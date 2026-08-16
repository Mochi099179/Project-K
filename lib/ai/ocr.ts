import Anthropic from "@anthropic-ai/sdk";
import { ocrResultSchema, type OcrPage, type OcrResult } from "@/lib/validation/ai-result";
import { contentBlockForFile, type UploadedFile } from "./content-blocks";

// ============================================================================
// OCR — provider abstraction, shared by two tasks:
//   1. Handwriting recognition — transcribes a STUDENT's handwritten work.
//   2. Document extraction — transcribes a TEACHER's printed reference file
//      (an exercise sheet, an answer key, or a teaching material), OCR'd once
//      at upload time and cached, instead of being re-sent to the grading AI
//      on every submission (see lib/pipeline/reference-ocr.ts).
//
// Both tasks share identical responsibility rules and identical Akson/
// Anthropic provider plumbing (retry/backoff, error classification,
// streaming, structured output) — only the model choice and instruction
// wording differ, via OCR_TASK_CONFIGS below.
//
// Responsibility: transcribe text. NOTHING ELSE. Neither task may decide
// correctness, score, learning issues, or even which question an answer
// belongs to — that's Answer Analysis AI's job (lib/ai/answer-analysis.ts),
// because only something that understands the exercise can do that mapping.
// A real OCR provider has no such understanding.
//
// Default provider strategy (per task, unless overridden — see below):
// Claude Vision first, not AksonOCR. AksonOCR bills per page and costs
// meaningfully more at this app's volume than Claude Vision, so it's used as
// a quality-driven RE-extraction rather than the default first attempt.
// Since a single OCR call already processes image-by-image (even a
// multi-page PDF arrives here pre-rasterized into one file per page — see
// content-blocks.ts), the confidence check is PER PAGE, not a batch average:
// each page's own reported confidence from Claude is compared against
// OCR_CONFIDENCE_FALLBACK_THRESHOLD, and only the pages that fall below it
// are individually re-extracted with AksonOCR — pages that meet the
// threshold keep Claude's reading untouched, even within the same batch. If
// Claude's request fails outright (no pages to check at all), AksonOCR is
// used as a plain whole-batch fallback instead. If a page's AksonOCR
// re-extraction itself fails, that page keeps its original (lower-
// confidence) Claude reading rather than failing OCR entirely — see
// runOcrTask() / reextractLowConfidencePages().
//
// Configured via env vars so either task's provider/threshold can be
// changed without touching the rest of the checking pipeline:
//   HANDWRITING_AI_PROVIDER   — handwriting task. Unset (default): Claude-
//   DOCUMENT_OCR_AI_PROVIDER  — document task. Same default behavior.
//                               first-with-confidence-gated-AksonOCR-
//                               fallback, as described above. Set explicitly
//                               to "akson" or "anthropic" to force exactly
//                               that one provider, with no fallback and no
//                               confidence check.
//   OCR_CONFIDENCE_FALLBACK_THRESHOLD — shared by both tasks; defaults to
//                               0.8 (see DEFAULT_OCR_CONFIDENCE_FALLBACK_THRESHOLD
//                               below). Only consulted when the provider env
//                               above is unset for that task.
//   HANDWRITING_AI_MODEL      — handwriting task, anthropic only; defaults
//                               to "claude-sonnet-5"
//   DOCUMENT_OCR_AI_MODEL     — document task, anthropic only; same default
//   HANDWRITING_AI_API_KEY    — handwriting task, anthropic only; falls back
//                               to ANTHROPIC_API_KEY
//   DOCUMENT_OCR_AI_API_KEY   — document task, anthropic only; same fallback
//   AKSON_OCR_API_KEY         — required once either provider env = "akson",
//   AKSON_OCR_BASE_URL          or whenever a confidence-gated/failure
//                               fallback actually reaches AksonOCR. Shared
//                               by both tasks — same Akson account.
//                               AksonOCR's real production origin is
//                               https://backend.aksonocr.com — deliberately
//                               not hardcoded as a fallback, so a bad/missing
//                               value fails loudly with a config error
//                               instead of silently pointing at a guessed
//                               default.
//   AKSON_OCR_MODEL            — handwriting task, akson only; defaults to
//                               "AksonOCR-handwriting" (their handwriting-
//                               tuned model)
//   AKSON_DOCUMENT_OCR_MODEL  — document task, akson only; defaults to
//                               "AksonOCR-preview". Reference documents
//                               (exercise sheets, answer keys, materials)
//                               are usually printed, but teachers can and do
//                               upload scans with handwritten annotations or
//                               handwritten answer keys — "AksonOCR-preview"
//                               is the default starting point, not a
//                               guarantee of print-only content; set this to
//                               "AksonOCR-handwriting" instead if a
//                               deployment's reference materials skew
//                               handwritten. The Claude Vision path and the
//                               instruction text below are written to
//                               transcribe both printed and handwritten
//                               content regardless of which Akson model is
//                               configured.
// Server-side only — never import this from a "use client" file.
// ============================================================================

