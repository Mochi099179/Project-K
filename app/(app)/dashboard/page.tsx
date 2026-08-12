"use client";

import Link from "next/link";
import { useAppData } from "@/lib/store";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { HomeworkUnitCard } from "@/components/homeworkunit/HomeworkUnitCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardPage() {
  const { classrooms, homeworkUnits, getRecentChecks } = useAppData();
  const recentChecks = getRecentChecks(4);

  return (
    <div>
      <Topbar />
      <div className="px-6 py-8 pb-20 sm:px-10">
        {/* Quick Check hero — the primary entry point, per design direction */}
        <Link href="/quick-check">
          <Card className="mb-6 flex flex-col items-start gap-5 rounded-[1.75rem] border-primary/25 bg-gradient-to-br from-[#EFF5EE] to-[#FFFCF5] p-8 transition-transform hover:scale-[1.005] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                  <rect x="5" y="4" width="14" height="17" rx="2" />
                  <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
                  <path d="M9 15l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-ink sm:text-2xl">ตรวจแบบฝึกหัด</h1>
                <p className="mt-1 max-w-[420px] text-[13px] leading-[1.6] text-ink/60">
                  Upload งานของนักเรียนและให้ AI ช่วยวิเคราะห์ ไม่ต้องสร้างห้องเรียนก่อนก็ทดลองได้ทันที
                </p>
              </div>
            </div>
            <span className="flex-shrink-0 rounded-full bg-primary px-7 py-3.5 text-[13.5px] font-bold text-card">
              เริ่มตรวจ →
            </span>
          </Card>
        </Link>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">ห้องเรียนของฉัน</h2>
          <Link href="/classrooms" className="text-[11.5px] font-semibold text-primary">
            ดูทั้งหมด →
          </Link>
        </div>
        {classrooms.length === 0 ? (
          <EmptyState
            title="ยังไม่มี Classroom"
            description="สร้าง Classroom เพื่อเริ่มติดตามพัฒนาการของนักเรียนในระยะยาว"
            action={
              <Link href="/classrooms" className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card">
                สร้าง Classroom
              </Link>
            }
          />
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {classrooms.slice(0, 3).map((c) => (
              <Link key={c.id} href={`/classrooms/${c.id}`}>
                <Card className="h-full p-5 transition-colors hover:border-primary/40">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13.5px] font-bold text-ink">
                      {c.name} {c.subject}
                    </span>
                    <span className="text-[12px] font-semibold text-ink">{c.avgScore}%</span>
                  </div>
                  <div className="mb-3 text-[11px] text-ink/50">{c.students.length} คน · {c.term}</div>
                  <ProgressBar pct={c.avgScore} />
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">Homework Units</h2>
          <Link href="/homework-units" className="text-[11.5px] font-semibold text-primary">
            ดูทั้งหมด →
          </Link>
        </div>
        {homeworkUnits.length === 0 ? (
          <EmptyState
            title="ยังไม่มี Homework Unit"
            description="สร้างชุดแบบฝึกหัดเพื่อเก็บแบบฝึกหัด เฉลย และสื่อการสอนไว้ใช้ซ้ำ"
            action={
              <Link href="/homework-units" className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card">
                สร้าง Homework Unit
              </Link>
            }
          />
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {homeworkUnits.slice(0, 3).map((u) => (
              <HomeworkUnitCard key={u.id} unit={u} />
            ))}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">การตรวจล่าสุด</h2>
        </div>
        {recentChecks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border py-8 text-center text-[13px] text-ink/40">
            ยังไม่มีการตรวจแบบฝึกหัด — ลองกด &quot;ตรวจแบบฝึกหัด&quot; ด้านบนดูสิ
          </p>
        ) : (
          <Card className="p-2">
            <div className="flex flex-col divide-y divide-border">
              {recentChecks.map((c) => (
                <Link key={c.id} href={`/checks/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-cream">
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-semibold text-ink">
                      Student {c.studentLabel} {c.topic ? `· ${c.topic}` : ""}
                    </div>
                    <div className="text-[10.5px] text-ink/50">
                      {new Date(c.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                      {c.status === "processing" ? "กำลังตรวจ..." : c.status === "failed" ? "ตรวจไม่สำเร็จ" : c.status === "needs_review" ? "รอตรวจสอบ" : "ตรวจสอบแล้ว"}
                    </div>
                  </div>
                  {c.status !== "processing" && c.status !== "failed" && (
                    <span className="flex-shrink-0 text-[13px] font-bold text-primary">{c.overallScore}%</span>
                  )}
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
