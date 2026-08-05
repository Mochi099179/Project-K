import Link from "next/link";
import type { Classroom } from "@/lib/types";
import { statusMeta } from "@/lib/chart-utils";
import { Card } from "@/components/ui/Card";

export function StudentsTab({ classroom }: { classroom: Classroom }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {classroom.students.map((st) => {
        const meta = statusMeta(st.homework.status);
        return (
          <Link key={st.id} href={`/classrooms/${classroom.id}/students/${st.id}`}>
            <Card className="h-full p-5 transition-colors hover:border-primary/40">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-base font-bold text-ink">{st.name}</h4>
                <span
                  className="rounded-full bg-cream px-2 py-1 font-mono text-[9px]"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </span>
              </div>
              <div className="mb-3 text-[11px] text-ink/50">
                เลขที่ {st.seatNo} · รหัส {st.studentId}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {st.problems.map((p) => (
                  <span key={p} className="rounded-full bg-cream px-2 py-1 text-[10px] text-ink/60">
                    {p}
                  </span>
                ))}
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
