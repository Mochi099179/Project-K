import type { Classroom } from "@/lib/types";
import { getClassroomInsight } from "@/lib/mock-data";
import { Card } from "@/components/ui/Card";

export function ClassroomSidePanel({
  classroom,
  onShowScores,
  onGenerateExercises,
  onGeneratePlan,
  onGenerateTechnique,
}: {
  classroom: Classroom;
  onShowScores: () => void;
  onGenerateExercises: () => void;
  onGeneratePlan: () => void;
  onGenerateTechnique: () => void;
}) {
  const insight = getClassroomInsight(classroom.id);

  const quickTools = [
    { label: "สร้างแบบฝึกหัด", bg: "rgba(109,151,115,0.12)", onClick: onGenerateExercises },
    { label: "สร้างแผนการสอน", bg: "rgba(216,183,95,0.18)", onClick: onGeneratePlan },
    { label: "วิเคราะห์นักเรียน", bg: "rgba(168,198,134,0.25)", onClick: () => onShowScores() },
    { label: "สร้างกิจกรรม", bg: "rgba(187,107,83,0.15)", onClick: onGenerateTechnique },
  ];

  const classroomTasks = [
    { title: "ตรวจแบบฝึกหัด", detail: `${classroom.exercises.inProgress} ชุดกำลังดำเนินการ`, count: classroom.exercises.inProgress },
    { title: "นักเรียนกลุ่มเสี่ยง", detail: "ควรได้รับการติดตาม", count: classroom.riskCount },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <Card className="p-5">
        <div className="mb-2.5 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="#D8B75F" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 3l1.4 4.2L18 8.6l-4.2 1.4L12 14l-1.4-4L6 8.6l4.6-1.4L12 3z" />
          </svg>
          <h3 className="text-[13px] font-bold text-ink">AI Insight ของห้อง {classroom.name}</h3>
        </div>
        <div className="mb-3 text-[10px] text-ink/45">อัปเดตล่าสุด วันนี้ 10:30 น.</div>
        <div className="mb-3.5 flex flex-col gap-2">
          {insight.points.slice(0, 3).map((pt) => (
            <div key={pt} className="text-[11.5px] leading-[1.5] text-ink/70">
              • {pt}
            </div>
          ))}
        </div>
        <button
          onClick={onShowScores}
          className="w-full rounded-full bg-primary py-2.5 text-[11.5px] font-bold text-card"
        >
          ดูข้อเสนอแนะทั้งหมด →
        </button>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-[13px] font-bold text-ink">เครื่องมือด่วน</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickTools.map((tool) => (
            <button
              key={tool.label}
              onClick={tool.onClick}
              className="rounded-2xl p-3 text-center"
              style={{ background: tool.bg }}
            >
              <div className="text-[11px] font-semibold text-ink">{tool.label}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-ink">งานที่ต้องดำเนินการ</h3>
          <span className="text-[10.5px] font-semibold text-primary">ดูทั้งหมด →</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {classroomTasks.map((t) => (
            <div key={t.title} className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-ink">{t.title}</div>
                <div className="text-[10.5px] text-ink/50">{t.detail}</div>
              </div>
              <span className="rounded-full border border-border bg-cream px-2.5 py-0.5 text-xs font-bold text-ink">
                {t.count}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-ink">รายชื่อนักเรียน (คะแนนสูงสุด)</h3>
          <span className="text-[10.5px] font-semibold text-primary">ดูทั้งหมด →</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {classroom.topStudents.map((ts) => (
            <div key={ts.name} className="flex items-center gap-2.5">
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-card"
                style={{ background: ts.badgeBg }}
              >
                {ts.rank}
              </div>
              <span className="flex-1 text-xs text-ink">{ts.name}</span>
              <span className="text-xs font-bold text-primary">{ts.pct}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
