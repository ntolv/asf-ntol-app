import type { ReactNode } from "react";
import AppSidebar from "@/components/ui/AppSidebar";
import MobileBottomNav from "@/components/ui/MobileBottomNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="mx-auto flex min-h-0 flex-1 max-w-[1800px]">
        <AppSidebar />

        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          <main className="flex-1 min-h-0 overflow-y-auto px-4 py-5 pb-28 md:px-6 md:py-6 md:pb-32 xl:pb-10">
            {children}
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

