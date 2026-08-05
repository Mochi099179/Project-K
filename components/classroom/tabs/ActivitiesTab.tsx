import type { Classroom } from "@/lib/types";
import { Card } from "@/components/ui/Card";

export function ActivitiesTab({ classroom, onGenerateTechnique }: { classroom: Classroom; onGenerateTechnique: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-[1.75rem] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(168,198,134,0.25)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#5b8060" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5">
            <circle cx="9" cy="8" r="3" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            <circle cx="17" cy="9" r="2.2" />
            <path d="M15.3 14.2c2.7.5 4.7 2.8 4.7 5.8" />
          </svg>
        </div>
        <h3 className="mb-2 text-[1.1rem] font-bold text-ink">เทคนิคและกิจกรรมการสอน</h3>
        <p className="mx-auto mb-5 max-w-[420px] text-[13px] leading-[1.6] text-ink/60">
          ให้ AI แนะนำเทคนิคการสอนและกิจกรรมในห้องเรียนที่เหมาะกับปัญหาของนักเรียนในห้อง {classroom.name}
        </p>
        <button onClick={onGenerateTechnique} className="rounded-full bg-primary px-6 py-3 text-[13px] font-bold text-card">
          แนะนำเทคนิคการสอน →
        </button>
      </Card>

      {classroom.savedTechniques && classroom.savedTechniques.length > 0 && (
        <div className="flex flex-col gap-3">
          {classroom.savedTechniques.map((tech, i) => (
            <Card key={i} className="p-5.5">
              <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/50">
                แนะนำเทคนิคการสอน
              </div>
              {tech.techniques.map((t) => (
                <div key={t} className="mb-1 text-[13px] leading-[1.6] text-ink">
                  • {t}
                </div>
              ))}
              <div className="my-3 flex flex-wrap gap-1.5">
                {tech.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-primary/12 px-2.5 py-1 font-mono text-[11px] text-primary">
                    {k}
                  </span>
                ))}
              </div>
              <div className="rounded-2xl bg-cream p-4">
                <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink/50">
                  กิจกรรมแนะนำ
                </div>
                <p className="text-[13px] leading-[1.6] text-ink">{tech.activity}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
