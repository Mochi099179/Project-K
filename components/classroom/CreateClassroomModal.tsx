"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/store";
import { CLASSROOM_PROBLEM_OPTIONS } from "@/lib/types";

export function CreateClassroomModal() {
  const { showCreateModal, closeCreateModal, createClassroom } = useAppData();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [problems, setProblems] = useState<string[]>([]);

  if (!showCreateModal) return null;

  function reset() {
    setStep(1);
    setName("");
    setGrade("");
    setProblems([]);
  }

  function handleClose() {
    reset();
    closeCreateModal();
  }

  function toggleProblem(label: string) {
    setProblems((prev) => (prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]));
  }

  function handleSubmit() {
    const id = createClassroom({ name, grade, problems });
    reset();
    router.push(`/classrooms/${id}`);
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
      <div className="relative w-[520px] max-w-[92vw] rounded-[1.75rem] border border-border bg-card p-9">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-lg text-ink/50"
          aria-label="Close"
        >
          ✕
        </button>

        {step === 1 ? (
          <>
            <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
              Step 1 / 2
            </div>
            <h2 className="mb-6 text-2xl font-semibold text-ink">สร้างห้องเรียนใหม่</h2>
            <label className="mb-2 block text-xs text-ink/55">ชื่อห้องเรียน</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ม.2/1"
              className="mb-4.5 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
            />
            <label className="mb-2 block text-xs text-ink/55">ระดับชั้น</label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="เช่น มัธยมศึกษาปีที่ 2"
              className="mb-7 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
            />
            <div className="flex justify-end gap-2.5">
              <button
                onClick={handleClose}
                className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card"
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
              Step 2 / 2
            </div>
            <h2 className="mb-2.5 text-2xl font-semibold text-ink">ปัญหาที่นักเรียนในห้องนี้มี</h2>
            <p className="mb-5 text-[13px] leading-[1.6] text-ink/50">
              เลือกได้หลายข้อ — ระบบจะใช้ข้อมูลนี้เป็นจุดตั้งต้นให้ AI วิเคราะห์ห้องเรียนนี้
            </p>
            <div className="mb-7 flex flex-wrap gap-2">
              {CLASSROOM_PROBLEM_OPTIONS.map((label) => {
                const selected = problems.includes(label);
                return (
                  <button
                    key={label}
                    onClick={() => toggleProblem(label)}
                    className="rounded-full border px-4 py-2.5 text-xs"
                    style={{
                      background: selected ? "rgba(109,151,115,0.15)" : "#FFF7EB",
                      color: selected ? "#5b8060" : "rgba(55,65,81,0.7)",
                      borderColor: selected ? "rgba(109,151,115,0.5)" : "#E5DCC8",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setStep(1)}
                className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card"
              >
                Create Classroom
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
