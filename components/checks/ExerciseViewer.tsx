"use client";

import { useState } from "react";

export function ExerciseViewer({ images }: { images: string[] }) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);

  if (images.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border text-[13px] text-ink/40">
        ไม่มีไฟล์แนบสำหรับแสดงผล
      </div>
    );
  }

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
            หน้า {page + 1} / {images.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(images.length - 1, p + 1))}
            disabled={page === images.length - 1}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-ink disabled:opacity-30"
          >
            ›
          </button>
        </div>
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
      </div>
      <div className="flex-1 overflow-auto rounded-2xl border border-border bg-cream p-3">
        <div style={{ width: `${zoom * 100}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[page]} alt={`หน้า ${page + 1}`} className="w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
