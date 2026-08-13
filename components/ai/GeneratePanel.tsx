"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/store";
import { GENERATE_TYPE_LABEL, type GenerateType, type MaterialsResult } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

function buildMaterials(topic: string): MaterialsResult {
  return {
    fileName: `${topic}.pptx`,
    slides: [
      `เกริ่นนำและจุดประสงค์การเรียนรู้: ${topic}`,
      "ทบทวนความรู้พื้นฐานที่เกี่ยวข้อง",
      "เนื้อหาหลัก ตอนที่ 1",
      "เนื้อหาหลัก ตอนที่ 2 พร้อมตัวอย่าง",
      "กิจกรรมฝึกปฏิบัติในชั้นเรียน",
      "สรุปและคำถามทบทวน",
    ],
  };
}

export function GeneratePanel({ type, classroomId }: { type: GenerateType; classroomId: string | null }) {
  const router = useRouter();
  const { getClassroom } = useAppData();
  const classroom = classroomId ? getClassroom(classroomId) : undefined;

  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceAttached, setSourceAttached] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [materialsResult, setMaterialsResult] = useState<MaterialsResult | null>(null);

  const backLabel = classroom ? `← ${classroom.name} ${classroom.subject}` : "← หน้าหลัก";

  function handleBack() {
    if (classroom) router.push(`/classrooms/${classroom.id}`);
    else router.push("/dashboard");
  }

  function runGenerate() {
    const t = topic.trim() || "บทเรียนนี้";
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      if (type === "materials") setMaterialsResult(buildMaterials(t));
    }, 1400);
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <button onClick={handleBack} className="mb-4 text-[12.5px] font-semibold text-primary">
        {backLabel}
      </button>
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">AI Generator</div>
      <h1 className="mb-5 text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.2rem]">
        {GENERATE_TYPE_LABEL[type]}
      </h1>

      {classroom && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 px-4.5 py-3.5 text-[13px] text-primary-dark">
          อ้างอิงจากศักยภาพผู้เรียนในห้อง {classroom.name}
        </div>
      )}

      <Card className="rounded-[1.75rem] p-7 mb-7">
        <label className="mb-2 block text-xs text-ink/55">หัวข้อที่จะสอน</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="เช่น สมการเชิงเส้นตัวแปรเดียว"
          className="mb-5 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
        />

        <label className="mb-2 block text-xs text-ink/55">แหล่งข้อมูล (ไม่บังคับ)</label>
        <button
          onClick={() => setSourceAttached((v) => !v)}
          className="mb-5 rounded-xl border border-border bg-cream px-4 py-2.5 text-[13px] text-ink"
        >
          {sourceAttached ? "✓ แนบไฟล์แหล่งข้อมูลแล้ว" : "แนบไฟล์แหล่งข้อมูล"}
        </button>

        <label className="mb-2 block text-xs text-ink/55">จุดที่อยากให้ผู้เรียนเข้าใจ (ไม่บังคับ)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="ระบุจุดสำคัญที่ต้องการเน้น..."
          className="mb-6 w-full resize-y rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
        />

        {generating ? (
          <div className="flex items-center gap-2.5 text-sm text-ink">
            <Spinner size={16} />
            AI กำลังสร้าง...
          </div>
        ) : (
          <button
            onClick={runGenerate}
            className="rounded-full bg-primary px-6.5 py-3.5 text-sm font-bold text-card transition-transform hover:scale-[1.03]"
          >
            Generate with AI →
          </button>
        )}
      </Card>

      {materialsResult && (
        <Card className="rounded-3xl p-6.5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">📄 {materialsResult.fileName}</span>
            <span className="rounded-full bg-cream px-3.5 py-1.5 text-[11px] text-ink/60">Download</span>
          </div>
          {materialsResult.slides.map((sl) => (
            <div key={sl} className="border-t border-border py-2 text-[13px] text-ink/70">
              {sl}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
