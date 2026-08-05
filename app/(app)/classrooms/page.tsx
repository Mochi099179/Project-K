"use client";

import Link from "next/link";
import { useAppData } from "@/lib/store";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default function ClassroomsPage() {
  const { classrooms, openCreateModal } = useAppData();

  return (
    <div>
      <BreadcrumbBar />
      <div className="px-6 py-8 pb-20 sm:px-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink">ห้องเรียนทั้งหมด</h1>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-[13px] font-bold text-card"
          >
            <span className="text-base leading-none">+</span> สร้างห้องเรียนใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((c) => (
            <Link key={c.id} href={`/classrooms/${c.id}`}>
              <Card className="h-full p-6 transition-colors hover:border-primary/40">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: "rgba(109,151,115,0.15)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#6D9773" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <rect x="3" y="4" width="18" height="13" rx="1.5" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-base font-bold text-ink">
                      {c.name} {c.subject}
                    </div>
                    <div className="text-[11px] text-ink/50">{c.term}</div>
                  </div>
                </div>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {c.problems.length ? (
                    c.problems.map((p) => (
                      <span key={p} className="rounded-full bg-primary/12 px-2.5 py-1 text-[10.5px] font-semibold text-primary-dark">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-ink/40">ยังไม่ได้ระบุปัญหาห้องเรียน</span>
                  )}
                </div>
                <div className="mb-2 flex justify-between text-[11px] text-ink/55">
                  <span>{c.students.length} คน</span>
                  <span className="font-semibold text-ink">{c.avgScore}%</span>
                </div>
                <ProgressBar pct={c.avgScore} />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
