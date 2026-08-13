"use client";

import { useAppData } from "@/lib/store";

export function Topbar() {
  const { notifications, teacherName } = useAppData();

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-6 border-b border-border bg-cream/90 px-6 py-5.5 backdrop-blur-md sm:px-10">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight text-ink sm:text-[1.6rem]">
          สวัสดีค่ะ {teacherName || "ครูผู้สอน"} 👋
        </h1>
        <p className="mt-1 text-[13px] text-ink/55">ยินดีต้อนรับเข้าสู่แดชบอร์ดของคุณ</p>
      </div>
      <div className="hidden items-center gap-4 md:flex">
        <div className="flex w-[260px] items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] flex-shrink-0 text-ink/45">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาอะไรบางอย่าง..."
            className="w-full bg-transparent text-[12.5px] text-ink outline-none"
          />
        </div>
        <div className="relative flex h-9.5 w-9.5 items-center justify-center rounded-full border border-border bg-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] text-ink">
            <path d="M6 10a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" />
            <path d="M9.5 18a2.5 2.5 0 005 0" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-terracotta text-[9px] font-bold text-card">
            {notifications.length}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <div>
            <div className="text-[11.5px] font-semibold leading-tight text-ink">8 พฤษภาคม 2567</div>
            <div className="text-[10px] leading-tight text-ink/50">วันพุธ</div>
          </div>
        </div>
      </div>
    </div>
  );
}
