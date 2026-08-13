import Anthropic from "@anthropic-ai/sdk";
import { ocrResultSchema, type OcrPage, type OcrResult } from "@/lib/validation/ai-result";
import { contentBlockForFile, type UploadedFile } from "./content-blocks";

// ============================================================================
// Handwriting Recognition (OCR) — provider abstraction.
//
// Responsibility: transcribe the student's handwritten work into text.
// NOTHING ELSE. It must never decide correctness, score, learning issues, or
// even which question an answer belongs to — that's Answer Analysis AI's job
// (lib/ai/answer-analysis.ts), because only something that understands the
// exercise can do that mapping. A real OCR provider has no such understanding.
//
// Configured via env vars so the provider can be swapped without touching
// the rest of the checking pipeline:
//   HANDWRITING_AI_PROVIDER  — unset (default): AksonOCR first, automatically
//                              falling back to Anthropic if Akson is
//                              unconfigured or its request fails for any
//                              reason (config/network/HTTP/parsing) — a
//                              missing Akson credential or an Akson outage
//                              never takes OCR down entirely. Set explicitly
//                              to "akson" or "anthropic" to force exactly
//                              that one provider, with no fallback.
//   HANDWRITING_AI_MODEL     — anthropic only; defaults to "claude-sonnet-5"
//   HANDWRITING_AI_API_KEY   — anthropic only; falls back to ANTHROPIC_API_KEY
//   AKSON_OCR_API_KEY        — required once HANDWRITING_AI_PROVIDER=akson
//   AKSON_OCR_BASE_URL       — required once HANDWRITING_AI_PROVIDER=akson.
//                              AksonOCR's real production origin is
//                              https://backend.aksonocr.com — deliberately
//                              not hardcoded as a fallback, so a bad/missing
//                              value fails loudly with a config error instead
//                              of silently pointing at a guessed default.
//   AKSON_OCR_MODEL          — akson only; defaults to "AksonOCR-handwriting"
//                              (their handwriting-tuned model — the other two,
//                              "AksonOCR-preview"/"AksonOCR-1.0", target
//                              printed text and are not what this stage needs)
// Server-side only — never import this from a "use client" file.
// ============================================================================

export type HandwritingRecognitionInput = {
  /** The student's photographed/scanned/PDF work, in provider-neutral form — what actually gets read. Required. */
  studentWorkFiles: UploadedFile[];
  /** Non-grading context: student id, topic. Must NOT include the answer key, scoring criteria, or exercise content. */
  contextLines: string[];
};

export type HandwritingRecognitionResult = {
  provider: string;
  model: string;
  raw: unknown;
  normalized: OcrResult;
};

const ocrPageJsonSchema = {
  type: "object",
  properties: {
    // Claude's structured-output schema validator rejects `minimum` on an
    // integer property ("output_config.format.schema: For 'integer' type,
    // property 'minimum' is not supported") — the >=1 constraint is instead
    // enforced by ocrPageSchema (lib/validation/ai-result.ts) after parsing.
    page_number: { type: "integer", description: "ลำดับหน้าของไฟล์ที่แนบมา เริ่มที่ 1" },
    content: { type: "string", description: "ข้อความทั้งหมดที่อ่านได้จากหน้านี้ ถอดตามที่เห็นจริง ห้ามตีความหรือแบ่งเป็นข้อๆ" },
    confidence: { type: "number", description: "0-1 ความมั่นใจโดยรวมว่าถอดตัวอักษร/ข้อความของหน้านี้ถูกต้อง" },
  },
  required: ["page_number", "content", "confidence"],
  additionalProperties: false,
} as const;

/**
 * Fallback OCR path using Claude vision — deliberately restricted to pure
 * transcription (no question segmentation, no grading) so swapping in
 * AksonOCR later is a like-for-like replacement, not a capability downgrade
 * disguised as a provider swap.
 */
