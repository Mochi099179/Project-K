import { AppDataProvider } from "@/lib/store";
import { AppShellGate } from "@/components/layout/AppShellGate";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <AppShellGate>{children}</AppShellGate>
    </AppDataProvider>
  );
}
