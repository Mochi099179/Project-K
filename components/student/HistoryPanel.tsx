import type { HistoryEntry } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/ui/TrendChart";

export function HistoryPanel({ history }: { history: HistoryEntry[] }) {
  const avgScore = Math.round(history.reduce((sum, h) => sum + h.score, 0) / history.length);
  const totalDelta = history[history.length - 1].score - history[0].score;
  const deltaLabel =
    totalDelta > 0 ? `↑ เพิ่มขึ้น ${totalDelta} คะแนน` : totalDelta < 0 ? `↓ ลดลง ${Math.abs(totalDelta)} คะแนน` : "± ไม่เปลี่ยนแปลง";
  const deltaColor = totalDelta > 0 ? "#5b8060" : totalDelta < 0 ? "#BB6B53" : "#374151";

  const rows = history.map((h, i) => {
    const prev = i > 0 ? history[i - 1].score : null;
    const d = prev === null ? 0 : h.score - prev;
    return {
      ...h,
      deltaLabel: prev === null ? "—" : d > 0 ? `↑ +${d}` : d < 0 ? `↓ ${d}` : "± 0",
      deltaColor: prev === null ? "rgba(55,65,81,0.5)" : d > 0 ? "#5b8060" : d < 0 ? "#BB6B53" : "rgba(55,65,81,0.5)",
    };
  });

  return (
    <Card className="rounded-[1.75rem] p-7">
      <div className="mb-4.5 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="text-xs text-ink/55">คะแนนเฉลี่ยจากการตรวจของ AI ทั้งหมด</div>
          <div className="text-[1.6rem] font-bold text-ink">{avgScore}%</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink/55">เปลี่ยนแปลงจากครั้งแรก</div>
          <div className="text-[1.1rem] font-bold" style={{ color: deltaColor }}>
            {deltaLabel}
          </div>
        </div>
      </div>

      <div className="mb-5">
        <TrendChart data={history.map((h) => ({ label: h.name, date: h.date, value: h.score }))} height={170} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              {["แบบฝึกหัด", "วันที่ตรวจ", "คะแนนจาก AI", "เทียบครั้งก่อน"].map((h) => (
                <th key={h} className="px-2 pb-2.5 text-left text-[10.5px] font-semibold text-ink/50">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.name} className="border-b border-border">
                <td className="px-2 py-3 text-xs font-semibold text-ink">{h.name}</td>
                <td className="px-2 py-3 text-xs text-ink/65">{h.date}</td>
                <td className="px-2 py-3 text-xs font-semibold text-ink">{h.score}%</td>
                <td className="px-2 py-3">
                  <span className="text-[11px] font-semibold" style={{ color: h.deltaColor }}>
                    {h.deltaLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
