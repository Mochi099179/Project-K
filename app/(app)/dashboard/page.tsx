"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppData } from "@/lib/store";
import { dashboardTrend } from "@/lib/mock-data";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/ui/TrendChart";
import { ProgressBar } from "@/components/ui/ProgressBar";

const statIcon = {
  classroom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  students: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M15.3 14.2c2.7.5 4.7 2.8 4.7 5.8" />
    </svg>
  ),
  exercises: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M8 10h8M8 14h8M8 18h5" />
    </svg>
  ),
  review: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  ),
  score: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-5 4 4 8-9" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" />
      <path d="M9.5 18a2.5 2.5 0 005 0" />
    </svg>
  ),
};

export default function DashboardPage() {
  const { classrooms, tasks, notifications, pendingReviewCount } = useAppData();

  const totalStudents = useMemo(() => classrooms.reduce((sum, c) => sum + c.students.length, 0), [classrooms]);
  const totalExercises = useMemo(() => classrooms.reduce((sum, c) => sum + c.exercises.total, 0), [classrooms]);
  const avgScoreAll = useMemo(
    () => (classrooms.reduce((sum, c) => sum + c.avgScore, 0) / (classrooms.length || 1)).toFixed(1),
    [classrooms]
  );
  const totalRisk = useMemo(() => classrooms.reduce((sum, c) => sum + c.riskCount, 0), [classrooms]);

  const dashTasks = tasks.map((t) => (t.kind === "review" ? { ...t, count: pendingReviewCount } : t));

  const insights = [
    {
      emoji: "📈",
      iconBg: "rgba(109,151,115,0.15)",
      title: 'คะแนนเฉลี่ยของบท "สมการเชิงเส้น" ลดลง 11.6%',
      detail: "เมื่อเทียบกับ 2 สัปดาห์ก่อน แนะนำให้ทวนเนื้อหาหรือเสริมแบบฝึกหัด",
    },
    {
      emoji: "🏆",
      iconBg: "rgba(216,183,95,0.2)",
      title: `${classrooms[0]?.name ?? ""} มีคะแนนเฉลี่ยดีที่สุด`,
      detail: `คะแนนเฉลี่ย ${classrooms[0]?.avgScore ?? ""}% รักษามาตรฐานต่อไปนะคะ`,
    },
    {
      emoji: "⚠️",
      iconBg: "rgba(187,107,83,0.15)",
      title: `นักเรียน ${totalRisk} คน มีคะแนนต่ำกว่า 70%`,
      detail: "แนะนำให้ติดตามและช่วยเหลือเป็นรายบุคคล",
    },
  ];

  const statCards = [
    { icon: statIcon.classroom, iconBg: "rgba(109,151,115,0.15)", iconColor: "#6D9773", label: "ห้องเรียนทั้งหมด", value: classrooms.length, unit: "ห้อง" },
    { icon: statIcon.students, iconBg: "rgba(216,183,95,0.18)", iconColor: "#D8B75F", label: "นักเรียนทั้งหมด", value: totalStudents, unit: "คน" },
    { icon: statIcon.exercises, iconBg: "rgba(168,198,134,0.25)", iconColor: "#5b8060", label: "แบบฝึกหัดทั้งหมด", value: totalExercises, unit: "ชุด" },
  ];

  return (
    <div>
      <Topbar />
      <div className="px-6 py-8 pb-20 sm:px-10">
        <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s) => (
            <Card key={s.label} className="p-4.5">
              <div
                className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: s.iconBg, color: s.iconColor }}
              >
                <span className="h-4 w-4">{s.icon}</span>
              </div>
              <div className="text-[11px] text-ink/55">{s.label}</div>
              <div className="text-2xl font-bold text-ink">
                {s.value} <span className="text-[11px] font-medium text-ink/50">{s.unit}</span>
              </div>
            </Card>
          ))}

          <Card className="cursor-pointer p-4.5">
            <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(216,183,95,0.18)", color: "#D8B75F" }}>
              <span className="h-4 w-4">{statIcon.review}</span>
            </div>
            <div className="text-[11px] text-ink/55">งานที่รอตรวจ</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-ink">{pendingReviewCount}</span>
              <span className="text-[11px] font-semibold text-primary">ดูรายการ →</span>
            </div>
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(109,151,115,0.15)", color: "#6D9773" }}>
              <span className="h-4 w-4">{statIcon.score}</span>
            </div>
            <div className="text-[11px] text-ink/55">คะแนนเฉลี่ยรวม</div>
            <div className="text-2xl font-bold text-ink">{avgScoreAll}%</div>
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(187,107,83,0.15)", color: "#BB6B53" }}>
              <span className="h-4 w-4">{statIcon.bell}</span>
            </div>
            <div className="text-[11px] text-ink/55">การแจ้งเตือน</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-ink">{notifications.length}</span>
              <span className="text-[11px] font-semibold text-primary">รายการ</span>
            </div>
          </Card>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className="p-6">
            <div className="mb-4.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">คะแนนเฉลี่ยของแบบฝึกหัด (ทุกห้องเรียน)</h3>
              <span className="text-[11px] text-ink/45">30 วันล่าสุด</span>
            </div>
            <TrendChart data={dashboardTrend} height={200} />
          </Card>

          <Card className="p-5.5">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <svg viewBox="0 0 24 24" fill="none" stroke="#D8B75F" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 3l1.4 4.2L18 8.6l-4.2 1.4L12 14l-1.4-4L6 8.6l4.6-1.4L12 3z" />
                </svg>
                AI Insights
              </h3>
              <span className="text-[11px] font-semibold text-primary">ดูทั้งหมด →</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {insights.map((ins) => (
                <div key={ins.title} className="flex gap-2.5 rounded-2xl border border-border bg-cream p-3.5">
                  <div
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl text-[13px]"
                    style={{ background: ins.iconBg }}
                  >
                    {ins.emoji}
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-snug text-ink">{ins.title}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-ink/55">{ins.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr_1fr]">
          <Card className="p-5.5">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">ห้องเรียนของคุณ</h3>
              <Link href="/classrooms" className="text-[11px] font-semibold text-primary">
                ดูห้องเรียนทั้งหมด →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {["ห้องเรียน", "นักเรียน", "คะแนนเฉลี่ย", "ความคืบหน้า"].map((h) => (
                      <th key={h} className="px-2 pb-2.5 text-left text-[10.5px] font-semibold text-ink/50">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map((c) => (
                    <tr key={c.id} className="border-b border-border hover:bg-cream">
                      <td className="p-0">
                        <Link href={`/classrooms/${c.id}`} className="flex items-center gap-2.5 px-2 py-3">
                          <div className="flex h-8.5 w-8.5 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(109,151,115,0.15)" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#6D9773" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                              <rect x="3" y="4" width="18" height="13" rx="1.5" />
                              <path d="M8 21h8M12 17v4" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-[12.5px] font-bold text-ink">{c.name}</div>
                            <div className="text-[10.5px] text-ink/50">{c.term}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-xs text-ink">{c.students.length} คน</td>
                      <td className="px-2 py-3 text-xs font-semibold text-ink">{c.avgScore}%</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <ProgressBar pct={c.avgScore} />
                          </div>
                          <span className="text-[11px] text-ink/55">{c.avgScore}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-ink">งานที่ต้องดำเนินการ</h3>
              <span className="text-[10.5px] font-semibold text-primary">ดูทั้งหมด →</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {dashTasks.map((t) => (
                <div key={t.title} className="flex items-center gap-2.5">
                  <div
                    className="flex h-7.5 w-7.5 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ background: t.iconBg, color: t.iconColor }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
                      <rect x="5" y="4" width="14" height="17" rx="2" />
                      <path d="M8 10h8M8 14h8" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-ink">{t.title}</div>
                    <div className="text-[10.5px] text-ink/50">{t.detail}</div>
                  </div>
                  <span className="rounded-full border border-border bg-cream px-2.5 py-0.5 text-xs font-bold text-ink">
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-ink">การแจ้งเตือนล่าสุด</h3>
              <span className="text-[10.5px] font-semibold text-primary">ดูทั้งหมด →</span>
            </div>
            <div className="flex flex-col gap-3">
              {notifications.map((n) => (
                <div key={n.title + n.time} className="flex gap-2.5">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">{n.title}</span>
                      <span className="flex-shrink-0 text-[10px] text-ink/40">{n.time}</span>
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-ink/55">{n.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
