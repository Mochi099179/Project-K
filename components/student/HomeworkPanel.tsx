import type { Student } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export function HomeworkPanel({
  student,
  onToggleFile,
  onToggleAnswer,
  onSend,
  onConfirm,
}: {
  student: Student;
  onToggleFile: () => void;
  onToggleAnswer: () => void;
  onSend: () => void;
  onConfirm: () => void;
}) {
  const hw = student.homework;
  const canSend = hw.hasFile && hw.hasAnswer && hw.status === "none";

  return (
    <Card className="rounded-[1.75rem] p-7">
      {hw.status === "none" && (
        <>
          <div className="mb-4.5 flex flex-wrap gap-3">
            <button
              onClick={onToggleFile}
              className="rounded-2xl border border-border bg-cream px-4.5 py-3 text-[13px] text-ink"
            >
              {hw.hasFile ? "✓ แนบไฟล์การบ้านแล้ว" : "แนบไฟล์การบ้าน"}
            </button>
            <button
              onClick={onToggleAnswer}
              className="rounded-2xl border border-border bg-cream px-4.5 py-3 text-[13px] text-ink"
            >
              {hw.hasAnswer ? "✓ แนบเฉลยแล้ว" : "แนบเฉลย"}
            </button>
          </div>
          {canSend ? (
            <button
              onClick={onSend}
              className="rounded-full bg-primary px-6 py-3 text-[13px] font-bold text-card transition-transform hover:scale-[1.03]"
            >
              ส่งให้ AI ตรวจ →
            </button>
          ) : (
            <p className="text-[13px] text-ink/50">แนบไฟล์การบ้านและเฉลยให้ครบก่อนส่งตรวจ</p>
          )}
        </>
      )}

      {hw.status === "grading" && (
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-ink">AI กำลังตรวจและวิเคราะห์คำตอบ...</span>
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
