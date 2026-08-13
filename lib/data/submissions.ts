import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { Check, CheckOcrResult, CheckQuestion, CheckStatus, ExerciseFileRef, FileKind, QuestionResult } from "@/lib/types";
import { inferFileKind } from "@/lib/files";
import { asFileRefList, asStringArray, type StoredFileRef } from "./mappers";

type Client = SupabaseClient<Database>;
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type EvaluationRow = Database["public"]["Tables"]["evaluations"]["Row"];
type CorrectionRow = Database["public"]["Tables"]["teacher_corrections"]["Row"];
type OcrResultRow = Database["public"]["Tables"]["ocr_results"]["Row"];

// ----------------------------------------------------------------------------
// Reconstructing DB rows into the app's Check/CheckQuestion shape. Once built,
// these feed straight into the SAME components/lib/analysis.ts logic that
// already existed before this migration — no downstream code needed to change.
// ----------------------------------------------------------------------------

/**
 * The DB's submission_status enum is more granular than the app's CheckStatus.
 * "failed" = a pre-flight validation error (no answer key attached, unreadable
 * file type) — neither AI stage ever ran. "ocr_failed"/"analysis_failed" mean
 * exactly one stage failed, so the UI can offer the matching retry action.
 */
function toCheckStatus(dbStatus: SubmissionRow["status"]): CheckStatus {
  switch (dbStatus) {
    case "failed":
      return "failed";
    case "ocr_failed":
      return "ocr_failed";
    case "analysis_failed":
      return "analysis_failed";
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
    needsReview: evaluation.needs_review,
    reviewReason: evaluation.review_reason,
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
    needsReview: false, // the teacher has already reviewed it — that's what a correction means
    reviewReason: "",
  };
}

