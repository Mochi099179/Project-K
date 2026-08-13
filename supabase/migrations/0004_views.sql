-- ============================================================================
-- 0004_views.sql
-- ============================================================================
-- Student Learning Profile and Class Analysis are explicitly "derived data" in
-- the product spec — never a second source of truth. This migration provides
-- exactly one view, `final_results`, which implements the one rule that
-- actually needs to live in the database: "use the teacher's correction if
-- one exists, otherwise use the AI evaluation." Everything above that
-- (grouping by keyword, ranking strengths/weaknesses, counting error
-- patterns) is aggregation logic that already exists and is already correct
-- in lib/analysis.ts — re-deriving the same logic a second time in SQL would
-- be duplicated logic that can quietly drift out of sync. The app instead
-- queries `final_results` and feeds the rows through the same
-- computeStudentInsights / computeClassDifficulties functions it already
-- uses today (see lib/data/submissions.ts).
--
-- `security_invoker = true` is required — without it, a view runs as its
-- owner and would bypass the RLS policies on the underlying tables.
-- ============================================================================

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
  q.features,
  q.context,
  q.extraction_confidence,
  e.id as evaluation_id,
  e.evaluation_confidence,
  coalesce(tc.corrected_is_correct, e.is_correct) as is_correct,
  coalesce(tc.corrected_score, e.score) as score,
  case when tc.id is not null then tc.corrected_error_type else e.error_type end as error_type,
  e.concept_issue,
  case when tc.id is not null then tc.corrected_reasoning else e.reasoning end as reasoning,
  case when tc.id is not null then tc.corrected_areas_to_improve else e.areas_to_improve end as areas_to_improve,
  (tc.id is not null) as is_teacher_corrected
from public.questions q
join public.evaluations e on e.question_id = q.id
left join public.teacher_corrections tc on tc.evaluation_id = e.id;

comment on view public.final_results is
  'Per-question final result: teacher correction if present, else the original AI evaluation. RLS-safe (security_invoker).';
