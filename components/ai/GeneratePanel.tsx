"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/store";
import { GENERATE_TYPE_LABEL, type ExerciseResultItem, type GenerateType, type MaterialsResult, type PlanRow, type TechniqueResult } from "@/lib/types";
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

function buildExercises(topic: string): ExerciseResultItem[] {
  return [
    { q: `อธิบายแนวคิดหลักของ ${topic} ด้วยคำพูดของตนเอง`, difficulty: "ง่าย" },
    { q: `ยกตัวอย่างการนำ ${topic} ไปใช้ในชีวิตประจำวัน`, difficulty: "ง่าย" },
    { q: `วิเคราะห์ความสัมพันธ์ระหว่างแนวคิดใน ${topic} กับบทเรียนก่อนหน้า`, difficulty: "กลาง" },
    { q: `แก้ปัญหาโจทย์ประยุกต์ที่เกี่ยวกับ ${topic}`, difficulty: "กลาง" },
    { q: `ออกแบบวิธีแก้ปัญหาใหม่โดยใช้หลักการของ ${topic}`, difficulty: "ยาก" },
  ];
}

function buildPlan(topic: string, periods: number, periodLength: number): PlanRow[] {
  const rows: PlanRow[] = [];
  for (let i = 1; i <= periods; i++) {
    let focus: string;
    if (i === 1) focus = `ปูพื้นฐานและสร้างความเข้าใจเบื้องต้นเรื่อง ${topic}`;
    else if (i === periods) focus = `สรุปเนื้อหาและประเมินความเข้าใจเรื่อง ${topic}`;
    else focus = `ขยายความเข้าใจ ${topic} ผ่านกิจกรรมคาบที่ ${i}`;
    rows.push({ no: i, focus, duration: `${periodLength} นาที` });
  }
  return rows;
}

function buildTechnique(topic: string): TechniqueResult {
  return {
    techniques: ["สอนแบบเพื่อนช่วยเพื่อน (Peer Teaching)", "ใช้คำถามปลายเปิดกระตุ้นการคิด", "สรุปบทเรียนด้วยแผนภาพ (Mind Map)"],
    keywords: [topic, "แนวคิดหลัก", "ตัวอย่างประยุกต์"],
    activity: `แบ่งกลุ่มย่อย 3-4 คน ให้ช่วยกันอธิบาย ${topic} ให้เพื่อนในกลุ่มฟัง ก่อนสุ่มถามทั้งห้อง`,
  };
}

