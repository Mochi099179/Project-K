import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { aiCheckResultSchema } from "@/lib/validation/ai-result";
import { asFileRef, asFileRefList } from "@/lib/data/mappers";
import { insertQuestionsAndEvaluations, updateSubmissionStatus, type InsertableQuestion } from "@/lib/data/submissions";

type AllowedMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function mediaTypeFromName(name: string): AllowedMediaType {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

const questionSchema = {
  type: "object",
  properties: {
    question: { type: "string", description: "โจทย์ข้อนี้ ถอดจากเอกสารให้ครบถ้วน" },
    student_answer: { type: "string", description: "คำตอบที่นักเรียนเขียน ถอดจากลายมือให้ตรงที่สุด" },
    expected_answer: { type: "string", description: "คำตอบที่ถูกต้องตามเฉลย" },
    keywords: { type: "array", items: { type: "string" }, description: "คำสำคัญของโจทย์ข้อนี้ เช่น หัวข้อ/สกิลที่เกี่ยวข้อง" },
    features: { type: "array", items: { type: "string" }, description: "คุณลักษณะของโจทย์ เช่น multi_step, word_problem" },
    context: { type: "array", items: { type: "string" }, description: "บริบท เช่น วิชา ระดับชั้น บทเรียน" },
    extraction_confidence: {
      type: "number",
      description: "0-1 ความมั่นใจว่าอ่าน/แยกโจทย์และคำตอบออกมาถูกต้อง (ไม่เกี่ยวกับว่าคำตอบถูกหรือผิด)",
    },
    is_correct: { type: "boolean", description: "คำตอบนักเรียนถูกต้องหรือไม่ เทียบกับเฉลย" },
    score: { type: "number", description: "คะแนนข้อนี้ 0 ถึง 1" },
    error_type: { type: "string", description: "ประเภทของข้อผิดพลาด ถ้าตอบผิด เช่น 'คำนวณผิดพลาด', 'เข้าใจแนวคิดผิด' ถ้าตอบถูกให้เป็นค่าว่าง" },
    concept_issue: { type: "string", description: "concept ที่นักเรียนยังไม่เข้าใจ ถ้ามี ไม่งั้นเป็นค่าว่าง" },
    reasoning: { type: "string", description: "เหตุผล/หลักฐานประกอบการตรวจข้อนี้ อธิบายสั้นๆ เป็นภาษาไทย" },
    areas_to_improve: { type: "array", items: { type: "string" }, description: "สิ่งที่ควรเสริมสำหรับข้อนี้ ถ้าตอบถูกให้เป็น []" },
    evaluation_confidence: { type: "number", description: "0-1 ความมั่นใจของ AI ในผลการตรวจและวิเคราะห์ข้อนี้" },
  },
  required: [
    "question", "student_answer", "expected_answer", "keywords", "features", "context",
    "extraction_confidence", "is_correct", "score", "error_type", "concept_issue",
    "reasoning", "areas_to_improve", "evaluation_confidence",
  ],
  additionalProperties: false,
} as const;

function imageBlock(base64: string, mediaType: AllowedMediaType) {
  return { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: base64 } };
}