async function recognizeWithAnthropic(input: HandwritingRecognitionInput): Promise<HandwritingRecognitionResult> {
  const apiKey = process.env.HANDWRITING_AI_API_KEY || process.env.ANTHROPIC_API_KEY;
  const model = process.env.HANDWRITING_AI_MODEL || "claude-sonnet-5";
  const client = new Anthropic({ apiKey });

  const blocks = input.studentWorkFiles
    .map((f) => contentBlockForFile(f.file, f.fileName))
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const instructions = [
    "คุณคือระบบอ่านลายมือ (OCR) เท่านั้น ไม่ใช่ระบบตรวจคำตอบ และไม่ใช่ระบบแบ่งข้อ",
    "หน้าที่เดียวของคุณคือถอดข้อความทั้งหมดที่ปรากฏในแต่ละหน้าให้ถูกต้องและครบถ้วนที่สุด ตามลำดับที่เห็นจริงบนหน้ากระดาษ",
    "ห้ามตัดสินว่าคำตอบถูกหรือผิด ห้ามให้คะแนน ห้ามวิเคราะห์แนวคิด ห้ามพยายามแยกว่าข้อความส่วนไหนเป็นข้อไหน — แค่ถอดข้อความของทั้งหน้าออกมาเป็นก้อนเดียว",
    "",
    "ทำตามลำดับนี้:",
    "1. อ่านแต่ละไฟล์ที่แนบมาตามลำดับ ให้ 1 ไฟล์ = 1 หน้า (page_number เรียงตามลำดับไฟล์ เริ่มที่ 1)",
    "2. ถอดข้อความทั้งหมดของหน้านั้นลงใน content รวมทั้งตัวเลขข้อ เครื่องหมาย และคำที่เขียนด้วยลายมือ ตามที่เห็นจริง",
    "3. confidence สะท้อนความมั่นใจโดยรวมในการถอดข้อความของหน้านั้น ไม่เกี่ยวกับความถูกผิดของคำตอบ",
  ].join("\n");

  // Scaled per page in THIS request, not fixed — a flat cap (previously
  // 4000) truncates mid-JSON once real handwritten pages carry enough text,
  // which surfaces as a confusing "Unterminated string in JSON" parse error
  // rather than the actual cause. claude-sonnet-5 allows up to 128k output
  // tokens; MAX_PAGES_PER_BATCH (check-pipeline.ts) keeps a single request's
  // page count low enough that this never needs to approach that ceiling.
  const maxTokens = Math.min(32_000, 1_000 + input.studentWorkFiles.length * 2_000);

  // The SDK refuses a plain (non-streaming) request once maxTokens implies
  // the response could take over 10 minutes to generate — a real
  // possibility now that maxTokens scales up with page count instead of
  // being a flat 4000. Streaming has no such ceiling, and .finalMessage()
  // gives back the exact same shape create() would have, so nothing below
  // this needs to change.
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
            properties: { pages: { type: "array", items: ocrPageJsonSchema } },
            required: ["pages"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [...blocks, { type: "text", text: [input.contextLines.join("\n\n"), "", instructions].join("\n") }],
        },
      ],
    })
    .finalMessage();

  if (response.stop_reason === "max_tokens") {
    // The response was cut off mid-output — JSON.parse would fail on it with
    // a confusing "Unterminated string" error that doesn't point at the real
    // cause. This page's content ran over maxTokens despite the per-page
    // scaling above (e.g. one exceptionally dense page of writing).
    throw new Error("ข้อความในหน้าที่แนบมายาวเกินกว่าที่ระบบจะประมวลผลได้ในครั้งเดียว กรุณาแบ่งไฟล์ให้มีจำนวนหน้าน้อยลงแล้วลองใหม่");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Handwriting AI ไม่ได้ตอบกลับเป็นข้อความ");

  const rawJson = JSON.parse(textBlock.text);
  const parsed = ocrResultSchema.safeParse(rawJson);
  if (!parsed.success) throw new Error("ผลลัพธ์จาก Handwriting AI ไม่ตรงตามรูปแบบที่กำหนด");

  return { provider: "anthropic", model, raw: rawJson, normalized: parsed.data };
}

