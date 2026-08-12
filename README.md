# TeachAI — AI Classroom & Homework Analysis Platform

A Next.js (App Router) app for teachers: upload a student's exercise, let AI read it,
extract each question/answer, evaluate it against a teaching-context-aware pipeline,
let the teacher review/correct, then roll results up into a per-student Learning
Profile and a per-classroom Class Analysis.

## Getting started

```bash
npm install
# Requires an Anthropic API key available to the server (used by app/api/process-check)
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open http://localhost:3000, then go to **หน้าหลัก** (Home) → **ตรวจแบบฝึกหัด** (Quick Check).

## What's implemented

- **Information architecture**: Home / Quick Check / Classroom / Homework Unit as
  separate top-level areas (Homework Unit is intentionally *not* nested under
  Classroom). Quick Check works standalone — no Classroom required.
- **AI pipeline** (`app/api/process-check`): one structured Claude call that reads
  the student's handwriting, splits it into question/answer blocks (kept in a
  single block per spec — never split into separate entities), and evaluates each
  one using the exercise, the answer key, and any teaching-materials context
  together — not the answer key alone.
- **Two confidence scores, kept separate**: `extractionConfidence` (did OCR/parsing
  read the question and answer correctly?) vs each result's `evaluationConfidence`
  (how sure is the AI about the grading?). The UI only surfaces a confidence badge
  when it's low enough to matter for the teacher's decision.
- **Human-in-the-loop**: every question card shows the AI result; a teacher can
  edit correctness/score/error type/reasoning/areas-to-improve inline. The AI
  result is preserved underneath — the corrected result is what becomes "final"
  and what feeds the Learning Profile.
- **Result page** (`/checks/[checkId]`): split screen — student exercise viewer
  (zoom + page nav) on the left, AI analysis (overall score, per-question cards,
  aggregated error analysis / areas to improve) on the right, save/send CTA bar.
- **Send to Student Profile**: guided flow — if there's no Classroom yet, a guided
  empty state offers to create one inline (5-step: info → learning problems →
  student profiles → confirm → created) without losing the check in progress;
  otherwise select Classroom → select/add Student → confirm.
- **Student Learning Profile** (`lib/analysis.ts`): strengths, concepts to
  reinforce, and common error patterns are derived from a student's finalized
  Check results — not just a single score.
- **Class Analysis**: same idea aggregated across a classroom's checks — "what is
  the whole class struggling with," shown in the classroom's Scores tab.
- **Homework Unit**: a separate content library (Exercises / Answer Keys /
  Teaching Materials) that can seed a Quick Check's context.
- **Design system**: kept the existing warm pastel palette (`#FFF7EB` background,
  soft green/gold accents), rounded cards, and moved the Home page from a
  graphs-heavy dashboard to a Quick-Check-first layout per the design direction.

## Known simplifications (being upfront about scope)

- **File storage is in-memory (React state) only** — there's no object storage or
  database, so everything resets on page reload. `lib/store.tsx` documents where
  a real backend would plug in (Checks, Homework Units, Classrooms/Students).
- **Uploads are images only** (jpeg/png/gif/webp) for the AI pipeline, since the
  model reads them as vision input. Homework Unit file lists accept any file type
  for cataloging, but only images actually feed the AI when starting a check from
  a unit's exercise.
- **No authentication / access control** — the multi-tenant "one teacher can't see
  another's data" requirement from the spec is a backend/auth concern that isn't
  wired up here.
- **The 8-stage OCR pipeline (Section 8) is implemented as one well-structured AI
  call** rather than separate microservices per stage — it still produces the
  same output contract (extraction confidence, evaluation confidence, keywords,
  features, context, per-question error analysis) so it's a drop-in replacement
  if you later split it into real pipeline stages.
- Classroom-level aggregate stats (average score, trend charts, distribution) on
  the pre-seeded demo classrooms are still mock numbers — new Checks feed the
  Student Learning Profile and Class Analysis (which are real derived data), but
  don't yet recompute the classroom's headline `avgScore`/trend cards.
