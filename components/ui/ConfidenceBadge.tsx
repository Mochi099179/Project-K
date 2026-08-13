export function ConfidenceBadge({ label, value }: { label: string; value: number }) {
  // Only surface confidence when it's low enough that a teacher should double-check.
  if (value >= 0.85) return null;
  const pct = Math.round(value * 100);
  const isLow = value < 0.65;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
      style={{
        background: isLow ? "rgba(187,107,83,0.15)" : "rgba(216,183,95,0.2)",
        color: isLow ? "#BB6B53" : "#a8823a",
      }}
    >
      ⚠ {label} {pct}%
    </span>
  );
}
