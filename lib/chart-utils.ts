import type { Distribution, TrendPoint } from "./types";

export type BuiltTrendPoint = TrendPoint & { x: number; y: number };

export type BuiltTrend = {
  points: BuiltTrendPoint[];
  pointsAttr: string;
  viewBox: string;
};

export function buildTrend(trend: TrendPoint[], w = 600, h = 170, padX = 24): BuiltTrend {
  const n = trend.length;
  const stepX = n > 1 ? (w - padX * 2) / (n - 1) : 0;
  const points = trend.map((t, i) => ({
    ...t,
    x: Math.round(padX + i * stepX),
    y: Math.round(h - (t.value / 100) * h),
  }));
  return {
    points,
    pointsAttr: points.map((p) => `${p.x},${p.y}`).join(" "),
    viewBox: `0 0 ${w} ${h}`,
  };
}

export function buildDonut(distribution: Distribution[]): string {
  let acc = 0;
  const stops = distribution.map((d) => {
    const start = acc;
    acc += d.pct;
    return `${d.color} ${start.toFixed(1)}% ${acc.toFixed(1)}%`;
  });
  return `conic-gradient(${stops.join(",")})`;
}

export function statusMeta(status: "none" | "grading" | "graded"): { label: string; color: string } {
  if (status === "graded") return { label: "ตรวจแล้ว", color: "#5b8060" };
  if (status === "grading") return { label: "AI กำลังตรวจ...", color: "#a8823a" };
  return { label: "ยังไม่ส่งการบ้าน", color: "rgba(55,65,81,0.4)" };
}