// ----------------------------------------------------------------------------
// AksonOCR — https://docs.aksonocr.com (POST {baseUrl}/api/v2/ocr).
// Contract confirmed directly from their live API reference: synchronous,
// JSON body, X-API-Key header, document sent as a base64 data: URI (matches
// what content-blocks.ts already produces — no separate upload path needed).
// Response: { model, pages: [{ index, markdown, confidence }], confidence }.
// ----------------------------------------------------------------------------

type AksonOcrModel = "AksonOCR-preview" | "AksonOCR-handwriting" | "AksonOCR-1.0";

type AksonOcrPage = { index: number; markdown: string; confidence?: number };
type AksonOcrSuccessResponse = { model: string; pages: AksonOcrPage[]; confidence?: number; usage?: { pages_processed: number } };
// AksonOCR's own docs show a flat shape ({ error: "CODE", message: "..." })
// for validation errors, but live testing against 400/401 responses only
// ever produced a nested shape ({ success: false, error: { code, message } })
// — apparently from a shared gateway layer in front of their app logic.
// Support both rather than assume either is exhaustive.
type AksonOcrErrorResponse = { error?: string | { code?: string; message?: string }; message?: string };

const AKSON_TIMEOUT_MS = 60_000;
const AKSON_MAX_ATTEMPTS = 3; // 1 initial attempt + 2 retries
const AKSON_MAX_REQUEST_BYTES = 10 * 1024 * 1024; // AksonOCR v2's documented per-request limit

function aksonOcrConfig(): { apiKey: string; baseUrl: string; model: AksonOcrModel } {
  const apiKey = process.env.AKSON_OCR_API_KEY;
  if (!apiKey) throw new Error("AKSON_OCR_API_KEY is not configured — กรุณาตั้งค่าตัวแปรสภาพแวดล้อม AKSON_OCR_API_KEY");

  const baseUrl = process.env.AKSON_OCR_BASE_URL;
  if (!baseUrl) throw new Error("AKSON_OCR_BASE_URL is not configured — กรุณาตั้งค่าตัวแปรสภาพแวดล้อม AKSON_OCR_BASE_URL");

  const model = (process.env.AKSON_OCR_MODEL as AksonOcrModel | undefined) || "AksonOCR-handwriting";
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ""), model };
}

function isRetryableAksonStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Maps AksonOCR's documented error codes/statuses to a teacher-facing message — never includes the API key or raw headers. */
function classifyAksonError(status: number, body: AksonOcrErrorResponse | null): Error {
  const nestedError = body?.error && typeof body.error === "object" ? body.error : null;
  const code = nestedError?.code ?? (typeof body?.error === "string" ? body.error : null) ?? `HTTP_${status}`;
  const message = nestedError?.message ?? body?.message ?? null;
  const detail = message ? ` (${message})` : "";
  const reason =
    status === 401 || status === 403
      ? "AKSON_OCR_API_KEY ไม่ถูกต้องหรือไม่มีสิทธิ์เข้าถึง"
      : status === 402
        ? "เครดิต AksonOCR ไม่เพียงพอ"
        : status === 413
          ? "ไฟล์มีขนาดใหญ่เกินไปสำหรับ AksonOCR"
          : status === 429
            ? "AksonOCR มีคำขอเข้ามาเยอะในขณะนี้ กรุณาลองใหม่อีกครั้ง"
            : status >= 500
              ? "AksonOCR เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์"
              : "AksonOCR ปฏิเสธคำขอ (คำขอไม่ถูกต้องหรือไฟล์ไม่รองรับ)";
  return new Error(`[AksonOCR] ${reason} — ${code}${detail} (HTTP ${status})`);
}

