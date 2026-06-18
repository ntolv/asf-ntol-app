"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import { useAuth } from "@/hooks/useAuth";

type PilotageResponse = {
  contributions?: {
    total_encaisse?: number;
  };
  tontine?: {
    total_encheres?: number;
    nb_lots_attribues?: number;
    derniers_gagnants?: Array<{
      periode?: string;
      gagnant?: string;
    }>;
  };
  decaissements?: {
    total_general?: number;
  };
  retards?: {
    montant_total_retards?: number;
    nb_membres_retard?: number;
  };
};

const T = {
  memberConnected: "Membre connect\u00e9",
  center: "Centre de pilotage",
  family: "Association Famille NTOL",
  mobileDesc:
    "Vue rapide de la caisse, des retards, des ench\u00e8res et des d\u00e9caissements.",
  desktopDesc: "Vue synth\u00e9tique de la situation financi\u00e8re et tontine.",
  dashboard: "Dashboard",
  encaisser: "Encaisser",
  decaisser: "D\u00e9caisser",
  tontine: "Tontine",
  encheres: "Ench\u00e8res",
  connectes: "Connect\u00e9s",
  caisseDisponible: "Caisse disponible",
  retards: "Retards",
  decaissements: "D\u00e9caissements",
  informations: "Informations",
  lastWinner: "Dernier gagnant",
  winnersCycle: "Membres ayant gagn\u00e9 la tontine",
  winners: "Membres ayant gagn\u00e9",
  alert: "Alerte",
  noWinner: "Aucun gagnant",
  membersLate: "membres en retard",
  loading: "Chargement...",
  user: "Utilisateur",
  member: "Membre",
};

const ICONS = {
  trophy: "\uD83C\uDFC6",
  users: "\uD83D\uDC65",
  warning: "\u26A0\uFE0F",
};

const quickActions = [
  { href: "/dashboard", label: T.dashboard },
  { href: "/contributions", label: T.encaisser },
  { href: "/decaissements", label: T.decaisser },
  { href: "/tontine", label: T.tontine },
  { href: "/encheres", label: T.encheres },
  { href: "/membres-connectes", label: T.connectes },
];

const kpiLinks = [
  { key: "caisse", href: "/caisse", label: T.caisseDisponible },
  { key: "retards", href: "/montants-attendus", label: T.retards },
  { key: "encheres", href: "/encheres", label: T.encheres },
  { key: "decaissements", href: "/decaissements", label: T.decaissements },
];

function money(value: number | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function HomePage() {
  const auth = useAuth();
  const [data, setData] = useState<PilotageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPilotage() {
    try {
      const res = await fetch("/api/caisses/pilotage", { cache: "no-store" });
      if (!res.ok) throw new Error("Erreur chargement pilotage");
      const json = (await res.json()) as PilotageResponse;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPilotage();
    const timer = window.setInterval(loadPilotage, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const dernierGagnant = data?.tontine?.derniers_gagnants?.[0];

  const values: Record<string, string> = {
    caisse: money(data?.contributions?.total_encaisse),
    retards: money(data?.retards?.montant_total_retards),
    encheres: money(data?.tontine?.total_encheres),
    decaissements: money(data?.decaissements?.total_general),
  };

  const memberName = auth.member?.nom || T.user;
  const memberRole = auth.member?.role || auth.member?.roleCode || T.member;

  const winnerText = dernierGagnant?.gagnant
    ? `${dernierGagnant.gagnant}${dernierGagnant.periode ? ` \u2014 Session ${dernierGagnant.periode}` : ""}`
    : T.noWinner;

  return (
    <>
      <div className="xl:hidden">
        <div className="flex flex-col gap-4 pb-20">
          <section className="rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  {T.memberConnected}
                </p>
                <p className="mt-1 truncate text-lg font-bold text-slate-900">
                  {auth.loading ? T.loading : memberName}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {auth.loading ? "" : memberRole}
                </p>
              </div>

              <LogoutButton compact className="shrink-0" />
            </div>
          </section>

          <section className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {T.family}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {T.center}
            </h1>
            <p className="mt-3 text-sm text-slate-600">{T.mobileDesc}</p>
          </section>

          <section className="grid grid-cols-2 gap-3">
            {kpiLinks.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">
                  {loading ? "..." : values[item.key]}
                </p>
              </Link>
            ))}
          </section>

          <section className="grid grid-cols-2 gap-3">
            {quickActions.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-[70px] items-center justify-center rounded-[22px] border border-slate-200 bg-white p-4 text-center text-base font-bold text-slate-900 shadow-sm"
              >
                {item.label}
              </Link>
            ))}
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {T.informations}
            </p>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                {ICONS.trophy} {T.lastWinner}:{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : winnerText}
                </span>
              </p>

              <p>
                {ICONS.users} {T.winnersCycle}:{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : data?.tontine?.nb_lots_attribues ?? 0}
                </span>
              </p>

              <p>
                {ICONS.warning} {T.alert}:{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : `${data?.retards?.nb_membres_retard ?? 0} ${T.membersLate}`}
                </span>
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="hidden xl:block">
        <div className="space-y-6 p-4 md:p-6">
          <section className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  {T.memberConnected}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {auth.loading ? T.loading : memberName}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {auth.loading ? "" : memberRole}
                </p>
              </div>

              <LogoutButton />
            </div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {T.family}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {T.center}
            </h1>
            <p className="mt-3 text-base text-slate-600">{T.desktopDesc}</p>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            {kpiLinks.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  {item.label}
                </p>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {loading ? "..." : values[item.key]}
                </p>
              </Link>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-6">
            {quickActions.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[24px] border border-slate-200 bg-white p-5 text-center text-lg font-bold text-slate-900 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                {item.label}
              </Link>
            ))}
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {T.informations}
            </p>

            <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
              <p>
                {ICONS.trophy} {T.lastWinner}:{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : winnerText}
                </span>
              </p>

              <p>
                {ICONS.users} {T.winners}:{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : data?.tontine?.nb_lots_attribues ?? 0}
                </span>
              </p>

              <p>
                {ICONS.warning} {T.alert}:{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : `${data?.retards?.nb_membres_retard ?? 0} ${T.membersLate}`}
                </span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}