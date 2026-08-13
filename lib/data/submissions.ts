import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Check, CheckQuestion, CheckStatus, ExerciseFileRef, FileKind, QuestionResult } from "@/lib/types";
import { inferFileKind } from "@/lib/files";
import { asFileRefList, asStringArray, type StoredFileRef } from "./mappers";

type Client = SupabaseClient<Database>;
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type EvaluationRow = Database["public"]["Tables"]["evaluations"]["Row"];
type CorrectionRow = Database["public"]["Tables"]["teacher_corrections"]["Row"];

// ----------------------------------------------------------------------------
// Reconstructing DB rows into the app's Check/CheckQuestion shape. Once built,
// these feed straight into the SAME components/lib/analysis.ts logic that
// already existed before this migration — no downstream code needed to change.
// ----------------------------------------------------------------------------

/**
 * The DB's submission_status enum is more granular than the app's CheckStatus
 * (it models every pipeline stage: uploaded/processing/ocr_completed/
 * extracting/evaluating/review_required/completed/failed). The UI only ever
 * needs to distinguish four states, so this collapses the DB enum down.
 */
function toCheckStatus(dbStatus: SubmissionRow["status"]): CheckStatus {
  switch (dbStatus) {
    case "failed":
      return "failed";
    case "review_required":
      return "needs_review";
    case "completed":
      return "reviewed";
    default: // uploaded | processing | ocr_completed | extracting | evaluating
      return "processing";
  }
}

function toQuestionResult(evaluation: EvaluationRow): QuestionResult {
  return {
    isCorrect: evaluation.is_correct,
    score: evaluation.score,
    errorType: evaluation.error_type,
    conceptIssue: evaluation.concept_issue,
    reasoning: evaluation.reasoning,
    areasToImprove: asStringArray(evaluation.areas_to_improve),
    evaluationConfidence: evaluation.evaluation_confidence,
  };
}

function toTeacherResult(correction: CorrectionRow): QuestionResult {
  return {
    isCorrect: correction.corrected_is_correct,
    score: correction.corrected_score,
    errorType: correction.corrected_error_type,
    conceptIssue: "",
    reasoning: correction.corrected_reasoning,
    areasToImprove: asStringArray(correction.corrected_areas_to_improve),
    evaluationConfidence: 1,
  };
}

async function exerciseFileRefs(supabase: Client, files: StoredFileRef[]): Promise<ExerciseFileRef[]> {
  // The `submissions` bucket is private (student work must never be publicly
  // accessible), so getPublicUrl() would return a URL that 403s. Signed URLs
  // are the correct way to let the currently-authenticated owner view their
  // own files; they expire after an hour.
  const refs = await Promise.all(
    files.map(async (f) => {
      const { data, error } = await supabase.storage.from("submissions").createSignedUrl(f.storage_path, 60 * 60);
      if (error || !data) return null;
      // Older rows predate file_kind — fall back to inferring from the filename.
      return { url: data.signedUrl, name: f.file_name, kind: f.file_kind ?? inferFileKind(f.file_name) };
    })
  );
  return refs.filter((r): r is ExerciseFileRef => !!r);
}

/**
 * Fetches questions/evaluations/teacher_corrections for a set of submissions
 * with flat queries (rather than a deeply-nested PostgREST embed) and joins
 * them in memory — more predictable to type and to reason about than relying
 * on embed cardinality inference for the 1:1 / 0-or-1 relations involved.
 */
