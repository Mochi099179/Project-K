"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Classroom, Student } from "@/lib/types";
import { finalQuestionResult } from "@/lib/types";
import { useAppData } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { CheckFlowLauncher } from "@/components/quickcheck/CheckFlowLauncher";

export function CheckHomeworkPanel({ classroom, student }: { classroom: Classroom; student: Student }) {
  const { getChecksForStudent } = useAppData();
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const checks = getChecksForStudent(classroom.id, student.id);

  if (showWizard) {
    return (
      <CheckFlowLauncher
        presetClassroomId={classroom.id}
        presetStudentId={student.id}
        presetStudentLabel={student.studentId}
        lockStudent
        onStarted={(checkId) => router.push(`/checks/${checkId}`)}
      />
    );
  }

  return (
    <Card className="rounded-[1.75rem] p-7">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-ink">ตรวจการบ้าน</h3>
        <button
          onClick={() => setShowWizard(true)}
          className="rounded-full bg-primary px-5 py-2.5 text-[12.5px] font-bold text-card transition-transform hover:scale-[1.02]"
        >
          + ตรวจการบ้านใหม่
        </button>
      </div>

      {checks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-[13px] text-ink/45">
          ยังไม่มีการตรวจการบ้านสำหรับนักเรียนคนนี้
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {checks.map((c) => {
            const correct = c.questions.filter((q) => finalQuestionResult(q).isCorrect).length;
            return (
              <Link
                key={c.id}
                href={`/checks/${c.id}`}
                className="flex items-center justify-between rounded-xl bg-cream px-4 py-3 transition-colors hover:bg-[#F3ECDC]"
              >
                <div>
                  <div className="text-[12.5px] font-semibold text-ink">{c.topic || "แบบฝึกหัด"}</div>
                  <div className="text-[10.5px] text-ink/50">
                    {new Date(c.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} · {correct}/
                    {c.questions.length} ข้อ
                    {c.status === "needs_review" && <span className="ml-1.5 font-semibold text-[#a8823a]">· รอตรวจสอบ</span>}
                  </div>
                </div>
                <span className="text-[13px] font-bold text-primary">{c.overallScore}%</span>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
