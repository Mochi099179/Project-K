"use client";

import type { ReactNode } from "react";
import { useAppData } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { CreateClassroomModal } from "@/components/classroom/CreateClassroomModal";

export function AppShellGate({ children }: { children: ReactNode }) {
  const { loading } = useAppData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <span
            className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary/25"
            style={{ borderTopColor: "#6D9773" }}
          />
          <p className="text-[13px] text-ink/50">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar />
      <div className="relative min-w-0 flex-1">
        {children}
        <CreateClassroomModal />
      </div>
    </div>
  );
}
