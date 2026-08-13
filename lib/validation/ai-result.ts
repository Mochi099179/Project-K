import { z } from "zod";

// ----------------------------------------------------------------------------
// STAGE 1 — Handwriting recognition (OCR). Provider-neutral shape: page-level
// extracted text only. A generic OCR API (e.g. AksonOCR) has no concept of
// "this is question 3" — it just reads what's on the page. Deliberately has
// NO correctness/score/error fields and NO question segmentation: those are
// the Answer Analysis AI's job. See lib/ai/handwriting.ts.
// ----------------------------------------------------------------------------
export const ocrPageSchema = z.object({
  page_number: z.number().int().min(1),
  content: z.string(), // raw extracted text for this page, exactly as the provider returned it
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export const ocrResultSchema = z.object({
  pages: z.array(ocrPageSchema).min(1, "ไม่พบข้อความที่อ่านได้จากเอกสาร"),
});

export type OcrPage = z.infer<typeof ocrPageSchema>;
export type OcrResult = z.infer<typeof ocrResultSchema>;

// ----------------------------------------------------------------------------
// STAGE 2 — Answer analysis. Receives raw OCR page text (not a pre-segmented
// question list) plus the exercise/answer key/scoring criteria, and must do
// BOTH the question segmentation ("this text is the answer to question 3")
// AND the grading — a generic OCR provider can't do the former, only
// something that understands the exercise can. Never sees the raw
// handwriting image.
// ----------------------------------------------------------------------------
export const analysisQuestionSchema = z.object({
  question_number: z.number().int(),
  question_text: z.string(), // the exercise's question, matched to this answer
  student_answer: z.string(), // the portion of the OCR text identified as this question's answer
  expected_answer: z.string().default(""),
  keywords: z.array(z.string()).default([]), // topic/skill tags for this question, e.g. for teacher browsing
  extraction_confidence: z.number().min(0).max(1), // confidence in the OCR text → this specific question mapping
  uncertain: z.boolean().default(false), // true if the OCR text for this question was garbled/ambiguous
  alternatives: z.array(z.string()).default([]),
  is_correct: z.boolean(),
  score: z.number().min(0).max(1),
  error_type: z.string().default(""),
  concept_issue: z.string().default(""),
  reasoning: z.string(),
  areas_to_improve: z.array(z.string()).default([]),
  evaluation_confidence: z.number().min(0).max(1),
  needs_review: z.boolean().default(false), // true when OCR uncertainty means this result shouldn't be trusted outright
  review_reason: z.string().default(""),
});

export const analysisResultSchema = z.object({
  questions: z.array(analysisQuestionSchema).min(1, "AI ไม่พบข้อคำถามในเอกสาร"),
});

export type AnalysisQuestion = z.infer<typeof analysisQuestionSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
