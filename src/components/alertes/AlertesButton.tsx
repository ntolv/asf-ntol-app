"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

export default function AlertesButton() {
  const auth = useAuth();
  const membreId = auth.member?.id || undefined;
  const { unreadCount } = useNotifications(membreId);

  return (
    <Link
      href="/alertes"
      className="fixed right-4 top-4 z-40 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-sm font-bold text-emerald-900 shadow-sm backdrop-blur xl:right-6"
      aria-label="Ouvrir les alertes"
    >
      <span aria-hidden="true">🔔</span>
      <span>Alertes</span>

      {unreadCount > 0 ? (
        <span className="ml-1 inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}