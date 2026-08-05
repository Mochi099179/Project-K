import type { Classroom } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/ui/TrendChart";
import { DonutChart } from "@/components/ui/DonutChart";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ExerciseTable } from "../ExerciseTable";

const statIcon = {
  students: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M15.3 14.2c2.7.5 4.7 2.8 4.7 5.8" />
    </svg>
  ),
  exercises: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M8 10h8M8 14h8M8 18h5" />
    </svg>
  ),
  score: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-5 4 4 8-9" />
    </svg>
  ),
  risk: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9L2.8 17a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    </svg>
  ),
};

const groupMeta = [
  { key: "excellent" as const, label: "กลุ่มเก่ง", range: "≥ 90% · คน", bg: "rgba(109,151,115,0.12)" },
  { key: "good" as const, label: "กลุ่มดี", range: "80-89% · คน", bg: "rgba(168,198,134,0.25)" },
  { key: "developing" as const, label: "กลุ่มพัฒนา", range: "70-79% · คน", bg: "rgba(216,183,95,0.2)" },
  { key: "support" as const, label: "กลุ่มเสริม", range: "< 70% · คน", bg: "rgba(187,107,83,0.15)" },
];

export function OverviewTab({ classroom, onGenerateExercises }: { classroom: Classroom; onGenerateExercises: () => void }) {
  const genderMale = classroom.students.filter((s) => s.gender === "M").length;
  const genderFemale = classroom.students.filter((s) => s.gender === "F").length;

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Card className="p-4.5">
          <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(109,151,115,0.15)", color: "#6D9773" }}>
            <span className="h-4 w-4">{statIcon.students}</span>
          </div>
          <div className="text-[11px] text-ink/55">นักเรียนทั้งหมด</div>
          <div className="text-[1.4rem] font-bold text-ink">{classroom.students.length} คน</div>
          <div className="mt-0.5 text-[10.5px] text-ink/45">
            ชาย {genderMale} · หญิง {genderFemale}
          </div>
        </Card>
        <Card className="p-4.5">
          <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(216,183,95,0.18)", color: "#D8B75F" }}>
            <span className="h-4 w-4">{statIcon.exercises}</span>
          </div>
          <div className="text-[11px] text-ink/55">แบบฝึกหัดทั้งหมด</div>
          <div className="text-[1.4rem] font-bold text-ink">{classroom.exercises.total} ชุด</div>
          <div className="mt-0.5 text-[10.5px] text-ink/45">
            เสร็จสิ้น {classroom.exercises.completed} · กำลังดำเนินการ {classroom.exercises.inProgress}
          </div>
        </Card>
        <Card className="p-4.5">
          <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(168,198,134,0.25)", color: "#5b8060" }}>
            <span className="h-4 w-4">{statIcon.score}</span>
          </div>
          <div className="text-[11px] text-ink/55">คะแนนเฉลี่ยห้อง</div>
          <div className="text-[1.4rem] font-bold text-ink">{classroom.avgScore}%</div>
          <div className="mt-0.5 text-[10.5px] font-semibold text-primary">↑ {classroom.avgDelta}% จากเดือนที่แล้ว</div>
        </Card>
        <Card className="p-4.5">
          <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(187,107,83,0.15)", color: "#BB6B53" }}>
            <span className="h-4 w-4">{statIcon.risk}</span>
          </div>
          <div className="text-[11px] text-ink/55">นักเรียนกลุ่มเสี่ยง</div>
          <div className="text-[1.4rem] font-bold text-ink">{classroom.riskCount} คน</div>
          <span className="text-[10.5px] font-semibold text-primary">ดูรายละเอียด →</span>
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5.5">
          <h3 className="mb-4 text-[13.5px] font-bold text-ink">แนวโน้มคะแนนของแบบฝึกหัด</h3>
          <TrendChart data={classroom.trend} height={180} />
        </Card>
        <Card className="p-5.5">
          <h3 className="mb-4 text-[13.5px] font-bold text-ink">การกระจายช่วงคะแนนล่าสุด</h3>
          <div className="mb-4 flex items-center justify-center">
            <DonutChart distribution={classroom.distribution} centerValue={`${classroom.avgScore}%`} centerLabel="คะแนนเฉลี่ย" />
          </div>
          <div className="flex flex-col gap-1.5">
            {classroom.distribution.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5 text-[10.5px] text-ink">
                <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="flex-1">{d.label}</span>
                <span className="text-ink/50">
                  {d.count} คน ({d.pct}%)
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <Card className="p-5.5">
          <h3 className="mb-4 text-[13.5px] font-bold text-ink">ภาพรวมความก้าวหน้าของนักเรียน</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {groupMeta.map((g) => (
              <div key={g.key} className="rounded-2xl p-3.5 text-center" style={{ background: g.bg }}>
                <div className="text-[11px] font-semibold text-ink">{g.label}</div>
                <div className="my-1.5 text-2xl font-bold text-ink">{classroom.groups[g.key]}</div>
                <div className="text-[9.5px] text-ink/50">{g.range}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right text-[11px] font-semibold text-primary">ดูรายละเอียดการจัดกลุ่ม →</div>
        </Card>

        <Card className="p-5.5">
          <h3 className="mb-4 text-[13.5px] font-bold text-ink">คะแนนเฉลี่ยตามหน่วยการเรียนรู้</h3>
          <div className="flex flex-col gap-3">
            {classroom.subjectScores.map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex justify-between text-[11.5px] text-ink">
                  <span>{s.label}</span>
                  <span className="font-bold">{s.pct}%</span>
                </div>
                <ProgressBar pct={s.pct} color={s.barColor} />
              </div>
            ))}
          </div>
          <div className="mt-3.5 text-right text-[11px] font-semibold text-primary">ดูวิเคราะห์เชิงลึก →</div>
        </Card>
      </div>

      <Card className="p-5.5">
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-ink">แบบฝึกหัดล่าสุด</h3>
          <button
            onClick={onGenerateExercises}
            className="rounded-full bg-primary px-3.5 py-2 text-[11.5px] font-bold text-card"
          >
            + สร้างแบบฝึกหัดใหม่
          </button>
        </div>
        <ExerciseTable rows={classroom.latestExercises} />
      </Card>
    </div>
  );
}
