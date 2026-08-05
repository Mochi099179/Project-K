import type { Classroom } from "@/lib/types";
import { Card } from "@/components/ui/Card";

export function PlansTab({ classroom, onGeneratePlan }: { classroom: Classroom; onGeneratePlan: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-[1.75rem] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(216,183,95,0.2)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#D8B75F" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5">
            <path d="M12 3l1.4 4.2L18 8.6l-4.2 1.4L12 14l-1.4-4L6 8.6l4.6-1.4L12 3z" />
          </svg>
        </div>
        <h3 className="mb-2 text-[1.1rem] font-bold text-ink">สร้างแผนการสอนด้วย AI</h3>
        <p className="mx-auto mb-5 max-w-[420px] text-[13px] leading-[1.6] text-ink/60">
          ระบุหัวข้อและจำนวนคาบ ให้ AI ออกแบบแผนการสอนที่ปรับให้เหมาะกับศักยภาพของนักเรียนในห้อง {classroom.name}
        </p>
        <button onClick={onGeneratePlan} className="rounded-full bg-primary px-6 py-3 text-[13px] font-bold text-card">
          สร้างแผนการสอน →
        </button>
      </Card>

      {classroom.savedPlans && classroom.savedPlans.length > 0 && (
        <div className="flex flex-col gap-3">
          {classroom.savedPlans.map((plan, i) => (
            <Card key={i} className="p-5.5">
              <h4 className="mb-3 text-sm font-bold text-ink">{plan.topic}</h4>
              <div className="flex flex-col">
                {plan.rows.map((row) => (
                  <div key={row.no} className="flex gap-3.5 border-t border-border py-3 first:border-t-0">
                    <span className="flex-shrink-0 font-mono text-xs text-primary">คาบ {row.no}</span>
                    <span className="flex-1 text-[13px] leading-[1.6] text-ink">{row.focus}</span>
                    <span className="flex-shrink-0 font-mono text-[10px] text-ink/45">{row.duration}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
