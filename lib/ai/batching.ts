import type { UploadedFile } from "./content-blocks";

// Shared by every caller that sends UploadedFile[] through lib/ai/ocr.ts
// (student submissions via check-pipeline.ts, and reference documents via
// lib/pipeline/reference-ocr.ts) — a multi-page PDF can hit the same
// size/page ceilings regardless of whose file it is.

// That budget keeps each image's SIZE bounded, but with few enough total
// pages each image can still use up to its 1.5MB per-image cap — so a
// request built from many such pages could still combine into something
// larger than intended. This is the second half of "handle any size of
// file": group the (already compressed) pages into separate OCR requests by
// actual encoded size, not by a fixed page count, so a file of any length
// gets split into however many requests it takes to stay under budget, then
// the per-page results are merged back into one result.
export const OCR_REQUEST_BYTE_BUDGET = 6 * 1024 * 1024;

// A second, independent cap on the same batches: with enough pages
// compressed down near the per-image budget floor, OCR_REQUEST_BYTE_BUDGET
// alone would still let a batch grow to 100+ pages — fine for the input
// side, but the OCR call's max_tokens (scaled per page, see lib/ai/ocr.ts)
// would then need an output budget large enough to transcribe all of them in
// one response. Capping page count keeps that scaling bounded regardless of
// how small the compressed pages turned out to be.
export const MAX_PAGES_PER_BATCH = 20;

export function estimateUploadedFileBytes(file: UploadedFile): number {
  if (file.file.kind === "image") return Math.ceil(file.file.base64.length * 0.75);
  if (file.file.kind === "text") return file.file.text.length;
  return 0;
}

/** A single file larger than the byte budget still becomes its own (solo) batch — it's already as small as compressImage could make it. */
export function batchUploadedFiles(files: UploadedFile[]): UploadedFile[][] {
  const batches: UploadedFile[][] = [];
  let current: UploadedFile[] = [];
  let currentBytes = 0;
  for (const file of files) {
    const bytes = estimateUploadedFileBytes(file);
    const wouldOverflow = current.length > 0 && (currentBytes + bytes > OCR_REQUEST_BYTE_BUDGET || current.length >= MAX_PAGES_PER_BATCH);
    if (wouldOverflow) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += bytes;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

export function joinOcrPages(pages: { page_number: number; content: string }[]): string {
  return [...pages]
    .sort((a, b) => a.page_number - b.page_number)
    .map((p) => `[หน้า ${p.page_number}]\n${p.content}`)
    .join("\n\n");
}