function toCheckOcrResult(row: OcrResultRow): CheckOcrResult {
  const normalized = row.normalized_result as unknown as { pages?: { page_number: number; content: string; confidence?: number | null }[] };
  return {
    id: row.id,
    status: row.status,
    provider: row.provider,
    pages: Array.isArray(normalized?.pages)
      ? normalized.pages.map((p) => ({ pageNumber: p.page_number, content: p.content, confidence: p.confidence ?? null }))
      : [],
    teacherCorrectedText: row.teacher_corrected_text,
    createdAt: row.created_at,
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
 * Fetches questions/evaluations/teacher_corrections/ocr_results for a set of
 * submissions with flat queries (rather than a deeply-nested PostgREST
 * embed) and joins them in memory — more predictable to type and reason
 * about than relying on embed cardinality inference.
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

  const { data: ocrResults, error: oError } = await supabase
    .from("ocr_results")
    .select("*")
    .in("submission_id", submissionIds)
    .order("created_at", { ascending: false });
  if (oError) throw oError;

  const latestOcrBySubmission = new Map<string, OcrResultRow>();
  for (const row of ocrResults ?? []) {
    if (!latestOcrBySubmission.has(row.submission_id)) latestOcrBySubmission.set(row.submission_id, row); // already sorted newest-first
  }

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
          questionNumber: q.question_number,
          question: q.question_text,
          studentAnswer: q.student_answer,
          expectedAnswer: q.expected_answer,
          keywords: asStringArray(q.keywords),
          extractionConfidence: q.extraction_confidence,
          ocrUncertain: q.ocr_uncertain,
          ocrAlternatives: asStringArray(q.ocr_alternatives),
          ai: evaluation
            ? toQuestionResult(evaluation)
            : {
                isCorrect: false,
                score: 0,
                errorType: "",
                conceptIssue: "",
                reasoning: "",
                areasToImprove: [],
                evaluationConfidence: 0,
                needsReview: true,
                reviewReason: "ยังไม่มีผลวิเคราะห์สำหรับข้อนี้",
              },
          teacherCorrected: correction ? toTeacherResult(correction) : null,
        };
      });

      const ocrRow = latestOcrBySubmission.get(s.id);

      return {
        id: s.id,
        createdAt: s.created_at,
        status: toCheckStatus(s.status),
        studentLabel: s.student_code,
        topic: s.topic ?? undefined,
        exerciseFiles: await exerciseFileRefs(supabase, asFileRefList(s.exercise_files)),
        ocrResult: ocrRow ? toCheckOcrResult(ocrRow) : null,
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

/** Server-side only: fetches the raw submission row (pipeline stages need fields buildChecks doesn't expose). */
export async function getSubmissionRow(supabase: Client, id: string): Promise<SubmissionRow | null> {
  const { data, error } = await supabase.from("submissions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
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

export async function updateSubmissionStatus(
  supabase: Client,
  id: string,
  patch: { status: SubmissionRow["status"]; overallScore?: number; errorMessage?: string }
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

// ----------------------------------------------------------------------------
// STAGE 1 — Handwriting recognition (OCR) writes. Never writes `questions` —
// a generic OCR provider doesn't know question boundaries, so there's
// nothing question-shaped to persist yet at this stage.
// ----------------------------------------------------------------------------

export async function insertOcrResult(
  supabase: Client,
  input: {
    submissionId: string;
    ownerId: string;
    provider: string;
    model: string;
    rawResponse: unknown;
    normalizedResult: unknown;
    status: "completed" | "failed";
    errorMessage?: string;
  }
): Promise<void> {
  const { error } = await supabase.from("ocr_results").insert({
    submission_id: input.submissionId,
    owner_id: input.ownerId,
    provider: input.provider,
    model: input.model,
    raw_response: input.rawResponse as Json,
    normalized_result: input.normalizedResult as Json,
    status: input.status,
    error_message: input.errorMessage ?? null,
  });
  if (error) throw error;
}

/** The most recent OCR attempt for a submission (retries insert a new row rather than overwrite, so history is preserved). */
export async function getLatestOcrResult(supabase: Client, submissionId: string): Promise<OcrResultRow | null> {
  const { data, error } = await supabase
    .from("ocr_results")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Teacher's correction of the OCR reading (all pages combined). null clears it, falling back to the raw OCR text. */
export async function updateOcrCorrectedText(supabase: Client, ocrResultId: string, correctedText: string | null): Promise<void> {
  const { error } = await supabase.from("ocr_results").update({ teacher_corrected_text: correctedText }).eq("id", ocrResultId);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// STAGE 2 — Answer analysis writes. Segments AND grades in one pass, so
// `questions` and `evaluations` are written together here.
// ----------------------------------------------------------------------------

export type InsertableAnalysisQuestion = {
  question_number: number;
  question_text: string;
  student_answer: string;
  expected_answer: string;
  keywords: string[];
  extraction_confidence: number;
  ocr_uncertain: boolean;
  ocr_alternatives: string[];
  is_correct: boolean;
  score: number;
  error_type: string;
  concept_issue: string;
  reasoning: string;
  areas_to_improve: string[];
  evaluation_confidence: number;
  needs_review: boolean;
  review_reason: string;
};

/**
 * Replaces every `questions` (and therefore `evaluations`/corrections, via
 * cascade) row for a submission with fresh Answer Analysis output — safe on
 * both the first analysis pass and a retry.
 */
export async function replaceQuestionsWithAnalysis(
  supabase: Client,
  submissionId: string,
  questions: InsertableAnalysisQuestion[]
): Promise<void> {
  const { error: deleteError } = await supabase.from("questions").delete().eq("submission_id", submissionId);
  if (deleteError) throw deleteError;

  // Ids are generated here (not left to the DB) so evaluations can be linked
  // to their question in the same batch without a second round-trip.
  const withIds = questions.map((q) => ({ id: crypto.randomUUID(), ...q }));

  const { error: qError } = await supabase.from("questions").insert(
    withIds.map((q) => ({
      id: q.id,
      submission_id: submissionId,
      question_number: q.question_number,
      question_text: q.question_text,
      student_answer: q.student_answer,
      expected_answer: q.expected_answer,
      keywords: q.keywords as unknown as Database["public"]["Tables"]["questions"]["Insert"]["keywords"],
      extraction_confidence: q.extraction_confidence,
      ocr_uncertain: q.ocr_uncertain,
      ocr_alternatives: q.ocr_alternatives as unknown as Database["public"]["Tables"]["questions"]["Insert"]["ocr_alternatives"],
    }))
  );
  if (qError) throw qError;

  const { error: eError } = await supabase.from("evaluations").insert(
    withIds.map((q) => ({
      question_id: q.id,
      is_correct: q.is_correct,
      score: q.score,
      error_type: q.error_type,
      concept_issue: q.concept_issue,
      reasoning: q.reasoning,
      areas_to_improve: q.areas_to_improve as unknown as Database["public"]["Tables"]["evaluations"]["Insert"]["areas_to_improve"],
      evaluation_confidence: q.evaluation_confidence,
      needs_review: q.needs_review,
      review_reason: q.review_reason,
    }))
  );
  if (eError) throw eError;
}
