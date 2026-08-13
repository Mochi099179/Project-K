"use client";

import { useState } from "react";
import type { ExerciseFileRef } from "@/lib/types";

export function ExerciseViewer({ files }: { files: ExerciseFileRef[] }) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);

  if (files.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border text-[13px] text-ink/40">
        ไม่มีไฟล์แนบสำหรับแสดงผล
      </div>
    );
  }

  const current = files[page];
  const canZoom = current.kind === "image";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-ink disabled:opacity-30"
          >
            ‹
          </button>
          <span className="text-[11.5px] text-ink/55">
            หน้า {page + 1} / {files.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(files.length - 1, p + 1))}
            disabled={page === files.length - 1}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-ink disabled:opacity-30"
          >
            ›
          </button>
        </div>
        {canZoom && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-ink"
            >
              −
            </button>
            <span className="w-9 text-center text-[11px] text-ink/55">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-ink"
            >
              +
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto rounded-2xl border border-border bg-cream p-3">
        {current.kind === "image" && (
          <div style={{ width: `${zoom * 100}%` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={`หน้า ${page + 1}`} className="w-full rounded-lg" />
          </div>
        )}
        {(current.kind === "pdf" || current.kind === "text") && (
          <iframe src={current.url} title={current.name} className="h-full min-h-[500px] w-full rounded-lg border-0 bg-card" />
        )}
        {current.kind === "other" && (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <span className="text-3xl">📎</span>
            <p className="text-[13px] text-ink/55">
              ไม่รองรับการแสดงตัวอย่างไฟล์ประเภทนี้ ({current.name})
            </p>
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-primary px-5 py-2 text-[12.5px] font-bold text-card"
            >
              เปิด/ดาวน์โหลดไฟล์
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
