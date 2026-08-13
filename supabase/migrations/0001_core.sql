-- ============================================================================
-- 0001_core.sql
-- profiles, classrooms, students
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- helper: keep updated_at fresh on every UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- PROFILES — one row per auth.users row, created automatically on signup.
-- Real accounts (email/password via Supabase Auth) — not anonymous sign-in.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'ครูผู้สอน',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'ครูผู้สอน')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- CLASSROOMS — belongs to a teacher (profile)
-- ---------------------------------------------------------------------------
create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  subject text not null default 'คณิตศาสตร์',
  grade text,
  term text,
  learning_problems jsonb not null default '[]'::jsonb, -- string[] chosen by teacher at creation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index classrooms_owner_id_idx on public.classrooms(owner_id);

alter table public.classrooms enable row level security;

create policy "classrooms_all_own" on public.classrooms
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create trigger classrooms_set_updated_at
  before update on public.classrooms
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- STUDENTS — belongs to a classroom. Identified primarily by student_code,
-- NOT by real name (PDPA / privacy-by-design, per product spec).
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_code text not null,
  display_name text, -- optional; UI falls back to "นักเรียน {student_code}" when null
  seat_no int,
  gender text check (gender in ('M', 'F')),
  problems jsonb not null default '[]'::jsonb, -- string[]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (classroom_id, student_code)
);

create index students_classroom_id_idx on public.students(classroom_id);
create index students_student_code_idx on public.students(student_code);

alter table public.students enable row level security;

-- Students have no owner_id of their own — ownership is via the parent classroom.
create policy "students_all_via_classroom" on public.students
  for all using (
    exists (
      select 1 from public.classrooms c
      where c.id = students.classroom_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classrooms c
      where c.id = students.classroom_id and c.owner_id = auth.uid()
    )
  );

create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();
