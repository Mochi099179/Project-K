"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppData } from "@/lib/store";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { ClassroomHeader } from "@/components/classroom/ClassroomHeader";
import { ClassroomTabs, type ClassroomTabKey } from "@/components/classroom/ClassroomTabs";
import { ClassroomSidePanel } from "@/components/classroom/ClassroomSidePanel";
import { OverviewTab } from "@/components/classroom/tabs/OverviewTab";
import { StudentsTab } from "@/components/classroom/tabs/StudentsTab";
import { ExercisesTab } from "@/components/classroom/tabs/ExercisesTab";
import { ScoresTab } from "@/components/classroom/tabs/ScoresTab";
import { PlansTab } from "@/components/classroom/tabs/PlansTab";
import { ActivitiesTab } from "@/components/classroom/tabs/ActivitiesTab";

export default function ClassroomDetailPage() {
  const params = useParams<{ classroomId: string }>();
  const router = useRouter();
  const { getClassroom } = useAppData();
  const [tab, setTab] = useState<ClassroomTabKey>("overview");

  const classroom = getClassroom(params.classroomId);

  if (!classroom) {
    return (
      <div>
        <BreadcrumbBar />
        <div className="px-10 py-16 text-center text-ink/50">ไม่พบห้องเรียนนี้</div>
      </div>
    );
  }

  const goGenerate = (type: "materials" | "exercises" | "plan" | "technique") =>
    router.push(`/ai-tools/${type}?classroomId=${classroom.id}`);

  return (
    <div>
      <BreadcrumbBar tail={`${classroom.name} ${classroom.subject}`} />
      <div className="px-6 py-8 pb-20 sm:px-10">
        <ClassroomHeader
          classroom={classroom}
          onGenerateExercises={() => goGenerate("exercises")}
          onGeneratePlan={() => goGenerate("plan")}
        />
        <ClassroomTabs active={tab} onChange={setTab} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_1fr]">
          <div>
            {tab === "overview" && <OverviewTab classroom={classroom} onGenerateExercises={() => goGenerate("exercises")} />}
            {tab === "students" && <StudentsTab classroom={classroom} />}
            {tab === "exercises" && <ExercisesTab classroom={classroom} onGenerateExercises={() => goGenerate("exercises")} />}
            {tab === "scores" && <ScoresTab classroom={classroom} />}
            {tab === "plans" && <PlansTab classroom={classroom} onGeneratePlan={() => goGenerate("plan")} />}
            {tab === "activities" && <ActivitiesTab classroom={classroom} onGenerateTechnique={() => goGenerate("technique")} />}
          </div>

          <ClassroomSidePanel
            classroom={classroom}
            onShowScores={() => setTab("scores")}
            onGenerateExercises={() => goGenerate("exercises")}
            onGeneratePlan={() => goGenerate("plan")}
            onGenerateTechnique={() => goGenerate("technique")}
          />
        </div>
      </div>
    </div>
  );
}
