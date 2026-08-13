"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

const STAGES = ["กำลังอ่านเอกสาร", "กำลังแยกข้อคำถาม", "กำลังตรวจคำตอบ", "กำลังสรุปผลวิเคราะห์"];

export function ProcessingView() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    // Deterministic visual progression — capped before the final stage until
    // the real API response updates the check's status.
    const timers = [1400, 3200, 5200].map((delay, i) =>
      setTimeout(() => setActiveIdx(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Card className="mx-auto max-w-[440px] rounded-[1.75rem] p-9 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary/25" style={{ borderTopColor: "#6D9773" }} />
      </div>
      <h2 className="mb-1.5 text-lg font-bold text-ink">AI กำลังตรวจแบบฝึกหัด</h2>
      <p className="mb-7 text-[13px] text-ink/55">ใช้เวลาประมาณครึ่งถึงหนึ่งนาที</p>
      <div className="flex flex-col items-start gap-3 text-left">
        {STAGES.map((stage, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={stage} className="flex items-center gap-2.5">
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  background: done ? "#6D9773" : active ? "rgba(216,183,95,0.25)" : "#F3ECDC",
                  color: done ? "#FFFCF5" : active ? "#a8823a" : "rgba(55,65,81,0.35)",
                }}
              >
                {done ? "✓" : active ? "●" : "○"}
              </span>
              <span
                className="text-[13px]"
                style={{ color: done || active ? "#374151" : "rgba(55,65,81,0.4)", fontWeight: active ? 700 : 500 }}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
