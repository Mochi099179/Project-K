-- ============================================================================
-- 0009_reference_ocr_cache.sql
-- Cached OCR text for teacher-uploaded reference files (exercise file,
-- answer-key file, teaching materials) — extracted once at upload time
-- instead of being re-downloaded and re-sent to the AI on every single
-- student submission graded against them.
--
-- Same status/provider/model/error shape as ocr_results (0007), but
-- deliberately NOT a child table like ocr_results: a student submission can
-- have many OCR attempts worth keeping as history, but each of these rows
-- has exactly one current file and one current cached reading — a retry
-- just overwrites the same row's ocr_* columns in place.
--
-- ocr_status is nullable and distinct from 'pending': null means "no file to
-- OCR" (e.g. an exercise with only typed answer_text, no exercise_file_path),
-- 'pending' means "a file exists and OCR hasn't run yet". The app sets
-- 'pending' explicitly at insert/upload time when a file is present, rather
-- than relying on a column default — exercises/answer_keys have optional
-- files, so a blanket default would be wrong for the no-file case.
--
-- homework_unit_files gets these columns unconditionally even though only
-- group_type = 'material' rows will ever populate them — the legacy
-- 'exercise'/'answer_key' groups noted as dead in 0006 are never OCR'd.
-- ============================================================================

create type public.reference_ocr_status as enum ('pending', 'processing', 'completed', 'failed');

alter table public.exercises
  add column ocr_text text,
  add column ocr_status public.reference_ocr_status,
  add column ocr_provider text,
  add column ocr_model text,
  add column ocr_error text,
  add column ocr_processed_at timestamptz;

alter table public.answer_keys
  add column ocr_text text,
  add column ocr_status public.reference_ocr_status,
  add column ocr_provider text,
  add column ocr_model text,
  add column ocr_error text,
  add column ocr_processed_at timestamptz;

alter table public.homework_unit_files
  add column ocr_text text,
  add column ocr_status public.reference_ocr_status,
  add column ocr_provider text,
  add column ocr_model text,
  add column ocr_error text,
  add column ocr_processed_at timestamptz;

comment on column public.exercises.ocr_text is 'Cached text extraction of exercise_file_path, read by grading instead of re-downloading/re-sending the raw file each submission.';
comment on column public.answer_keys.ocr_text is 'Cached text extraction of file_path, read by grading instead of re-downloading/re-sending the raw file each submission.';
comment on column public.homework_unit_files.ocr_text is 'Cached text extraction of storage_path (group_type = material only), folded into grading context.';
