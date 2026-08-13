"use client";

import { useState } from "react";
import { useAppData } from "@/lib/store";
import { QuickCheckWizard } from "./QuickCheckWizard";
import { HomeworkUnitCheckFlow } from "./HomeworkUnitCheckFlow";

type Mode = "unit" | "manual";

/**
 * Two ways to start a check: reuse an existing Homework Unit (no re-upload of
 * reference material) or the standalone Quick Check wizard (upload
 * everything, one-off). Both write to the same `submissions` table — this
 * component only decides which reference material the teacher has to type.
 */
export function CheckFlowLauncher({
  presetClassroomId = null,
  presetStudentId = null,
  presetStudentLabel = "",
  lockStudent = false,
  presetTopic = "",
  initialHomeworkUnitId = null,
  onStarted,
}: {
  presetClassroomId?: string | null;
  presetStudentId?: string | null;
  presetStudentLabel?: string;
  lockStudent?: boolean;
  presetTopic?: string;
  initialHomeworkUnitId?: string | null;
  onStarted: (checkId: string) => void;
}) {
  const { homeworkUnits } = useAppData();
  const [mode, setMode] = useState<Mode>(initialHomeworkUnitId || homeworkUnits.length > 0 ? "unit" : "manual");

  return (
    <div>
      <div className="mb-5 flex w-fit flex-wrap gap-1.5 rounded-full border border-border bg-card p-1.5">
        <ModeButton active={mode === "unit"} onClick={() => setMode("unit")} label="ใช้ Homework Unit" />
        <ModeButton active={mode === "manual"} onClick={() => setMode("manual")} label="Quick Check (อัปโหลดเอง)" />
      </div>

      {mode === "unit" ? (
        <HomeworkUnitCheckFlow
          presetClassroomId={presetClassroomId}
          presetStudentId={presetStudentId}
          presetStudentLabel={presetStudentLabel}
          lockStudent={lockStudent}
          initialHomeworkUnitId={initialHomeworkUnitId}
          onStarted={onStarted}
        />
      ) : (
        <QuickCheckWizard
          presetClassroomId={presetClassroomId}
          presetStudentId={presetStudentId}
          presetStudentLabel={presetStudentLabel}
          lockStudent={lockStudent}
          presetTopic={presetTopic}
          onStarted={onStarted}
        />
      )}
    </div>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4.5 py-2.5 text-[12.5px] font-semibold transition-colors"
      style={{
        background: active ? "#6D9773" : "transparent",
        color: active ? "#FFFCF5" : "rgba(55,65,81,0.6)",
      }}
    >
      {label}
    </button>
  );
}
