import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

function isAllowedMediaType(value: string): value is AllowedMediaType {
  return (ALLOWED_MEDIA_TYPES as readonly string[]).includes(value);
}

type ImageInput = { base64: string; mediaType: string };

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
    "question",
    "student_answer",
    "expected_answer",
    "keywords",
    "features",
    "context",
    "extraction_confidence",
    "is_correct",
    "score",
    "error_type",
    "concept_issue",
    "reasoning",
    "areas_to_improve",
    "evaluation_confidence",
  ],
  additionalProperties: false,
} as const;

function imageBlock(img: ImageInput) {
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: img.mediaType as AllowedMediaType, data: img.base64 },
  };
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    studentLabel,
    topic,
    teachingMaterialsText,
    answerKeyText,
    answerKeyImage,
    exerciseImages,
  }: {
    studentLabel?: string;
    topic?: string;
    teachingMaterialsText?: string;
    answerKeyText?: string;
    answerKeyImage?: ImageInput | null;
    exerciseImages: ImageInput[];
  } = body;

  if (!Array.isArray(exerciseImages) || exerciseImages.length === 0) {
    return NextResponse.json({ error: "กรุณาแนบรูปแบบฝึกหัดของนักเรียนอย่างน้อย 1 หน้า" }, { status: 400 });
  }
  for (const img of exerciseImages) {
    if (!img?.base64 || !isAllowedMediaType(img.mediaType)) {
      return NextResponse.json({ error: "รูปแบบฝึกหัดมีไฟล์ที่ไม่รองรับ" }, { status: 400 });
    }
  }
  if (answerKeyImage && !isAllowedMediaType(answerKeyImage.mediaType)) {
    return NextResponse.json({ error: "รูปเฉลยไม่รองรับ" }, { status: 400 });
  }
  if (!answerKeyText?.trim() && !answerKeyImage) {
    return NextResponse.json({ error: "กรุณาแนบเฉลย (พิมพ์ข้อความ หรือแนบรูป)" }, { status: 400 });
  }

  const client = new Anthropic();

  const contextLines = [
    `Student ID: ${studentLabel || "(ไม่ระบุ)"}`,
    topic ? `หัวข้อ/บทเรียน: ${topic}` : null,
    teachingMaterialsText?.trim() ? `สื่อ/บันทึกการสอนที่เกี่ยวข้อง:\n${teachingMaterialsText.trim()}` : null,
    answerKeyText?.trim() ? `เฉลย/เกณฑ์การให้คะแนน (ข้อความ):\n${answerKeyText.trim()}` : null,
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

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      output_config: {
        effort: "medium",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              questions: { type: "array", items: questionSchema },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            ...exerciseImages.map(imageBlock),
            ...(answerKeyImage ? [imageBlock(answerKeyImage)] : []),
            { type: "text", text: [contextLines.join("\n\n"), "", instructions].join("\n") },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "โมเดลไม่ได้ตอบกลับเป็นข้อความ" }, { status: 502 });
    }

    const result = JSON.parse(textBlock.text);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเรียก AI";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
