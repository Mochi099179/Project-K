import type { ExerciseRow } from "@/lib/types";

export function ExerciseTable({ rows }: { rows: ExerciseRow[] }) {
  if (!rows.length) {
    return <p className="py-6 text-center text-[13px] text-ink/45">ยังไม่มีแบบฝึกหัดในห้องเรียนนี้</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="border-b border-border">
            {["ชื่อแบบฝึกหัด", "หน่วยการเรียนรู้", "วันครบกำหนด", "ส่งแล้ว / ทั้งหมด", "คะแนนเฉลี่ย", "สถานะ"].map((h) => (
              <th key={h} className="px-2 pb-2.5 text-left text-[10.5px] font-semibold text-ink/50">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((ex) => (
            <tr key={ex.name} className="border-b border-border">
              <td className="px-2 py-3 text-xs font-semibold text-ink">{ex.name}</td>
              <td className="px-2 py-3 text-xs text-ink/65">{ex.unit}</td>
              <td className="px-2 py-3 text-xs text-ink/65">{ex.due}</td>
              <td className="px-2 py-3 text-xs text-ink/65">
                {ex.submitted}/{ex.total}
              </td>
              <td className="px-2 py-3 text-xs font-semibold text-ink">{ex.avgScore}</td>
              <td className="px-2 py-3">
                <span
                  className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                  style={{ color: ex.statusColor, background: ex.statusBg }}
                >
                  {ex.statusLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
