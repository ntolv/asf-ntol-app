import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import AppSidebar from "@/components/ui/AppSidebar";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import AlertesButton from "@/components/alertes/AlertesButton";
import MobilePersistentQuickNav from "@/components/navigation/MobilePersistentQuickNav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div
      data-dashboard-layout-root="true"
      className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-emerald-50 via-white to-white"
    >
      <div
        data-dashboard-shell="true"
        className="mx-auto flex h-full min-h-0 w-full max-w-[1800px] xl:h-auto xl:min-h-screen xl:items-start"
      >
        <AppSidebar />

        <AlertesButton />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main
            data-dashboard-main="true"
            className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[140px] md:px-6 md:py-6 xl:overflow-visible xl:pb-10"
          >
            <MobilePersistentQuickNav />
            {children}
          </main>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}