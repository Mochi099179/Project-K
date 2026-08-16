import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recognizeHandwriting, ocrConfidenceFallbackThreshold, type HandwritingRecognitionInput } from "./ocr";
import type { UploadedFile } from "./content-blocks";

const ENV_KEYS = [
  "HANDWRITING_AI_PROVIDER",
  "AKSON_OCR_API_KEY",
  "AKSON_OCR_BASE_URL",
  "AKSON_OCR_MODEL",
  "ANTHROPIC_API_KEY",
  "HANDWRITING_AI_API_KEY",
  "OCR_CONFIDENCE_FALLBACK_THRESHOLD",
] as const;
const savedEnv: Record<string, string | undefined> = {};

function setAksonEnv(overrides: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}) {
  process.env.HANDWRITING_AI_PROVIDER = "akson";
  process.env.AKSON_OCR_API_KEY = "test-api-key";
  process.env.AKSON_OCR_BASE_URL = "https://akson.test";
  delete process.env.AKSON_OCR_MODEL;
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const oneImageInput: HandwritingRecognitionInput = {
  studentWorkFiles: [
    { fileName: "page1.jpg", file: { kind: "image", base64: "aGVsbG8=", mediaType: "image/jpeg" } } satisfies UploadedFile,
  ],
  contextLines: ["Student ID: test-001"],
};

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("recognizeHandwriting — provider routing", () => {
  it("routes to AksonOCR when HANDWRITING_AI_PROVIDER=akson", async () => {
    setAksonEnv();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { model: "AksonOCR-handwriting", pages: [{ index: 0, markdown: "สวัสดี", confidence: 87 }] })
    );

    const result = await recognizeHandwriting(oneImageInput);

    expect(result.provider).toBe("akson");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://akson.test/api/v2/ocr");
    expect((init?.headers as Record<string, string>)["X-API-Key"]).toBe("test-api-key");
  });

  it("never touches the AksonOCR endpoint when explicitly forced to anthropic", async () => {
    process.env.HANDWRITING_AI_PROVIDER = "anthropic";
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.HANDWRITING_AI_API_KEY;
    process.env.AKSON_OCR_API_KEY = "test-api-key";
    process.env.AKSON_OCR_BASE_URL = "https://akson.test";
    // recognizeWithAnthropic will fail for its own reasons (fetch is
    // globally stubbed to a bare mock, so it can't reach the real Anthropic
    // API either) — the point here is only that an explicit "anthropic"
    // override never falls through to AksonOCR, even though Akson is
    // configured and would otherwise succeed.
    await expect(recognizeHandwriting(oneImageInput)).rejects.toThrow();
    const calledUrls = vi.mocked(fetch).mock.calls.map(([url]) => url);
    expect(calledUrls).not.toContain("https://akson.test/api/v2/ocr");
  });
});

