"use client";

import { useState } from "react";
import { useAppData } from "@/lib/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { GuidedClassroomSteps } from "@/components/classroom/GuidedClassroomSteps";

type ModalStep = "select-classroom" | "guided-create" | "select-student" | "confirm";

export function SendToProfileModal({
  checkId,
  onClose,
  onSaved,
}: {
  checkId: string;
  onClose: () => void;
  onSaved: (classroomId: string, studentId: string) => void;
}) {
  const { classrooms, addStudent, saveCheckToProfile } = useAppData();

  const [step, setStep] = useState<ModalStep>(classrooms.length === 0 ? "guided-create" : "select-classroom");
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [dismissedNoClassroom, setDismissedNoClassroom] = useState(false);

  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentName, setNewStudentName] = useState("");

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId) || null;

  const [savingError, setSavingError] = useState<string | null>(null);

  function handleClassroomCreated(classroomId: string) {
    setSelectedClassroomId(classroomId);
    setStep("select-student");
  }

  async function handleAddStudentInline() {
    if (!selectedClassroomId || !newStudentId.trim()) return;
    const classroom = classrooms.find((c) => c.id === selectedClassroomId);
    try {
      const id = await addStudent(selectedClassroomId, {
        name: newStudentName.trim() || `นักเรียน ${newStudentId.trim()}`,
        studentId: newStudentId.trim(),
        seatNo: (classroom?.students.length ?? 0) + 1,
        gender: "M",
      });
      setSelectedStudentId(id);
      setNewStudentId("");
      setNewStudentName("");
      setStep("confirm");
    } catch {
      setSavingError("เพิ่มนักเรียนไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  async function handleConfirm() {
    if (!selectedClassroomId || !selectedStudentId) return;
    try {
      await saveCheckToProfile(checkId, selectedClassroomId, selectedStudentId);
      onSaved(selectedClassroomId, selectedStudentId);
    } catch {
      setSavingError("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="relative max-h-[90vh] w-[560px] max-w-full overflow-y-auto rounded-[1.75rem] border border-border bg-card p-9">
        <button onClick={onClose} className="absolute top-5 right-5 text-lg text-ink/50" aria-label="Close">
          ✕
        </button>

        {step === "select-classroom" && classrooms.length === 0 && !dismissedNoClassroom && (
          <EmptyState
            icon={<span className="text-2xl">🏫</span>}
            title="ยังไม่มี Classroom"
            description="สร้าง Classroom เพื่อเก็บประวัติการเรียนรู้และติดตามพัฒนาการของนักเรียน"
            action={
              <button onClick={() => setStep("guided-create")} className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card">
                สร้าง Classroom
              </button>
            }
            secondaryAction={
              <button onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/60">
                ไว้ก่อน
              </button>
            }
          />
        )}

        {step === "select-classroom" && classrooms.length > 0 && (
          <>
            <h2 className="mb-1.5 text-xl font-semibold text-ink">บันทึกผลไปยัง Student Profile</h2>
            <p className="mb-5 text-[13px] text-ink/50">เลือกห้องเรียนที่จะเก็บผลนี้</p>
            <div className="mb-5 flex max-h-[300px] flex-col gap-2 overflow-y-auto">
              {classrooms.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClassroomId(c.id)}
                  className="flex items-center justify-between rounded-xl border px-4 py-3 text-left"
                  style={{
                    borderColor: selectedClassroomId === c.id ? "#6D9773" : "var(--color-border)",
                    background: selectedClassroomId === c.id ? "rgba(109,151,115,0.08)" : "transparent",
                  }}
                >
                  <span>
                    <span className="block text-[13px] font-bold text-ink">
                      {c.name} {c.subject}
                    </span>
                    <span className="block text-[11px] text-ink/50">{c.students.length} คน</span>
                  </span>
                  {selectedClassroomId === c.id && <span className="text-primary">✓</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setStep("guided-create")} className="mb-6 text-[12.5px] font-semibold text-primary">
              + สร้างห้องเรียนใหม่
            </button>
            <div className="flex justify-end gap-2.5">
              <button onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
                ยกเลิก
              </button>
              <button
                onClick={() => setStep("select-student")}
                disabled={!selectedClassroomId}
                className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card disabled:opacity-40"
              >
                ถัดไป →
              </button>
            </div>
          </>
        )}

        {step === "guided-create" && (
          <GuidedClassroomSteps
            onCancel={() => {
              if (classrooms.length === 0) {
                setDismissedNoClassroom(false);
                setStep("select-classroom");
              } else {
                setStep("select-classroom");
              }
            }}
            onCreated={handleClassroomCreated}
          />
        )}

        {step === "select-student" && selectedClassroom && (
          <>
            <h2 className="mb-1.5 text-xl font-semibold text-ink">เลือกนักเรียน</h2>
            <p className="mb-5 text-[13px] text-ink/50">
              ในห้อง {selectedClassroom.name} {selectedClassroom.subject}
            </p>
            {selectedClassroom.students.length > 0 && (
              <div className="mb-5 flex max-h-[240px] flex-col gap-2 overflow-y-auto">
                {selectedClassroom.students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className="flex items-center justify-between rounded-xl border px-4 py-3 text-left"
                    style={{
                      borderColor: selectedStudentId === s.id ? "#6D9773" : "var(--color-border)",
                      background: selectedStudentId === s.id ? "rgba(109,151,115,0.08)" : "transparent",
                    }}
                  >
                    <span className="text-[13px] font-semibold text-ink">
                      {s.name} · เลขที่ {s.seatNo}
                    </span>
                    {selectedStudentId === s.id && <span className="text-primary">✓</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-6 rounded-xl border border-dashed border-border p-3.5">
              <div className="mb-2 text-[11.5px] font-semibold text-ink/60">หรือเพิ่มนักเรียนใหม่</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="รหัสนักเรียน"
                  className="flex-1 rounded-lg border border-border bg-cream px-3 py-2 text-[12.5px] text-ink outline-none"
                />
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="ชื่อ (ไม่บังคับ)"
                  className="flex-1 rounded-lg border border-border bg-cream px-3 py-2 text-[12.5px] text-ink outline-none"
                />
                <button
                  onClick={handleAddStudentInline}
                  disabled={!newStudentId.trim()}
                  className="rounded-lg bg-primary/15 px-4 py-2 text-[12px] font-bold text-primary-dark disabled:opacity-40"
                >
                  + เพิ่มและเลือก
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button onClick={() => setStep("select-classroom")} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
                ย้อนกลับ
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={!selectedStudentId}
                className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card disabled:opacity-40"
              >
                ถัดไป →
              </button>
            </div>
          </>
        )}

        {step === "confirm" && selectedClassroom && (
          <>
            <h2 className="mb-1.5 text-xl font-semibold text-ink">ยืนยันการบันทึก</h2>
            <p className="mb-5 text-[13px] text-ink/50">ผลตรวจนี้จะถูกบันทึกลง Student Profile ของ</p>
            <div className="mb-7 rounded-xl bg-cream p-4">
              <div className="text-[13px] font-bold text-ink">
                {selectedClassroom.students.find((s) => s.id === selectedStudentId)?.name}
              </div>
              <div className="text-[11.5px] text-ink/55">
                {selectedClassroom.name} {selectedClassroom.subject}
              </div>
            </div>
            {savingError && (
              <div className="mb-4 rounded-xl border border-[#BB6B53]/30 bg-[#BB6B53]/10 px-4 py-3 text-[12.5px] text-[#BB6B53]">
                {savingError}
              </div>
            )}
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setStep("select-student")} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
                ย้อนกลับ
              </button>
              <button onClick={handleConfirm} className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card">
                ยืนยันและบันทึก
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
