"use client";

import { useState } from "react";
import { useAppData } from "@/lib/store";
import { CLASSROOM_PROBLEM_OPTIONS } from "@/lib/types";

type Step = 1 | 2 | 3 | 4 | 5;

type DraftStudent = { studentId: string; name: string; gender: "M" | "F" };

export function GuidedClassroomSteps({
  onCreated,
  onCancel,
}: {
  onCreated: (classroomId: string) => void;
  onCancel?: () => void;
}) {
  const { createClassroom } = useAppData();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [students, setStudents] = useState<DraftStudent[]>([]);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [createdId, setCreatedId] = useState<string | null>(null);

  function toggleProblem(label: string) {
    setProblems((prev) => (prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]));
  }

  function addDraftStudent() {
    if (!studentId.trim()) return;
    setStudents((prev) => [...prev, { studentId: studentId.trim(), name: studentName.trim(), gender }]);
    setStudentId("");
    setStudentName("");
  }

  function handleConfirm() {
    const id = createClassroom({
      name,
      grade,
      problems,
      students: students.map((s) => ({ studentId: s.studentId, name: s.name || undefined, gender: s.gender })),
    });
    setCreatedId(id);
    setStep(5);
  }

  return (
    <div>
      <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
        สร้างห้องเรียนใหม่ · ขั้นตอน {Math.min(step, 4)} / 4
      </div>

      {step === 1 && (
        <>
          <h2 className="mb-2 text-xl font-semibold text-ink">ข้อมูลห้องเรียน</h2>
          <p className="mb-5 text-[13px] text-ink/50">เริ่มจากชื่อและระดับชั้นของห้องเรียน</p>
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
            {onCancel && (
              <button onClick={onCancel} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
                ยกเลิก
              </button>
            )}
            <button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card disabled:opacity-40"
            >
              ถัดไป →
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="mb-2 text-xl font-semibold text-ink">ปัญหาที่นักเรียนในห้องนี้มี</h2>
          <p className="mb-5 text-[13px] leading-[1.6] text-ink/50">
            เลือกได้หลายข้อ (ไม่บังคับ) — ระบบจะใช้ข้อมูลนี้เป็นจุดตั้งต้นให้ AI วิเคราะห์ห้องเรียนนี้
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
            <button onClick={() => setStep(1)} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
              ย้อนกลับ
            </button>
            <button onClick={() => setStep(3)} className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card">
              ถัดไป →
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="mb-2 text-xl font-semibold text-ink">สร้าง Student Profile</h2>
          <p className="mb-5 text-[13px] leading-[1.6] text-ink/50">
            ใช้รหัสนักเรียนแทนชื่อจริงได้ ไม่บังคับกรอกชื่อ — ข้ามขั้นตอนนี้แล้วเพิ่มทีหลังก็ได้
          </p>
          <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="รหัสนักเรียน เช่น 005"
              className="rounded-xl border border-border bg-cream px-3.5 py-2.5 text-[13px] text-ink outline-none"
            />
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="ชื่อ (ไม่บังคับ)"
              className="rounded-xl border border-border bg-cream px-3.5 py-2.5 text-[13px] text-ink outline-none"
            />
            <div className="flex gap-1.5">
              {(["M", "F"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className="rounded-xl border px-3 py-2.5 text-xs"
                  style={{
                    background: gender === g ? "rgba(109,151,115,0.15)" : "#FFF7EB",
                    color: gender === g ? "#5b8060" : "rgba(55,65,81,0.7)",
                    borderColor: gender === g ? "rgba(109,151,115,0.5)" : "#E5DCC8",
                  }}
                >
                  {g === "M" ? "ชาย" : "หญิง"}
                </button>
              ))}
            </div>
            <button onClick={addDraftStudent} disabled={!studentId.trim()} className="rounded-xl bg-primary/15 px-4 py-2.5 text-xs font-bold text-primary-dark disabled:opacity-40">
              + เพิ่ม
            </button>
          </div>
          {students.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {students.map((s, i) => (
                <span key={s.studentId + i} className="flex items-center gap-1.5 rounded-full border border-border bg-cream px-3 py-1.5 text-[11px] text-ink">
                  {s.name || `นักเรียน ${s.studentId}`} · {s.studentId}
                  <button onClick={() => setStudents((prev) => prev.filter((_, idx) => idx !== i))} className="text-ink/40 hover:text-ink">
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-2.5">
            <button onClick={() => setStep(2)} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
              ย้อนกลับ
            </button>
            <button onClick={() => setStep(4)} className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card">
              ถัดไป →
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h2 className="mb-2 text-xl font-semibold text-ink">ยืนยันข้อมูลห้องเรียน</h2>
          <div className="mb-7 flex flex-col gap-2">
            <SummaryRow label="ชื่อห้องเรียน" value={name} />
            <SummaryRow label="ระดับชั้น" value={grade || "-"} />
            <SummaryRow label="ปัญหาที่ระบุ" value={problems.length ? problems.join(", ") : "ไม่ได้ระบุ"} />
            <SummaryRow label="นักเรียน" value={students.length ? `${students.length} คน` : "ยังไม่มี (เพิ่มทีหลังได้)"} />
          </div>
          <div className="flex justify-end gap-2.5">
            <button onClick={() => setStep(3)} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
              ย้อนกลับ
            </button>
            <button onClick={handleConfirm} className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card">
              สร้างห้องเรียน
            </button>
          </div>
        </>
      )}

      {step === 5 && createdId && (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-2xl text-primary">✓</div>
          <h2 className="mb-1.5 text-xl font-semibold text-ink">สร้างห้องเรียนสำเร็จ</h2>
          <p className="mb-7 text-[13px] text-ink/55">
            {name} พร้อมใช้งานแล้ว {students.length > 0 && `พร้อมนักเรียน ${students.length} คน`}
          </p>
          <button onClick={() => onCreated(createdId)} className="rounded-full bg-primary px-7 py-3 text-[13px] font-bold text-card">
            ดำเนินการต่อ →
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-cream px-4 py-3">
      <span className="text-[12.5px] text-ink/55">{label}</span>
      <span className="text-[12.5px] font-semibold text-ink">{value}</span>
    </div>
  );
}
