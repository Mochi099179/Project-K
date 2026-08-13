-- ============================================================================
-- 0006_exercises.sql
-- exercises, answer_keys, submissions.exercise_id
--
-- This is the additive split anticipated by migration 0002's design note and
-- by the "reserved" exercises/answer-keys/teaching-materials buckets created
-- in 0005: a Homework Unit's exercises now carry their own reference file,
-- scoring criteria, and paired answer key, instead of living as three flat,
-- unpaired file lists in homework_unit_files. Teaching Materials stay in
-- homework_unit_files (group_type = 'material') — that part was never
-- ambiguous and didn't need splitting.
--
-- homework_unit_files rows with group_type 'exercise' / 'answer_key' are left
-- in place for any pre-existing data (nothing here deletes them); the app
-- simply stops writing new rows in those two groups and uses the tables
-- below instead.
-- ============================================================================

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  homework_unit_id uuid not null references public.homework_units(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  exercise_file_path text,
  exercise_file_name text,
  exercise_file_kind public.file_kind not null default 'other',
  scoring_criteria text,
  max_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_homework_unit_id_idx on public.exercises(homework_unit_id);
create index exercises_owner_id_idx on public.exercises(owner_id);

alter table public.exercises enable row level security;

create policy "exercises_all_own" on public.exercises
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.check_exercise_owner()
returns trigger as $$
begin
  if not exists (
    select 1 from public.homework_units u
    where u.id = new.homework_unit_id and u.owner_id = new.owner_id
  ) then
    raise exception 'homework_unit does not belong to owner';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger exercises_check_owner
  before insert or update on public.exercises
  for each row execute function public.check_exercise_owner();

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ANSWER_KEYS — 0 or 1 per exercise (unique exercise_id). Modeled as its own
-- table (rather than columns on exercises) so a future exercise type that
-- allows multiple answer-key variants doesn't require another migration.
-- ---------------------------------------------------------------------------
create table public.answer_keys (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null unique references public.exercises(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  file_path text,
  file_name text,
  file_kind public.file_kind not null default 'other',
  answer_text text,
  created_at timestamptz not null default now()
);

create index answer_keys_exercise_id_idx on public.answer_keys(exercise_id);
create index answer_keys_owner_id_idx on public.answer_keys(owner_id);

alter table public.answer_keys enable row level security;

create policy "answer_keys_all_own" on public.answer_keys
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.check_answer_key_owner()
returns trigger as $$
begin
  if not exists (
    select 1 from public.exercises e
    where e.id = new.exercise_id and e.owner_id = new.owner_id
  ) then
    raise exception 'exercise does not belong to owner';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger answer_keys_check_owner
  before insert or update on public.answer_keys
  for each row execute function public.check_answer_key_owner();

-- ---------------------------------------------------------------------------
-- SUBMISSIONS.exercise_id — nullable, mirrors homework_unit_id's pattern:
-- ON DELETE SET NULL so removing an Exercise/Homework Unit never deletes a
-- student's Submission history, it just detaches the reference.
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column exercise_id uuid references public.exercises(id) on delete set null;

create index submissions_exercise_id_idx on public.submissions(exercise_id);

-- Defense in depth, same pattern as check_submission_links() in 0003.
create or replace function public.check_submission_exercise_owner()
returns trigger as $$
begin
  if new.exercise_id is not null and not exists (
    select 1 from public.exercises e where e.id = new.exercise_id and e.owner_id = new.owner_id
  ) then
    raise exception 'exercise does not belong to owner';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger submissions_check_exercise_owner
  before insert or update on public.submissions
  for each row execute function public.check_submission_exercise_owner();
