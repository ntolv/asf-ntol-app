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
    "Membre connecte"
  );
}

function uniqueByMember(rows: PresenceUser[]) {
  const map = new Map<string, PresenceUser>();

  for (const row of rows) {
    if (row.member_id) {
      map.set(row.member_id, row);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.nom_complet.localeCompare(b.nom_complet, "fr")
  );
}

function pageLabel(page: PresenceUser["page"]) {
  if (page === "encheres") return "Encheres";
  if (page === "membres-connectes") return "Membres connectes";
  return "Application";
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
            Pr&eacute;sence temps r&eacute;el
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Membres connect&eacute;s
          </h1>
          <p className="mt-2 text-slate-600">
            Visualisation simultan&eacute;e des membres pr&eacute;sents sur
            l&apos;application et dans la salle d&apos;ench&egrave;res.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Connect&eacute;s application
            </p>
            <p className="mt-2 text-4xl font-black text-emerald-700">
              {users.length}
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Connect&eacute;s sur ench&egrave;res
            </p>
            <p className="mt-2 text-4xl font-black text-emerald-700">
              {usersOnEncheres.length}
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Ench&eacute;risseurs connect&eacute;s
          </h2>

          <div className="mt-4 space-y-3">
            {usersOnEncheres.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">
                Aucun ench&eacute;risseur connect&eacute; pour le moment.
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
                      Pr&eacute;sent sur la page ench&egrave;res
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
            Tous les membres connect&eacute;s
          </h2>

          <div className="mt-4 space-y-3">
            {users.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">
                Aucun membre d&eacute;tect&eacute;.
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
                      Page : {pageLabel(user.page)}
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