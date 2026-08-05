"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppData } from "@/lib/store";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { HomeworkPanel } from "@/components/student/HomeworkPanel";
import { HistoryPanel } from "@/components/student/HistoryPanel";

export default function StudentProfilePage() {
  const params = useParams<{ classroomId: string; studentId: string }>();
  const { getClassroom, getStudent, toggleHasFile, toggleHasAnswer, sendToAI, confirmGrading } = useAppData();

  const classroom = getClassroom(params.classroomId);
  const student = getStudent(params.classroomId, params.studentId);

  if (!classroom || !student) {
    return (
      <div>
        <BreadcrumbBar />
        <div className="px-10 py-16 text-center text-ink/50">ไม่พบข้อมูลนักเรียนนี้</div>
      </div>
    );
  }

  const hasHistory = (student.history?.length ?? 0) > 1;

  return (
    <div>
      <BreadcrumbBar tail={`${classroom.name} ${classroom.subject} / ${student.name}`} />
      <div className="px-6 py-8 pb-20 sm:px-10">
        <div className="mx-auto max-w-[760px]">
          <Link
            href={`/classrooms/${classroom.id}`}
            className="mb-4 inline-block text-[12.5px] font-semibold text-primary"
          >
            ← กลับไปที่ {classroom.name}
          </Link>

          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Student Profile
          </div>
          <h1 className="mb-2 text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.2rem]">
            {student.name}
          </h1>
          <p className="mb-4 font-mono text-[13px] text-ink/50">
            เลขที่ {student.seatNo} · รหัสประจำตัว {student.studentId}
          </p>
          <div className="mb-9 flex flex-wrap gap-2">
            {student.problems.map((p) => (
              <span key={p} className="rounded-full bg-primary/12 px-2.5 py-1 font-mono text-[11px] text-primary">
                {p}
              </span>
            ))}
          </div>

          <h2 className="mb-4 text-[1.15rem] font-semibold text-ink">Homework &amp; AI Grading</h2>
          <div className="mb-10">
            <HomeworkPanel
              student={student}
              onToggleFile={() => toggleHasFile(classroom.id, student.id)}
              onToggleAnswer={() => toggleHasAnswer(classroom.id, student.id)}
              onSend={() => sendToAI(classroom.id, student.id)}
              onConfirm={() => confirmGrading(classroom.id, student.id)}
            />
          </div>

          {hasHistory && (
            <>
              <h2 className="mb-4 text-[1.15rem] font-semibold text-ink">
                ประวัติการบ้านและเปรียบเทียบคะแนน AI
              </h2>
              <HistoryPanel history={student.history!} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
