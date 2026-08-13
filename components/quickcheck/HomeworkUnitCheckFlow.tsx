"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { readAttachedFile, ACCEPTED_ATTACHMENT_TYPES, type ReadFileResult } from "@/lib/files";
import { Card } from "@/components/ui/Card";

const KIND_THUMBNAIL_ICON: Record<ReadFileResult["kind"], string> = { image: "🖼️", pdf: "📄", text: "📝", other: "📎" };

export function HomeworkUnitCheckFlow({
  presetClassroomId = null,
  presetStudentId = null,
  presetStudentLabel = "",
  lockStudent = false,
  initialHomeworkUnitId = null,
  onStarted,
}: {
  presetClassroomId?: string | null;
  presetStudentId?: string | null;
  presetStudentLabel?: string;
  lockStudent?: boolean;
  initialHomeworkUnitId?: string | null;
  onStarted: (checkId: string) => void;
}) {
  const { homeworkUnits, startCheck } = useAppData();
  const [homeworkUnitId, setHomeworkUnitId] = useState<string | null>(initialHomeworkUnitId);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [studentLabel, setStudentLabel] = useState(presetStudentLabel);
  const [studentWork, setStudentWork] = useState<ReadFileResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedUnit = homeworkUnits.find((u) => u.id === homeworkUnitId) ?? null;
  const exercises = selectedUnit?.exercises ?? [];
  const selectedExercise = exercises.find((e) => e.id === exerciseId) ?? null;

  function handleHomeworkUnitChange(id: string | null) {
    // Drop any Exercise selection from the previous unit — the dropdown
    // below is always scoped to the current one.
    setHomeworkUnitId(id);
    setExerciseId(null);
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const read = await Promise.all(Array.from(files).map(readAttachedFile));
    setStudentWork((prev) => [...prev, ...read]);
  }

  const hasAnswerKey = !!selectedExercise?.answerKey;
  const canStart = !!homeworkUnitId && !!exerciseId && studentLabel.trim() !== "" && studentWork.length > 0 && hasAnswerKey;

  async function handleStart() {
    if (!canStart || submitting || !selectedExercise || !homeworkUnitId || !exerciseId) return;
    setSubmitting(true);
    setError(null);
    try {
      const checkId = await startCheck({
        studentLabel: studentLabel.trim(),
        topic: selectedExercise.title,
        exerciseImages: studentWork,
        classroomId: presetClassroomId,
        studentId: presetStudentId,
        homeworkUnitId,
        exerciseId,
      });
      onStarted(checkId);
    } catch {
      setError("เริ่มตรวจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  if (homeworkUnits.length === 0) {
    return (
      <Card className="rounded-[1.75rem] p-8 text-center">
        <p className="mb-4 text-[13px] leading-[1.6] text-ink/55">
          ยังไม่มี Homework Unit — สร้างชุดแบบฝึกหัดไว้ก่อน แล้วกลับมาเลือกใช้ตรงนี้ได้โดยไม่ต้องอัปโหลดซ้ำทุกครั้ง
        </p>
        <Link href="/homework-units" className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card">
          ไปที่ Homework Unit →
        </Link>
      </Card>
    );
  }

  return (
    <Card className="rounded-[1.75rem] p-7 sm:p-9">
      <h2 className="mb-1.5 text-lg font-bold text-ink">เลือก Homework Unit</h2>
      <p className="mb-5 text-[13px] leading-[1.6] text-ink/55">
        ระบบจะโหลดแบบฝึกหัด เฉลย เกณฑ์การให้คะแนน และสื่อการสอนให้อัตโนมัติ — ไม่ต้องอัปโหลดซ้ำ
      </p>

      <label className="mb-2 block text-xs text-ink/55">Homework Unit</label>
      <select
        value={homeworkUnitId ?? ""}
        onChange={(e) => handleHomeworkUnitChange(e.target.value || null)}
        className="mb-4.5 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
      >
        <option value="">— เลือก Homework Unit —</option>
        {homeworkUnits.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} · {u.subject}
          </option>
        ))}
      </select>

      <label className="mb-2 block text-xs text-ink/55">Exercise</label>
      <select
        value={exerciseId ?? ""}
        onChange={(e) => setExerciseId(e.target.value || null)}
        disabled={!homeworkUnitId}
        className="mb-5 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none disabled:opacity-50"
      >
        <option value="">
          {homeworkUnitId ? (exercises.length ? "— เลือก Exercise —" : "ยังไม่มีแบบฝึกหัดในชุดนี้") : "เลือก Homework Unit ก่อน"}
        </option>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.title}
          </option>
        ))}
      </select>

      {selectedExercise && (
        <div className="mb-6 rounded-2xl border border-primary/25 bg-primary/8 p-4.5">
          <div className="mb-2.5 text-[12.5px] font-bold text-primary-dark">บริบทที่โหลดให้อัตโนมัติ</div>
          <div className="flex flex-col gap-1.5 text-[12.5px]">
            <ContextRow ok={!!selectedExercise.exerciseFilePath} label="ไฟล์แบบฝึกหัด" />
            <ContextRow ok={hasAnswerKey} label="เฉลย" />
            <ContextRow ok={!!selectedExercise.scoringCriteria} label="เกณฑ์การให้คะแนน" />
            <ContextRow
              ok={(selectedUnit?.teachingMaterials.length ?? 0) > 0}
              label={`สื่อการสอน (${selectedUnit?.teachingMaterials.length ?? 0} ไฟล์)`}
            />
          </div>
          {!hasAnswerKey && (
            <p className="mt-3 text-[11.5px] text-[#BB6B53]">แบบฝึกหัดนี้ยังไม่มีเฉลย — เพิ่มเฉลยที่หน้า Homework Unit ก่อนเริ่มตรวจ</p>
          )}
        </div>
      )}

      <label className="mb-2 block text-xs text-ink/55">Student ID</label>
      <input
        type="text"
        value={studentLabel}
        onChange={(e) => setStudentLabel(e.target.value)}
        placeholder="เช่น 005"
        disabled={lockStudent}
        className="mb-5 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none disabled:opacity-70"
      />

      <label className="mb-2 block text-xs text-ink/55">งานของนักเรียน (Student Work)</label>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/8 px-4 py-5 text-center text-[13px] font-semibold text-primary-dark"
      >
        <span className="text-base">📎</span> แนบไฟล์งานของนักเรียน (รูปภาพ, PDF, ข้อความ)
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_ATTACHMENT_TYPES.join(",")}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      {studentWork.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {studentWork.map((f, i) => (
            <span key={f.name + i} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-ink">
              {f.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.dataUrl} alt="" className="h-4 w-4 rounded-sm object-cover" />
              ) : (
                <span className="text-sm leading-none">{KIND_THUMBNAIL_ICON[f.kind]}</span>
              )}
              {f.name}
              <button onClick={() => setStudentWork((prev) => prev.filter((_, idx) => idx !== i))} className="text-ink/40 hover:text-ink">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-[#BB6B53]/30 bg-[#BB6B53]/10 px-4 py-3 text-[12.5px] text-[#BB6B53]">{error}</div>
      )}

      <button
        onClick={handleStart}
        disabled={!canStart || submitting}
        className="w-full rounded-full bg-primary px-8 py-3.5 text-[13.5px] font-bold text-card transition-transform hover:scale-[1.01] disabled:opacity-50"
      >
        {submitting ? "กำลังเริ่มตรวจ..." : "เริ่มตรวจ →"}
      </button>
    </Card>
  );
}

function ContextRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: ok ? "#5b8060" : "rgba(55,65,81,0.35)" }}>{ok ? "✓" : "—"}</span>
      <span style={{ color: ok ? "#374151" : "rgba(55,65,81,0.4)" }}>{label}</span>
    </div>
  );
}
