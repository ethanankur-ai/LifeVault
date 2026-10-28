-- LifeVault database schema. Run once in Supabase dashboard → SQL Editor.
-- Model: each login (auth user) owns exactly one family. Row Level Security (RLS) makes every
-- query, from the server or the browser, see only that family's rows.

-- ───────────── Tables ─────────────

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null unique references auth.users on delete cascade, -- links a login to its family
  created_at timestamptz not null default now()
);

-- The logged-in user's family id. Used by RLS policies and as a column default, so the API
-- never has to send family_id. "security definer" lets it read families without RLS recursion.
create function my_family_id() returns uuid
language sql stable security definer set search_path = public
as $$ select id from families where owner_id = auth.uid() $$;

create table members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family_id() references families on delete cascade,
  name text not null,
  relation text,
  dob date,
  unique (id, family_id) -- lets documents check that member and family match (see below)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null,
  family_id uuid not null default my_family_id() references families on delete cascade,
  file_path text not null, -- path inside the "documents" storage bucket: <family_id>/<file name>
  doc_type text,
  doc_number text,
  expiry_date date,
  tags text[] not null default '{}',
  extracted_json jsonb,    -- raw Gemini output, kept for reference
  created_at timestamptz not null default now(),
  -- A document can only point at a member of the same family.
  foreign key (member_id, family_id) references members (id, family_id) on delete cascade
);

-- Search helper for GET /api/documents?q=: one text column to ILIKE against.
-- security_invoker makes the view obey the RLS policies of the documents table.
create view documents_search with (security_invoker = true) as
select *, concat_ws(' ', doc_type, doc_number, array_to_string(tags, ' ')) as search_text
from documents;

-- ───────────── Row Level Security ─────────────

alter table families enable row level security;
alter table members enable row level security;
alter table documents enable row level security;

create policy "own family" on families for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own family" on members for all
  using (family_id = my_family_id()) with check (family_id = my_family_id());
create policy "own family" on documents for all
  using (family_id = my_family_id()) with check (family_id = my_family_id());

-- ───────────── Auto-create a family on sign-up ─────────────

create function create_family_for_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into families (name, owner_id)
  values (coalesce(new.raw_user_meta_data ->> 'family_name', 'My Family'), new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function create_family_for_new_user();

-- Give a family to users who signed up before this script ran.
insert into families (name, owner_id) select 'My Family', id from auth.users
on conflict (owner_id) do nothing;

-- ───────────── File storage ─────────────

-- Private bucket: files are only reachable by logged-in users through the policy below.
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Upload files to "<family_id>/<file name>"; users can only read/write their own family's folder.
create policy "own family files" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = my_family_id()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = my_family_id()::text);