type OcrInput = {
  /** The file(s) to transcribe, in provider-neutral form. Required. */
  files: UploadedFile[];
  /** Non-grading context: student id, topic, etc. Must NOT include the answer key, scoring criteria, or exercise content. */
  contextLines: string[];
};

export type HandwritingRecognitionInput = {
  /** The student's photographed/scanned/PDF work, in provider-neutral form — what actually gets read. Required. */
  studentWorkFiles: UploadedFile[];
  /** Non-grading context: student id, topic. Must NOT include the answer key, scoring criteria, or exercise content. */
  contextLines: string[];
};

export type DocumentExtractionInput = OcrInput;

export type HandwritingRecognitionResult = {
  provider: string;
  model: string;
  raw: unknown;
  normalized: OcrResult;
};

export type DocumentExtractionResult = HandwritingRecognitionResult;

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

const HANDWRITING_INSTRUCTIONS = [
  "คุณคือระบบอ่านลายมือ (OCR) เท่านั้น ไม่ใช่ระบบตรวจคำตอบ และไม่ใช่ระบบแบ่งข้อ",
  "หน้าที่เดียวของคุณคือถอดข้อความทั้งหมดที่ปรากฏในแต่ละหน้าให้ถูกต้องและครบถ้วนที่สุด ตามลำดับที่เห็นจริงบนหน้ากระดาษ",
  "ห้ามตัดสินว่าคำตอบถูกหรือผิด ห้ามให้คะแนน ห้ามวิเคราะห์แนวคิด ห้ามพยายามแยกว่าข้อความส่วนไหนเป็นข้อไหน — แค่ถอดข้อความของทั้งหน้าออกมาเป็นก้อนเดียว",
  "",
  "ทำตามลำดับนี้:",
  "1. อ่านแต่ละไฟล์ที่แนบมาตามลำดับ ให้ 1 ไฟล์ = 1 หน้า (page_number เรียงตามลำดับไฟล์ เริ่มที่ 1)",
  "2. ถอดข้อความทั้งหมดของหน้านั้นลงใน content รวมทั้งตัวเลขข้อ เครื่องหมาย และคำที่เขียนด้วยลายมือ ตามที่เห็นจริง",
  "3. confidence สะท้อนความมั่นใจโดยรวมในการถอดข้อความของหน้านั้น ไม่เกี่ยวกับความถูกผิดของคำตอบ",
].join("\n");

const DOCUMENT_INSTRUCTIONS = [
  "คุณคือระบบถอดข้อความจากเอกสาร (Document OCR) เท่านั้น ไม่ใช่ระบบตรวจคำตอบ และไม่ใช่ระบบแบ่งข้อ",
  "เอกสารที่แนบมาเป็นไฟล์อ้างอิงที่ครูอัปโหลดไว้ล่วงหน้า (เช่น แบบฝึกหัด, เฉลย, หรือสื่อการสอน) ไม่ใช่งานเขียนของนักเรียน แต่เอกสารนี้อาจเป็นได้ทั้งข้อความพิมพ์ ลายมือครูที่เขียน/สแกนไว้ หรือทั้งสองอย่างผสมกัน (เช่น แบบฝึกหัดพิมพ์ที่มีลายมือเฉลยเขียนแทรก)",
  "หน้าที่เดียวของคุณคือถอดข้อความทั้งหมดที่ปรากฏในแต่ละหน้าให้ถูกต้องและครบถ้วนที่สุด ไม่ว่าจะเป็นตัวพิมพ์หรือลายมือ ตามลำดับที่เห็นจริงบนหน้าเอกสาร โดยคงโครงสร้างเดิมไว้ให้มากที่สุดเท่าที่ข้อความล้วนจะสื่อได้ (เช่น หมายเลขข้อ, หัวข้อ, ตาราง, สูตรคณิตศาสตร์, รายการข้อ, เครื่องหมาย และคำที่เขียนด้วยลายมือ)",
  "ห้ามตัดสินว่าคำตอบถูกหรือผิด ห้ามให้คะแนน ห้ามวิเคราะห์แนวคิด ห้ามพยายามแยกว่าข้อความส่วนไหนเป็นข้อไหน — แค่ถอดข้อความของทั้งหน้าออกมาเป็นก้อนเดียว",
  "",
  "ทำตามลำดับนี้:",
  "1. อ่านแต่ละไฟล์ที่แนบมาตามลำดับ ให้ 1 ไฟล์ = 1 หน้า (page_number เรียงตามลำดับไฟล์ เริ่มที่ 1)",
  "2. ถอดข้อความทั้งหมดของหน้านั้นลงใน content ตามที่เห็นจริง ทั้งส่วนที่พิมพ์และส่วนที่เป็นลายมือ",
  "3. confidence สะท้อนความมั่นใจโดยรวมในการถอดข้อความของหน้านั้น",
].join("\n");

