"use client";

import Link from "next/link";
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

export default function MembresConnectesLink() {
  const { member } = useAuth();
  const [presenceRows, setPresenceRows] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!member?.id) return;

    const currentUser: PresenceUser = {
      member_id: member.id,
      nom_complet: getMemberName(member),
      page: "encheres",
      online_at: new Date().toISOString(),
    };

    const channel = supabase.channel("asf-ntol-presence", {
      config: {
        presence: {
          key: `encheres-${member.id}`,
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

  const connectedOnEncheres = useMemo(() => {
    const ids = new Set(
      presenceRows
        .filter((row) => row.page === "encheres")
        .map((row) => row.member_id)
    );

    return ids.size;
  }, [presenceRows]);

  return (
    <Link
      href="/membres-connectes"
      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
      Membres connectÃ©s
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
        {connectedOnEncheres}
      </span>
    </Link>
  );
}