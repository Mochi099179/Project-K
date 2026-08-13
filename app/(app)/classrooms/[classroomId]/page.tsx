"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAppData } from "@/lib/store";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { ClassroomHeader } from "@/components/classroom/ClassroomHeader";
import { ClassroomTabs, type ClassroomTabKey } from "@/components/classroom/ClassroomTabs";
import { ClassroomSidePanel } from "@/components/classroom/ClassroomSidePanel";
import { OverviewTab } from "@/components/classroom/tabs/OverviewTab";
import { StudentsTab } from "@/components/classroom/tabs/StudentsTab";
import { ScoresTab } from "@/components/classroom/tabs/ScoresTab";

export default function ClassroomDetailPage() {
  const params = useParams<{ classroomId: string }>();
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

  return (
    <div>
      <BreadcrumbBar tail={`${classroom.name} ${classroom.subject}`} />
      <div className="px-6 py-8 pb-20 sm:px-10">
        <ClassroomHeader classroom={classroom} />
        <ClassroomTabs active={tab} onChange={setTab} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_1fr]">
          <div>
            {tab === "overview" && <OverviewTab classroom={classroom} />}
            {tab === "students" && <StudentsTab classroom={classroom} />}
            {tab === "scores" && <ScoresTab classroom={classroom} />}
          </div>

          <ClassroomSidePanel classroom={classroom} onShowScores={() => setTab("scores")} />
        </div>
      </div>
    </div>
  );
}
