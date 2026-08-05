import { buildTrend } from "@/lib/chart-utils";
import type { TrendPoint } from "@/lib/types";

export function TrendChart({
  data,
  height = 180,
  barColor = "#6D9773",
  lineColor = "#D8B75F",
}: {
  data: TrendPoint[];
  height?: number;
  barColor?: string;
  lineColor?: string;
}) {
  const trend = buildTrend(data, 600, height);

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox={trend.viewBox}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <polyline points={trend.pointsAttr} fill="none" stroke={lineColor} strokeWidth={2.5} />
        {trend.points.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={4} fill={lineColor} />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-end gap-2 pt-6">
        {trend.points.map((pt, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10.5px] font-bold text-ink">{pt.value}%</span>
            <div
              className="w-3/5 rounded-t-md"
              style={{ height: `${pt.value}%`, background: barColor }}
            />
            <span className="text-center text-[9px] leading-tight text-ink/50">
              {pt.label}
              <br />
              {pt.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
