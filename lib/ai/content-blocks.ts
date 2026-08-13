import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { inferFileKind } from "@/lib/files";
import type { FileKind } from "@/lib/types";

type Client = SupabaseClient<Database>;

export type AllowedImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function imageMediaType(name: string): AllowedImageMediaType {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

// Claude downsamples any image bigger than this anyway, so sending more
// pixels never improves OCR quality — it just risks hitting the API's
// request-size limit (this is what caused the 413 "request_too_large"
// errors: full-resolution phone camera photos, several MB each, multiplied
// across several pages, quickly exceeds it once base64-encoded).
// Progressively smaller steps let compression keep shrinking the image
// instead of giving up at MAX_IMAGE_DIMENSION/lowest-quality once that alone
// isn't enough — the combination is what guarantees convergence under any
// per-image budget, not just the common case.
const MAX_IMAGE_DIMENSION = 1568;
const DIMENSION_STEPS = [1568, 1200, 900, 650, 480, 320];
const TARGET_MAX_BYTES = 1.5 * 1024 * 1024; // per-image budget after compression
const JPEG_QUALITY_STEPS = [82, 68, 54, 40, 28];

/**
 * Resizes/re-encodes an image to keep individual request payloads well
 * under the AI provider's size limit, without needing the teacher to
 * manually compress photos before uploading. Falls back to the original
 * bytes untouched if sharp can't process the file for any reason (e.g. an
 * unusual/corrupt format) — better to send something than to fail the
 * whole check on a compression bug.
 *
 * `maxBytes` is caller-supplied (not a fixed constant) because the right
 * per-image budget depends on how many images are going in the SAME
 * request — 3 pages can each afford ~1.5MB, but 20 pages can't, or the
 * combined base64 payload blows the request-size limit regardless of how
 * well any single image was compressed. See buildCheckingContext in
 * check-context.ts for how the shared budget is computed.
 */
async function compressImage(
  buffer: Buffer,
  fileName: string,
  maxBytes: number = TARGET_MAX_BYTES
): Promise<{ buffer: Buffer; mediaType: AllowedImageMediaType }> {
  try {
    const source = sharp(buffer, { failOn: "none" }).rotate(); // .rotate() with no args auto-orients from EXIF, then the re-encode strips it
    const metadata = await source.metadata();
    const sourceLongEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0) || MAX_IMAGE_DIMENSION;
    // Never upscale — cap each step at the source's own size, then dedupe so
    // a small source doesn't redundantly re-encode the same effective size.
    const dimensionSteps = Array.from(new Set(DIMENSION_STEPS.map((d) => Math.min(d, sourceLongEdge)))).sort((a, b) => b - a);

    let smallest: Buffer | null = null;
    for (const dimension of dimensionSteps) {
      const resized =
        dimension < sourceLongEdge
          ? source.clone().resize({ width: dimension, height: dimension, fit: "inside", withoutEnlargement: true })
          : source.clone();
      for (const quality of JPEG_QUALITY_STEPS) {
        const candidate = await resized.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
        if (!smallest || candidate.byteLength < smallest.byteLength) smallest = candidate;
        if (candidate.byteLength <= maxBytes) return { buffer: candidate, mediaType: "image/jpeg" };
      }
    }
    if (!smallest) throw new Error("compression produced no output");
    // Hit the smallest resolution/quality step and it's still over budget
    // (an extreme edge case) — send the smallest we could produce rather
    // than failing the whole check over it.
    return { buffer: smallest, mediaType: "image/jpeg" };
  } catch {
    return { buffer, mediaType: imageMediaType(fileName) };
  }
}

export type DownloadedFile =
  | { kind: "image"; base64: string; mediaType: AllowedImageMediaType }
  | { kind: "pdf"; base64: string }
  | { kind: "text"; text: string }
  | { kind: "other" };

/** Provider-neutral file representation — used for OCR provider adapters, which must not depend on Anthropic's ContentBlock shape. */
export type UploadedFile = { fileName: string; file: DownloadedFile };

/**
 * Rasterizes every page of a PDF into a PNG image buffer. A PDF has no size
 * mitigation of its own (unlike images, it was previously sent as raw,
 * uncompressed base64 regardless of page count or size — the actual cause of
 * most 413s) — rendering it to images lets each page flow through the same
 * compressImage() budget as a photographed page. scale:2 renders at roughly
 * print resolution; compressImage() downsizes further from there as needed,
 * so this doesn't need to be conservative.
 */