type AksonOcrModel = "AksonOCR-preview" | "AksonOCR-handwriting" | "AksonOCR-1.0";

type OcrTaskConfig = {
  /** Human label used in error messages, e.g. "Handwriting AI" / "Document OCR AI". */
  aiLabel: string;
  providerEnvVar: string;
  anthropicApiKeyEnvVar: string;
  anthropicModelEnvVar: string;
  anthropicDefaultModel: string;
  aksonModelEnvVar: string;
  aksonDefaultModel: AksonOcrModel;
  instructions: string;
};

const HANDWRITING_TASK: OcrTaskConfig = {
  aiLabel: "Handwriting AI",
  providerEnvVar: "HANDWRITING_AI_PROVIDER",
  anthropicApiKeyEnvVar: "HANDWRITING_AI_API_KEY",
  anthropicModelEnvVar: "HANDWRITING_AI_MODEL",
  anthropicDefaultModel: "claude-sonnet-5",
  aksonModelEnvVar: "AKSON_OCR_MODEL",
  aksonDefaultModel: "AksonOCR-handwriting",
  instructions: HANDWRITING_INSTRUCTIONS,
};

const DOCUMENT_TASK: OcrTaskConfig = {
  aiLabel: "Document OCR AI",
  providerEnvVar: "DOCUMENT_OCR_AI_PROVIDER",
  anthropicApiKeyEnvVar: "DOCUMENT_OCR_AI_API_KEY",
  anthropicModelEnvVar: "DOCUMENT_OCR_AI_MODEL",
  anthropicDefaultModel: "claude-sonnet-5",
  aksonModelEnvVar: "AKSON_DOCUMENT_OCR_MODEL",
  aksonDefaultModel: "AksonOCR-preview",
  instructions: DOCUMENT_INSTRUCTIONS,
};

// Confidence gate for the default Claude-first strategy in runOcrTask():
// below this, a single page's Claude Vision confidence is considered
// untrustworthy enough to re-extract that page with AksonOCR instead of
// accepting it outright. A dedicated, named threshold (env-overridable, not
// inlined into the fallback check) so it can be retuned later without
// touching the fallback logic itself.
const DEFAULT_OCR_CONFIDENCE_FALLBACK_THRESHOLD = 0.8;

export function ocrConfidenceFallbackThreshold(): number {
  const raw = process.env.OCR_CONFIDENCE_FALLBACK_THRESHOLD;
  if (!raw) return DEFAULT_OCR_CONFIDENCE_FALLBACK_THRESHOLD;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : DEFAULT_OCR_CONFIDENCE_FALLBACK_THRESHOLD;
}

/**
 * Primary OCR path using Claude vision — deliberately restricted to pure
 * transcription (no question segmentation, no grading) so swapping in
 * AksonOCR later is a like-for-like replacement, not a capability downgrade
 * disguised as a provider swap.
 */
