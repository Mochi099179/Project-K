import type { FileKind } from "./types";

export type ReadFileResult = { file: File; base64: string; mediaType: string; dataUrl: string; name: string; kind: FileKind };

// Plain-text formats are read as UTF-8 text server-side (see app/api/process-check),
// so only true plain-text extensions belong here. `.doc`/`.docx` are binary
// (zip-based) formats — decoding them as UTF-8 would produce garbage, so they
// fall through to "other" (still attachable, just not fed to the AI as content).
export function inferFileKind(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return "other";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["txt", "md"].includes(ext)) return "text";
  return "other";
}

export const ACCEPTED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", ".pdf", "text/plain", ".txt", ".md"];

export function readAttachedFile(file: File): Promise<ReadFileResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:(.*);base64,(.*)$/);
      if (!match) {
        reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
        return;
      }
      resolve({ file, mediaType: match[1], base64: match[2], dataUrl, name: file.name, kind: inferFileKind(file.name) });
    };
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}
