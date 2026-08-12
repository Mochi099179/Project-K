"use client";

import { useParams } from "next/navigation";
import { useAppData } from "@/lib/store";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { CheckResultView } from "@/components/checks/CheckResultView";

export default function CheckResultPage() {
  const params = useParams<{ checkId: string }>();
  const { getCheck } = useAppData();
  const check = getCheck(params.checkId);

  if (!check) {
    return (
      <div>
        <BreadcrumbBar section={{ label: "ตรวจแบบฝึกหัด", href: "/quick-check" }} />
        <div className="px-10 py-16 text-center text-ink/50">ไม่พบผลตรวจนี้</div>
      </div>
    );
  }

  return (
    <div>
      <BreadcrumbBar section={{ label: "ตรวจแบบฝึกหัด", href: "/quick-check" }} tail={`Student ${check.studentLabel}`} />
      <div className="px-6 py-8 pb-28 sm:px-10">
        <CheckResultView check={check} />
      </div>
    </div>
  );
}