async function recognizeWithAnthropic(input: OcrInput, task: OcrTaskConfig): Promise<HandwritingRecognitionResult> {
  const apiKey = process.env[task.anthropicApiKeyEnvVar] || process.env.ANTHROPIC_API_KEY;
  const model = process.env[task.anthropicModelEnvVar] || task.anthropicDefaultModel;
  const client = new Anthropic({ apiKey });

  const blocks = input.files
    .map((f) => contentBlockForFile(f.file, f.fileName))
    .filter((b): b is NonNullable<typeof b> => b !== null);

  // Scaled per page in THIS request, not fixed — a flat cap (previously
  // 4000) truncates mid-JSON once real pages carry enough text, which
  // surfaces as a confusing "Unterminated string in JSON" parse error rather
  // than the actual cause. claude-sonnet-5 allows up to 128k output tokens;
  // MAX_PAGES_PER_BATCH (lib/ai/batching.ts) keeps a single request's page
  // count low enough that this never needs to approach that ceiling.
  const maxTokens = Math.min(32_000, 1_000 + input.files.length * 2_000);

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
          content: [...blocks, { type: "text", text: [input.contextLines.join("\n\n"), "", task.instructions].join("\n") }],
        },
      ],
    })
    .finalMessage();

  if (response.stop_reason === "max_tokens") {
    // The response was cut off mid-output — JSON.parse would fail on it with
    // a confusing "Unterminated string" error that doesn't point at the real
    // cause. This page's content ran over maxTokens despite the per-page
    // scaling above (e.g. one exceptionally dense page).
    throw new Error("ข้อความในหน้าที่แนบมายาวเกินกว่าที่ระบบจะประมวลผลได้ในครั้งเดียว กรุณาแบ่งไฟล์ให้มีจำนวนหน้าน้อยลงแล้วลองใหม่");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error(`${task.aiLabel} ไม่ได้ตอบกลับเป็นข้อความ`);

  const rawJson = JSON.parse(textBlock.text);
  const parsed = ocrResultSchema.safeParse(rawJson);
  if (!parsed.success) throw new Error(`ผลลัพธ์จาก ${task.aiLabel} ไม่ตรงตามรูปแบบที่กำหนด`);

  return { provider: "anthropic", model, raw: rawJson, normalized: parsed.data };
}

// ----------------------------------------------------------------------------
// AksonOCR — https://docs.aksonocr.com (POST {baseUrl}/api/v2/ocr).
// Contract confirmed directly from their live API reference: synchronous,
// JSON body, X-API-Key header, document sent as a base64 data: URI (matches
// what content-blocks.ts already produces — no separate upload path needed).
// Response: { model, pages: [{ index, markdown, confidence }], confidence }.
// ----------------------------------------------------------------------------

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

function aksonOcrConfig(task: OcrTaskConfig): { apiKey: string; baseUrl: string; model: AksonOcrModel } {
  const apiKey = process.env.AKSON_OCR_API_KEY;
  if (!apiKey) throw new Error("AKSON_OCR_API_KEY is not configured — กรุณาตั้งค่าตัวแปรสภาพแวดล้อม AKSON_OCR_API_KEY");

  const baseUrl = process.env.AKSON_OCR_BASE_URL;
  if (!baseUrl) throw new Error("AKSON_OCR_BASE_URL is not configured — กรุณาตั้งค่าตัวแปรสภาพแวดล้อม AKSON_OCR_BASE_URL");

  const model = (process.env[task.aksonModelEnvVar] as AksonOcrModel | undefined) || task.aksonDefaultModel;
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
      console.warn(`[ocr:akson] request failed attempt=${attempt}/${AKSON_MAX_ATTEMPTS} reason=${isTimeout ? "timeout" : "network"}`);
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
      console.log(`[ocr:akson] request completed attempt=${attempt} status=${res.status} durationMs=${Date.now() - startedAt}`);
      try {
        return (await res.json()) as AksonOcrSuccessResponse;
      } catch {
        throw new Error("[AksonOCR] การตอบกลับไม่ถูกต้อง (malformed JSON response)");
      }
    }

    const errorBody = (await res.json().catch(() => null)) as AksonOcrErrorResponse | null;
    console.warn(`[ocr:akson] request failed attempt=${attempt}/${AKSON_MAX_ATTEMPTS} status=${res.status} durationMs=${Date.now() - startedAt}`);
    if (!isRetryableAksonStatus(res.status) || attempt === AKSON_MAX_ATTEMPTS) {
      throw classifyAksonError(res.status, errorBody);
    }
    await sleep(aksonBackoffMs(attempt));
  }
  /* istanbul ignore next -- unreachable: the loop above always returns or throws */
  throw new Error("[AksonOCR] request failed");
}

