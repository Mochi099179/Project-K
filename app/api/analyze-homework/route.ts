import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

function isAllowedMediaType(value: string): value is AllowedMediaType {
  return (ALLOWED_MEDIA_TYPES as readonly string[]).includes(value);
}

export async function POST(req: Request) {
  const { imageBase64, mediaType, answerKeyText } = await req.json();

  if (typeof imageBase64 !== "string" || !imageBase64) {
    return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
  }
  if (typeof answerKeyText !== "string" || !answerKeyText.trim()) {
    return NextResponse.json({ error: "Missing answerKeyText" }, { status: 400 });
  }
  if (typeof mediaType !== "string" || !isAllowedMediaType(mediaType)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      output_config: {
        effort: "medium",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              transcription: {
                type: "string",
                description: "สิ่งที่นักเรียนเขียนในภาพ ถอดจากลายมือให้ครบถ้วนที่สุด",
              },
              score: { type: "integer", description: "คะแนนที่ให้ 0-100 เทียบกับเฉลย" },
              strengths: { type: "array", items: { type: "string" }, description: "จุดเด่นของคำตอบ" },
              weaknesses: { type: "array", items: { type: "string" }, description: "จุดที่ควรเสริม" },
              suggestions: { type: "array", items: { type: "string" }, description: "ข้อเสนอแนะสำหรับครู" },
            },
            required: ["transcription", "score", "strengths", "weaknesses", "suggestions"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            {
              type: "text",
              text: [
                "นี่คือภาพถ่ายการบ้านลายมือของนักเรียนวิชาคณิตศาสตร์",
                "",
                "เฉลย/เกณฑ์การให้คะแนน:",
                answerKeyText,
                "",
                "กรุณา:",
                "1. อ่านลายมือในภาพและถอดเป็นข้อความให้ครบถ้วนที่สุด",
                "2. ตรวจและให้คะแนน 0-100 เทียบกับเฉลยข้างต้น",
                "3. ระบุจุดเด่น จุดที่ควรเสริม และข้อเสนอแนะสำหรับครู เป็นภาษาไทย กระชับ เข้าใจง่าย",
              ].join("\n"),
            },
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
