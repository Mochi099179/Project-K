export function ProgressBar({
  pct,
  color = "#6D9773",
  height = 7,
}: {
  pct: number;
  color?: string;
  height?: number;
}) {
  return (
    <div
      className="w-full rounded-full bg-border overflow-hidden"
      style={{ height }}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
      />
    </div>
  );
}
