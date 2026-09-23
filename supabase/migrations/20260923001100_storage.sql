-- =============================================================================
-- Supabase Storage buckets for file bytes. (Supabase-specific; the only other
-- Supabase dependency is app.current_user_id().)
--
--   documents    retailer uploads (program PDFs, spreadsheets, photos).
--                Path convention: <organization_id>/<anything>
--                Members of that organization can upload and read.
--   raw-imports  raw API payloads and import files. Server-side only; purged
--                according to each connection's raw_payload_retention.
-- Both buckets are private (no public URLs).
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false),
       ('raw-imports', 'raw-imports', false)
on conflict (id) do nothing;

create policy documents_member_select on storage.objects
  for select to authenticated
  using (bucket_id = 'documents'
         and (storage.foldername(name))[1] in (select org_id::text from app.user_organization_ids() as org_id));

create policy documents_member_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents'
              and (storage.foldername(name))[1] in (select org_id::text from app.user_organization_ids() as org_id));

-- No policies for 'raw-imports': only the server (service role) can access it.
