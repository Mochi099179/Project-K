import type { Check } from "@/lib/types";
import { computeStudentInsights, type ConceptStat } from "@/lib/analysis";
import { Card } from "@/components/ui/Card";

export function LearningProfileCard({ checks }: { checks: Check[] }) {
  const insights = computeStudentInsights(checks);

  if (insights.totalChecks === 0) {
    return (
      <Card className="rounded-[1.75rem] p-7 text-center">
        <p className="text-[13px] leading-[1.6] text-ink/45">
          ยังไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์ — ตรวจการบ้านนักเรียนคนนี้เพื่อเริ่มสร้าง Learning Profile
        </p>
      </Card>
    );
  }

  return (
    <Card className="rounded-[1.75rem] p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold text-ink">Learning Profile</h3>
          <p className="text-[11px] text-ink/45">
            จาก {insights.totalChecks} ครั้งที่ตรวจ · {insights.totalQuestions} ข้อ
          </p>
        </div>
        {insights.accuracy !== null && (
          <span className="rounded-full bg-primary/12 px-3 py-1.5 text-[12.5px] font-bold text-primary-dark">
            ถูกต้องสะสม {insights.accuracy}%
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ConceptColumn title="สิ่งที่เข้าใจแล้ว" color="#5b8060" bg="rgba(109,151,115,0.1)" items={insights.strongConcepts} emptyLabel="ยังไม่มีข้อมูล" />
        <ConceptColumn title="ควรเสริม" color="#a8823a" bg="rgba(216,183,95,0.18)" items={insights.weakConcepts} emptyLabel="ยังไม่มีข้อมูล" />
        <ConceptColumn title="ข้อผิดพลาดที่พบบ่อย" color="#BB6B53" bg="rgba(187,107,83,0.12)" items={insights.errorPatterns} emptyLabel="ไม่พบรูปแบบชัดเจน" />
      </div>
    </Card>
  );
}

function ConceptColumn({
  title,
  color,
  bg,
  items,
  emptyLabel,
}: {
  title: string;
  color: string;
  bg: string;
  items: ConceptStat[];
  emptyLabel: string;
}) {
  return (
    <div>
      <div className="mb-2 text-[11.5px] font-bold" style={{ color }}>
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-ink/40">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <div key={it.label} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: bg }}>
              <span className="text-[11.5px] text-ink">{it.label}</span>
              <span className="text-[10.5px] font-bold" style={{ color }}>
                ×{it.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
