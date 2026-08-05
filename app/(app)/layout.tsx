import { AppDataProvider } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { CreateClassroomModal } from "@/components/classroom/CreateClassroomModal";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <div className="flex min-h-screen bg-cream">
        <Sidebar />
        <div className="relative min-w-0 flex-1">
          {children}
          <CreateClassroomModal />
        </div>
      </div>
    </AppDataProvider>
  );
}
