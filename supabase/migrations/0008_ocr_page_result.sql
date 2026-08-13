-- ============================================================================
-- 0008_ocr_page_result.sql
--
-- Realigns the OCR stage's data shape with what a real, generic OCR provider
-- (AksonOCR) actually returns: page-level extracted text, NOT pre-segmented
-- question/answer pairs. A dedicated OCR API has no concept of "this is
-- question 3" — that mapping requires understanding the exercise, which is
-- the Answer Analysis AI's job, not OCR's (see lib/ai/answer-analysis.ts).
--
-- Consequently, `questions` rows are now written by the Analysis stage
-- (which segments AND grades in one pass over the OCR text), not the OCR
-- stage. Teacher review/correction of the OCR reading therefore now happens
-- on the OCR text itself (ocr_results.teacher_corrected_text), not on
-- individual `questions` rows — questions.teacher_corrected_answer is
-- dropped as a result; it was never applied to any real data (migration
-- 0007 hadn't shipped yet).
-- ============================================================================

alter table public.ocr_results
  add column teacher_corrected_text text,
  add column updated_at timestamptz not null default now();

comment on column public.ocr_results.normalized_result is
  'Provider-neutral shape: { pages: [{ page_number, content, confidence? }] }. Represents only what the OCR provider actually returned — never invented structure.';
comment on column public.ocr_results.teacher_corrected_text is
  'Teacher''s correction of the OCR reading (all pages, combined), used by Answer Analysis in place of normalized_result when set. Null = use the OCR reading as-is.';

create trigger ocr_results_set_updated_at
  before update on public.ocr_results
  for each row execute function public.set_updated_at();

-- final_results (0004) selects features/context directly, which blocks
-- dropping those columns — drop and recreate it against the new shape.
drop view public.final_results;

alter table public.questions drop column teacher_corrected_answer;

-- features/context were never surfaced anywhere in the UI (dead metadata
-- from the original single-call design) and Answer Analysis's new schema
-- doesn't produce them — dropped rather than left as unused columns.
alter table public.questions drop column features;
alter table public.questions drop column context;

-- page_number was OCR-stage metadata; question segmentation now happens in
-- Answer Analysis, which works from joined OCR text and doesn't track which
-- source page a given question came from.
alter table public.questions drop column page_number;

-- Recreated against the current `questions`/`evaluations` shape: features/
-- context are gone, and needs_review/review_reason (0007) are now exposed
-- so downstream analysis can tell a confidently-wrong answer apart from one
-- that was never confidently gradable in the first place.
create view public.final_results
with (security_invoker = true) as
select
  q.id as question_id,
  q.submission_id,
  q.question_number,
  q.question_text,
  q.student_answer,
  q.expected_answer,
  q.keywords,
  q.extraction_confidence,
  q.ocr_uncertain,
  q.ocr_alternatives,
  e.id as evaluation_id,
  e.evaluation_confidence,
  coalesce(tc.corrected_is_correct, e.is_correct) as is_correct,
  coalesce(tc.corrected_score, e.score) as score,
  case when tc.id is not null then tc.corrected_error_type else e.error_type end as error_type,
  e.concept_issue,
  case when tc.id is not null then tc.corrected_reasoning else e.reasoning end as reasoning,
  case when tc.id is not null then tc.corrected_areas_to_improve else e.areas_to_improve end as areas_to_improve,
  (tc.id is not null) as is_teacher_corrected,
  (tc.id is null and e.needs_review) as needs_review,
  e.review_reason
from public.questions q
join public.evaluations e on e.question_id = q.id
left join public.teacher_corrections tc on tc.evaluation_id = e.id;

comment on view public.final_results is
  'Per-question final result: teacher correction if present, else the original AI evaluation. RLS-safe (security_invoker).';