/**
 * AksonOCR path — sends each input file (already downloaded and
 * size-budgeted upstream, same as the Anthropic path) to AksonOCR's sync OCR
 * endpoint and normalizes the result into the same OcrResult shape
 * recognizeWithAnthropic() produces, so nothing downstream (Answer Analysis,
 * the OCR pipeline, the UI) needs to know or care which provider actually
 * did the recognition.
 *
 * "text" kind files (e.g. an uploaded .txt/.md) are already plain text — no
 * OCR call is made for them, matching how the Anthropic path treats them as
 * already-readable content rather than something to transcribe.
 *
 * One AksonOCR request per file rather than a native multi-page-PDF request:
 * upstream callers already rasterize PDFs into per-page images (needed for
 * the Anthropic path's request-size budget), so by the time files reach here
 * every "page" is already a separate file. This reuses that existing
 * pipeline instead of branching a second, PDF-native path through AksonOCR —
 * a "pdf" kind is still handled below (AksonOCR supports PDF natively)
 * purely as a defensive fallback in case that upstream expansion ever
 * changes.
 */
async function recognizeWithAksonOcr(input: OcrInput, task: OcrTaskConfig): Promise<HandwritingRecognitionResult> {
  const { apiKey, baseUrl, model } = aksonOcrConfig(task);

  const pages: OcrPage[] = [];
  const rawResponses: unknown[] = [];
  let pageOffset = 0;

  for (const uploaded of input.files) {
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
      // files out (reported as unreadable) before the input's files are built.
      pageOffset += 1;
      continue;
    }

    const documentUrl =
      file.kind === "image" ? `data:${file.mediaType};base64,${file.base64}` : `data:application/pdf;base64,${file.base64}`;

    // AksonOCR's documented v2 limit is 10MB/request. The "image" branch is
    // already well under this via the caller's per-image compression budget
    // (max ~1.5MB), but the defensive "pdf" branch above bypasses that
    // budget entirely — check it explicitly rather than let a doomed,
    // oversized request burn a round-trip (and, per Akson's credit model,
    // potentially a credit) before failing.
    const approxBytes = Math.ceil((file.base64.length * 3) / 4);
    if (approxBytes > AKSON_MAX_REQUEST_BYTES) {
      throw new Error(
        `[AksonOCR] ไฟล์หน้าที่ ${pageOffset + 1} มีขนาดใหญ่เกินขีดจำกัดของ AksonOCR (${(approxBytes / 1024 / 1024).toFixed(1)}MB > ${AKSON_MAX_REQUEST_BYTES / 1024 / 1024}MB ต่อคำขอ)`
      );
    }

    console.log(`[ocr:akson] request started page=${pageOffset + 1} model=${model}`);
    const response = await callAksonOcr(baseUrl, apiKey, {
      model,
      document: { type: "document_url", document_url: documentUrl, document_name: uploaded.fileName },
    });
    rawResponses.push(response);

    if (!response.pages || response.pages.length === 0) {
      throw new Error(`[AksonOCR] ไม่พบข้อความที่อ่านได้จากหน้าที่ ${pageOffset + 1}`);
    }
    console.log(`[ocr:akson] pagesReturned=${response.pages.length} forInputPage=${pageOffset + 1}`);

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

/**
 * Re-extracts each given low-confidence page individually with AksonOCR
 * (source file resolved via the "1 file = 1 page" contract: page_number N
 * corresponds to input.files[N-1] — the same contract recognizeWithAnthropic's
 * prompt relies on). Independent per page: one page's re-extraction failing
 * never blocks another's, and a page whose re-extraction fails simply keeps
 * its original (lower-confidence) Anthropic reading rather than the whole
 * OCR call failing.
 */
async function reextractLowConfidencePages(
  files: UploadedFile[],
  contextLines: string[],
  task: OcrTaskConfig,
  lowConfidencePages: OcrPage[]
): Promise<{ replacementsByPageNumber: Map<number, OcrPage>; aksonModel: string | null }> {
  const outcomes = await Promise.allSettled(
    lowConfidencePages.map(async (page) => {
      const file = files[page.page_number - 1];
      if (!file) throw new Error(`no source file for page ${page.page_number}`); // defensive — contract violation
      const result = await recognizeWithAksonOcr({ files: [file], contextLines }, task);
      const replacement = result.normalized.pages[0];
      if (!replacement) throw new Error(`AksonOCR returned no page for page ${page.page_number}`);
      return { pageNumber: page.page_number, replacement, model: result.model };
    })
  );

  const replacementsByPageNumber = new Map<number, OcrPage>();
  let aksonModel: string | null = null;
  outcomes.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") {
      replacementsByPageNumber.set(outcome.value.pageNumber, { ...outcome.value.replacement, page_number: outcome.value.pageNumber });
      aksonModel = outcome.value.model;
    } else {
      console.warn(
        `[ocr] AksonOCR re-extraction failed for ${task.aiLabel} page ${lowConfidencePages[i].page_number}, keeping the lower-confidence Anthropic reading: ${
          outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
        }`
      );
    }
  });

  return { replacementsByPageNumber, aksonModel };
}

