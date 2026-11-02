-- Custom checklists (made by the family, optionally drafted by AI). Run once in Supabase dashboard →
-- SQL Editor, after schema.sql. Custom document categories need no table: they are whatever types the
-- family uses on its documents and checklists (see server/src/docTypes.js).

create table checklists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family_id() references families on delete cascade,
  name text not null,
  doc_types text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Same rule as every other table: a family only sees and changes its own checklists.
alter table checklists enable row level security;
create policy "own family" on checklists for all
  using (family_id = my_family_id()) with check (family_id = my_family_id());
