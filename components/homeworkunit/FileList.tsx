"use client";

import { useRef, useState } from "react";
import type { FileKind, FileRef } from "@/lib/types";
import { Card } from "@/components/ui/Card";

function inferKind(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return "other";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["txt", "md", "doc", "docx"].includes(ext)) return "text";
  return "other";
}

const KIND_ICON: Record<FileKind, string> = { image: "🖼️", pdf: "📄", text: "📝", other: "📎" };

export function FileList({
  title,
  description,
  files,
  onAdd,
  emptyLabel,
}: {
  title: string;
  description: string;
  files: FileRef[];
  onAdd: (file: File, kind: FileKind) => Promise<void>;
  emptyLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList2 | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of Array.from(fileList)) {
        await onAdd(f, inferKind(f.name));
      }
    } catch {
      setError("อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card className="rounded-[1.75rem] p-5.5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-ink">{title}</h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-primary/12 px-3.5 py-2 text-[11.5px] font-bold text-primary-dark disabled:opacity-50"
        >
          {uploading ? "กำลังอัปโหลด..." : "+ อัปโหลด"}
        </button>
      </div>
      <p className="mb-4 text-[11.5px] text-ink/50">{description}</p>
      <input ref={inputRef} type="file" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
      {error && <p className="mb-3 text-[11.5px] text-[#BB6B53]">{error}</p>}

      {files.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-[12.5px] text-ink/40">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5 rounded-xl bg-cream px-3.5 py-2.5">
              <span className="text-base">{KIND_ICON[f.kind]}</span>
              <span className="flex-1 truncate text-[12.5px] text-ink">{f.name}</span>
              <span className="text-[10.5px] text-ink/40">
                {new Date(f.addedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Alias to avoid shadowing the DOM FileList component name above.
type FileList2 = globalThis.FileList;