async function runOcrTask(input: OcrInput, task: OcrTaskConfig): Promise<HandwritingRecognitionResult> {
  const provider = process.env[task.providerEnvVar];

  // Explicit provider — strict, no fallback, exactly what was asked for.
  if (provider === "anthropic") return recognizeWithAnthropic(input, task);
  if (provider === "akson") return recognizeWithAksonOcr(input, task);
  if (provider) throw new Error(`ไม่รองรับ ${task.aiLabel} provider: "${provider}"`);

  // No provider set — Claude Vision is the primary OCR engine: at this
  // app's volume, calling AksonOCR (billed per page) on every request costs
  // meaningfully more than Claude Vision. AksonOCR is used as a
  // quality-driven, PER-PAGE re-extraction, not a redundant first attempt —
  // each page's own confidence (not a batch average) is checked against
  // OCR_CONFIDENCE_FALLBACK_THRESHOLD, and only pages below it get
  // re-extracted; the rest of the batch keeps Claude's reading untouched.
  // If Claude's request fails outright (no pages to check at all), Akson is
  // used as a plain whole-batch fallback instead.
  let anthropicResult: HandwritingRecognitionResult;
  try {
    anthropicResult = await recognizeWithAnthropic(input, task);
  } catch (err) {
    console.warn(`[ocr] Anthropic failed for ${task.aiLabel}, falling back to AksonOCR: ${err instanceof Error ? err.message : String(err)}`);
    return recognizeWithAksonOcr(input, task);
  }

  const threshold = ocrConfidenceFallbackThreshold();
  const lowConfidencePages = anthropicResult.normalized.pages.filter((p) => typeof p.confidence === "number" && p.confidence < threshold);
  if (lowConfidencePages.length === 0) return anthropicResult;

  console.warn(
    `[ocr] ${task.aiLabel}: ${lowConfidencePages.length}/${anthropicResult.normalized.pages.length} page(s) below confidence threshold ${threshold}, re-extracting with AksonOCR individually`
  );
  const { replacementsByPageNumber, aksonModel } = await reextractLowConfidencePages(input.files, input.contextLines, task, lowConfidencePages);
  if (replacementsByPageNumber.size === 0) return anthropicResult; // every re-extraction attempt failed — keep the original result entirely

  const mergedPages = anthropicResult.normalized.pages.map((page) => replacementsByPageNumber.get(page.page_number) ?? page);
  const allPagesReextracted = replacementsByPageNumber.size === anthropicResult.normalized.pages.length;

  return {
    provider: allPagesReextracted ? "akson" : "anthropic+akson",
    model: aksonModel ? `${anthropicResult.model}+${aksonModel}` : anthropicResult.model,
    raw: { anthropic: anthropicResult.raw, aksonReextractedPageCount: replacementsByPageNumber.size },
    normalized: { pages: mergedPages },
  };
}

export async function recognizeHandwriting(input: HandwritingRecognitionInput): Promise<HandwritingRecognitionResult> {
  return runOcrTask({ files: input.studentWorkFiles, contextLines: input.contextLines }, HANDWRITING_TASK);
}

/**
 * Transcribes a teacher-uploaded reference document (exercise sheet, answer
 * key, or teaching material) into text — the same pure-transcription
 * contract as recognizeHandwriting. These files are usually printed but may
 * contain handwritten annotations or be entirely handwritten (e.g. a
 * teacher's handwritten answer key) — see AKSON_DOCUMENT_OCR_MODEL above.
 * Called once per file at upload time by lib/pipeline/reference-ocr.ts, not
 * per submission.
 */
export async function extractDocumentText(input: DocumentExtractionInput): Promise<DocumentExtractionResult> {
  return runOcrTask(input, DOCUMENT_TASK);
}
