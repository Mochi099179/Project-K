export type ClassroomTabKey = "overview" | "students" | "scores";

const TABS: { key: ClassroomTabKey; label: string }[] = [
  { key: "overview", label: "ภาพรวม" },
  { key: "students", label: "นักเรียน" },
  { key: "scores", label: "คะแนน & วิเคราะห์ผล" },
];

export function ClassroomTabs({
  active,
  onChange,
}: {
  active: ClassroomTabKey;
  onChange: (tab: ClassroomTabKey) => void;
}) {
  return (
    <div className="mb-6 flex w-fit flex-wrap gap-1.5 rounded-full border border-border bg-card p-1.5">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className="rounded-full px-4.5 py-2.5 text-[12.5px] font-semibold transition-colors"
          style={{
            background: active === tab.key ? "#6D9773" : "transparent",
            color: active === tab.key ? "#FFFCF5" : "rgba(55,65,81,0.6)",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
