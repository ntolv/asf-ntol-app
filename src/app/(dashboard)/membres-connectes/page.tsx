"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

type PresenceUser = {
  member_id: string;
  nom_complet: string;
  page: "encheres" | "membres-connectes" | "application";
  online_at: string;
};

function getMemberName(member: unknown) {
  const m = member as any;
  return (
    m?.nom_complet ||
    [m?.prenom, m?.nom].filter(Boolean).join(" ") ||
    m?.email ||
    "Membre connectÃ©"
  );
}

function uniqueByMember(rows: PresenceUser[]) {
  const map = new Map<string, PresenceUser>();

  for (const row of rows) {
    map.set(row.member_id, row);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.nom_complet.localeCompare(b.nom_complet, "fr")
  );
}

export default function MembresConnectesPage() {
  const { member } = useAuth();

  const [presenceRows, setPresenceRows] = useState<PresenceUser[]>([]);

  const users = useMemo(() => uniqueByMember(presenceRows), [presenceRows]);
  const usersOnEncheres = useMemo(
    () => uniqueByMember(presenceRows.filter((u) => u.page === "encheres")),
    [presenceRows]
  );

  useEffect(() => {
    if (!member?.id) return;

    const currentUser: PresenceUser = {
      member_id: member.id,
      nom_complet: getMemberName(member),
      page: "membres-connectes",
      online_at: new Date().toISOString(),
    };

    const channel = supabase.channel("asf-ntol-presence", {
      config: {
        presence: {
          key: `membres-connectes-${member.id}`,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();

        const rows = Object.values(state)
          .flat()
          .map((item) => item as unknown as PresenceUser)
          .filter((item) => item?.member_id);

        setPresenceRows(rows);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(currentUser);
        }
      });

    return () => {
      channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [member]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-28 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">
            PrÃ©sence temps rÃ©el
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Membres connectÃ©s
          </h1>
          <p className="mt-2 text-slate-600">
            Visualisation simultanÃ©e des membres prÃ©sents sur lâ€™application et sur la salle dâ€™enchÃ¨res.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">ConnectÃ©s application</p>
            <p className="mt-2 text-4xl font-black text-emerald-700">
              {users.length}
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">ConnectÃ©s sur enchÃ¨res</p>
            <p className="mt-2 text-4xl font-black text-emerald-700">
              {usersOnEncheres.length}
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            EnchÃ©risseurs connectÃ©s
          </h2>

          <div className="mt-4 space-y-3">
            {usersOnEncheres.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">
                Aucun enchÃ©risseur connectÃ© pour le moment.
              </p>
            ) : (
              usersOnEncheres.map((user) => (
                <div
                  key={user.member_id}
                  className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {user.nom_complet}
                    </p>
                    <p className="text-sm text-slate-500">
                      PrÃ©sent sur la page enchÃ¨res
                    </p>
                  </div>

                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Tous les membres connectÃ©s
          </h2>

          <div className="mt-4 space-y-3">
            {users.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">
                Aucun membre dÃ©tectÃ©.
              </p>
            ) : (
              users.map((user) => (
                <div
                  key={user.member_id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {user.nom_complet}
                    </p>
                    <p className="text-sm text-slate-500">
                      Page : {user.page === "encheres" ? "EnchÃ¨res" : "Application"}
                    </p>
                  </div>

                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}