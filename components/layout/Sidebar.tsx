"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNavIcons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  quickCheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  ),
  classroom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5C4.67 20 4 19.33 4 18.5v-13z" />
      <path d="M20 5.5C20 4.67 19.33 4 18.5 4H12v16h6.5c.83 0 1.5-.67 1.5-1.5v-13z" />
    </svg>
  ),
  homeworkUnit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
      <path d="M10 12h4" />
    </svg>
  ),
  aitools: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.4 4.2L18 8.6l-4.2 1.4L12 14l-1.4-4L6 8.6l4.6-1.4L12 3z" />
      <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 00-.2-1.6l2-1.6-2-3.4-2.3.9a7 7 0 00-2.7-1.6L15.4 2h-2.8l-.4 2.7a7 7 0 00-2.7 1.6l-2.3-.9-2 3.4 2 1.6A7 7 0 005 12a7 7 0 00.2 1.6l-2 1.6 2 3.4 2.3-.9c.8.7 1.7 1.2 2.7 1.6l.4 2.7h2.8l.4-2.7a7 7 0 002.7-1.6l2.3.9 2-3.4-2-1.6c.1-.5.2-1 .2-1.6z" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 4" />
      <path d="M12 17.5h.01" />
    </svg>
  ),
};

function NavButton({
  href,
  icon,
  label,
  active,
  emphasize,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  emphasize?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors"
      style={{
        background: active ? "rgba(109,151,115,0.12)" : emphasize ? "rgba(216,183,95,0.18)" : "transparent",
        color: active ? "#5b8060" : emphasize ? "#a8823a" : "rgba(55,65,81,0.6)",
      }}
    >
      <span className="h-[18px] w-[18px] flex-shrink-0">{icon}</span>
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isQuickCheck = pathname?.startsWith("/quick-check") || pathname?.startsWith("/checks");
  const isClassroom = pathname?.startsWith("/classrooms");
  const isHomeworkUnit = pathname?.startsWith("/homework-units");
  const isAiTools = pathname?.startsWith("/ai-tools");

  return (
    <aside className="sticky top-0 flex h-screen w-[250px] flex-shrink-0 flex-col gap-5.5 overflow-y-auto border-r border-border bg-card px-4 py-5.5">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-1.5">
        <div className="flex h-8.5 w-8.5 flex-shrink-0 items-center justify-center rounded-xl bg-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px] text-card">
            <path d="M12 3c-4 0-7 3-7 7 0 5 4 9 7 11 3-2 7-6 7-11 0-4-3-7-7-7z" />
            <path d="M12 8v6M9 11h6" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-bold leading-tight tracking-tight text-ink">TeachAI</div>
          <div className="text-[10px] tracking-wide text-ink/50">Smart Teaching Assistant</div>
        </div>
      </Link>

      <div className="flex flex-col gap-0.5">
        <NavButton href="/dashboard" icon={mainNavIcons.home} label="หน้าหลัก" active={!!isDashboard} />
        <NavButton href="/quick-check" icon={mainNavIcons.quickCheck} label="ตรวจแบบฝึกหัด" active={!!isQuickCheck} emphasize />
        <NavButton href="/classrooms" icon={mainNavIcons.classroom} label="ห้องเรียน" active={!!isClassroom} />
        <NavButton href="/homework-units" icon={mainNavIcons.homeworkUnit} label="Homework Unit" active={!!isHomeworkUnit} />
        <NavButton href="/ai-tools/technique" icon={mainNavIcons.aitools} label="AI แนะนำ" active={!!isAiTools} />
      </div>

      <div className="mt-auto flex flex-col gap-3.5">
        <InertNavItem icon={mainNavIcons.settings} label="การตั้งค่า" />
        <div className="flex items-center gap-2.5 border-t border-border px-3 pt-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold text-[13px] font-bold text-card">
            จร
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink">ครูจิราภรณ์</div>
            <div className="text-[11px] text-ink/50">ครูผู้สอน</div>
          </div>
        </div>
        <a href="#" className="flex items-center gap-2 px-3 text-[12.5px] text-ink/50">
          <span className="h-[15px] w-[15px]">{mainNavIcons.help}</span>
          ช่วยเหลือ
        </a>
      </div>
    </aside>
  );
}

function InertNavItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex cursor-default items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-ink/60">
      <span className="h-[18px] w-[18px] flex-shrink-0">{icon}</span>
      {label}
    </div>
  );
}
