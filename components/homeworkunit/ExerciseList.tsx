"use client";

import { useRef, useState } from "react";
import type { Exercise, FileKind } from "@/lib/types";
import { useAppData } from "@/lib/store";
import { Card } from "@/components/ui/Card";

function inferKind(name: string): FileKind {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return "other";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["txt", "md", "doc", "docx"].includes(ext)) return "text";
  return "other";
}

export function ExerciseList({ homeworkUnitId, exercises }: { homeworkUnitId: string; exercises: Exercise[] }) {
  const { deleteExercise } = useAppData();
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("ลบแบบฝึกหัดนี้? ไฟล์เฉลยและไฟล์แบบฝึกหัดที่แนบไว้จะถูกลบด้วย")) return;
    setDeletingId(id);
    try {
      await deleteExercise(homeworkUnitId, id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="rounded-[1.75rem] p-5.5 lg:col-span-2">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-ink">Exercises</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-full bg-primary/12 px-3.5 py-2 text-[11.5px] font-bold text-primary-dark"
        >
          + เพิ่มแบบฝึกหัด
        </button>
      </div>
      <p className="mb-4 text-[11.5px] text-ink/50">แบบฝึกหัดในชุดนี้ พร้อมเฉลยและเกณฑ์การให้คะแนน — เลือกใช้ได้ทันทีตอนตรวจ ไม่ต้องอัปโหลดซ้ำ</p>

      {exercises.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-[12.5px] text-ink/40">ยังไม่มีแบบฝึกหัด</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {exercises.map((ex) => (
            <div key={ex.id} className="rounded-xl bg-cream px-4 py-3.5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">{ex.title}</div>
                  {ex.description && <div className="mt-0.5 text-[11.5px] text-ink/55">{ex.description}</div>}
                </div>
                <button
                  onClick={() => handleDelete(ex.id)}
                  disabled={deletingId === ex.id}
                  className="flex-shrink-0 text-[11px] font-semibold text-[#BB6B53] disabled:opacity-40"
                >
                  {deletingId === ex.id ? "กำลังลบ..." : "ลบ"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge ok={!!ex.exerciseFilePath} label="ไฟล์แบบฝึกหัด" />
                <Badge ok={!!ex.answerKey} label="เฉลย" />
                <Badge ok={!!ex.scoringCriteria} label="เกณฑ์การให้คะแนน" />
              </div>
              {ex.scoringCriteria && <p className="mt-2 text-[11px] leading-[1.5] text-ink/55">{ex.scoringCriteria}</p>}
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateExerciseModal homeworkUnitId={homeworkUnitId} onClose={() => setShowCreate(false)} />}
    </Card>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
        ok ? "bg-primary/12 text-primary-dark" : "border border-dashed border-border text-ink/35"
      }`}
    >
      {ok ? "✓" : "—"} {label}
    </span>
  );
}

function CreateExerciseModal({ homeworkUnitId, onClose }: { homeworkUnitId: string; onClose: () => void }) {
  const { createExercise } = useAppData();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scoringCriteria, setScoringCriteria] = useState("");
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [exerciseFile, setExerciseFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exerciseFileRef = useRef<HTMLInputElement>(null);
  const answerKeyFileRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createExercise(homeworkUnitId, {
        title: title.trim(),
        description: description.trim() || undefined,
        scoringCriteria: scoringCriteria.trim() || undefined,
        exerciseFile: exerciseFile ? { file: exerciseFile, kind: inferKind(exerciseFile.name) } : null,
        answerKeyFile: answerKeyFile ? { file: answerKeyFile, kind: inferKind(answerKeyFile.name) } : null,
        answerKeyText: answerKeyText.trim() || undefined,
      });
      onClose();
    } catch {
      setError("บันทึกแบบฝึกหัดไม่สำเร็จ กรุณาลองใหม่");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="relative max-h-[88vh] w-[520px] max-w-[92vw] overflow-y-auto rounded-[1.75rem] border border-border bg-card p-9">
        <button onClick={onClose} className="absolute top-5 right-5 text-lg text-ink/50" aria-label="Close">
          ✕
        </button>
        <h2 className="mb-6 text-2xl font-semibold text-ink">เพิ่มแบบฝึกหัด</h2>

        <label className="mb-2 block text-xs text-ink/55">ชื่อแบบฝึกหัด</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="เช่น การบวกเศษส่วน"
          className="mb-4.5 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
        />

        <label className="mb-2 block text-xs text-ink/55">คำอธิบาย (ไม่บังคับ)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mb-4.5 w-full resize-none rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
        />

        <label className="mb-2 block text-xs text-ink/55">ไฟล์แบบฝึกหัด (ไม่บังคับ)</label>
        <FilePickButton fileName={exerciseFile?.name} onPick={() => exerciseFileRef.current?.click()} onClear={() => setExerciseFile(null)} />
        <input
          ref={exerciseFileRef}
          type="file"
          className="hidden"
          onChange={(e) => setExerciseFile(e.target.files?.[0] ?? null)}
        />

        <label className="mb-2 mt-4.5 block text-xs text-ink/55">เฉลย (พิมพ์ข้อความ หรือแนบไฟล์อย่างใดอย่างหนึ่ง)</label>
        <textarea
          value={answerKeyText}
          onChange={(e) => setAnswerKeyText(e.target.value)}
          rows={2}
          placeholder="พิมพ์เฉลยที่นี่..."
          className="mb-2.5 w-full resize-none rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
        />
        <FilePickButton
          fileName={answerKeyFile?.name}
          onPick={() => answerKeyFileRef.current?.click()}
          onClear={() => setAnswerKeyFile(null)}
          label="หรือแนบไฟล์เฉลย"
        />
        <input
          ref={answerKeyFileRef}
          type="file"
          className="hidden"
          onChange={(e) => setAnswerKeyFile(e.target.files?.[0] ?? null)}
        />

        <label className="mb-2 mt-4.5 block text-xs text-ink/55">เกณฑ์การให้คะแนน (ไม่บังคับ)</label>
        <textarea
          value={scoringCriteria}
          onChange={(e) => setScoringCriteria(e.target.value)}
          rows={3}
          placeholder="เช่น 2 คะแนนถ้าตอบถูก, 1 คะแนนถ้าวิธีถูกแต่คำนวณผิด, 0 คะแนนถ้าวิธีผิด"
          className="mb-6 w-full resize-none rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
        />

        {error && <p className="mb-4 text-[12.5px] text-[#BB6B53]">{error}</p>}

        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
            ยกเลิก
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || saving}
            className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card disabled:opacity-40"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilePickButton({
  fileName,
  onPick,
  onClear,
  label = "แนบไฟล์",
}: {
  fileName?: string;
  onPick: () => void;
  onClear: () => void;
  label?: string;
}) {
  return fileName ? (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-ink">
      📎 {fileName}
      <button onClick={onClear} className="text-ink/40 hover:text-ink">
        ✕
      </button>
    </span>
  ) : (
    <button onClick={onPick} className="rounded-xl border border-dashed border-border bg-cream px-4 py-2.5 text-[12.5px] font-semibold text-ink/55">
      📎 {label}
    </button>
  );
}
