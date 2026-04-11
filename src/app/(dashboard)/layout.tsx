import type { ReactNode } from "react";
import AppSidebar from "@/components/ui/AppSidebar";
import MobileBottomNav from "@/components/ui/MobileBottomNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-dashboard-layout-root="true"
      className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-emerald-50 via-white to-white"
    >
      <div
        data-dashboard-shell="true"
        className="mx-auto flex h-full min-h-0 w-full max-w-[1800px]"
      >
        <AppSidebar />

        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          <main
            data-dashboard-main="true"
            className="flex-1 min-h-0 overflow-y-auto px-4 py-5 md:px-6 md:py-6"
          >
            {children}
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
