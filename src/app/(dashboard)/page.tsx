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

const quickActions = [
  { href: "/contributions", label: "Encaisser" },
  { href: "/decaissements", label: "Décaisser" },
  { href: "/tontine", label: "Tontine" },
  { href: "/encheres", label: "Enchères" },
  { href: "/membres-connectes", label: "Connectés" },
];

const kpiLinks = [
  { key: "caisse", href: "/caisse", label: "Caisse disponible" },
  { key: "retards", href: "/montants-attendus", label: "Retards" },
  { key: "encheres", href: "/encheres", label: "Enchères" },
  { key: "decaissements", href: "/decaissements", label: "Décaissements" },
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

  const memberName = auth.member?.nom || "Utilisateur";
  const memberRole = auth.member?.role || auth.member?.roleCode || "Membre";

  return (
    <>
      <div className="xl:hidden">
        <div className="flex flex-col gap-4 pb-20">
          <section className="rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Membre connecté
                </p>
                <p className="mt-1 truncate text-lg font-bold text-slate-900">
                  {auth.loading ? "Chargement..." : memberName}
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
              Association Famille NTOL
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Centre de pilotage
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Vue rapide de la caisse, des retards, des enchères et des décaissements.
            </p>
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
              Informations
            </p>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                🏆 Dernier gagnant :{" "}
                <span className="font-bold text-slate-900">
                  {loading
                    ? "..."
                    : dernierGagnant?.gagnant
                      ? `${dernierGagnant.gagnant}${dernierGagnant.periode ? ` — Session ${dernierGagnant.periode}` : ""}`
                      : "Aucun gagnant"}
                </span>
              </p>

              <p>
                👥 Membres ayant gagné la tontine :{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : data?.tontine?.nb_lots_attribues ?? 0}
                </span>
              </p>

              <p>
                ⚠️ Alerte :{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : `${data?.retards?.nb_membres_retard ?? 0} membres en retard`}
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
                  Membre connecté
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {auth.loading ? "Chargement..." : memberName}
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
              Association Famille NTOL
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Centre de pilotage
            </h1>
            <p className="mt-3 text-base text-slate-600">
              Vue synthétique de la situation financière et tontine.
            </p>
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

          <section className="grid gap-4 md:grid-cols-5">
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
              Informations
            </p>

            <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
              <p>
                🏆 Dernier gagnant :{" "}
                <span className="font-bold text-slate-900">
                  {loading
                    ? "..."
                    : dernierGagnant?.gagnant
                      ? `${dernierGagnant.gagnant}${dernierGagnant.periode ? ` — Session ${dernierGagnant.periode}` : ""}`
                      : "Aucun gagnant"}
                </span>
              </p>

              <p>
                👥 Membres ayant gagné :{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : data?.tontine?.nb_lots_attribues ?? 0}
                </span>
              </p>

              <p>
                ⚠️ Alerte :{" "}
                <span className="font-bold text-slate-900">
                  {loading ? "..." : `${data?.retards?.nb_membres_retard ?? 0} membres en retard`}
                </span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}