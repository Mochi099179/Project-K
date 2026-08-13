"use client";

import { useState } from "react";
import Link from "next/link";
import type { Check } from "@/lib/types";
import { finalQuestionResult } from "@/lib/types";
import { useAppData } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { ExerciseViewer } from "./ExerciseViewer";
import { QuestionCard } from "./QuestionCard";
import { SendToProfileModal } from "./SendToProfileModal";
import { ProcessingView } from "@/components/quickcheck/ProcessingView";

export function CheckResultView({ check }: { check: Check }) {
  const { correctQuestion, markReviewed, saveCheckToProfile, getClassroom, getStudent } = useAppData();
  const [showSendModal, setShowSendModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (check.status === "processing") {
    return <ProcessingView />;
  }

  if (check.status === "failed") {
    return (
      <Card className="mx-auto max-w-[480px] rounded-[1.75rem] p-8 text-center">
        <div className="mb-3 text-3xl">⚠️</div>
        <h2 className="mb-2 text-lg font-bold text-ink">ตรวจไม่สำเร็จ</h2>
        <p className="text-[13px] leading-[1.6] text-ink/55">
          {check.errorMessage || "เกิดข้อผิดพลาดบางอย่างระหว่างตรวจ กรุณาลองใหม่อีกครั้ง"}
        </p>
      </Card>
    );
  }

  const totalQ = check.questions.length;
  const correctCount = check.questions.filter((q) => finalQuestionResult(q).isCorrect).length;
  const boundClassroom = check.classroomId ? getClassroom(check.classroomId) : undefined;
  const boundStudent = check.classroomId && check.studentId ? getStudent(check.classroomId, check.studentId) : undefined;

  const incorrect = check.questions.filter((q) => !finalQuestionResult(q).isCorrect);
  const areasToImprove = Array.from(new Set(incorrect.flatMap((q) => finalQuestionResult(q).areasToImprove))).slice(0, 6);
  const errorTypes = Array.from(new Set(incorrect.map((q) => finalQuestionResult(q).errorType).filter(Boolean)));

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSave() {
    try {
      await markReviewed(check.id);
      showToast("บันทึกผลแล้ว");
    } catch {
      showToast("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  async function handleSendClick() {
    if (check.classroomId && check.studentId) {
      try {
        await saveCheckToProfile(check.id, check.classroomId, check.studentId);
        showToast("บันทึกลง Student Profile แล้ว");
      } catch {
        showToast("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      }
    } else {
      setShowSendModal(true);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-ink">Student ID: {check.studentLabel}</h1>
            <StatusPill status={check.status} />
          </div>
          <p className="text-[12.5px] text-ink/55">
            {check.topic && <>{check.topic} · </>}
            {new Date(check.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
            {boundStudent && boundClassroom && (
              <>
                {" "}
                ·{" "}
                <Link href={`/classrooms/${boundClassroom.id}/students/${boundStudent.id}`} className="font-semibold text-primary">
                  {boundStudent.name}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3">
          <div className="text-right">
            <div className="text-[10.5px] text-ink/50">คะแนนรวม</div>
            <div className="text-xl font-bold text-ink">
              {correctCount} / {totalQ}
            </div>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-bold"
            style={{ background: "rgba(109,151,115,0.15)", color: "#5b8060" }}
          >
            {check.overallScore}%
          </div>
        </div>
      </div>

      {/* Split screen */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="rounded-[1.75rem] p-4 lg:sticky lg:top-24 lg:h-[calc(100vh-160px)]">
          <div className="mb-2 px-1 font-mono text-[10px] uppercase tracking-wide text-ink/45">Student Exercise</div>
          <div className="h-[420px] lg:h-[calc(100%-28px)]">
            <ExerciseViewer images={check.exerciseImages} />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="rounded-[1.75rem] p-5.5">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-wide text-ink/45">AI Analysis</div>

            {(errorTypes.length > 0 || areasToImprove.length > 0) && (
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {errorTypes.length > 0 && (
                  <div className="rounded-xl bg-[#BB6B53]/8 p-3.5">
                    <div className="mb-1.5 text-[11px] font-bold text-[#BB6B53]">จุดที่ผิดบ่อย</div>
                    {errorTypes.map((e) => (
                      <div key={e} className="text-[12px] leading-[1.6] text-ink/70">
                        • {e}
                      </div>
                    ))}
                  </div>
                )}
                {areasToImprove.length > 0 && (
                  <div className="rounded-xl bg-primary/8 p-3.5">
                    <div className="mb-1.5 text-[11px] font-bold text-primary-dark">ควรเสริม</div>
                    {areasToImprove.map((a) => (
                      <div key={a} className="text-[12px] leading-[1.6] text-ink/70">
                        • {a}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {check.questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  index={i}
                  question={q}
                  onCorrect={(correction) => {
                    correctQuestion(check.id, q.id, correction).catch(() => showToast("แก้ไขไม่สำเร็จ กรุณาลองใหม่"));
                  }}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* CTA bar */}
      <div className="sticky bottom-4 z-20 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-5 py-3.5 backdrop-blur-md">
        <div className="text-[12px] text-ink/50">
          {check.status === "reviewed" ? "ครูตรวจสอบผลแล้ว" : "AI ตรวจให้เบื้องต้น — กรุณาตรวจสอบก่อนบันทึก"}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 text-[12.5px] font-semibold text-primary-dark">
            บันทึก
          </button>
          <button
            onClick={handleSendClick}
            disabled={!!check.savedToProfile}
            className="rounded-full bg-primary px-6 py-2.5 text-[12.5px] font-bold text-card disabled:opacity-60"
          >
            {check.savedToProfile ? "✓ ส่งเข้า Student Profile แล้ว" : "ส่งเข้า Student Profile →"}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-[12.5px] font-semibold text-card shadow-lg">
          {toast}
        </div>
      )}

      {showSendModal && (
        <SendToProfileModal
          checkId={check.id}
          onClose={() => setShowSendModal(false)}
          onSaved={() => {
            setShowSendModal(false);
            showToast("บันทึกลง Student Profile แล้ว");
          }}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Check["status"] }) {
  const meta =
    status === "reviewed"
      ? { label: "✓ ตรวจสอบแล้ว", bg: "rgba(109,151,115,0.15)", color: "#5b8060" }
      : { label: "รอครูตรวจสอบ", bg: "rgba(216,183,95,0.2)", color: "#a8823a" };
  return (
    <span className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}