async function buildChecks(supabase: Client, submissions: SubmissionRow[]): Promise<Check[]> {
  if (submissions.length === 0) return [];
  const submissionIds = submissions.map((s) => s.id);

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("*")
    .in("submission_id", submissionIds)
    .order("question_number", { ascending: true });
  if (qError) throw qError;

  const questionIds = (questions ?? []).map((q) => q.id);

  const { data: evaluations, error: eError } =
    questionIds.length === 0
      ? { data: [] as EvaluationRow[], error: null }
      : await supabase.from("evaluations").select("*").in("question_id", questionIds);
  if (eError) throw eError;

  const evaluationIds = (evaluations ?? []).map((e) => e.id);

  const { data: corrections, error: cError } =
    evaluationIds.length === 0
      ? { data: [] as CorrectionRow[], error: null }
      : await supabase.from("teacher_corrections").select("*").in("evaluation_id", evaluationIds);
  if (cError) throw cError;

  const evaluationByQuestion = new Map((evaluations ?? []).map((e) => [e.question_id, e]));
  const correctionByEvaluation = new Map((corrections ?? []).map((c) => [c.evaluation_id, c]));
  const questionsBySubmission = new Map<string, QuestionRow[]>();
  for (const q of questions ?? []) {
    const list = questionsBySubmission.get(q.submission_id) ?? [];
    list.push(q);
    questionsBySubmission.set(q.submission_id, list);
  }

  return Promise.all(
    submissions.map(async (s) => {
      const rows = questionsBySubmission.get(s.id) ?? [];
      const mappedQuestions: CheckQuestion[] = rows.map((q) => {
        const evaluation = evaluationByQuestion.get(q.id);
        const correction = evaluation ? correctionByEvaluation.get(evaluation.id) : undefined;
        return {
          id: q.id,
          question: q.question_text,
          studentAnswer: q.student_answer,
          expectedAnswer: q.expected_answer,
          keywords: asStringArray(q.keywords),
          features: asStringArray(q.features),
          context: asStringArray(q.context),
          extractionConfidence: q.extraction_confidence,
          ai: evaluation
            ? toQuestionResult(evaluation)
            : { isCorrect: false, score: 0, errorType: "", conceptIssue: "", reasoning: "", areasToImprove: [], evaluationConfidence: 0 },
          teacherCorrected: correction ? toTeacherResult(correction) : null,
        };
      });

      return {
        id: s.id,
        createdAt: s.created_at,
        status: toCheckStatus(s.status),
        studentLabel: s.student_code,
        topic: s.topic ?? undefined,
        exerciseFiles: await exerciseFileRefs(supabase, asFileRefList(s.exercise_files)),
        questions: mappedQuestions,
        overallScore: s.overall_score ?? 0,
        errorMessage: s.error_message ?? undefined,
        homeworkUnitId: s.homework_unit_id,
        exerciseId: s.exercise_id,
        classroomId: s.classroom_id,
        studentId: s.student_id,
        savedToProfile:
          s.saved_to_profile_at && s.classroom_id && s.student_id
            ? { classroomId: s.classroom_id, studentId: s.student_id, savedAt: s.saved_to_profile_at }
            : null,
      };
    })
  );
}

export async function listRecentSubmissions(supabase: Client, limit = 5): Promise<Check[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return buildChecks(supabase, data ?? []);
}

export async function listSubmissionsForStudent(supabase: Client, classroomId: string, studentId: string): Promise<Check[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return buildChecks(supabase, data ?? []);
}

export async function listSubmissionsForClassroom(supabase: Client, classroomId: string): Promise<Check[]> {
  const { data, error } = await supabase.from("submissions").select("*").eq("classroom_id", classroomId);
  if (error) throw error;
  return buildChecks(supabase, data ?? []);
}

