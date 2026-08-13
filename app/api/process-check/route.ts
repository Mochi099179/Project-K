import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { aiCheckResultSchema } from "@/lib/validation/ai-result";
import { asFileRef, asFileRefList, type StoredFileRef } from "@/lib/data/mappers";
import { insertQuestionsAndEvaluations, updateSubmissionStatus, type InsertableQuestion } from "@/lib/data/submissions";
import { getExerciseWithAnswerKey, listMaterialsForUnit } from "@/lib/data/homework-units";
import { inferFileKind } from "@/lib/files";
import type { FileKind } from "@/lib/types";

type AllowedImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function imageMediaType(name: string): AllowedImageMediaType {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

type DownloadedFile =
  | { kind: "image"; base64: string; mediaType: AllowedImageMediaType }
  | { kind: "pdf"; base64: string }
  | { kind: "text"; text: string }
  | { kind: "other" };

/**
 * Downloads a file from Storage and prepares it for the Claude request based on its kind.
 * "other" (e.g. .docx — a binary zip format, not plain text) is intentionally never fetched;
 * it's reported by name in the prompt instead (see unreadable-file notes below).
 */
async function downloadFile(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  bucket: string,
  path: string,
  fileName: string,
  knownKind?: FileKind
): Promise<DownloadedFile | null> {
  const kind = knownKind ?? inferFileKind(fileName);
  if (kind === "other") return { kind: "other" };

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();

  if (kind === "text") {
    return { kind: "text", text: new TextDecoder("utf-8").decode(arrayBuffer) };
  }
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  if (kind === "pdf") return { kind: "pdf", base64 };
  return { kind: "image", base64, mediaType: imageMediaType(fileName) };
}

type ContentBlock =
  | { type: "image"; source: { type: "base64"; media_type: AllowedImageMediaType; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "text"; text: string };

function contentBlockForFile(file: DownloadedFile, label: string): ContentBlock | null {
  switch (file.kind) {
    case "image":
      return { type: "image", source: { type: "base64", media_type: file.mediaType, data: file.base64 } };
    case "pdf":
      return { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.base64 } };
    case "text":
      return { type: "text", text: `[เนื้อหาไฟล์ข้อความ: ${label}]\n${file.text}` };
    case "other":
      return null;
  }
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

  const studentFileRefs = asFileRefList(submission.exercise_files);

  const downloadedStudentFiles = await Promise.all(
    studentFileRefs.map((f) => downloadFile(supabase, "submissions", f.storage_path, f.file_name, f.file_kind))
  );

  const unreadableStudentFiles: string[] = [];
  const exerciseContentBlocks: ContentBlock[] = [];
  downloadedStudentFiles.forEach((file, i) => {
    if (!file) return; // download failed — silently drop, same as before
    const block = contentBlockForFile(file, studentFileRefs[i].file_name);
    if (block) exerciseContentBlocks.push(block);
    else unreadableStudentFiles.push(studentFileRefs[i].file_name);
  });

  if (exerciseContentBlocks.length === 0) {
    const message = unreadableStudentFiles.length
      ? `ไฟล์แบบฝึกหัดที่แนบมา (${unreadableStudentFiles.join(", ")}) เป็นไฟล์ประเภทที่ยังไม่รองรับ — รองรับเฉพาะรูปภาพ, PDF และไฟล์ข้อความ (.txt, .md)`
      : "ไม่พบไฟล์แบบฝึกหัดของนักเรียน";
    await updateSubmissionStatus(supabase, submissionId, { status: "failed", errorMessage: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Two sources of reference material: a reusable Homework Unit Exercise
  // (submission.exercise_id set — teacher never re-uploaded anything), or
  // the standalone Quick Check fields uploaded directly onto this submission.
  let referenceExerciseBlock: ContentBlock | null = null;
  let answerKeyBlock: ContentBlock | null = null;
  let answerKeyFileUnreadableName: string | null = null;
  let answerKeyText = submission.answer_key_text?.trim() || null;
  let scoringCriteria: string | null = null;
  let teachingMaterialsLine: string | null = null;

  async function resolveRefFile(
    bucket: string,
    path: string | null,
    name: string | null,
    kind: FileKind | undefined,
    label: string
  ): Promise<{ block: ContentBlock | null; unreadableLabel: string | null }> {
    if (!path) return { block: null, unreadableLabel: null };
    const file = await downloadFile(supabase, bucket, path, name ?? path, kind);
    const block = file ? contentBlockForFile(file, name ?? label) : null;
    return { block, unreadableLabel: block ? null : name ? `${label}: ${name}` : null };
  }

  if (submission.exercise_id) {
    const exercise = await getExerciseWithAnswerKey(supabase, submission.exercise_id);
    if (exercise) {
      scoringCriteria = exercise.scoringCriteria;

      const [exerciseFile, answerKeyFile] = await Promise.all([
        resolveRefFile("exercises", exercise.exerciseFilePath, exercise.exerciseFileName, exercise.exerciseFileKind, "แบบฝึกหัดต้นฉบับ"),
        resolveRefFile(
          "answer-keys",
          exercise.answerKey?.filePath ?? null,
          exercise.answerKey?.fileName ?? null,
          exercise.answerKey?.fileKind,
          "ไฟล์เฉลย"
        ),
      ]);
      referenceExerciseBlock = exerciseFile.block;
      answerKeyBlock = answerKeyFile.block;
      answerKeyText = exercise.answerKey?.answerText?.trim() || null;

      const unreadableRefs = [exerciseFile.unreadableLabel, answerKeyFile.unreadableLabel].filter(
        (v): v is string => !!v
      );
      if (unreadableRefs.length) {
        teachingMaterialsLine = `หมายเหตุ: มีไฟล์อ้างอิงที่ยังอ่านเนื้อหาไม่ได้ (รองรับเฉพาะรูปภาพ/PDF/ข้อความ): ${unreadableRefs.join(", ")}`;
      }
    }
    if (submission.homework_unit_id) {
      const materials = await listMaterialsForUnit(supabase, submission.homework_unit_id);
      if (materials.length) {
        teachingMaterialsLine = [
          teachingMaterialsLine,
          `มีสื่อการสอนที่เกี่ยวข้องกับชุดแบบฝึกหัดนี้ ${materials.length} ไฟล์: ${materials.map((m) => m.name).join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n");
      }
    }
  } else {
    const answerKeyFileRef: StoredFileRef | null = asFileRef(submission.answer_key_file);
    if (answerKeyFileRef) {
      const resolved = await resolveRefFile(
        "submissions",
        answerKeyFileRef.storage_path,
        answerKeyFileRef.file_name,
        answerKeyFileRef.file_kind,
        "ไฟล์เฉลย"
      );
      answerKeyBlock = resolved.block;
      answerKeyFileUnreadableName = resolved.unreadableLabel;
    }
  }

  if (!answerKeyText && !answerKeyBlock) {
    const message = answerKeyFileUnreadableName
      ? `ไฟล์เฉลยที่แนบมา (${answerKeyFileUnreadableName}) เป็นไฟล์ประเภทที่ยังไม่รองรับ — รองรับเฉพาะรูปภาพ, PDF และไฟล์ข้อความ (.txt, .md)`
      : "กรุณาแนบเฉลย";
    await updateSubmissionStatus(supabase, submissionId, { status: "failed", errorMessage: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (unreadableStudentFiles.length) {
    teachingMaterialsLine = [
      teachingMaterialsLine,
      `หมายเหตุ: มีไฟล์งานของนักเรียนที่ยังอ่านเนื้อหาไม่ได้ (รองรับเฉพาะรูปภาพ/PDF/ข้อความ): ${unreadableStudentFiles.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  await updateSubmissionStatus(supabase, submissionId, { status: "evaluating" });

  const contextLines = [
    `Student ID: ${submission.student_code}`,
    submission.topic ? `หัวข้อ/บทเรียน: ${submission.topic}` : null,
    submission.teaching_materials_text?.trim() ? `สื่อ/บันทึกการสอนที่เกี่ยวข้อง:\n${submission.teaching_materials_text.trim()}` : null,
    teachingMaterialsLine,
    answerKeyText ? `เฉลย/เกณฑ์การให้คะแนน (ข้อความ):\n${answerKeyText}` : null,
    scoringCriteria?.trim() ? `เกณฑ์การให้คะแนน (Scoring Criteria) — ใช้เกณฑ์นี้ในการให้คะแนนแต่ละข้ออย่างเคร่งครัด:\n${scoringCriteria.trim()}` : null,
  ].filter(Boolean);

  const instructions = [
    "คุณกำลังตรวจแบบฝึกหัดของนักเรียนให้ครูคนหนึ่ง",
    "ไฟล์แรกๆ ที่แนบมา (ถ้ามีมากกว่า 1 ไฟล์) คือหน้าแบบฝึกหัดของนักเรียน (อาจเป็นรูปภาพลายมือ, PDF หรือไฟล์ข้อความ) ให้อ่านทุกไฟล์ประกอบกัน",
    referenceExerciseBlock ? "ไฟล์ถัดมาคือแบบฝึกหัดต้นฉบับ (โจทย์เปล่า) จากชุด Homework Unit ให้ใช้เทียบกับสิ่งที่นักเรียนทำ" : null,
    answerKeyBlock ? "ไฟล์สุดท้ายที่แนบมาคือเฉลย ให้ใช้ประกอบการตรวจด้วย" : null,
    "",
    "ทำตามลำดับนี้อย่างเคร่งครัด:",
    "1. อ่านงานของนักเรียนและแยกออกเป็นข้อๆ โดยให้โจทย์และคำตอบของนักเรียนอยู่ใน block เดียวกันเสมอ ห้ามแยกเป็นคนละ entity",
    "2. สำหรับแต่ละข้อ ให้ประเมินโดยพิจารณาจากโจทย์ คำตอบนักเรียน เฉลย และสื่อการสอน/บริบทที่ให้มาประกอบกัน ไม่ใช่ดูแค่เฉลยอย่างเดียว",
    scoringCriteria?.trim() ? "2b. มีเกณฑ์การให้คะแนน (Scoring Criteria) แนบมาด้วย ต้องใช้เกณฑ์นี้ในการคำนวณ score ของแต่ละข้อ ห้ามใช้ดุลยพินิจแทน" : null,
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
            ...exerciseContentBlocks,
            ...(referenceExerciseBlock ? [referenceExerciseBlock] : []),
            ...(answerKeyBlock ? [answerKeyBlock] : []),
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
