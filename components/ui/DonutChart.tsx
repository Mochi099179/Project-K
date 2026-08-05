import { buildDonut } from "@/lib/chart-utils";
import type { Distribution } from "@/lib/types";

export function DonutChart({
  distribution,
  centerValue,
  centerLabel,
  size = 130,
}: {
  distribution: Distribution[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const gradient = buildDonut(distribution);
  const innerSize = Math.round(size * 0.6);

  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{ width: size, height: size, background: gradient }}
    >
      <div
        className="flex flex-col items-center justify-center rounded-full bg-card"
        style={{ width: innerSize, height: innerSize }}
      >
        <span className="text-[1.1rem] font-bold text-ink">{centerValue}</span>
        <span className="text-[8.5px] text-ink/50">{centerLabel}</span>
      </div>
    </div>
  );
}
