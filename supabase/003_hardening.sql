-- Hardening found in the QA audit. Run once in Supabase dashboard → SQL Editor, after schema.sql and 002_checklists.sql.
-- Safe to run on a database that already has data: the checks apply to new and changed rows only ("not valid"),
-- so old rows that break a rule don't block the script. After cleaning such rows you can enforce them everywhere with
--   alter table <table> validate constraint <name>;

-- ───────────── Rules the API already checks, now also enforced by the database ─────────────

alter table members
  add constraint members_name_ok check (btrim(name) <> '' and length(name) <= 100) not valid,
  add constraint members_relation_len check (length(relation) <= 50) not valid;

alter table documents
  add constraint documents_type_len check (length(doc_type) <= 60) not valid,
  add constraint documents_number_len check (length(doc_number) <= 60) not valid,
  add constraint documents_tags_count check (cardinality(tags) <= 20) not valid,
  -- The stored file must sit in the family's own storage folder: "<family_id>/<file name>", no "..".
  add constraint documents_path_in_family check (file_path like family_id::text || '/%' and file_path not like '%..%') not valid,
  add constraint documents_expiry_range check (expiry_date between '1900-01-01' and '2200-12-31') not valid;

alter table checklists
  add constraint checklists_name_ok check (btrim(name) <> '' and length(name) <= 60) not valid,
  add constraint checklists_types_count check (cardinality(doc_types) <= 20) not valid;

-- ───────────── Indexes ─────────────
-- Filtering by member, the expiring list and the member → documents cascade all scan the table without these.

create index if not exists documents_family_member_idx on documents (family_id, member_id);
create index if not exists documents_family_expiry_idx on documents (family_id, expiry_date);

-- ───────────── Storage: only photos and PDFs, at most 10 MB ─────────────
-- The upload form checks this too, but anyone with a login can call Storage directly, so the bucket enforces it.

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
where id = 'documents';
