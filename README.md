# TeachAI — AI Classroom & Homework Analysis Platform

A Next.js (App Router) app for teachers: upload a student's exercise, let AI read it,
extract each question/answer, evaluate it against a teaching-context-aware pipeline,
let the teacher review/correct, then roll results up into a per-student Learning
Profile and a per-classroom Class Analysis.

Backed by Supabase (Postgres + Auth + Storage) — real accounts, real persistence,
row-level security so each teacher only ever sees their own data.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase + Anthropic keys
```

### 1. Set up the database

In a fresh Supabase project, run the migrations in order (`supabase/migrations/`)
via the Supabase SQL editor, or with the CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates the schema, enables RLS on every table, creates the four private
Storage buckets (`teaching-materials`, `answer-keys`, `exercises`, `submissions`),
and sets up owner-scoped Storage policies.

### 2. Create your first account and (optionally) seed demo data

```bash
npm run dev
```

Go to `/login`, sign up with an email/password. Then, optionally, run
`supabase/seed.sql` in the SQL editor (edit the email at the top first) to get
one demo classroom, two students, a Homework Unit, and a fully-worked example
submission so the Learning Profile / Class Analysis views aren't empty.

### 3. Run it

Open http://localhost:3000/dashboard.

## What's implemented

- **Real auth** (Supabase Auth, email/password) — `/login`, session refresh via
  `proxy.ts`, RLS-scoped everywhere (`auth.uid()` — not the frontend).
- **Information architecture**: Home / Quick Check / Classroom / Homework Unit as
  separate top-level areas (Homework Unit is intentionally *not* nested under
  Classroom). Quick Check works standalone — no Classroom required.
- **AI pipeline** (`app/api/process-check`): server-only route — downloads the
  student's exercise (and optional answer key image) from Storage, calls Claude
  Sonnet 5 with a structured JSON schema, **validates the response with Zod**
  before it ever touches the database, then writes `questions` + `evaluations`.
- **Two confidence scores, kept separate**: `extraction_confidence` (did OCR/
  parsing read the question and answer correctly?) vs each evaluation's
  `evaluation_confidence` (how sure is the AI about the grading?).
- **Human-in-the-loop, audit-preserving**: `evaluations` rows are AI-written and
  write-once (no update policy). A teacher's edit inserts/upserts a
  `teacher_corrections` row instead — the original AI result is never
  overwritten. "Final result" = correction if present, else the AI evaluation
  (see the `final_results` view).
- **Quick Check without a Classroom**: a `submissions` row can have
  `student_id`/`classroom_id`/`homework_unit_id` all null. "Send to Student
  Profile" **updates that same row** (`classroom_id`/`student_id` set) — it
  never creates a duplicate.
- **Student Learning Profile / Class Analysis**: derived, not stored — computed
  from `final_results` rows reconstructed into the app's existing `Check[]`
  shape and fed through the same `lib/analysis.ts` functions that existed
  before this migration (no duplicated aggregation logic in SQL).
- **Real file storage**: exercise images, answer keys, and Homework Unit files
  all go to private Supabase Storage buckets, uploaded directly from the
  browser (RLS-protected) and read back via short-lived signed URLs — never
  public.
- **Defense in depth**: beyond RLS, `submissions_check_links` and
  `homework_unit_files_check_owner` triggers stop a row from ever being linked
  to a classroom/student/unit that isn't the same owner's.

## Architecture

```
Browser (RLS-protected, safe for the user's own data)
  ├─ auth: sign in/up/out
  ├─ classrooms/students: CRUD
  ├─ homework units + file uploads → Storage
  └─ submissions: create shell + upload files → Storage
        │
        ▼
Server route  app/api/process-check  (the ONLY place with the Anthropic key)
  ├─ re-fetch the submission (RLS: only the caller's own)
  ├─ download files from Storage server-side
  ├─ call Claude Sonnet 5 → structured JSON
  ├─ validate with Zod — reject/mark failed if malformed
  └─ write questions + evaluations (still through the user's own RLS session)
```

`lib/data/*.ts` is the data-access layer — one file per entity group, each
function typed against `lib/supabase/database.types.ts` and returning the
app's existing `Classroom`/`Student`/`HomeworkUnit`/`Check` shapes, so none of
the existing pages/components needed to change to consume real data.

## Known simplifications (being upfront about scope)

- **`lib/supabase/database.types.ts` is hand-authored**, not CLI-generated
  (matches the migrations exactly, but there's no live project in this
  environment to generate against). Regenerate once you have a project:
  `supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts`
  — the shape is intentionally identical, so it's a drop-in swap.
- **Classroom-level decorative analytics** (trend chart, score distribution,
  subject breakdown, top students, exercise table) are **not** part of the
  approved schema and are not wired to real data — they render empty/zero on
  real classrooms. `avgScore` and `riskCount` *are* computed live from
  submissions. This was flagged before implementation began and intentionally
  scoped out rather than adding unapproved tables.
- **`addSavedPlan`/`addSavedTechnique`** (the AI-tools "save" actions) are
  still local-only, in-memory — not part of the approved schema, resets on
  reload. Same reasoning as above.
- **The full teacher dataset loads into memory on mount** (`listRecentSubmissions(supabase, 500)`)
  so `getChecksForStudent`/`getChecksForClassroom`/etc. can stay synchronous
  and every existing component keeps working unchanged. Fine at this scale;
  would need pagination for a teacher with hundreds of submissions.
- **One unused Storage bucket**: `homework-unit-files` exists (from the
  original migration) but nothing writes to it — Homework Unit files actually
  go into `exercises`/`answer-keys`/`teaching-materials`, matching the flat
  three-list UI. Harmless, just vestigial; left as-is rather than editing an
  already-approved migration for a cosmetic reason.
- **No password reset flow, no email templates customized** — Supabase's
  default auth emails work but haven't been styled.

## Verification note

This sandbox has no network access and no live Supabase project, so I could
not run `npm install` or `next build` against the real `@supabase/*` packages
here. Everything was verified with `tsc --noEmit` and `eslint` against
hand-written local type stubs matching the real packages' public API — clean
on both. Please run `npm install && npm run build` yourself before treating
this as production-ready; that will be the first real compile against the
actual Supabase SDK types.
