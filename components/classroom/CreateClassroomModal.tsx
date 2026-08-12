"use client";

import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/store";
import { GuidedClassroomSteps } from "./GuidedClassroomSteps";

export function CreateClassroomModal() {
  const { showCreateModal, closeCreateModal } = useAppData();
  const router = useRouter();

  if (!showCreateModal) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-[560px] max-w-[92vw] overflow-y-auto rounded-[1.75rem] border border-border bg-card p-9">
        <button onClick={closeCreateModal} className="absolute top-5 right-5 text-lg text-ink/50" aria-label="Close">
          ✕
        </button>
        <GuidedClassroomSteps
          onCancel={closeCreateModal}
          onCreated={(id) => {
            closeCreateModal();
            router.push(`/classrooms/${id}`);
          }}
        />
      </div>
    </div>
  );
}
