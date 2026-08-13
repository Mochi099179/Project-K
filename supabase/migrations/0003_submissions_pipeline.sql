-- ============================================================================
-- 0003_submissions_pipeline.sql
-- submissions (= app's "Check"), questions, evaluations, teacher_corrections
--
-- Core rule preserved from the product spec: AI evaluations are written once
-- and never overwritten. A teacher's edit creates a teacher_corrections row
-- instead. "Final result" = teacher_corrections if present, else evaluations.
-- See migration 0004 for the `final_results` view that implements that rule.
-- ============================================================================

create type public.submission_status as enum (
  'uploaded',
  'processing',
  'ocr_completed',
  'extracting',
  'evaluating',
  'review_required',
  'completed',
  'failed'
);

-- ---------------------------------------------------------------------------
-- SUBMISSIONS ("Check" in the app) — student_id / classroom_id /
-- homework_unit_id are ALL nullable so a standalone Quick Check is valid.
-- When a teacher later does "Send to Student Profile", this row is UPDATED
-- in place (student_id/classroom_id set) — never duplicated.
-- ---------------------------------------------------------------------------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  student_code text not null,
  student_id uuid references public.students(id) on delete set null,
  classroom_id uuid references public.classrooms(id) on delete set null,
  homework_unit_id uuid references public.homework_units(id) on delete set null,
  topic text,
  status public.submission_status not null default 'uploaded',
  exercise_files jsonb not null default '[]'::jsonb, -- [{ storage_path, file_name }]
  answer_key_file jsonb,                              -- { storage_path, file_name } | null
  answer_key_text text,
  teaching_materials_text text,
  overall_score numeric,
  error_message text,
  saved_to_profile_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index submissions_owner_id_idx on public.submissions(owner_id);
create index submissions_student_id_idx on public.submissions(student_id);
create index submissions_classroom_id_idx on public.submissions(classroom_id);
create index submissions_homework_unit_id_idx on public.submissions(homework_unit_id);
create index submissions_status_idx on public.submissions(status);

alter table public.submissions enable row level security;

create policy "submissions_all_own" on public.submissions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create trigger submissions_set_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

-- Defense in depth: if student_id/classroom_id are set, they must belong to
-- this same owner (stops a submission being linked to someone else's roster).
create or replace function public.check_submission_links()
returns trigger as $$
begin
  if new.classroom_id is not null and not exists (
    select 1 from public.classrooms c where c.id = new.classroom_id and c.owner_id = new.owner_id
  ) then
    raise exception 'classroom does not belong to owner';
  end if;

  if new.student_id is not null and not exists (
    select 1 from public.students s
    join public.classrooms c on c.id = s.classroom_id
    where s.id = new.student_id and c.owner_id = new.owner_id
  ) then
    raise exception 'student does not belong to owner';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger submissions_check_links
  before insert or update on public.submissions
  for each row execute function public.check_submission_links();

-- ---------------------------------------------------------------------------
-- QUESTIONS — question + student answer stay in one row, never split apart.
-- ---------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_number int not null,
  question_text text not null,
  student_answer text not null default '',
  expected_answer text not null default '',
  keywords jsonb not null default '[]'::jsonb,
  features jsonb not null default '[]'::jsonb,
  context jsonb not null default '[]'::jsonb,
  extraction_confidence numeric not null default 0.8,
  created_at timestamptz not null default now(),
  unique (submission_id, question_number)
);

create index questions_submission_id_idx on public.questions(submission_id);

alter table public.questions enable row level security;

create policy "questions_all_via_submission" on public.questions
  for all using (
    exists (select 1 from public.submissions s where s.id = questions.submission_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.submissions s where s.id = questions.submission_id and s.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- EVALUATIONS — AI-written. One per question. Never updated after insert
-- (the app only ever inserts a teacher_corrections row instead).
-- ---------------------------------------------------------------------------
create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions(id) on delete cascade,
  is_correct boolean not null,
  score numeric not null default 0,
  error_type text not null default '',
  concept_issue text not null default '',
  reasoning text not null default '',
  areas_to_improve jsonb not null default '[]'::jsonb,
  evaluation_confidence numeric not null default 0.8,
  created_at timestamptz not null default now()
);

create index evaluations_question_id_idx on public.evaluations(question_id);

alter table public.evaluations enable row level security;

create policy "evaluations_all_via_question" on public.evaluations
  for all using (
    exists (
      select 1 from public.questions q
      join public.submissions s on s.id = q.submission_id
      where q.id = evaluations.question_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.questions q
      join public.submissions s on s.id = q.submission_id
      where q.id = evaluations.question_id and s.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- TEACHER CORRECTIONS — 0 or 1 per evaluation. Presence of a row means
-- "teacher-corrected"; the underlying evaluation row is left untouched.
-- ---------------------------------------------------------------------------
create table public.teacher_corrections (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null unique references public.evaluations(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id),
  corrected_is_correct boolean not null,
  corrected_score numeric not null default 0,
  corrected_error_type text not null default '',
  corrected_reasoning text not null default '',
  corrected_areas_to_improve jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teacher_corrections_evaluation_id_idx on public.teacher_corrections(evaluation_id);

alter table public.teacher_corrections enable row level security;

create policy "teacher_corrections_all_via_evaluation" on public.teacher_corrections
  for all using (
    exists (
      select 1 from public.evaluations e
      join public.questions q on q.id = e.question_id
      join public.submissions s on s.id = q.submission_id
      where e.id = teacher_corrections.evaluation_id and s.owner_id = auth.uid()
    )
  )
  with check (teacher_id = auth.uid());

create trigger teacher_corrections_set_updated_at
  before update on public.teacher_corrections
  for each row execute function public.set_updated_at();
