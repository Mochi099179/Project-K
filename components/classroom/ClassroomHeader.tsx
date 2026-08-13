import type { Classroom } from "@/lib/types";

export function ClassroomHeader({ classroom }: { classroom: Classroom }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
      <div className="flex items-center gap-4">
        <div className="flex h-15 w-15 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: "rgba(109,151,115,0.15)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#6D9773" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
            <rect x="3" y="4" width="18" height="13" rx="1.5" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-tight text-ink sm:text-[1.7rem]">
            {classroom.name} {classroom.subject}
          </h1>
          <div className="mt-1 mb-2.5 text-[12.5px] text-ink/55">{classroom.term}</div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/12 px-3 py-1 text-[11px] font-semibold text-primary">
              ระดับชั้น {classroom.grade}
            </span>
            <span className="rounded-full border border-border bg-cream px-3 py-1 text-[11px] font-semibold text-ink">
              รายวิชา {classroom.subject}
            </span>
            <span className="rounded-full border border-border bg-cream px-3 py-1 text-[11px] font-semibold text-ink">
              ครูผู้สอน: {classroom.teacher}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
