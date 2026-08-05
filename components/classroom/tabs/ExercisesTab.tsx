import type { Classroom } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { ExerciseTable } from "../ExerciseTable";

export function ExercisesTab({ classroom, onGenerateExercises }: { classroom: Classroom; onGenerateExercises: () => void }) {
  return (
    <Card className="p-5.5">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="text-[13.5px] font-bold text-ink">แบบฝึกหัดทั้งหมด</h3>
        <button
          onClick={onGenerateExercises}
          className="rounded-full bg-primary px-3.5 py-2 text-[11.5px] font-bold text-card"
        >
          + สร้างแบบฝึกหัดใหม่
        </button>
      </div>
      <ExerciseTable rows={classroom.latestExercises} />
    </Card>
  );
}
