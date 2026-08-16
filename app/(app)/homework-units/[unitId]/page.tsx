"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppData } from "@/lib/store";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { FileList } from "@/components/homeworkunit/FileList";
import { ExerciseList } from "@/components/homeworkunit/ExerciseList";

const OCR_POLL_INTERVAL_MS = 4_000;

export default function HomeworkUnitDetailPage() {
  const params = useParams<{ unitId: string }>();
  const router = useRouter();
  const { getHomeworkUnit, addFileToUnit, deleteHomeworkUnit, refreshHomeworkUnit } = useAppData();
  const unit = getHomeworkUnit(params.unitId);
  const [deleting, setDeleting] = useState(false);

  // Light polling while any reference file's OCR cache is still being
  // filled in the background — stops itself once nothing is left pending.
  // Scoped to this page only; no app-wide polling/Realtime infra exists yet.
  useEffect(() => {
    if (!unit) return;
    const statuses = [
      ...unit.exercises.flatMap((e) => [e.exerciseFileOcrStatus, e.answerKey?.ocrStatus ?? null]),
      ...unit.teachingMaterials.map((m) => m.ocrStatus),
    ];
    const hasPending = statuses.some((s) => s === "pending" || s === "processing");
    if (!hasPending) return;
    const timer = setTimeout(() => void refreshHomeworkUnit(unit.id), OCR_POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [unit, refreshHomeworkUnit]);

  async function handleDeleteUnit() {
    if (!unit || !confirm(`ลบ Homework Unit "${unit.name}"? แบบฝึกหัด เฉลย และสื่อการสอนทั้งหมดในชุดนี้จะถูกลบด้วย`)) return;
    setDeleting(true);
    try {
      await deleteHomeworkUnit(unit.id);
      router.push("/homework-units");
    } catch {
      setDeleting(false);
    }
  }

  if (!unit) {
    return (
      <div>
        <BreadcrumbBar section={{ label: "Homework Unit", href: "/homework-units" }} />
        <div className="px-10 py-16 text-center text-ink/50">ไม่พบชุดแบบฝึกหัดนี้</div>
      </div>
    );
  }

  return (
    <div>
      <BreadcrumbBar section={{ label: "Homework Unit", href: "/homework-units" }} tail={unit.name} />
      <div className="px-6 py-8 pb-20 sm:px-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-15 w-15 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: "rgba(216,183,95,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#a8823a" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M8 10h8M8 14h8M8 18h5" />
              </svg>
            </div>
            <div>
              <h1 className="text-[1.5rem] font-bold tracking-tight text-ink sm:text-[1.7rem]">{unit.name}</h1>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="rounded-full bg-gold/25 px-3 py-1 text-[11px] font-semibold text-[#a8823a]">{unit.subject}</span>
                <span className="rounded-full border border-border bg-cream px-3 py-1 text-[11px] font-semibold text-ink">
                  ระดับชั้น {unit.grade}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button onClick={handleDeleteUnit} disabled={deleting} className="rounded-2xl border border-border px-5 py-3 text-[13px] font-semibold text-[#BB6B53] disabled:opacity-40">
              {deleting ? "กำลังลบ..." : "ลบ Homework Unit"}
            </button>
            <button
              onClick={() => router.push(`/quick-check?unitId=${unit.id}`)}
              className="rounded-2xl bg-primary px-5 py-3 text-[13px] font-bold text-card"
            >
              ตรวจแบบฝึกหัดจากชุดนี้ →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ExerciseList homeworkUnitId={unit.id} exercises={unit.exercises} />
          <FileList
            homeworkUnitId={unit.id}
            title="Teaching Materials"
            description="สื่อ/เอกสารประกอบการสอน"
            files={unit.teachingMaterials}
            onAdd={(file, kind) => addFileToUnit(unit.id, file, kind)}
            emptyLabel="ยังไม่มีสื่อการสอน"
          />
        </div>
      </div>
    </div>
  );
}