function aksonBackoffMs(attempt: number): number {
  return Math.min(4_000, 500 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POSTs one document to AksonOCR's sync OCR endpoint, retrying network
 * failures / timeouts / 429 / 5xx with backoff. Never retries 400/401/402/
 * 403/413 — those are permanent for a given request and retrying would just
 * burn AksonOCR credits for the same guaranteed failure.
 */
async function callAksonOcr(baseUrl: string, apiKey: string, body: unknown): Promise<AksonOcrSuccessResponse> {
  const url = `${baseUrl}/api/v2/ocr`;

  for (let attempt = 1; attempt <= AKSON_MAX_ATTEMPTS; attempt++) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AKSON_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        // Never log this header — it carries AKSON_OCR_API_KEY.
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      console.warn(`[handwriting:akson] request failed attempt=${attempt}/${AKSON_MAX_ATTEMPTS} reason=${isTimeout ? "timeout" : "network"}`);
      if (attempt === AKSON_MAX_ATTEMPTS) {
        throw new Error(
          isTimeout
            ? `[AksonOCR] คำขอหมดเวลา (เกิน ${AKSON_TIMEOUT_MS / 1000} วินาที) หลังลองใหม่ ${attempt} ครั้ง`
            : `[AksonOCR] เชื่อมต่อไม่สำเร็จหลังลองใหม่ ${attempt} ครั้ง: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      await sleep(aksonBackoffMs(attempt));
      continue;
    }
    clearTimeout(timer);

    if (res.ok) {
      console.log(`[handwriting:akson] request completed attempt=${attempt} status=${res.status} durationMs=${Date.now() - startedAt}`);
      try {
        return (await res.json()) as AksonOcrSuccessResponse;
      } catch {
        throw new Error("[AksonOCR] การตอบกลับไม่ถูกต้อง (malformed JSON response)");
      }
    }

    const errorBody = (await res.json().catch(() => null)) as AksonOcrErrorResponse | null;
    console.warn(`[handwriting:akson] request failed attempt=${attempt}/${AKSON_MAX_ATTEMPTS} status=${res.status} durationMs=${Date.now() - startedAt}`);
    if (!isRetryableAksonStatus(res.status) || attempt === AKSON_MAX_ATTEMPTS) {
      throw classifyAksonError(res.status, errorBody);
    }
    await sleep(aksonBackoffMs(attempt));
  }
  /* istanbul ignore next -- unreachable: the loop above always returns or throws */
  throw new Error("[AksonOCR] request failed");
}

/**
 * AksonOCR path — sends each of the student's files (already downloaded and
 * size-budgeted by content-blocks.ts/check-context.ts, same as the Anthropic
 * path) to AksonOCR's sync OCR endpoint and normalizes the result into the
 * same OcrResult shape recognizeWithAnthropic() produces, so nothing
 * downstream (Answer Analysis, the OCR pipeline, the UI) needs to know or
 * care which provider actually did the recognition.
 *
 * "text" kind files (e.g. an uploaded .txt/.md) are already plain text — no
 * OCR call is made for them, matching how the Anthropic path treats them as
 * already-readable content rather than something to transcribe.
 *
 * One AksonOCR request per file rather than a native multi-page-PDF request:
 * check-context.ts already rasterizes PDFs into per-page images upstream of
 * either provider (needed for the Anthropic path's request-size budget), so
 * by the time files reach here every "page" is already a separate file. This
 * reuses that existing pipeline instead of branching a second, PDF-native
 * path through AksonOCR — a "pdf" kind is still handled below (AksonOCR
 * supports PDF natively) purely as a defensive fallback in case that
 * upstream expansion ever changes.
 */
async function recognizeWithAksonOcr(input: HandwritingRecognitionInput): Promise<HandwritingRecognitionResult> {
  const { apiKey, baseUrl, model } = aksonOcrConfig();

  const pages: OcrPage[] = [];
  const rawResponses: unknown[] = [];
  let pageOffset = 0;

  for (const uploaded of input.studentWorkFiles) {
    const file = uploaded.file;

    if (file.kind === "text") {
      // Already text — nothing to recognize. Kept as its own page, same as
      // the Anthropic path folding it in as page content by file order.
      pages.push({ page_number: pageOffset + 1, content: file.text, confidence: null });
      pageOffset += 1;
      continue;
    }

    if (file.kind === "other") {
      // Never actually reaches here — content-blocks.ts filters "other" kind
      // files out (reported as unreadable) before studentWorkFiles is built.
      pageOffset += 1;
      continue;
    }

    const documentUrl =
      file.kind === "image" ? `data:${file.mediaType};base64,${file.base64}` : `data:application/pdf;base64,${file.base64}`;

    // AksonOCR's documented v2 limit is 10MB/request. The "image" branch is
    // already well under this via check-context.ts's per-image compression
    // budget (max ~1.5MB), but the defensive "pdf" branch above bypasses
    // that budget entirely — check it explicitly rather than let a doomed,
    // oversized request burn a round-trip (and, per Akson's credit model,
    // potentially a credit) before failing.
    const approxBytes = Math.ceil((file.base64.length * 3) / 4);
    if (approxBytes > AKSON_MAX_REQUEST_BYTES) {
      throw new Error(
        `[AksonOCR] ไฟล์หน้าที่ ${pageOffset + 1} มีขนาดใหญ่เกินขีดจำกัดของ AksonOCR (${(approxBytes / 1024 / 1024).toFixed(1)}MB > ${AKSON_MAX_REQUEST_BYTES / 1024 / 1024}MB ต่อคำขอ)`
      );
    }

    console.log(`[handwriting:akson] request started page=${pageOffset + 1} model=${model}`);
    const response = await callAksonOcr(baseUrl, apiKey, {
      model,
      document: { type: "document_url", document_url: documentUrl, document_name: uploaded.fileName },
    });
    rawResponses.push(response);

    if (!response.pages || response.pages.length === 0) {
      throw new Error(`[AksonOCR] ไม่พบข้อความที่อ่านได้จากหน้าที่ ${pageOffset + 1}`);
    }
    console.log(`[handwriting:akson] pagesReturned=${response.pages.length} forInputPage=${pageOffset + 1}`);

    for (const p of response.pages) {
      pages.push({
        page_number: pageOffset + p.index + 1,
        content: p.markdown,
        // AksonOCR returns confidence on a 0–100 scale; the app's internal
        // contract (ocrPageSchema) is 0–1, same as the Anthropic path.
        confidence: typeof p.confidence === "number" ? Math.max(0, Math.min(1, p.confidence / 100)) : null,
      });
    }
    pageOffset += response.pages.length;
  }

  const parsed = ocrResultSchema.safeParse({ pages });
  if (!parsed.success) throw new Error("ผลลัพธ์จาก AksonOCR ไม่ตรงตามรูปแบบที่กำหนด");

  return { provider: "akson", model, raw: rawResponses, normalized: parsed.data };
}

export async function recognizeHandwriting(input: HandwritingRecognitionInput): Promise<HandwritingRecognitionResult> {
  const provider = process.env.HANDWRITING_AI_PROVIDER;

  // Explicit provider — strict, no fallback, exactly what was asked for.
  if (provider === "anthropic") return recognizeWithAnthropic(input);
  if (provider === "akson") return recognizeWithAksonOcr(input);
  if (provider) throw new Error(`ไม่รองรับ Handwriting AI provider: "${provider}"`);

  // No provider set — AksonOCR is the primary handwriting OCR engine;
  // Anthropic is the automatic fallback whenever Akson can't be used, so a
  // missing/expired Akson credential or an Akson-side outage doesn't take
  // OCR down entirely. aksonOcrConfig()'s own config-validation errors are
  // just one of the failure shapes caught here — network/HTTP/parsing
  // failures fall back the same way.
  try {
    return await recognizeWithAksonOcr(input);
  } catch (err) {
    console.warn(`[handwriting] AksonOCR failed, falling back to Anthropic: ${err instanceof Error ? err.message : String(err)}`);
    return recognizeWithAnthropic(input);
  }
}
