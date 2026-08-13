"use client";

import { useState } from "react";
import { useAppData } from "@/lib/store";

export function AddStudentModal({
  classroomId,
  nextSeatNo,
  onClose,
}: {
  classroomId: string;
  nextSeatNo: number;
  onClose: () => void;
}) {
  const { addStudent } = useAppData();

  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [seatNo, setSeatNo] = useState(String(nextSeatNo));
  const [gender, setGender] = useState<"M" | "F">("M");

  const canSubmit = studentId.trim() !== "" && seatNo.trim() !== "";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await addStudent(classroomId, {
        name: name.trim() || `นักเรียน ${studentId.trim()}`,
        studentId: studentId.trim(),
        seatNo: Number(seatNo) || nextSeatNo,
        gender,
      });
      onClose();
    } catch {
      setError("เพิ่มนักเรียนไม่สำเร็จ กรุณาลองใหม่");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
      <div className="relative w-[440px] max-w-[92vw] rounded-[1.75rem] border border-border bg-card p-9">
        <button onClick={onClose} className="absolute top-5 right-5 text-lg text-ink/50" aria-label="Close">
          ✕
        </button>

        <h2 className="mb-6 text-2xl font-semibold text-ink">เพิ่มนักเรียน</h2>

        <label className="mb-2 block text-xs text-ink/55">ชื่อ-นามสกุล (ไม่บังคับ)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น ณัฐวุฒิ สินธุ์เจริญ"
          className="mb-4.5 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
        />

        <div className="mb-4.5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-xs text-ink/55">เลขที่</label>
            <input
              type="number"
              value={seatNo}
              onChange={(e) => setSeatNo(e.target.value)}
              placeholder="1"
              className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-ink/55">รหัสนักเรียน</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="44821"
              className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
            />
          </div>
        </div>

        <label className="mb-2 block text-xs text-ink/55">เพศ</label>
        <div className="mb-7 flex gap-2">
          {(["M", "F"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className="rounded-full border px-4 py-2.5 text-xs"
              style={{
                background: gender === g ? "rgba(109,151,115,0.15)" : "#FFF7EB",
                color: gender === g ? "#5b8060" : "rgba(55,65,81,0.7)",
                borderColor: gender === g ? "rgba(109,151,115,0.5)" : "#E5DCC8",
              }}
            >
              {g === "M" ? "ชาย" : "หญิง"}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card disabled:opacity-40"
          >
            {submitting ? "กำลังเพิ่ม..." : "เพิ่มนักเรียน"}
          </button>
        </div>
        {error && <p className="mt-3 text-[12px] text-[#BB6B53]">{error}</p>}
      </div>
    </div>
  );
}
