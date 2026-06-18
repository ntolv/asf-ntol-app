"use client";

import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function badgeClass(type: string) {
  if (type === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  if (type === "error") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function AlertesPage() {
  const auth = useAuth();
  const membreId = auth.member?.id || undefined;
  const {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications(membreId);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Alertes reçues
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
          Centre d’alertes
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Consulte les alertes envoyées à ton compte et marque-les comme lues.
        </p>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Non lues
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? "..." : unreadCount}
            </p>
          </div>

          <button
            type="button"
            onClick={() => markAllAsRead()}
            disabled={loading || unreadCount === 0}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 disabled:opacity-50"
          >
            Tout marquer comme lu
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="space-y-3">
        {loading ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Chargement des alertes...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Aucune alerte pour le moment.
          </div>
        ) : (
          notifications.map((notification) => (
            <article
              key={notification.id}
              className={[
                "rounded-[24px] border bg-white p-5 shadow-sm",
                notification.lue ? "border-slate-200" : "border-emerald-200",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeClass(notification.type)}`}>
                      {notification.type}
                    </span>

                    {!notification.lue ? (
                      <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                        Non lue
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-lg font-bold text-slate-900">
                    {notification.titre}
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    {notification.message}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    {formatDate(notification.date_creation)}
                  </p>
                </div>

                {!notification.lue ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className="shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
                  >
                    Lu
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}