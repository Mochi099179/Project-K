import Anthropic from "@anthropic-ai/sdk";
import { analysisResultSchema, type AnalysisResult } from "@/lib/validation/ai-result";
import type { ContentBlock } from "./content-blocks";

// ============================================================================
// Answer Analysis AI — segments AND grades.
//
// Receives raw OCR text (page-level, unsegmented — see lib/ai/handwriting.ts)
// plus the exercise/answer key/scoring criteria/teaching materials. Because a
// generic OCR provider has no understanding of the exercise, it can't map
// "this text" to "question 3" — only something that understands the exercise
// can, so that mapping happens here, in the same call that grades. Never
// receives the student's raw handwritten image.
//
// Configured the same way as lib/ai/handwriting.ts, under separate env vars
// so the two stages can use different providers/models if needed:
//   ANSWER_ANALYSIS_AI_PROVIDER / _MODEL / _API_KEY — all default to the
//   same Anthropic credentials as the rest of the app (ANTHROPIC_API_KEY).
// Server-side only — never import this from a "use client" file.
// ============================================================================

export type AnswerAnalysisInput = {
  /** OCR reading to grade against (page text joined, or the teacher's corrected version — decided by the caller). */
  ocrText: string;
  referenceExerciseBlock?: ContentBlock | null;
  answerKeyBlock?: ContentBlock | null;
  answerKeyText?: string | null;
  scoringCriteria?: string | null;
  contextLines: string[]; // student id, topic, teaching materials note, etc.
};

export type AnswerAnalysisResult = {
  provider: string;
  model: string;
  raw: unknown;
  normalized: AnalysisResult;
};

const analysisQuestionJsonSchema = {
  type: "object",
  properties: {
    question_number: { type: "integer", description: "เลขข้อ ตามที่ปรากฏในแบบฝึกหัด" },
    question_text: { type: "string", description: "โจทย์ข้อนี้ ถอดจากแบบฝึกหัดต้นฉบับ/เฉลยให้ครบถ้วน" },
    student_answer: {
      type: "string",
      description: "ส่วนของข้อความ OCR ที่เป็นคำตอบของนักเรียนสำหรับข้อนี้ ถอดตามที่ระบบอ่านได้ ห้ามแก้ไขเนื้อหาเอง",
    },
    expected_answer: { type: "string", description: "คำตอบที่ถูกต้องของข้อนี้ ตามเฉลย" },
    keywords: { type: "array", items: { type: "string" }, description: "คำสำคัญของโจทย์ข้อนี้ เช่น หัวข้อ/สกิลที่เกี่ยวข้อง" },
    extraction_confidence: {
      type: "number",
      description: "0-1 ความมั่นใจว่าข้อความ OCR ส่วนนี้คือคำตอบของข้อนี้จริง และถอดมาได้ถูกต้อง",
    },
    uncertain: { type: "boolean", description: "true ถ้าข้อความ OCR ของข้อนี้ไม่ชัดเจน อ่านได้มากกว่าหนึ่งแบบ หรือระบุไม่ได้ว่าเป็นคำตอบข้อไหนแน่" },
    alternatives: { type: "array", items: { type: "string" }, description: "คำตอบทางเลือกอื่นที่อาจเป็นไปได้ ถ้า uncertain=true" },
    is_correct: { type: "boolean", description: "คำตอบนักเรียนถูกต้องหรือไม่ เทียบกับเฉลย" },
    score: { type: "number", description: "คะแนนข้อนี้ 0 ถึง 1" },
    error_type: { type: "string", description: "ประเภทของข้อผิดพลาด ถ้าตอบผิด เช่น 'คำนวณผิดพลาด', 'เข้าใจแนวคิดผิด' ถ้าตอบถูกให้เป็นค่าว่าง" },
    concept_issue: { type: "string", description: "concept ที่นักเรียนยังไม่เข้าใจ ถ้ามี ไม่งั้นเป็นค่าว่าง" },
    reasoning: { type: "string", description: "เหตุผล/หลักฐานประกอบการตรวจข้อนี้ อธิบายสั้นๆ เป็นภาษาไทย" },
    areas_to_improve: { type: "array", items: { type: "string" }, description: "สิ่งที่ควรเสริมสำหรับข้อนี้ ถ้าตอบถูกให้เป็น []" },
    evaluation_confidence: { type: "number", description: "0-1 ความมั่นใจของ AI ในผลการตรวจและวิเคราะห์ข้อนี้" },
    needs_review: {
      type: "boolean",
      description: "true ถ้าข้อความ OCR ที่ได้รับมาไม่ชัดเจนจนไม่ควรฟันธงผลโดยไม่ให้ครูตรวจสอบก่อน",
    },
    review_reason: { type: "string", description: "เหตุผลที่ต้องให้ครูตรวจสอบ ถ้า needs_review=true ไม่งั้นเป็นค่าว่าง" },
  },
  required: [
    "question_number", "question_text", "student_answer", "expected_answer", "keywords",
    "extraction_confidence", "uncertain", "alternatives",
    "is_correct", "score", "error_type", "concept_issue",
    "reasoning", "areas_to_improve", "evaluation_confidence", "needs_review", "review_reason",
  ],
  additionalProperties: false,
} as const;

