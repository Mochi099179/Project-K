"use client";

import { useState } from "react";
import type { CheckQuestion, QuestionResult } from "@/lib/types";
import { finalQuestionResult } from "@/lib/types";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";

export function QuestionCard({
  index,
  question,
  onCorrect,
}: {
  index: number;
  question: CheckQuestion;
  onCorrect: (correction: QuestionResult) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const final = finalQuestionResult(question);
  const isEdited = !!question.teacherCorrected;
  const needsReview = !question.teacherCorrected && final.needsReview;

  return (
    <div
      className="rounded-2xl border bg-card"
      style={{ borderColor: isEdited ? "rgba(216,183,95,0.5)" : needsReview ? "rgba(187,107,83,0.4)" : "var(--color-border)" }}
    >
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full items-center gap-3 px-4.5 py-3.5 text-left">
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{
            background: needsReview ? "rgba(187,107,83,0.15)" : final.isCorrect ? "rgba(109,151,115,0.15)" : "rgba(187,107,83,0.15)",
            color: needsReview ? "#BB6B53" : final.isCorrect ? "#5b8060" : "#BB6B53",
          }}
        >
          {needsReview ? "⚠" : final.isCorrect ? "✓" : "✗"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-bold text-ink">ข้อ {question.questionNumber ?? index + 1}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
              style={{
                background: needsReview ? "rgba(187,107,83,0.12)" : final.isCorrect ? "rgba(109,151,115,0.12)" : "rgba(187,107,83,0.12)",
                color: needsReview ? "#BB6B53" : final.isCorrect ? "#5b8060" : "#BB6B53",
              }}
            >
              {needsReview ? "รอครูตรวจสอบ" : final.isCorrect ? "ถูกต้อง" : "ไม่ถูกต้อง"}
            </span>
            {isEdited && (
              <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[10px] font-semibold text-[#a8823a]">
                ครูแก้ไขแล้ว
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-ink/55">{question.question}</p>
        </div>
        <span className="flex-shrink-0 text-ink/40">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4.5 py-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <ConfidenceBadge label="อ่านลายมือไม่ชัดเจน" value={question.extractionConfidence} />
            {question.ocrUncertain && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#BB6B53]/15 px-2.5 py-1 text-[10.5px] font-semibold text-[#BB6B53]">
                ⚠ ระบบอ่านลายมือไม่มั่นใจ
              </span>
            )}
            {!question.teacherCorrected && (
              <ConfidenceBadge label="AI ไม่มั่นใจในผลตรวจ" value={question.ai.evaluationConfidence} />
            )}
            {question.keywords.slice(0, 4).map((k) => (
              <span key={k} className="rounded-full bg-cream px-2.5 py-1 text-[10.5px] text-ink/55">
                {k}
              </span>
            ))}
          </div>

          {needsReview && final.reviewReason && (
            <div className="mb-3 rounded-xl bg-[#BB6B53]/8 p-3">
              <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wide text-[#BB6B53]">เหตุผลที่ต้องตรวจสอบ</div>
              <p className="text-[12.5px] leading-[1.6] text-ink/80">{final.reviewReason}</p>
            </div>
          )}

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-cream p-3">
              <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wide text-ink/45">คำตอบนักเรียน</div>
              <div className="whitespace-pre-wrap text-[12.5px] leading-[1.6] text-ink">{question.studentAnswer || "—"}</div>
              {question.ocrAlternatives.length > 0 && (
                <div className="mt-1.5 text-[10.5px] text-ink/45">ทางเลือกอื่นที่อาจเป็นไปได้: {question.ocrAlternatives.join(", ")}</div>
              )}
            </div>
            <div className="rounded-xl bg-cream p-3">
              <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wide text-ink/45">คำตอบที่ถูกต้อง</div>
              <div className="whitespace-pre-wrap text-[12.5px] leading-[1.6] text-ink">{question.expectedAnswer || "—"}</div>
            </div>
          </div>

          {!editing ? (
            <>
              {(final.errorType || final.conceptIssue) && !final.isCorrect && (
                <div className="mb-3">
                  <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wide text-[#BB6B53]">จุดที่ผิด</div>
                  <p className="text-[12.5px] leading-[1.6] text-ink/80">
                    {final.errorType}
                    {final.conceptIssue ? ` — ${final.conceptIssue}` : ""}
                  </p>
                </div>
              )}
              {final.reasoning && (
                <div className="mb-3">
                  <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wide text-ink/45">คำอธิบาย</div>
                  <p className="text-[12.5px] leading-[1.6] text-ink/70">{final.reasoning}</p>
                </div>
              )}
              {final.areasToImprove.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wide text-primary">ควรเสริม</div>
                  {final.areasToImprove.map((a) => (
                    <div key={a} className="text-[12.5px] leading-[1.6] text-ink/70">
                      → {a}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setEditing(true)}
                className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-[12px] font-semibold text-primary-dark"
              >
                ✎ แก้ไขผล
              </button>
            </>
          ) : (
            <QuestionEditForm
              initial={final}
              onCancel={() => setEditing(false)}
              onSave={(correction) => {
                onCorrect(correction);
                setEditing(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function QuestionEditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: QuestionResult;
  onSave: (r: QuestionResult) => void;
  onCancel: () => void;
}) {
  const [isCorrect, setIsCorrect] = useState(initial.isCorrect);
  const [errorType, setErrorType] = useState(initial.errorType);
  const [reasoning, setReasoning] = useState(initial.reasoning);
  const [areasText, setAreasText] = useState(initial.areasToImprove.join("\n"));

  return (
    <div className="rounded-xl border border-gold/40 bg-gold/8 p-3.5">
      <div className="mb-3 flex gap-2">
        {[
          { v: true, label: "✓ ถูกต้อง" },
          { v: false, label: "✗ ไม่ถูกต้อง" },
        ].map((opt) => (
          <button
            key={String(opt.v)}
            onClick={() => setIsCorrect(opt.v)}
            className="rounded-full border px-4 py-2 text-xs font-semibold"
            style={{
              background: isCorrect === opt.v ? (opt.v ? "rgba(109,151,115,0.15)" : "rgba(187,107,83,0.15)") : "#FFF7EB",
              color: isCorrect === opt.v ? (opt.v ? "#5b8060" : "#BB6B53") : "rgba(55,65,81,0.6)",
              borderColor: isCorrect === opt.v ? "transparent" : "#E5DCC8",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {!isCorrect && (
        <input
          type="text"
          value={errorType}
          onChange={(e) => setErrorType(e.target.value)}
          placeholder="ประเภทข้อผิดพลาด เช่น คำนวณผิดพลาด"
          className="mb-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] text-ink outline-none"
        />
      )}
      <textarea
        value={reasoning}
        onChange={(e) => setReasoning(e.target.value)}
        placeholder="คำอธิบาย"
        className="mb-2 h-16 w-full resize-none rounded-lg border border-border bg-card p-2.5 text-[12.5px] text-ink outline-none"
      />
      <textarea
        value={areasText}
        onChange={(e) => setAreasText(e.target.value)}
        placeholder="สิ่งที่ควรเสริม (บรรทัดละ 1 ข้อ)"
        className="mb-3 h-16 w-full resize-none rounded-lg border border-border bg-card p-2.5 text-[12.5px] text-ink outline-none"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-[12px] text-ink/70">
          ยกเลิก
        </button>
        <button
          onClick={() =>
            onSave({
              isCorrect,
              score: isCorrect ? 1 : 0,
              errorType: isCorrect ? "" : errorType,
              conceptIssue: initial.conceptIssue,
              reasoning,
              areasToImprove: areasText.split("\n").map((s) => s.trim()).filter(Boolean),
              evaluationConfidence: 1,
              needsReview: false,
              reviewReason: "",
            })
          }
          className="rounded-full bg-primary px-5 py-2 text-[12px] font-bold text-card"
        >
          บันทึกการแก้ไข
        </button>
      </div>
    </div>
  );
}
