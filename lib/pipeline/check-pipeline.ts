import type { SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import type { Database } from "@/lib/supabase/database.types";
import { buildCheckingContext } from "./check-context";
import { recognizeHandwriting } from "@/lib/ai/ocr";
import { analyzeAnswers } from "@/lib/ai/answer-analysis";
import { batchUploadedFiles, joinOcrPages } from "@/lib/ai/batching";
import type { OcrPage } from "@/lib/validation/ai-result";
import {
  getSubmissionRow,
  insertOcrResult,
  getLatestOcrResult,
  replaceQuestionsWithAnalysis,
  updateSubmissionStatus,
  type InsertableAnalysisQuestion,
} from "@/lib/data/submissions";

type Client = SupabaseClient<Database>;
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

export type StageOutcome = { ok: true } | { ok: false; error: string };

const handwritingProvider = () => process.env.HANDWRITING_AI_PROVIDER || "anthropic";
const handwritingModel = () => process.env.HANDWRITING_AI_MODEL || "claude-sonnet-5";

/** Translates the AI SDK's own error shapes into a message a teacher can act on, when we recognize the cause. */
function friendlyAiErrorMessage(err: unknown): string | null {
  if (!(err instanceof Anthropic.APIError)) return null;
  if (err.status === 413) {
    return "ไฟล์ที่แนบมามีขนาดใหญ่เกินไปสำหรับ AI ประมวลผล กรุณาลดจำนวนหน้า/ขนาดไฟล์ หรือบีบอัดรูปภาพก่อนอัปโหลดใหม่";
  }
  if (err.status === 429 || err.type === "rate_limit_error") {
    return "ระบบ AI มีคำขอเข้ามาเยอะในขณะนี้ กรุณาลองใหม่อีกครั้งในอีกสักครู่";
  }
  return null;
}

/**
 * Stage 1 — Handwriting recognition (OCR). Reads the student's uploaded work
 * and persists an `ocr_results` row. Never writes `questions`: a generic OCR
 * provider has no concept of question boundaries, so there's nothing
 * question-shaped to save yet — that mapping is Stage 2's job.
 */
export async function runOcrStage(supabase: Client, ownerId: string, submission: SubmissionRow): Promise<StageOutcome> {
  const contextResult = await buildCheckingContext(supabase, submission);
  if (!contextResult.ok) {
    await updateSubmissionStatus(supabase, submission.id, { status: "failed", errorMessage: contextResult.error });
    return { ok: false, error: contextResult.error };
  }
  const context = contextResult.context;

  await updateSubmissionStatus(supabase, submission.id, { status: "processing" });

  try {
    // 1 file = 1 page is the contract recognizeHandwriting's prompt relies on
    // (see lib/ai/ocr.ts) — batching must preserve that within each
    // request while still producing sequential page numbers across ALL of
    // them once merged, hence the running offset below.
    const batches = batchUploadedFiles(context.studentWorkFiles);
    let pageOffset = 0;
    const mergedPages: OcrPage[] = [];
    const rawResponses: unknown[] = [];
    let provider = handwritingProvider();
    let model = handwritingModel();

    for (const batch of batches) {
      const recognition = await recognizeHandwriting({ studentWorkFiles: batch, contextLines: context.contextLines });
      provider = recognition.provider;
      model = recognition.model;
      rawResponses.push(recognition.raw);
      for (const page of recognition.normalized.pages) {
        mergedPages.push({ ...page, page_number: pageOffset + page.page_number });
      }
      pageOffset += batch.length;
    }

    await insertOcrResult(supabase, {
      submissionId: submission.id,
      ownerId,
      provider,
      model,
      rawResponse: batches.length > 1 ? rawResponses : rawResponses[0],
      normalizedResult: { pages: mergedPages },
      status: "completed",
    });

    await updateSubmissionStatus(supabase, submission.id, { status: "ocr_completed" });
    return { ok: true };
  } catch (err) {
    console.error(`[check-pipeline] OCR stage failed for submission ${submission.id}:`, err);
    const message = friendlyAiErrorMessage(err) ?? (err instanceof Error ? err.message : "อ่านลายมือไม่สำเร็จ");
    // Preserve the failure for debugging even though there's no successful normalized result.
    await insertOcrResult(supabase, {
      submissionId: submission.id,
      ownerId,
      provider: handwritingProvider(),
      model: handwritingModel(),
      rawResponse: { error: message },
      normalizedResult: { pages: [] },
      status: "failed",
      errorMessage: message,
    });
    await updateSubmissionStatus(supabase, submission.id, { status: "ocr_failed", errorMessage: message });
    return { ok: false, error: message };
  }
}

/**
 * Stage 2 — Answer analysis. Reads the most recent successful OCR result
 * (or the teacher's correction of it, if set) and, in one pass, segments the
 * text into questions AND grades them — never re-downloads or re-sends the
 * student's original handwriting file.
 */
export async function runAnalysisStage(supabase: Client, submission: SubmissionRow): Promise<StageOutcome> {
  const contextResult = await buildCheckingContext(supabase, submission);
  if (!contextResult.ok) {
    await updateSubmissionStatus(supabase, submission.id, { status: "failed", errorMessage: contextResult.error });
    return { ok: false, error: contextResult.error };
  }
  const context = contextResult.context;

  const ocrResult = await getLatestOcrResult(supabase, submission.id);
  if (!ocrResult || ocrResult.status !== "completed") {
    const error = "ยังไม่มีผลอ่านลายมือที่สำเร็จสำหรับคำขอตรวจนี้ กรุณาอ่านลายมือก่อน";
    await updateSubmissionStatus(supabase, submission.id, { status: "analysis_failed", errorMessage: error });
    return { ok: false, error };
  }

  const normalized = ocrResult.normalized_result as unknown as { pages?: { page_number: number; content: string }[] };
  const ocrText = ocrResult.teacher_corrected_text?.trim() || joinOcrPages(normalized?.pages ?? []);
  if (!ocrText.trim()) {
    const error = "ผลอ่านลายมือว่างเปล่า จึงยังวิเคราะห์คำตอบไม่ได้";
    await updateSubmissionStatus(supabase, submission.id, { status: "analysis_failed", errorMessage: error });
    return { ok: false, error };
  }

  await updateSubmissionStatus(supabase, submission.id, { status: "evaluating" });

  try {
    const analysis = await analyzeAnswers({
      ocrText,
      referenceExerciseBlock: context.referenceExerciseBlock,
      answerKeyBlock: context.answerKeyBlock,
      answerKeyText: context.answerKeyText,
      scoringCriteria: context.scoringCriteria,
      materialsText: context.materialsText,
      contextLines: context.contextLines,
    });

    const insertable: InsertableAnalysisQuestion[] = analysis.normalized.questions.map((q) => ({
      question_number: q.question_number,
      question_text: q.question_text,
      student_answer: q.student_answer,
      expected_answer: q.expected_answer,
      keywords: q.keywords,
      extraction_confidence: q.extraction_confidence,
      ocr_uncertain: q.uncertain,
      ocr_alternatives: q.alternatives,
      is_correct: q.is_correct,
      score: q.score,
      error_type: q.error_type,
      concept_issue: q.concept_issue,
      reasoning: q.reasoning,
      areas_to_improve: q.areas_to_improve,
      evaluation_confidence: q.evaluation_confidence,
      needs_review: q.needs_review,
      review_reason: q.review_reason,
    }));

    await replaceQuestionsWithAnalysis(supabase, submission.id, insertable);

    const correctCount = insertable.filter((q) => q.is_correct).length;
    const overallScore = insertable.length ? Math.round((correctCount / insertable.length) * 100) : 0;
    await updateSubmissionStatus(supabase, submission.id, { status: "review_required", overallScore });
    return { ok: true };
  } catch (err) {
    console.error(`[check-pipeline] Analysis stage failed for submission ${submission.id}:`, err);
    const message = friendlyAiErrorMessage(err) ?? (err instanceof Error ? err.message : "วิเคราะห์คำตอบไม่สำเร็จ");
    await updateSubmissionStatus(supabase, submission.id, { status: "analysis_failed", errorMessage: message });
    return { ok: false, error: message };
  }
}

/**
 * Fresh submission: OCR, then auto-chain into Analysis on success — matches
 * the app's existing one-shot Check UX. Callers pass an already
 * ownership-verified submission row (see app/api/process-check/route.ts).
 */
export async function runFullPipeline(supabase: Client, ownerId: string, submission: SubmissionRow): Promise<StageOutcome> {
  const ocrOutcome = await runOcrStage(supabase, ownerId, submission);
  if (!ocrOutcome.ok) return ocrOutcome;

  const refreshed = await getSubmissionRow(supabase, submission.id);
  if (!refreshed) return { ok: false, error: "ไม่พบคำขอตรวจนี้" };
  return runAnalysisStage(supabase, refreshed);
}
