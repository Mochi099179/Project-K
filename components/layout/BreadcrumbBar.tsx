"use client";

import Link from "next/link";
import { useAppData } from "@/lib/store";

export type Crumb = { label: string; href?: string };

export function BreadcrumbBar({
  section = { label: "ห้องเรียน", href: "/classrooms" },
  tail,
}: {
  section?: { label: string; href: string };
  tail?: string;
}) {
  const { notifications } = useAppData();

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-6 border-b border-border bg-cream/90 px-6 py-4.5 backdrop-blur-md sm:px-10">
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink/50">
        <Link href="/dashboard" className="hover:text-ink">
          หน้าหลัก
        </Link>
        <span>›</span>
        <Link href={section.href} className="hover:text-ink">
          {section.label}
        </Link>
        {tail ? (
          <>
            <span>›</span>
            <span className="font-semibold text-ink">{tail}</span>
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-3.5">
        <div className="hidden items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-ink sm:flex">
          ภาคเรียนที่ 1 / 2567
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-ink/50">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <div className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border border-border bg-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] text-ink">
            <path d="M6 10a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" />
            <path d="M9.5 18a2.5 2.5 0 005 0" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[8px] font-bold text-card">
            {notifications.length}
          </span>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-card">
            จร
          </div>
          <div>
            <div className="text-xs font-semibold leading-tight text-ink">ครูจิราภรณ์</div>
            <div className="text-[10px] leading-tight text-ink/50">ครูผู้สอน</div>
          </div>
        </div>
      </div>
    </div>
  );
}
