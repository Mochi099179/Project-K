"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { CheckFlowLauncher } from "@/components/quickcheck/CheckFlowLauncher";

function QuickCheckInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unitId = searchParams.get("unitId");
  const topic = searchParams.get("topic") ?? "";

  return (
    <CheckFlowLauncher
      presetTopic={topic}
      initialHomeworkUnitId={unitId}
      onStarted={(checkId) => router.push(`/checks/${checkId}`)}
    />
  );
}

export default function QuickCheckPage() {
  return (
    <div>
      <BreadcrumbBar section={{ label: "ตรวจแบบฝึกหัด", href: "/quick-check" }} />
      <div className="px-6 py-8 pb-20 sm:px-10">
        <div className="mx-auto max-w-[640px]">
          <div className="mb-6 text-center">
            <h1 className="mb-1.5 text-2xl font-bold text-ink">ตรวจแบบฝึกหัด</h1>
            <p className="text-[13px] text-ink/55">
              อัปโหลดงานของนักเรียนแล้วให้ AI ช่วยตรวจได้ทันที ไม่ต้องสร้างห้องเรียนก่อน
            </p>
          </div>
          <Suspense fallback={null}>
            <QuickCheckInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