export async function getSubmission(supabase: Client, id: string): Promise<Check | null> {
  const { data, error } = await supabase.from("submissions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [check] = await buildChecks(supabase, [data]);
  return check ?? null;
}

// ----------------------------------------------------------------------------
// Writes
// ----------------------------------------------------------------------------

export async function uploadSubmissionFile(
  supabase: Client,
  ownerId: string,
  submissionId: string,
  file: File,
  kind: FileKind
): Promise<StoredFileRef> {
  const path = `${ownerId}/${submissionId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("submissions").upload(path, file);
  if (error) throw error;
  return { storage_path: path, file_name: file.name, file_kind: kind };
}

export async function createSubmissionShell(
  supabase: Client,
  ownerId: string,
  input: {
    id: string;
    studentLabel: string;
    topic?: string;
    exerciseFiles: StoredFileRef[];
    answerKeyFile: StoredFileRef | null;
    answerKeyText?: string;
    teachingMaterialsText?: string;
    classroomId?: string | null;
    studentId?: string | null;
    homeworkUnitId?: string | null;
    exerciseId?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("submissions").insert({
    id: input.id,
    owner_id: ownerId,
    student_code: input.studentLabel,
    student_id: input.studentId ?? null,
    classroom_id: input.classroomId ?? null,
    homework_unit_id: input.homeworkUnitId ?? null,
    exercise_id: input.exerciseId ?? null,
    topic: input.topic ?? null,
    status: "processing",
    exercise_files: input.exerciseFiles as unknown as Database["public"]["Tables"]["submissions"]["Insert"]["exercise_files"],
    answer_key_file: (input.answerKeyFile ?? null) as unknown as Database["public"]["Tables"]["submissions"]["Insert"]["answer_key_file"],
    answer_key_text: input.answerKeyText ?? null,
    teaching_materials_text: input.teachingMaterialsText ?? null,
  });
  if (error) throw error;
}

export type InsertableQuestion = {
  question_number: number;
  question_text: string;
  student_answer: string;
  expected_answer: string;
  keywords: string[];
  features: string[];
  context: string[];
  extraction_confidence: number;
  is_correct: boolean;
  score: number;
  error_type: string;
  concept_issue: string;
  reasoning: string;
  areas_to_improve: string[];
  evaluation_confidence: number;
};

/** Server-side only: writes the AI pipeline's output. Called once per submission. */
export async function insertQuestionsAndEvaluations(
  supabase: Client,
  submissionId: string,
  questions: InsertableQuestion[]
): Promise<void> {
  const { data: insertedQuestions, error: qError } = await supabase
    .from("questions")
    .insert(
      questions.map((q) => ({
        submission_id: submissionId,
        question_number: q.question_number,
        question_text: q.question_text,
        student_answer: q.student_answer,
        expected_answer: q.expected_answer,
        keywords: q.keywords as unknown as Database["public"]["Tables"]["questions"]["Insert"]["keywords"],
        features: q.features as unknown as Database["public"]["Tables"]["questions"]["Insert"]["features"],
        context: q.context as unknown as Database["public"]["Tables"]["questions"]["Insert"]["context"],
        extraction_confidence: q.extraction_confidence,
      }))
    )
    .select("id, question_number");
  if (qError) throw qError;

  const byNumber = new Map((insertedQuestions ?? []).map((q) => [q.question_number, q.id]));

  const { error: eError } = await supabase.from("evaluations").insert(
    questions.map((q) => ({
      question_id: byNumber.get(q.question_number)!,
      is_correct: q.is_correct,
      score: q.score,
      error_type: q.error_type,
      concept_issue: q.concept_issue,
      reasoning: q.reasoning,
      areas_to_improve: q.areas_to_improve as unknown as Database["public"]["Tables"]["evaluations"]["Insert"]["areas_to_improve"],
      evaluation_confidence: q.evaluation_confidence,
    }))
  );
  if (eError) throw eError;
}

export async function updateSubmissionStatus(
  supabase: Client,
  id: string,
  patch: { status: Database["public"]["Tables"]["submissions"]["Row"]["status"]; overallScore?: number; errorMessage?: string }
): Promise<void> {
  const { error } = await supabase
    .from("submissions")
    .update({
      status: patch.status,
      overall_score: patch.overallScore ?? null,
      error_message: patch.errorMessage ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function markSubmissionReviewed(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("submissions").update({ status: "completed" }).eq("id", id);
  if (error) throw error;
}

export async function linkSubmissionToProfile(
  supabase: Client,
  submissionId: string,
  classroomId: string,
  studentId: string
): Promise<void> {
  const { error } = await supabase
    .from("submissions")
    .update({
      classroom_id: classroomId,
      student_id: studentId,
      status: "completed",
      saved_to_profile_at: new Date().toISOString(),
    })
    .eq("id", submissionId);
  if (error) throw error;
}
/** 0-or-1 correction per evaluation (unique constraint) — upsert, not insert. */
export async function upsertTeacherCorrection(
  supabase: Client,
  evaluationId: string,
  teacherId: string,
  correction: QuestionResult
): Promise<void> {
  const { error } = await supabase.from("teacher_corrections").upsert(
    {
      evaluation_id: evaluationId,
      teacher_id: teacherId,
      corrected_is_correct: correction.isCorrect,
      corrected_score: correction.score,
      corrected_error_type: correction.errorType,
      corrected_reasoning: correction.reasoning,
      corrected_areas_to_improve:
        correction.areasToImprove as unknown as Database["public"]["Tables"]["teacher_corrections"]["Insert"]["corrected_areas_to_improve"],
    },
    { onConflict: "evaluation_id" }
  );
  if (error) throw error;
}

/** Looks up the evaluation row id for a given question id (needed before upserting a correction). */
export async function getEvaluationIdForQuestion(supabase: Client, questionId: string): Promise<string | null> {
  const { data, error } = await supabase.from("evaluations").select("id").eq("question_id", questionId).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
