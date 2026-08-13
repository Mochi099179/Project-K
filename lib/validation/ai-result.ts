import { z } from "zod";

export const aiQuestionSchema = z.object({
  question: z.string(),
  student_answer: z.string(),
  expected_answer: z.string(),
  keywords: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  context: z.array(z.string()).default([]),
  extraction_confidence: z.number().min(0).max(1).default(0.8),
  is_correct: z.boolean(),
  score: z.number().min(0).max(1).default(0),
  error_type: z.string().default(""),
  concept_issue: z.string().default(""),
  reasoning: z.string().default(""),
  areas_to_improve: z.array(z.string()).default([]),
  evaluation_confidence: z.number().min(0).max(1).default(0.8),
});

export const aiCheckResultSchema = z.object({
  questions: z.array(aiQuestionSchema).min(1, "AI ไม่พบข้อคำถามในเอกสาร"),
});

export type AiQuestion = z.infer<typeof aiQuestionSchema>;
export type AiCheckResult = z.infer<typeof aiCheckResultSchema>;