async function downloadAsBase64(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  bucket: string,
  path: string
): Promise<{ base64: string; mediaType: AllowedMediaType } | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return { base64: Buffer.from(arrayBuffer).toString("base64"), mediaType: mediaTypeFromName(path) };
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { submissionId } = (await req.json()) as { submissionId?: string };
  if (!submissionId) {
    return NextResponse.json({ error: "missing submissionId" }, { status: 400 });
  }

  // RLS already scopes this to the caller's own rows; the owner_id check is defense in depth.
  const { data: submission, error: fetchError } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (fetchError || !submission) {
    return NextResponse.json({ error: "ไม่พบคำขอตรวจนี้" }, { status: 404 });
  }

  const exerciseFileRefs = asFileRefList(submission.exercise_files);
  const answerKeyFileRef = asFileRef(submission.answer_key_file);

  const exerciseImages = (
    await Promise.all(exerciseFileRefs.map((f) => downloadAsBase64(supabase, "submissions", f.storage_path)))
  ).filter((img): img is { base64: string; mediaType: AllowedMediaType } => img !== null);

  if (exerciseImages.length === 0) {
    await updateSubmissionStatus(supabase, submissionId, { status: "failed", errorMessage: "ไม่พบไฟล์แบบฝึกหัดของนักเรียน" });
    return NextResponse.json({ error: "ไม่พบไฟล์แบบฝึกหัดของนักเรียน" }, { status: 400 });
  }

  const answerKeyImage = answerKeyFileRef ? await downloadAsBase64(supabase, "submissions", answerKeyFileRef.storage_path) : null;

  if (!submission.answer_key_text?.trim() && !answerKeyImage) {
    await updateSubmissionStatus(supabase, submissionId, { status: "failed", errorMessage: "ไม่มีเฉลยแนบมา" });
    return NextResponse.json({ error: "กรุณาแนบเฉลย" }, { status: 400 });
  }

  await updateSubmissionStatus(supabase, submissionId, { status: "evaluating" });

  const contextLines = [
    `Student ID: ${submission.student_code}`,
    submission.topic ? `หัวข้อ/บทเรียน: ${submission.topic}` : null,
    submission.teaching_materials_text?.trim() ? `สื่อ/บันทึกการสอนที่เกี่ยวข้อง:\n${submission.teaching_materials_text.trim()}` : null,
    submission.answer_key_text?.trim() ? `เฉลย/เกณฑ์การให้คะแนน (ข้อความ):\n${submission.answer_key_text.trim()}` : null,
  ].filter(Boolean);

  const instructions = [
    "คุณกำลังตรวจแบบฝึกหัดของนักเรียนให้ครูคนหนึ่ง",
    "ภาพแรกๆ ที่แนบมา (ถ้ามีมากกว่า 1 ภาพ) คือหน้าแบบฝึกหัดของนักเรียนที่เขียนด้วยลายมือ ให้อ่านทุกหน้าประกอบกัน",
    answerKeyImage ? "ภาพสุดท้ายที่แนบมาคือรูปเฉลย ให้ใช้ประกอบการตรวจด้วย" : null,
    "",
    "ทำตามลำดับนี้อย่างเคร่งครัด:",
    "1. อ่านลายมือนักเรียนและแยกออกเป็นข้อๆ โดยให้โจทย์และคำตอบของนักเรียนอยู่ใน block เดียวกันเสมอ ห้ามแยกเป็นคนละ entity",
    "2. สำหรับแต่ละข้อ ให้ประเมินโดยพิจารณาจากโจทย์ คำตอบนักเรียน เฉลย และสื่อการสอน/บริบทที่ให้มาประกอบกัน ไม่ใช่ดูแค่เฉลยอย่างเดียว",
    "3. แยกความมั่นใจสองแบบให้ชัดเจน: extraction_confidence (มั่นใจแค่ไหนว่าถอดโจทย์/คำตอบถูกต้อง) กับ evaluation_confidence (มั่นใจแค่ไหนว่าผลตรวจถูกต้อง) ห้ามใช้ค่าเดียวกันปนกัน",
    "4. ถ้าตอบผิด ให้วิเคราะห์ให้ลึกกว่าผิด/ถูก — บอกประเภทข้อผิดพลาด แนวคิดที่ยังไม่เข้าใจ เหตุผลประกอบ และสิ่งที่ควรเสริม",
    "5. เขียนทุกอย่างเป็นภาษาไทย กระชับ เข้าใจง่ายสำหรับครู",
  ]
    .filter(Boolean)
    .join("\n");

  let rawResult: unknown;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      output_config: {
        effort: "medium",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { questions: { type: "array", items: questionSchema } },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            ...exerciseImages.map((img) => imageBlock(img.base64, img.mediaType)),
            ...(answerKeyImage ? [imageBlock(answerKeyImage.base64, answerKeyImage.mediaType)] : []),
            { type: "text", text: [contextLines.join("\n\n"), "", instructions].join("\n") },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("โมเดลไม่ได้ตอบกลับเป็นข้อความ");
    rawResult = JSON.parse(textBlock.text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเรียก AI";
    await updateSubmissionStatus(supabase, submissionId, { status: "failed", errorMessage: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // AI-generated JSON is never trusted directly — validate before it touches the database.
  const parsed = aiCheckResultSchema.safeParse(rawResult);
  if (!parsed.success) {
    const message = "ผลลัพธ์จาก AI ไม่ตรงตามรูปแบบที่กำหนด";
    await updateSubmissionStatus(supabase, submissionId, { status: "failed", errorMessage: message });
    return NextResponse.json({ error: message, details: parsed.error.flatten() }, { status: 502 });
  }

  const insertable: InsertableQuestion[] = parsed.data.questions.map((q, idx) => ({
    question_number: idx + 1,
    question_text: q.question,
    student_answer: q.student_answer,
    expected_answer: q.expected_answer,
    keywords: q.keywords,
    features: q.features,
    context: q.context,
    extraction_confidence: q.extraction_confidence,
    is_correct: q.is_correct,
    score: q.score,
    error_type: q.error_type,
    concept_issue: q.concept_issue,
    reasoning: q.reasoning,
    areas_to_improve: q.areas_to_improve,
    evaluation_confidence: q.evaluation_confidence,
  }));

  try {
    await insertQuestionsAndEvaluations(supabase, submissionId, insertable);
  } catch (err) {
    const message = err instanceof Error ? err.message : "บันทึกผลตรวจไม่สำเร็จ";
    await updateSubmissionStatus(supabase, submissionId, { status: "failed", errorMessage: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const correctCount = insertable.filter((q) => q.is_correct).length;
  const overallScore = insertable.length ? Math.round((correctCount / insertable.length) * 100) : 0;
  await updateSubmissionStatus(supabase, submissionId, { status: "review_required", overallScore });

  return NextResponse.json({ ok: true, submissionId, overallScore });
}
