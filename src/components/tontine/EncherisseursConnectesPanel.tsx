"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    if (row.member_id) map.set(row.member_id, row);
  }

  return Array.from(map.values()).sort((a, b) =>
    a.nom_complet.localeCompare(b.nom_complet, "fr")
  );
}

export default function EncherisseursConnectesPanel({ member }: { member: any }) {
  const [presenceRows, setPresenceRows] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!member?.id) return;

    const channel = supabase.channel("asf-ntol-presence", {
      config: {
        presence: { key: `encheres-${member.id}` },
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
          await channel.track({
            member_id: member.id,
            nom_complet: getMemberName(member),
            page: "encheres",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [member]);

  const usersOnEncheres = useMemo(
    () => uniqueByMember(presenceRows.filter((u) => u.page === "encheres")),
    [presenceRows]
  );

  return (
    <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Salle en direct
          </p>
          <h2 className="mt-1 text-xl font-semibold text-emerald-950">
            Ench&eacute;risseurs connect&eacute;s
          </h2>
        </div>

        <Link
          href="/membres-connectes"
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          Voir tout
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <span className="font-black">{usersOnEncheres.length}</span>{" "}
        membre{usersOnEncheres.length > 1 ? "s" : ""} pr&eacute;sent
        {usersOnEncheres.length > 1 ? "s" : ""} dans la salle.
      </div>

      <div className="mt-4 space-y-2">
        {usersOnEncheres.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Aucun ench&eacute;risseur connect&eacute; pour le moment.
          </p>
        ) : (
          usersOnEncheres.map((user) => (
            <div
              key={user.member_id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-sm font-semibold text-slate-900">
                {user.nom_complet}
              </p>
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
            </div>
          ))
        )}
      </div>
    </section>
  );
}