async function rasterizePdfPages(buffer: Buffer): Promise<Buffer[]> {
  try {
    const { pdf } = await import("pdf-to-img");
    const document = await pdf(buffer, { scale: 2 });
    const pages: Buffer[] = [];
    for await (const page of document) pages.push(page as Buffer);
    return pages;
  } catch (err) {
    console.error("[content-blocks] PDF rasterization failed:", err);
    return [];
  }
}

/** One unit of work still awaiting compression — the output of fetchStudentWorkPages(), input to compressStudentWorkPages(). */
export type RawStudentPage =
  | { kind: "image"; fileName: string; buffer: Buffer }
  | { kind: "text"; fileName: string; text: string };

/**
 * Downloads one student-submitted file and expands it into however many
 * pages it actually represents — 1 for an image or text file, N for an
 * N-page PDF — so a multi-page scan is budgeted and compressed the same way
 * as N separately photographed pages, instead of being sent as one
 * unbounded blob. Returns null on download failure (dropped silently, same
 * as before); `unreadable: true` for a file kind with no readable content
 * (e.g. .docx) or a PDF that failed to rasterize.
 */
export async function fetchStudentWorkPages(
  supabase: Client,
  bucket: string,
  path: string,
  fileName: string,
  knownKind?: FileKind
): Promise<{ pages: RawStudentPage[]; unreadable: boolean } | null> {
  const kind = knownKind ?? inferFileKind(fileName);
  if (kind === "other") return { pages: [], unreadable: true };

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();

  if (kind === "text") {
    return { pages: [{ kind: "text", fileName, text: new TextDecoder("utf-8").decode(arrayBuffer) }], unreadable: false };
  }

  if (kind === "pdf") {
    const pages = await rasterizePdfPages(Buffer.from(arrayBuffer));
    if (pages.length === 0) return { pages: [], unreadable: true };
    return {
      pages: pages.map((buffer, i) => ({
        kind: "image" as const,
        fileName: pages.length > 1 ? `${fileName} (หน้า ${i + 1}/${pages.length})` : fileName,
        buffer,
      })),
      unreadable: false,
    };
  }

  return { pages: [{ kind: "image", fileName, buffer: Buffer.from(arrayBuffer) }], unreadable: false };
}

/** Compresses each raw page against the shared per-image budget and converts it to the provider-neutral UploadedFile shape. */
export async function compressStudentWorkPages(pages: RawStudentPage[], imageMaxBytes: number): Promise<UploadedFile[]> {
  return Promise.all(
    pages.map(async (page): Promise<UploadedFile> => {
      if (page.kind === "text") return { fileName: page.fileName, file: { kind: "text", text: page.text } };
      const compressed = await compressImage(page.buffer, page.fileName, imageMaxBytes);
      return {
        fileName: page.fileName,
        file: { kind: "image", base64: compressed.buffer.toString("base64"), mediaType: compressed.mediaType },
      };
    })
  );
}

/**
 * Downloads a file from Storage and prepares it for a Claude request based on its kind.
 * "other" (e.g. .docx — a binary zip format, not plain text) is intentionally never fetched;
 * it's reported by name in the prompt instead (see callers' unreadable-file notes).
 */
export async function downloadFile(
  supabase: Client,
  bucket: string,
  path: string,
  fileName: string,
  knownKind?: FileKind,
  imageMaxBytes?: number
): Promise<DownloadedFile | null> {
  const kind = knownKind ?? inferFileKind(fileName);
  if (kind === "other") return { kind: "other" };

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();

  if (kind === "text") {
    return { kind: "text", text: new TextDecoder("utf-8").decode(arrayBuffer) };
  }
  if (kind === "pdf") return { kind: "pdf", base64: Buffer.from(arrayBuffer).toString("base64") };

  const compressed = await compressImage(Buffer.from(arrayBuffer), fileName, imageMaxBytes);
  return { kind: "image", base64: compressed.buffer.toString("base64"), mediaType: compressed.mediaType };
}

export type ContentBlock =
  | { type: "image"; source: { type: "base64"; media_type: AllowedImageMediaType; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
  | { type: "text"; text: string };

export function contentBlockForFile(file: DownloadedFile, label: string): ContentBlock | null {
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

/** Downloads a ref'd file and converts it straight to a content block, or reports it as unreadable. */
export async function resolveFileBlock(
  supabase: Client,
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
