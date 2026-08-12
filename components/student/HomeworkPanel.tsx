"use client";

import { useState } from "react";
import type { Student } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

type SendPayload = { imageBase64: string; mediaType: string; answerKeyText: string };

export function HomeworkPanel({
  student,
  onSend,
  onConfirm,
}: {
  student: Student;
  onSend: (payload: SendPayload) => void;
  onConfirm: () => void;
}) {
  const hw = student.homework;

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [answerKeyText, setAnswerKeyText] = useState("");

  const canSend = !!imageBase64 && answerKeyText.trim() !== "" && hw.status === "none";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const match = header.match(/data:(.*);base64/);
      setImagePreview(dataUrl);
      setImageBase64(base64);
      setMediaType(match?.[1] ?? file.type);
    };
    reader.readAsDataURL(file);
  }

  function handleSend() {
    if (!imageBase64 || !mediaType) return;
    onSend({ imageBase64, mediaType, answerKeyText: answerKeyText.trim() });
  }

  return (
    <Card className="rounded-[1.75rem] p-7">
      {hw.status === "none" && (
        <>
          {hw.error && (
            <div className="mb-4 rounded-xl border border-[#BB6B53]/30 bg-[#BB6B53]/10 px-4 py-3 text-[12.5px] text-[#BB6B53]">
              {hw.error}
            </div>
          )}

          <div className="mb-4.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs text-ink/55">รูปถ่ายการบ้าน (ลายมือนักเรียน)</label>
              <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-cream text-center text-ink/50 hover:border-primary/40">
                {imagePreview ? (
                  <img src={imagePreview} alt="ตัวอย่างการบ้าน" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <>
                    <span className="text-lg">📷</span>
                    <span className="text-[12px]">แตะเพื่อถ่ายหรือเลือกรูป</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="mb-2 block text-xs text-ink/55">เฉลย / เกณฑ์การให้คะแนน</label>
              <textarea
                value={answerKeyText}
                onChange={(e) => setAnswerKeyText(e.target.value)}
                placeholder="พิมพ์เฉลยหรือเกณฑ์การให้คะแนนที่นี่..."
                className="h-32 w-full resize-none rounded-2xl border border-border bg-cream p-3 text-[12.5px] text-ink outline-none"
              />
            </div>
          </div>

          {canSend ? (
            <button
              onClick={handleSend}
              className="rounded-full bg-primary px-6 py-3 text-[13px] font-bold text-card transition-transform hover:scale-[1.03]"
            >
              ส่งให้ AI ตรวจ →
            </button>
          ) : (
            <p className="text-[13px] text-ink/50">แนบรูปการบ้านและกรอกเฉลยให้ครบก่อนส่งตรวจ</p>
          )}
        </>
      )}

      {hw.status === "grading" && (
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-ink">AI กำลังอ่านลายมือ ตรวจ และวิเคราะห์คำตอบ...</span>
        </div>
      )}

      {hw.status === "graded" && (
        <>
          <div className="mb-6 flex items-center gap-5">
            <div className="flex h-[70px] w-[70px] flex-shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <span className="text-lg font-bold text-primary">{hw.score}</span>
            </div>
            <div>
              <div className="mb-1 text-sm font-semibold text-ink">ผลตรวจการบ้านโดย AI</div>
              <div className="text-xs text-ink/45">อัปเดตอัตโนมัติทุกครั้งที่ส่งตรวจใหม่</div>
            </div>
          </div>

          {hw.transcription && (
            <div className="mb-5 rounded-2xl bg-cream p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/50">
                ข้อความที่ AI อ่านได้จากลายมือ
              </div>
              <div className="whitespace-pre-wrap text-[12.5px] leading-[1.6] text-ink/80">{hw.transcription}</div>
            </div>
          )}

          <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-primary">จุดเด่น</div>
              {(hw.strengths || []).map((txt) => (
                <div key={txt} className="mb-1 text-[13px] leading-[1.6] text-ink/70">
                  • {txt}
                </div>
              ))}
            </div>
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-gold">จุดที่ควรเสริม</div>
              {(hw.weaknesses || []).map((txt) => (
                <div key={txt} className="mb-1 text-[13px] leading-[1.6] text-ink/70">
                  • {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="mb-5 rounded-2xl bg-cream p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/50">ข้อเสนอแนะ</div>
            {(hw.suggestions || []).map((txt) => (
              <div key={txt} className="mb-1 text-[13px] leading-[1.6] text-ink">
                → {txt}
              </div>
            ))}
          </div>
          {hw.confirmed ? (
            <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-dark">
              ✓ ครูยืนยันความถูกต้องแล้ว
            </div>
          ) : (
            <button
              onClick={onConfirm}
              className="rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-[13px] font-semibold text-primary-dark"
            >
              ยืนยันความถูกต้องของ AI
            </button>
          )}
        </>
      )}
    </Card>
  );
}
