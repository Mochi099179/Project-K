"use client";

import { useParams, useRouter } from "next/navigation";
import { useAppData } from "@/lib/store";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { FileList } from "@/components/homeworkunit/FileList";

export default function HomeworkUnitDetailPage() {
  const params = useParams<{ unitId: string }>();
  const router = useRouter();
  const { getHomeworkUnit, addFileToUnit } = useAppData();
  const unit = getHomeworkUnit(params.unitId);

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
          <button
            onClick={() => router.push(`/quick-check?unitId=${unit.id}&topic=${encodeURIComponent(unit.name)}`)}
            className="rounded-2xl bg-primary px-5 py-3 text-[13px] font-bold text-card"
          >
            ตรวจแบบฝึกหัดจากชุดนี้ →
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <FileList
            title="Exercises"
            description="แบบฝึกหัดในชุดนี้"
            files={unit.exercises}
            onAdd={(file, kind) => addFileToUnit(unit.id, "exercises", file, kind)}
            emptyLabel="ยังไม่มีแบบฝึกหัด"
          />
          <FileList
            title="Answer Keys"
            description="เฉลยของชุดนี้"
            files={unit.answerKeys}
            onAdd={(file, kind) => addFileToUnit(unit.id, "answerKeys", file, kind)}
            emptyLabel="ยังไม่มีเฉลย"
          />
          <FileList
            title="Teaching Materials"
            description="สื่อ/เอกสารประกอบการสอน"
            files={unit.teachingMaterials}
            onAdd={(file, kind) => addFileToUnit(unit.id, "teachingMaterials", file, kind)}
            emptyLabel="ยังไม่มีสื่อการสอน"
          />
        </div>
      </div>
    </div>
  );
}
