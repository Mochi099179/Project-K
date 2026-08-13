-- ============================================================================
-- 0002_homework_units.sql
-- homework_units, homework_unit_files
--
-- Design note: the product spec's reference schema models exercises /
-- answer_keys / materials as three separate tables (with answer_keys tied to
-- one specific exercise). The current UI treats these as three flat,
-- independent file lists per Homework Unit (no per-exercise pairing), so this
-- migration mirrors that with a single table + a group enum instead of three
-- near-identical tables. Splitting this into the stricter 3-table shape later
-- is a non-breaking, additive change (add exercises table, add nullable
-- exercise_id to this table, migrate rows) whenever the product needs it.
-- ============================================================================

create type public.homework_file_group as enum ('exercise', 'answer_key', 'material');
create type public.file_kind as enum ('image', 'pdf', 'text', 'other');

create table public.homework_units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  subject text not null default 'คณิตศาสตร์',
  grade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index homework_units_owner_id_idx on public.homework_units(owner_id);

alter table public.homework_units enable row level security;

create policy "homework_units_all_own" on public.homework_units
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create trigger homework_units_set_updated_at
  before update on public.homework_units
  for each row execute function public.set_updated_at();

create table public.homework_unit_files (
  id uuid primary key default gen_random_uuid(),
  homework_unit_id uuid not null references public.homework_units(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  group_type public.homework_file_group not null,
  file_name text not null,
  storage_path text, -- nullable: a row can exist as catalog metadata before/without an uploaded file
  file_kind public.file_kind not null default 'other',
  created_at timestamptz not null default now()
);

create index homework_unit_files_unit_id_idx on public.homework_unit_files(homework_unit_id);
create index homework_unit_files_owner_id_idx on public.homework_unit_files(owner_id);

alter table public.homework_unit_files enable row level security;

create policy "homework_unit_files_all_own" on public.homework_unit_files
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Defense in depth: the homework_unit_id must actually belong to the same owner.
create or replace function public.check_homework_unit_file_owner()
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

create trigger homework_unit_files_check_owner
  before insert or update on public.homework_unit_files
  for each row execute function public.check_homework_unit_file_owner();
