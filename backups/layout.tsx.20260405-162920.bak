"use client";

import AppSidebar from "@/components/ui/AppSidebar";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import AppTopBar from "@/components/ui/AppTopBar";
import RoleGuard from "@/components/auth/RoleGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopBar />

          <main className="flex-1 px-4 py-5 pb-28 md:px-6 md:py-6 md:pb-32 xl:pb-6">
            <RoleGuard>{children}</RoleGuard>
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}