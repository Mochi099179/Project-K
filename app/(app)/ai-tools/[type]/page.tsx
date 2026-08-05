"use client";

import { useParams, useSearchParams } from "next/navigation";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { GeneratePanel } from "@/components/ai/GeneratePanel";
import { GENERATE_TYPE_LABEL, type GenerateType } from "@/lib/types";

const VALID_TYPES: GenerateType[] = ["materials", "exercises", "plan", "technique"];

export default function AiToolPage() {
  const params = useParams<{ type: string }>();
  const searchParams = useSearchParams();
  const classroomId = searchParams.get("classroomId");

  const type = params.type as GenerateType;
  const isValid = VALID_TYPES.includes(type);

  if (!isValid) {
    return (
      <div>
        <BreadcrumbBar />
        <div className="px-10 py-16 text-center text-ink/50">ไม่พบเครื่องมือ AI นี้</div>
      </div>
    );
  }

  return (
    <div>
      <BreadcrumbBar tail={GENERATE_TYPE_LABEL[type]} />
      <div className="px-6 py-8 pb-20 sm:px-10">
        <GeneratePanel type={type} classroomId={classroomId} />
      </div>
    </div>
  );
}
