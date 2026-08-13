"use client";

import { useState } from "react";
import type { CheckOcrResult } from "@/lib/types";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { Spinner } from "@/components/ui/Spinner";

export type OcrPanelStatus = "processing" | "completed" | "error";

const STATUS_META: Record<OcrPanelStatus, { label: string; bg: string; color: string }> = {
  processing: { label: "กำลังอ่านลายมือ...", bg: "transparent", color: "" },
  completed: { label: "อ่านลายมือสำเร็จ", bg: "rgba(109,151,115,0.15)", color: "#5b8060" },
  error: { label: "อ่านลายมือไม่สำเร็จ", bg: "rgba(187,107,83,0.15)", color: "#BB6B53" },
};

/**
 * Collapsed-by-default status card for the Handwriting AI's raw reading —
 * a supporting/verification layer, not the primary result (that's AI
 * Analysis). Stays collapsed even once it *can* expand: opening it is
 * always an explicit teacher action, never automatic on OCR/analysis
 * completion, so the score/analysis is what's immediately visible.
 */
export function OcrResultCollapsible({
  status,
  ocrResult,
  errorMessage,
  onCorrect,
  disabled,
}: {
  status: OcrPanelStatus;
  ocrResult: CheckOcrResult | null;
  errorMessage?: string | null;
  onCorrect: (correctedText: string | null) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = (status === "completed" && !!ocrResult) || status === "error";
  const meta = STATUS_META[status];

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => canExpand && setExpanded((e) => !e)}
        aria-expanded={canExpand ? expanded : undefined}
        className={`flex w-full items-center gap-3 px-4.5 py-3.5 text-left ${canExpand ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center">
          {status === "processing" ? (
            <Spinner size={16} />
          ) : (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold"
              style={{ background: meta.bg, color: meta.color }}
            >
              {status === "completed" ? "✓" : "!"}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-bold text-ink">OCR Result</div>
          <div className="text-[12px] text-ink/55">{meta.label}</div>
        </div>
        {canExpand && (
          <svg
            className="h-4 w-4 flex-shrink-0 text-ink/40 transition-transform duration-200 ease-out"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        )}
      </button>

      {/* grid-rows 0fr→1fr is what makes this animate smoothly without
          knowing the content's height ahead of time (no JS measurement). */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-4.5 py-4">
            {status === "completed" && ocrResult && (
              <OcrResultContent ocrResult={ocrResult} onCorrect={onCorrect} disabled={disabled} />
            )}
            {status === "error" && (
              <p className="text-[12.5px] leading-[1.6] text-ink/70">
                {errorMessage || "เกิดข้อผิดพลาดบางอย่างระหว่างอ่านลายมือ กรุณาลองใหม่อีกครั้ง"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The existing OCR content (raw page text, teacher-correction flow) — unchanged from before, just relocated under the collapsible header above. */
function OcrResultContent({
  ocrResult,
  onCorrect,
  disabled,
}: {
  ocrResult: CheckOcrResult;
  onCorrect: (correctedText: string | null) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const pagesText = [...ocrResult.pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const effectiveText = ocrResult.teacherCorrectedText ?? pagesText.map((p) => p.content).join("\n\n");
  const [draft, setDraft] = useState(effectiveText);

  return (
    <div>
      {!editing && !disabled && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => {
              setDraft(effectiveText);
              setEditing(true);
            }}
            className="text-[11px] font-semibold text-primary"
          >
            ✎ แก้ไขข้อความที่อ่านได้
          </button>
        </div>
      )}

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            className="mb-2 w-full resize-y rounded-xl border border-gold/40 bg-cream p-3 text-[12.5px] leading-[1.6] text-ink outline-none"
          />
          <p className="mb-2.5 text-[10.5px] text-ink/45">
            แก้ไขเฉพาะสิ่งที่ระบบอ่านผิด — บันทึกแล้วกด &quot;ลองวิเคราะห์ใหม่&quot; ด้านล่างของหน้าเพื่อให้ AI วิเคราะห์ด้วยข้อความนี้
          </p>
          <div className="flex justify-end gap-2">
            {ocrResult.teacherCorrectedText !== null && (
              <button
                onClick={() => {
                  onCorrect(null);
                  setEditing(false);
                }}
                className="mr-auto text-[11.5px] font-semibold text-ink/50"
              >
                ใช้ข้อความที่ AI อ่านได้เดิม
              </button>
            )}
            <button onClick={() => setEditing(false)} className="rounded-full border border-border px-4 py-2 text-[12px] text-ink/70">
              ยกเลิก
            </button>
            <button
              onClick={() => {
                onCorrect(draft.trim());
                setEditing(false);
              }}
              className="rounded-full bg-primary px-5 py-2 text-[12px] font-bold text-card"
            >
              บันทึก
            </button>
          </div>
        </div>
      ) : (
        <>
          {ocrResult.teacherCorrectedText !== null ? (
            <div>
              <span className="mb-2 inline-block rounded-full bg-gold/25 px-2 py-0.5 text-[10px] font-semibold text-[#a8823a]">ครูแก้ไขแล้ว</span>
              <div className="whitespace-pre-wrap text-[12.5px] leading-[1.6] text-ink">{ocrResult.teacherCorrectedText || "—"}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pagesText.map((p) => (
                <div key={p.pageNumber}>
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="font-mono text-[9.5px] uppercase tracking-wide text-ink/45">หน้า {p.pageNumber}</span>
                    {p.confidence !== null && <ConfidenceBadge label="อ่านไม่ชัดเจน" value={p.confidence} />}
                  </div>
                  <div className="whitespace-pre-wrap text-[12.5px] leading-[1.6] text-ink">{p.content || "—"}</div>
                </div>
              ))}
              {pagesText.length === 0 && <p className="text-[12.5px] text-ink/40">ไม่มีข้อความที่อ่านได้</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