describe("recognizeHandwriting — automatic Anthropic→AksonOCR fallback (unset provider)", () => {
  // Claude Vision is the default first attempt (cheaper at this app's
  // volume than AksonOCR, which bills per page — see lib/ai/ocr.ts's header
  // comment). Forcing the Anthropic client to throw at construction time —
  // by leaving both API-key env vars unset — is the same reliable,
  // no-real-network technique the rest of this suite already uses to
  // simulate "Anthropic's attempt failed" without needing to mock the SDK's
  // streaming wire format.
  beforeEach(() => {
    delete process.env.HANDWRITING_AI_PROVIDER;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.HANDWRITING_AI_API_KEY;
  });

  it("falls back to AksonOCR when Anthropic is unconfigured (no API key)", async () => {
    process.env.AKSON_OCR_API_KEY = "test-api-key";
    process.env.AKSON_OCR_BASE_URL = "https://akson.test";
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { model: "AksonOCR-handwriting", pages: [{ index: 0, markdown: "สวัสดี", confidence: 87 }] })
    );

    const result = await recognizeHandwriting(oneImageInput);

    expect(result.provider).toBe("akson");
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://akson.test/api/v2/ocr");
  });

  it("surfaces AksonOCR's own error when both providers fail", async () => {
    // Anthropic fails first (no key, per beforeEach); AksonOCR is also left
    // unconfigured here, so its config-validation error is what should
    // ultimately propagate — proving the fallback actually reached
    // AksonOCR's code path rather than the original Anthropic error just
    // propagating unchanged.
    delete process.env.AKSON_OCR_API_KEY;
    delete process.env.AKSON_OCR_BASE_URL;

    await expect(recognizeHandwriting(oneImageInput)).rejects.toThrow(/AKSON_OCR_API_KEY is not configured/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

// Note: the confidence-gated re-extraction itself (Anthropic succeeds, each
// page's own confidence is compared against ocrConfidenceFallbackThreshold(),
// and low-confidence pages are individually re-extracted with AksonOCR)
// isn't covered here — exercising it needs a real Anthropic streaming (SSE)
// response, which nothing in this codebase currently mocks (answer-analysis.ts's
// pure-Anthropic Stage 2 has no test coverage for the same reason). The
// threshold's own parsing logic is covered below instead.
describe("ocrConfidenceFallbackThreshold", () => {
  afterEach(() => {
    delete process.env.OCR_CONFIDENCE_FALLBACK_THRESHOLD;
  });

  it("defaults to 0.8 when unset", () => {
    delete process.env.OCR_CONFIDENCE_FALLBACK_THRESHOLD;
    expect(ocrConfidenceFallbackThreshold()).toBe(0.8);
  });

  it("uses the configured value when it's a valid number in [0, 1]", () => {
    process.env.OCR_CONFIDENCE_FALLBACK_THRESHOLD = "0.65";
    expect(ocrConfidenceFallbackThreshold()).toBe(0.65);
  });

  it.each(["not-a-number", "-0.1", "1.5", ""])("falls back to the default for an invalid value (%j)", (raw) => {
    process.env.OCR_CONFIDENCE_FALLBACK_THRESHOLD = raw;
    expect(ocrConfidenceFallbackThreshold()).toBe(0.8);
  });
});

describe("recognizeWithAksonOcr — success path", () => {
  it("normalizes a successful response into the app's OcrResult shape", async () => {
    setAksonEnv();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(201, {
        model: "AksonOCR-handwriting",
        pages: [{ index: 0, markdown: "# หน้า 1\nคำตอบ: แปด", confidence: 92 }],
        confidence: 92,
        usage: { pages_processed: 1 },
      })
    );

    const result = await recognizeHandwriting(oneImageInput);

    expect(result.provider).toBe("akson");
    expect(result.model).toBe("AksonOCR-handwriting");
    expect(result.normalized.pages).toEqual([{ page_number: 1, content: "# หน้า 1\nคำตอบ: แปด", confidence: 0.92 }]);
  });

  it("sends text-kind files as content directly, without calling the API for them", async () => {
    setAksonEnv();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { model: "AksonOCR-handwriting", pages: [{ index: 0, markdown: "img text", confidence: 80 }] }));

    const input: HandwritingRecognitionInput = {
      studentWorkFiles: [
        { fileName: "notes.txt", file: { kind: "text", text: "already typed answer" } } satisfies UploadedFile,
        { fileName: "page1.jpg", file: { kind: "image", base64: "aGVsbG8=", mediaType: "image/jpeg" } } satisfies UploadedFile,
      ],
      contextLines: [],
    };

    const result = await recognizeHandwriting(input);

    expect(fetch).toHaveBeenCalledTimes(1); // only the image goes through the API
    expect(result.normalized.pages).toEqual([
      { page_number: 1, content: "already typed answer", confidence: null },
      { page_number: 2, content: "img text", confidence: 0.8 },
    ]);
  });

  it("offsets page numbers across multiple files, expanding multi-page provider responses", async () => {
    setAksonEnv();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { model: "AksonOCR-handwriting", pages: [{ index: 0, markdown: "page A" }] }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          model: "AksonOCR-handwriting",
          pages: [
            { index: 0, markdown: "page B1" },
            { index: 1, markdown: "page B2" },
          ],
        })
      );

    const input: HandwritingRecognitionInput = {
      studentWorkFiles: [
        { fileName: "a.jpg", file: { kind: "image", base64: "aGVsbG8=", mediaType: "image/jpeg" } } satisfies UploadedFile,
        { fileName: "b.pdf", file: { kind: "pdf", base64: "JVBERi0=" } } satisfies UploadedFile,
      ],
      contextLines: [],
    };

    const result = await recognizeHandwriting(input);

    expect(result.normalized.pages.map((p) => [p.page_number, p.content])).toEqual([
      [1, "page A"],
      [2, "page B1"],
      [3, "page B2"],
    ]);
  });
});

