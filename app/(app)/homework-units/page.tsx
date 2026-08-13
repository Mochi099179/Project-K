"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/store";
import { BreadcrumbBar } from "@/components/layout/BreadcrumbBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { HomeworkUnitCard } from "@/components/homeworkunit/HomeworkUnitCard";

export default function HomeworkUnitsPage() {
  const { homeworkUnits, createHomeworkUnit } = useAppData();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <BreadcrumbBar section={{ label: "Homework Unit", href: "/homework-units" }} />
      <div className="px-6 py-8 pb-20 sm:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Homework Unit</h1>
            <p className="mt-1 text-[12.5px] text-ink/55">คลังแบบฝึกหัด เฉลย และสื่อการสอน แยกจากห้องเรียน</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-[13px] font-bold text-card"
          >
            <span className="text-base leading-none">+</span> สร้างชุดแบบฝึกหัดใหม่
          </button>
        </div>

        {homeworkUnits.length === 0 ? (
          <EmptyState
            icon={<span className="text-2xl">📚</span>}
            title="ยังไม่มี Homework Unit"
            description="สร้างชุดแบบฝึกหัดเพื่อเก็บแบบฝึกหัด เฉลย และสื่อการสอนไว้ใช้ซ้ำ"
            action={
              <button onClick={() => setShowCreate(true)} className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card">
                สร้าง Homework Unit
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {homeworkUnits.map((u) => (
              <HomeworkUnitCard key={u.id} unit={u} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateHomeworkUnitModal
          onClose={() => setShowCreate(false)}
          onCreate={async (input) => {
            const id = await createHomeworkUnit(input);
            setShowCreate(false);
            router.push(`/homework-units/${id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateHomeworkUnitModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: { name: string; subject: string; grade: string }) => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("คณิตศาสตร์");
  const [grade, setGrade] = useState("");

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink/50 backdrop-blur-sm">
      <div className="relative w-[460px] max-w-[92vw] rounded-[1.75rem] border border-border bg-card p-9">
        <button onClick={onClose} className="absolute top-5 right-5 text-lg text-ink/50" aria-label="Close">
          ✕
        </button>
        <h2 className="mb-6 text-2xl font-semibold text-ink">สร้าง Homework Unit</h2>
        <label className="mb-2 block text-xs text-ink/55">ชื่อชุดแบบฝึกหัด</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น พหุนามและการดำเนินการ"
          className="mb-4.5 w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
        />
        <div className="mb-7 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-xs text-ink/55">วิชา</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-ink/55">ระดับชั้น</label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="เช่น ม.2"
              className="w-full rounded-xl border border-border bg-cream px-4 py-3 text-sm text-ink outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5">
          <button onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-[13px] text-ink/70">
            ยกเลิก
          </button>
          <button
            onClick={() => name.trim() && onCreate({ name: name.trim(), subject, grade })}
            disabled={!name.trim()}
            className="rounded-full bg-primary px-6 py-2.5 text-[13px] font-bold text-card disabled:opacity-40"
          >
            สร้าง
          </button>
        </div>
      </div>
    </div>
  );
}