async function analyzeWithAnthropic(input: AnswerAnalysisInput): Promise<AnswerAnalysisResult> {
  const apiKey = process.env.ANSWER_ANALYSIS_AI_API_KEY || process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANSWER_ANALYSIS_AI_MODEL || "claude-sonnet-5";
  const client = new Anthropic({ apiKey });

  const contextLines = [
    ...input.contextLines,
    `ข้อความที่ระบบ OCR อ่านได้จากงานของนักเรียน (ยังไม่ได้แบ่งเป็นข้อๆ):\n${input.ocrText}`,
    input.answerKeyText ? `เฉลย/เกณฑ์การให้คะแนน (ข้อความ):\n${input.answerKeyText}` : null,
    input.scoringCriteria?.trim()
      ? `เกณฑ์การให้คะแนน (Scoring Criteria) — ใช้เกณฑ์นี้ในการให้คะแนนแต่ละข้ออย่างเคร่งครัด:\n${input.scoringCriteria.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const instructions = [
    "คุณคือระบบวิเคราะห์และตรวจคำตอบ (Answer Analysis) ให้ครูคนหนึ่ง",
    "คุณไม่ได้เห็นภาพลายมือต้นฉบับของนักเรียน — คุณได้รับเฉพาะข้อความดิบที่ระบบ OCR อ่านได้ (ยังไม่ได้แบ่งว่าส่วนไหนเป็นคำตอบข้อไหน)",
    input.referenceExerciseBlock ? "ไฟล์ที่แนบมาคือแบบฝึกหัดต้นฉบับ ใช้ระบุว่าข้อความ OCR แต่ละส่วนตรงกับข้อไหน" : null,
    input.answerKeyBlock ? "ไฟล์ที่แนบมาอีกไฟล์คือเฉลย ใช้ประกอบการตรวจ" : null,
    "",
    "ทำตามลำดับนี้อย่างเคร่งครัด:",
    "1. อ่านแบบฝึกหัดต้นฉบับเพื่อทราบว่ามีกี่ข้อ แต่ละข้อคือโจทย์อะไร",
    "2. จับคู่ข้อความ OCR แต่ละส่วนเข้ากับข้อที่ตรงกัน โดยพิจารณาลำดับ เนื้อหา และบริบท — ถ้าจับคู่ไม่ได้แน่ชัดหรือข้อความ OCR ของข้อนั้นดูสับสน ให้ uncertain=true พร้อมระบุ alternatives ถ้ามี",
    "3. สำหรับแต่ละข้อ ให้ประเมินโดยพิจารณาจากโจทย์ คำตอบนักเรียนที่จับคู่ได้ เฉลย และบริบทที่ให้มาประกอบกัน พร้อมระบุ expected_answer จากเฉลย",
    input.scoringCriteria?.trim() ? "3b. มีเกณฑ์การให้คะแนน (Scoring Criteria) แนบมาด้วย ต้องใช้เกณฑ์นี้ในการคำนวณ score ของแต่ละข้อ ห้ามใช้ดุลยพินิจแทน" : null,
    "4. ข้อไหนที่ข้อความ OCR ไม่ชัดเจนหรือจับคู่ข้อไม่ได้แน่ชัด ห้ามฟันธงผลราวกับว่าคำตอบที่ได้มาถูกต้องแน่นอน — ให้ตั้ง needs_review=true พร้อมอธิบายเหตุผลใน review_reason ถึงจะยังคงต้องประเมิน is_correct/score ตามข้อมูลที่มีเป็น best-effort ก็ตาม",
    "5. ถ้าตอบผิด ให้วิเคราะห์ให้ลึกกว่าผิด/ถูก — บอกประเภทข้อผิดพลาด แนวคิดที่ยังไม่เข้าใจ เหตุผลประกอบ และสิ่งที่ควรเสริม",
    "6. เขียนทุกอย่างเป็นภาษาไทย กระชับ เข้าใจง่ายสำหรับครู",
  ]
    .filter(Boolean)
    .join("\n");

  // A flat cap (previously 4000) truncates mid-JSON on any exercise with
  // substantial content — the same failure mode fixed in
  // lib/ai/handwriting.ts. Unlike OCR (roughly 1 page in, 1 transcript out),
  // grading output doesn't scale simply with input length: each question
  // expands into many verbose Thai fields (question_text, reasoning,
  // areas_to_improve, ...) regardless of how short the student's answer was,
  // so a length-derived budget was measured to still undershoot real
  // content. Generous and flat instead — tokens are billed by what the model
  // actually generates, not by this ceiling, so there's no cost/latency
  // downside to leaving headroom. Streamed for the same reason as OCR: past
  // a certain max_tokens the SDK refuses a plain (non-streaming) request
  // outright ("Streaming is required for operations that may take longer
  // than 10 minutes").
  const maxTokens = 48_000;

  const response = await client.messages
    .stream({
      model,
      max_tokens: maxTokens,
      output_config: {
        effort: "medium",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { questions: { type: "array", items: analysisQuestionJsonSchema } },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            ...(input.referenceExerciseBlock ? [input.referenceExerciseBlock] : []),
            ...(input.answerKeyBlock ? [input.answerKeyBlock] : []),
            { type: "text", text: [contextLines, "", instructions].join("\n") },
          ],
        },
      ],
    })
    .finalMessage();

  if (response.stop_reason === "max_tokens") {
    throw new Error("ผลการวิเคราะห์ยาวเกินกว่าที่ระบบจะประมวลผลได้ในครั้งเดียว กรุณาลองใหม่ หรือแบ่งงานของนักเรียนให้มีจำนวนหน้าน้อยลง");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Answer Analysis AI ไม่ได้ตอบกลับเป็นข้อความ");

  const rawJson = JSON.parse(textBlock.text);
  const parsed = analysisResultSchema.safeParse(rawJson);
  if (!parsed.success) throw new Error("ผลลัพธ์จาก Answer Analysis AI ไม่ตรงตามรูปแบบที่กำหนด");

  return { provider: "anthropic", model, raw: rawJson, normalized: parsed.data };
}

export async function analyzeAnswers(input: AnswerAnalysisInput): Promise<AnswerAnalysisResult> {
  const provider = process.env.ANSWER_ANALYSIS_AI_PROVIDER || "anthropic";
  switch (provider) {
    case "anthropic":
      return analyzeWithAnthropic(input);
    default:
      throw new Error(`ไม่รองรับ Answer Analysis AI provider: "${provider}"`);
  }
}