describe("recognizeWithAksonOcr — configuration errors", () => {
  it("throws a clear error when AKSON_OCR_API_KEY is missing", async () => {
    setAksonEnv({ AKSON_OCR_API_KEY: undefined });
    await expect(recognizeHandwriting(oneImageInput)).rejects.toThrow(/AKSON_OCR_API_KEY is not configured/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws a clear error when AKSON_OCR_BASE_URL is missing", async () => {
    setAksonEnv({ AKSON_OCR_BASE_URL: undefined });
    await expect(recognizeHandwriting(oneImageInput)).rejects.toThrow(/AKSON_OCR_BASE_URL is not configured/);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("recognizeWithAksonOcr — non-retryable HTTP errors (fail on first attempt)", () => {
  it.each([
    [400, { success: false, error: { code: "INVALID_INPUT", message: "bad input" } }],
    [401, { success: false, error: { code: "HTTP_ERROR", message: "unauthorized" } }],
    [402, { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } }],
    [403, { success: false, error: { code: "HTTP_ERROR", message: "forbidden" } }],
    [413, { error: "PAYLOAD_TOO_LARGE", message: "too big" }],
  ])("does not retry on HTTP %i", async (status, body) => {
    setAksonEnv();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(status, body));

    await expect(recognizeHandwriting(oneImageInput)).rejects.toThrow(`HTTP ${status}`);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("includes neither the API key nor the Authorization header in the thrown error message", async () => {
    setAksonEnv();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, { success: false, error: { code: "HTTP_ERROR", message: "unauthorized" } }));

    await expect(recognizeHandwriting(oneImageInput)).rejects.toSatisfy((err: Error) => {
      expect(err.message).not.toContain("test-api-key");
      expect(err.message.toLowerCase()).not.toContain("bearer");
      return true;
    });
  });
});

describe("recognizeWithAksonOcr — retryable failures", () => {
  it("retries on 429 and succeeds if a later attempt returns 200", async () => {
    setAksonEnv();
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(429, { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "slow down" } }))
      .mockResolvedValueOnce(jsonResponse(200, { model: "AksonOCR-handwriting", pages: [{ index: 0, markdown: "ok", confidence: 90 }] }));

    const promise = recognizeHandwriting(oneImageInput);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.normalized.pages[0].content).toBe("ok");
  });

  it("retries on 500 up to the max attempt count, then throws", async () => {
    setAksonEnv();
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(500, { success: false, error: { code: "PROCESSING_ERROR", message: "boom" } }));

    const promise = recognizeHandwriting(oneImageInput);
    const assertion = expect(promise).rejects.toThrow("HTTP 500");
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("retries on network failure, then throws a clear error if it never recovers", async () => {
    setAksonEnv();
    vi.useFakeTimers();
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));

    const promise = recognizeHandwriting(oneImageInput);
    const assertion = expect(promise).rejects.toThrow(/เชื่อมต่อไม่สำเร็จ/);
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("treats an AbortError (timeout) as retryable, then throws a timeout-specific error", async () => {
    setAksonEnv();
    vi.useFakeTimers();
    const abortError = Object.assign(new Error("The operation was aborted"), { name: "AbortError" });
    vi.mocked(fetch).mockRejectedValue(abortError);

    const promise = recognizeHandwriting(oneImageInput);
    const assertion = expect(promise).rejects.toThrow(/หมดเวลา/);
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("recognizeWithAksonOcr — malformed / empty responses", () => {
  it("throws a clear error when the success response body is not valid JSON", async () => {
    setAksonEnv();
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not json{{{", { status: 200 }));

    await expect(recognizeHandwriting(oneImageInput)).rejects.toThrow(/malformed JSON/);
    expect(fetch).toHaveBeenCalledTimes(1); // malformed response is not retried
  });

  it("throws a clear error when the response has an empty pages array", async () => {
    setAksonEnv();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { model: "AksonOCR-handwriting", pages: [] }));

    await expect(recognizeHandwriting(oneImageInput)).rejects.toThrow(/ไม่พบข้อความที่อ่านได้/);
  });
});
