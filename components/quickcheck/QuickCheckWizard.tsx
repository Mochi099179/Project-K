"use client";

import { useRef, useState } from "react";
import { useAppData } from "@/lib/store";
import { readImageFile, ACCEPTED_IMAGE_TYPES, type ReadImageResult } from "@/lib/files";
import { Card } from "@/components/ui/Card";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_META: { key: Step; label: string }[] = [
  { key: 1, label: "นักเรียน" },
  { key: 2, label: "สื่อการสอน" },
  { key: 3, label: "เฉลย" },
  { key: 4, label: "แบบฝึกหัด" },
  { key: 5, label: "ตรวจ" },
];

export function QuickCheckWizard({
  presetClassroomId = null,
  presetStudentId = null,
  presetStudentLabel = "",
  lockStudent = false,
  presetTopic = "",
  presetHomeworkUnitId = null,
  onStarted,
}: {
  presetClassroomId?: string | null;
  presetStudentId?: string | null;
  presetStudentLabel?: string;
  lockStudent?: boolean;
  presetTopic?: string;
  presetHomeworkUnitId?: string | null;
  onStarted: (checkId: string) => void;
}) {
  const { startCheck } = useAppData();

  const [step, setStep] = useState<Step>(1);
  const [studentLabel, setStudentLabel] = useState(presetStudentLabel);
  const [topic, setTopic] = useState(presetTopic);
  const [teachingMaterialsText, setTeachingMaterialsText] = useState("");
  const [teachingMaterialsImages, setTeachingMaterialsImages] = useState<ReadImageResult[]>([]);
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [answerKeyImage, setAnswerKeyImage] = useState<ReadImageResult | null>(null);
  const [exerciseImages, setExerciseImages] = useState<ReadImageResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const materialsInputRef = useRef<HTMLInputElement>(null);
  const answerKeyInputRef = useRef<HTMLInputElement>(null);
  const exerciseInputRef = useRef<HTMLInputElement>(null);

  const canGoStep2 = studentLabel.trim() !== "";
  const canGoStep4 = answerKeyText.trim() !== "" || !!answerKeyImage;
  const canGoStep5 = exerciseImages.length > 0;
  const canStart = canGoStep2 && canGoStep4 && canGoStep5;

  async function handleMaterialsFiles(files: FileList | null) {
    if (!files) return;
    const read = await Promise.all(Array.from(files).map(readImageFile));
    setTeachingMaterialsImages((prev) => [...prev, ...read]);
  }

  async function handleAnswerKeyFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setAnswerKeyImage(await readImageFile(file));
  }

  async function handleExerciseFiles(files: FileList | null) {
    if (!files) return;
    const read = await Promise.all(Array.from(files).map(readImageFile));
    setExerciseImages((prev) => [...prev, ...read]);
  }

  async function handleStart() {
    if (!canStart || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const combinedMaterialsText = [
        teachingMaterialsText.trim(),
        teachingMaterialsImages.length ? `(แนบไฟล์สื่อการสอน ${teachingMaterialsImages.length} ไฟล์)` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const checkId = await startCheck({
        studentLabel: studentLabel.trim(),
        topic: topic.trim() || undefined,
        teachingMaterialsText: combinedMaterialsText || undefined,
        answerKeyText: answerKeyText.trim() || undefined,
        answerKeyImage: answerKeyImage,
        exerciseImages,
        classroomId: presetClassroomId,
        studentId: presetStudentId,
        homeworkUnitId: presetHomeworkUnitId,
      });
      onStarted(checkId);
    } catch {
      setError("เริ่มตรวจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-[1.75rem] p-7 sm:p-9">
      {/* Step indicator */}
      <div className="mb-8 flex items-center">
        {STEP_META.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold transition-colors"
                style={{
                  background: step >= s.key ? "#6D9773" : "#F3ECDC",
                  color: step >= s.key ? "#FFFCF5" : "rgba(55,65,81,0.45)",
                }}
              >
                {step > s.key ? "✓" : s.key}
              </div>
              <span
                className="hidden text-[10.5px] font-semibold sm:block"
                style={{ color: step >= s.key ? "#374151" : "rgba(55,65,81,0.4)" }}
              >
                {s.label}
              </span>
            </div>
            {i < STEP_META.length - 1 && (
              <div className="mx-1.5 h-[2px] flex-1 rounded-full" style={{ background: step > s.key ? "#6D9773" : "#F3ECDC" }} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="mb-1.5 text-lg font-bold text-ink">รหัสนักเรียน</h2>
          <p className="mb-5 text-[13px] leading-[1.6] text-ink/55">
            ใช้รหัส/เลขที่แทนชื่อจริงของนักเรียนได้ ไม่บังคับให้กรอกชื่อจริง
          </p>
          <label className="mb-2 block text-xs text-ink/55">Student ID</label>
          <input
            type="text"
            value={studentLabel}
            onChange={(e) => setStudentLabel(e.target.value)}
            placeholder="เช่น 005"
            disabled={lockStudent}
            className="mb-2 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none disabled:opacity-70"
          />
          <label className="mb-2 mt-4 block text-xs text-ink/55">หัวข้อ/บทเรียน (ไม่บังคับ)</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="เช่น การแยกตัวประกอบ"
            className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
          />
          <StepFooter onNext={() => setStep(2)} nextDisabled={!canGoStep2} />
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="mb-1.5 text-lg font-bold text-ink">สื่อการสอน (Teaching Materials)</h2>
          <p className="mb-5 text-[13px] leading-[1.6] text-ink/55">
            ใช้เป็นบริบทให้ AI เข้าใจว่านักเรียนกำลังเรียนเรื่องอะไร — ไม่บังคับ ข้ามได้
          </p>
          <textarea
            value={teachingMaterialsText}
            onChange={(e) => setTeachingMaterialsText(e.target.value)}
            placeholder="พิมพ์บันทึกการสอน แนวคิดหลัก หรือสิ่งที่ครูสอนไว้..."
            className="mb-3 h-28 w-full resize-none rounded-2xl border border-border bg-cream p-3.5 text-[12.5px] text-ink outline-none"
          />
          <UploadRow
            label="แนบไฟล์สื่อการสอน (รูปภาพ)"
            files={teachingMaterialsImages.map((f) => f.name)}
            onPick={() => materialsInputRef.current?.click()}
            onRemove={(i) => setTeachingMaterialsImages((prev) => prev.filter((_, idx) => idx !== i))}
          />
          <input
            ref={materialsInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            onChange={(e) => handleMaterialsFiles(e.target.files)}
            className="hidden"
          />
          <StepFooter onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="mb-1.5 text-lg font-bold text-ink">เฉลย (Answer Key)</h2>
          <p className="mb-5 text-[13px] leading-[1.6] text-ink/55">พิมพ์เฉลย หรือแนบรูปเฉลยอย่างน้อยหนึ่งอย่าง</p>
          <textarea
            value={answerKeyText}
            onChange={(e) => setAnswerKeyText(e.target.value)}
            placeholder="พิมพ์เฉลยหรือเกณฑ์การให้คะแนนที่นี่..."
            className="mb-3 h-28 w-full resize-none rounded-2xl border border-border bg-cream p-3.5 text-[12.5px] text-ink outline-none"
          />
          <UploadRow
            label="หรือแนบรูปเฉลย"
            files={answerKeyImage ? [answerKeyImage.name] : []}
            onPick={() => answerKeyInputRef.current?.click()}
            onRemove={() => setAnswerKeyImage(null)}
          />
          <input
            ref={answerKeyInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            onChange={(e) => handleAnswerKeyFile(e.target.files)}
            className="hidden"
          />
          <StepFooter onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!canGoStep4} />
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="mb-1.5 text-lg font-bold text-ink">แบบฝึกหัดของนักเรียน</h2>
          <p className="mb-5 text-[13px] leading-[1.6] text-ink/55">
            แนบรูปถ่าย/สแกนงานของนักเรียน แนบได้หลายหน้าถ้างานมีหลายหน้า
          </p>
          <UploadRow
            label="แนบรูปแบบฝึกหัด"
            files={exerciseImages.map((f) => f.name)}
            onPick={() => exerciseInputRef.current?.click()}
            onRemove={(i) => setExerciseImages((prev) => prev.filter((_, idx) => idx !== i))}
            emphasize
            previewDataUrls={exerciseImages.map((f) => f.dataUrl)}
          />
          <input
            ref={exerciseInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            onChange={(e) => handleExerciseFiles(e.target.files)}
            className="hidden"
          />
          <StepFooter onBack={() => setStep(3)} onNext={() => setStep(5)} nextDisabled={!canGoStep5} />
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="mb-1.5 text-lg font-bold text-ink">ตรวจสอบก่อนเริ่มตรวจ</h2>
          <p className="mb-5 text-[13px] leading-[1.6] text-ink/55">AI จะอ่านงาน แยกเป็นข้อๆ และตรวจให้อัตโนมัติ ครูตรวจสอบผลได้อีกครั้งก่อนบันทึก</p>
          <div className="mb-6 flex flex-col gap-2.5">
            <ReviewRow label="Student ID" value={studentLabel} />
            {topic && <ReviewRow label="หัวข้อ" value={topic} />}
            <ReviewRow
              label="สื่อการสอน"
              value={teachingMaterialsText || teachingMaterialsImages.length ? "แนบแล้ว" : "ไม่ได้แนบ"}
            />
            <ReviewRow label="เฉลย" value={answerKeyText || answerKeyImage ? "แนบแล้ว" : "ไม่ได้แนบ"} />
            <ReviewRow label="แบบฝึกหัด" value={`${exerciseImages.length} หน้า`} />
          </div>
          {error && (
            <div className="mb-4 rounded-xl border border-[#BB6B53]/30 bg-[#BB6B53]/10 px-4 py-3 text-[12.5px] text-[#BB6B53]">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between gap-2.5">
            <button onClick={() => setStep(4)} className="rounded-full border border-border px-5 py-3 text-[13px] font-semibold text-ink/70">
              ← ย้อนกลับ
            </button>
            <button
              onClick={handleStart}
              disabled={!canStart || submitting}
              className="rounded-full bg-primary px-8 py-3 text-[13.5px] font-bold text-card transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting ? "กำลังเริ่มตรวจ..." : "เริ่มตรวจ →"}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function StepFooter({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-7 flex items-center justify-between">
      {onBack ? (
        <button onClick={onBack} className="rounded-full border border-border px-5 py-3 text-[13px] font-semibold text-ink/70">
          ← ย้อนกลับ
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-full bg-primary px-7 py-3 text-[13px] font-bold text-card disabled:opacity-40"
      >
        ถัดไป →
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-cream px-4 py-3">
      <span className="text-[12.5px] text-ink/55">{label}</span>
      <span className="text-[12.5px] font-semibold text-ink">{value}</span>
    </div>
  );
}

function UploadRow({
  label,
  files,
  onPick,
  onRemove,
  emphasize,
  previewDataUrls,
}: {
  label: string;
  files: string[];
  onPick: () => void;
  onRemove: (index: number) => void;
  emphasize?: boolean;
  previewDataUrls?: string[];
}) {
  return (
    <div>
      <button
        onClick={onPick}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-5 text-center text-[13px] font-semibold transition-colors ${
          emphasize ? "border-primary/40 bg-primary/8 text-primary-dark" : "border-border bg-cream text-ink/55"
        }`}
      >
        <span className="text-base">📎</span> {label}
      </button>
      {files.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {files.map((name, i) => (
            <span key={name + i} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-ink">
              {previewDataUrls?.[i] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewDataUrls[i]} alt="" className="h-4 w-4 rounded-sm object-cover" />
              )}
              {name}
              <button onClick={() => onRemove(i)} className="text-ink/40 hover:text-ink">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
