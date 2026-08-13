import Link from "next/link";
import type { HomeworkUnit } from "@/lib/types";
import { Card } from "@/components/ui/Card";

export function HomeworkUnitCard({ unit }: { unit: HomeworkUnit }) {
  const withAnswerKey = unit.exercises.filter((e) => e.answerKey).length;
  const fileCount = unit.exercises.length + unit.teachingMaterials.length;
  return (
    <Link href={`/homework-units/${unit.id}`}>
      <Card className="h-full p-6 transition-colors hover:border-primary/40">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: "rgba(216,183,95,0.2)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#a8823a" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <rect x="5" y="4" width="14" height="17" rx="2" />
              <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M8 10h8M8 14h8M8 18h5" />
            </svg>
          </div>
          <div>
            <div className="text-base font-bold text-ink">{unit.name}</div>
            <div className="text-[11px] text-ink/50">
              {unit.subject} · {unit.grade}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] text-ink/55">
          <span className="rounded-full bg-cream px-2.5 py-1">{unit.exercises.length} แบบฝึกหัด</span>
          <span className="rounded-full bg-cream px-2.5 py-1">{withAnswerKey} เฉลย</span>
          <span className="rounded-full bg-cream px-2.5 py-1">{unit.teachingMaterials.length} สื่อการสอน</span>
        </div>
        {fileCount === 0 && <div className="mt-2 text-[11px] text-ink/35">ยังไม่มีไฟล์แนบ</div>}
      </Card>
    </Link>
  );
}
