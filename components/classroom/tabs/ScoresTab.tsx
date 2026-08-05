import type { Classroom } from "@/lib/types";
import { getClassroomInsight } from "@/lib/mock-data";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function ScoresTab({ classroom }: { classroom: Classroom }) {
  const insight = getClassroomInsight(classroom.id);

  return (
    <Card className="rounded-[1.75rem] p-7">
      <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-primary">
        AI Room Analysis
      </div>
      <p className="mb-5 text-[14.5px] leading-[1.7] text-ink">{insight.summary}</p>
      <div className="mb-6 flex flex-col gap-2.5">
        {insight.points.map((pt) => (
          <div key={pt} className="flex items-start gap-2.5">
            <span className="mt-0.5 text-primary">→</span>
            <span className="text-[13.5px] leading-[1.6] text-ink/70">{pt}</span>
          </div>
        ))}
      </div>
      <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 p-4.5">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-primary">
          Recommendation
        </div>
        <p className="text-[13.5px] leading-[1.6] text-ink">{insight.recommendation}</p>
      </div>
      <h4 className="mb-3 text-[12.5px] font-bold text-ink">คะแนนเฉลี่ยตามหน่วยการเรียนรู้</h4>
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
    </Card>
  );
}
