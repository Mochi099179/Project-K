-- ============================================================================
-- 0007_ocr_pipeline.sql
-- Splits checking into two independent AI stages:
--   1. Handwriting recognition (OCR) — reads student work, no grading.
--   2. Answer analysis — grades the OCR'd text, never sees the raw image.
--
-- questions already conceptually represented "OCR output" (question_text,
-- student_answer, extraction_confidence) even under the old single-call
-- design, so it keeps that role — this migration only adds the columns
-- needed to preserve OCR uncertainty and let a teacher correct OCR text
-- without touching the AI-authored evaluation. ocr_results is new: it holds
-- the raw provider response for debugging/audit, kept separate from the
-- materialized `questions` rows the rest of the app actually reads.
-- ============================================================================

-- New pipeline states. Added outside of any dependent DML in this file —
-- Postgres won't let a new enum value be used in the same transaction that
-- adds it, so nothing else in this migration references them.
alter type public.submission_status add value if not exists 'ocr_failed';
alter type public.submission_status add value if not exists 'analysis_failed';

-- ---------------------------------------------------------------------------
-- QUESTIONS — OCR-stage columns. question_number becomes nullable: the
-- Handwriting AI must be able to say "I can't tell which question this
-- answer belongs to" rather than guess (unique(submission_id, question_number)
-- still holds — Postgres treats multiple NULLs as distinct, so several
-- unmapped answers per submission are fine).
-- ---------------------------------------------------------------------------
alter table public.questions alter column question_number drop not null;

alter table public.questions
  add column page_number int,
  add column ocr_uncertain boolean not null default false,
  add column ocr_alternatives jsonb not null default '[]'::jsonb, -- string[] of alternate readings
  add column teacher_corrected_answer text; -- teacher's fix to student_answer; null = use OCR's reading as-is

comment on column public.questions.student_answer is 'Handwriting AI''s reading of the student''s answer — never edited in place; see teacher_corrected_answer.';
comment on column public.questions.teacher_corrected_answer is 'Teacher-corrected OCR reading. When set, Answer Analysis uses this instead of student_answer.';

-- ---------------------------------------------------------------------------
-- EVALUATIONS — Answer Analysis must be able to say "don't trust this score,
-- the OCR input was uncertain" instead of silently grading a possibly-wrong
-- transcription with false confidence.
-- ---------------------------------------------------------------------------
alter table public.evaluations
  add column needs_review boolean not null default false,
  add column review_reason text not null default '';

-- ---------------------------------------------------------------------------
-- OCR_RESULTS — one row per OCR attempt (initial + each retry), so the full
-- history is preserved for debugging (raw provider response) without ever
-- being treated as a second source of truth for the app's UI — that's still
-- `questions`. The most recent row per submission is "current".
-- ---------------------------------------------------------------------------
create table public.ocr_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  model text not null,
  raw_response jsonb not null,
  normalized_result jsonb not null,
  status text not null check (status in ('completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index ocr_results_submission_id_idx on public.ocr_results(submission_id);
create index ocr_results_owner_id_idx on public.ocr_results(owner_id);

alter table public.ocr_results enable row level security;

create policy "ocr_results_all_own" on public.ocr_results
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.check_ocr_result_owner()
returns trigger as $$
begin
  if not exists (
    select 1 from public.submissions s where s.id = new.submission_id and s.owner_id = new.owner_id
  ) then
    raise exception 'submission does not belong to owner';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger ocr_results_check_owner
  before insert or update on public.ocr_results
  for each row execute function public.check_ocr_result_owner();
