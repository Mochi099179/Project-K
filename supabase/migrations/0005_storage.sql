-- ============================================================================
-- 0005_storage.sql
-- Storage buckets + owner-scoped policies.
--
-- Path convention (enforced by policy, not just by convention):
--   {bucket}/{owner_id}/{entity_id}/{filename}
-- storage.foldername(name)[1] is the first path segment, i.e. {owner_id}.
-- A user may only read/write objects under a path that starts with their own
-- auth.uid() — this mirrors the table RLS policies above.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('submissions', 'submissions', false),
  ('homework-unit-files', 'homework-unit-files', false),
  ('teaching-materials', 'teaching-materials', false),
  ('answer-keys', 'answer-keys', false),
  ('exercises', 'exercises', false)
on conflict (id) do nothing;

create policy "submissions_bucket_owner_rw" on storage.objects
  for all using (
    bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "homework_unit_files_bucket_owner_rw" on storage.objects
  for all using (
    bucket_id = 'homework-unit-files' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'homework-unit-files' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- These three buckets are reserved for the stricter per-exercise file model
-- described in migration 0002's comment, if/when that split happens. Same
-- owner-scoped policy pattern, kept ready so no policy work is needed later.
create policy "teaching_materials_bucket_owner_rw" on storage.objects
  for all using (
    bucket_id = 'teaching-materials' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'teaching-materials' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "answer_keys_bucket_owner_rw" on storage.objects
  for all using (
    bucket_id = 'answer-keys' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'answer-keys' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "exercises_bucket_owner_rw" on storage.objects
  for all using (
    bucket_id = 'exercises' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'exercises' and (storage.foldername(name))[1] = auth.uid()::text
  );