export function GeneratePanel({ type, classroomId }: { type: GenerateType; classroomId: string | null }) {
  const router = useRouter();
  const { getClassroom, addSavedPlan, addSavedTechnique } = useAppData();
  const classroom = classroomId ? getClassroom(classroomId) : undefined;

  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [periods, setPeriods] = useState(4);
  const [periodLength, setPeriodLength] = useState(50);
  const [sourceAttached, setSourceAttached] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [materialsResult, setMaterialsResult] = useState<MaterialsResult | null>(null);
  const [exercisesResult, setExercisesResult] = useState<ExerciseResultItem[] | null>(null);
  const [planResult, setPlanResult] = useState<PlanRow[] | null>(null);
  const [techniqueResult, setTechniqueResult] = useState<TechniqueResult | null>(null);
  const [planAdded, setPlanAdded] = useState(false);
  const [techniqueAdded, setTechniqueAdded] = useState(false);

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
      else if (type === "exercises") setExercisesResult(buildExercises(t));
      else if (type === "plan") setPlanResult(buildPlan(t, periods, periodLength));
      else if (type === "technique") setTechniqueResult(buildTechnique(t));
    }, 1400);
  }

  function discardPlan() {
    setPlanResult(null);
    setPlanAdded(false);
    setTopic("");
    setNotes("");
  }

  function discardTechnique() {
    setTechniqueResult(null);
    setTechniqueAdded(false);
    setTopic("");
    setNotes("");
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

        {type === "plan" && (
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs text-ink/55">จำนวนคาบ</label>
              <input
                type="number"
                value={periods}
                onChange={(e) => setPeriods(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs text-ink/55">ระยะเวลาต่อคาบ (นาที)</label>
              <input
                type="number"
                value={periodLength}
                onChange={(e) => setPeriodLength(parseInt(e.target.value) || 10)}
                className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
              />
            </div>
          </div>
        )}

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

      {exercisesResult && (
        <Card className="rounded-3xl p-6.5">
          {exercisesResult.map((ex) => (
            <div key={ex.q} className="flex justify-between gap-3 border-t border-border py-3 first:border-t-0">
              <span className="text-[13px] leading-[1.6] text-ink">{ex.q}</span>
              <span className="flex-shrink-0 font-mono text-[10px] text-ink/45">{ex.difficulty}</span>
            </div>
          ))}
        </Card>
      )}

      {planResult && (
        <>
          <Card className="rounded-3xl p-6.5">
            {planResult.map((row) => (
              <div key={row.no} className="flex gap-3.5 border-t border-border py-3 first:border-t-0">
                <span className="flex-shrink-0 font-mono text-xs text-primary">คาบ {row.no}</span>
                <span className="flex-1 text-[13px] leading-[1.6] text-ink">{row.focus}</span>
                <span className="flex-shrink-0 font-mono text-[10px] text-ink/45">{row.duration}</span>
              </div>
            ))}
          </Card>
          {planAdded ? (
            <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-primary-dark">
              ✓ เพิ่มแผนการสอนนี้ในห้องเรียนแล้ว
            </div>
          ) : (
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => {
                  if (classroom) addSavedPlan(classroom.id, topic.trim() || "บทเรียนนี้", planResult);
                  setPlanAdded(true);
                }}
                disabled={!classroom}
                className="rounded-full bg-primary px-5.5 py-2.5 text-[13px] font-bold text-card disabled:opacity-40"
              >
                + เพิ่มในห้องเรียน
              </button>
              <button onClick={discardPlan} className="rounded-full border border-border px-5.5 py-2.5 text-[13px] text-ink/70">
                ยกเลิก / สร้างใหม่
              </button>
            </div>
          )}
        </>
      )}

      {techniqueResult && (
        <>
          <Card className="rounded-3xl p-6.5">
            <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/50">
              แนะนำเทคนิคการสอน
            </div>
            {techniqueResult.techniques.map((t) => (
              <div key={t} className="mb-1 text-[13px] leading-[1.6] text-ink">
                • {t}
              </div>
            ))}
            <div className="my-4 flex flex-wrap gap-1.5">
              {techniqueResult.keywords.map((k) => (
                <span key={k} className="rounded-full bg-primary/12 px-2.5 py-1 font-mono text-[11px] text-primary">
                  {k}
                </span>
              ))}
            </div>
            <div className="mt-2 rounded-2xl bg-cream p-4">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink/50">
                กิจกรรมแนะนำ
              </div>
              <p className="text-[13px] leading-[1.6] text-ink">{techniqueResult.activity}</p>
            </div>
          </Card>
          {techniqueAdded ? (
            <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-primary-dark">
              ✓ เพิ่มกิจกรรมนี้ในห้องเรียนแล้ว
            </div>
          ) : (
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => {
                  if (classroom) addSavedTechnique(classroom.id, techniqueResult);
                  setTechniqueAdded(true);
                }}
                disabled={!classroom}
                className="rounded-full bg-primary px-5.5 py-2.5 text-[13px] font-bold text-card disabled:opacity-40"
              >
                + เพิ่มในห้องเรียน
              </button>
              <button onClick={discardTechnique} className="rounded-full border border-border px-5.5 py-2.5 text-[13px] text-ink/70">
                ยกเลิก / สร้างใหม่
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
