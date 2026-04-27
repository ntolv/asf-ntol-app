"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FluxRow = {
  annee: number;
  type_flux: "ENTREE" | "SORTIE";
  categorie: string;
  montant: number | string | null;
};

type BilanPro = {
  annee: number;
  annee_precedente: number;
  report_precedent: number | string | null;
  type_report: "AVOIR" | "DEVOIR" | "NEUTRE" | string;
  report_avoir: number | string | null;
  report_devoir: number | string | null;
  total_entrees: number | string | null;
  total_sorties: number | string | null;
  solde_final: number | string | null;
  situation_globale: "EXCEDENT" | "DEFICIT" | "EQUILIBRE" | string;
};

type TontineKpi = {
  mise_brute_cycle: number | string | null;
  mise_brute_session: number | string | null;
  total_encheres: number | string | null;
  lots_attribues: number | string | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    bilanPro?: BilanPro | null;
    flux?: FluxRow[];
    tontineKpi?: TontineKpi | null;
    details?: any[];
  };
};

function n(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function money(value: number | string | null | undefined) {
  return `${new Intl.NumberFormat("fr-FR").format(n(value))} FCFA`;
}

function KpiCard({
  title,
  value,
  icon,
  tone,
  subtitle,
}: {
  title: string;
  value: string;
  icon: string;
  tone: "green" | "red" | "blue" | "amber" | "slate";
  subtitle?: string;
}) {
  const styles = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-900",
    red: "bg-red-50 border-red-200 text-red-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    slate: "bg-slate-50 border-slate-200 text-slate-900",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${styles}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-70">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs font-medium opacity-70">{subtitle}</p>
          ) : null}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  tone = "white",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone?: "white" | "green" | "red" | "blue";
}) {
  const styles =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "red"
      ? "border-red-200 bg-red-50"
      : tone === "blue"
      ? "border-blue-200 bg-blue-50"
      : "border-slate-200 bg-white";

  return (
    <section className={`rounded-3xl border p-5 shadow-sm ${styles}`}>
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function BilanPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bilanPro, setBilanPro] = useState<BilanPro | null>(null);
  const [flux, setFlux] = useState<FluxRow[]>([]);
  const [tontineKpi, setTontineKpi] = useState<any | null>(null);
  const [details, setDetails] = useState<any[]>([]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/bilan", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const rawText = await response.text();
      const json = rawText ? (JSON.parse(rawText) as ApiResponse) : null;

      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Erreur lors du chargement du bilan.");
      }

      setBilanPro(json.data?.bilanPro ?? null);
      setFlux(Array.isArray(json.data?.flux) ? json.data!.flux : []);
      setTontineKpi(json.data?.tontineKpi ?? null);
      setDetails(Array.isArray(json.data?.details) ? json.data.details : []);
    } catch (err: any) {
      setBilanPro(null);
      setFlux([]);
      setTontineKpi(null);
      setError(err?.message || "Erreur lors du chargement du bilan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const entrees = useMemo(
    () => flux.filter((f) => f.type_flux === "ENTREE"),
    [flux]
  );

  const sorties = useMemo(
    () => flux.filter((f) => f.type_flux === "SORTIE"),
    [flux]
  );

  const situationTone =
    bilanPro?.situation_globale === "DEFICIT"
      ? "red"
      : bilanPro?.situation_globale === "EQUILIBRE"
      ? "blue"
      : "green";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">
                ASF-NTOL
              </p>
              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Bilan structuré
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                Lecture type entreprise : entrées, sorties, reports, résultat et indicateurs tontine.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/20 px-4 py-3 text-center text-sm font-bold text-white"
              >
                ← Dashboard
              </Link>
              <button
                onClick={loadData}
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950"
              >
                Actualiser
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center font-bold text-slate-700">
            Chargement du bilan...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
            {error}
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <KpiCard
                title="Total entrées"
                value={money(bilanPro?.total_entrees)}
                icon="📥"
                tone="green"
              />
              <KpiCard
                title="Total sorties"
                value={money(bilanPro?.total_sorties)}
                icon="📤"
                tone="red"
              />
              <KpiCard
                title="Report N-1"
                value={money(bilanPro?.report_precedent)}
                icon="🔄"
                tone={n(bilanPro?.report_precedent) < 0 ? "red" : "blue"}
                subtitle={bilanPro?.type_report ?? "NEUTRE"}
              />
              <KpiCard
                title="Résultat final"
                value={money(bilanPro?.solde_final)}
                icon="⚖️"
                tone={situationTone}
                subtitle={bilanPro?.situation_globale ?? "NON RENSEIGNÉ"}
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel
                title="📥 Bloc Entrées"
                subtitle="Toutes les ressources entrantes exposées par le backend."
                tone="green"
              >
                <div className="space-y-3">
                  {entrees.length === 0 ? (
                    <p className="text-sm text-slate-600">Aucune entrée disponible.</p>
                  ) : (
                    entrees.map((item, index) => (
                      <div
                        key={`${item.categorie}-${index}`}
                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-bold text-slate-950">{item.categorie}</p>
                          <p className="text-xs text-slate-500">Année {item.annee}</p>
                        </div>
                        <p className="text-lg font-black text-emerald-700">
                          {money(item.montant)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel
                title="📤 Bloc Sorties"
                subtitle="Toutes les charges et distributions exposées par le backend."
                tone="red"
              >
                <div className="space-y-3">
                  {sorties.length === 0 ? (
                    <p className="text-sm text-slate-600">Aucune sortie disponible.</p>
                  ) : (
                    sorties.map((item, index) => (
                      <div
                        key={`${item.categorie}-${index}`}
                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-bold text-slate-950">{item.categorie}</p>
                          <p className="text-xs text-slate-500">Année {item.annee}</p>
                        </div>
                        <p className="text-lg font-black text-red-700">
                          {money(item.montant)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>

            <Panel
              title="🔄 Reports année précédente"
              subtitle="Le report est classé en avoir ou devoir selon le résultat N-1."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard
                  title="Avoir reporté"
                  value={money(bilanPro?.report_avoir)}
                  icon="✅"
                  tone="green"
                />
                <KpiCard
                  title="Devoir reporté"
                  value={money(bilanPro?.report_devoir)}
                  icon="⚠️"
                  tone="red"
                />
                <KpiCard
                  title="Type de report"
                  value={bilanPro?.type_report ?? "NEUTRE"}
                  icon="📌"
                  tone="blue"
                />
              </div>
            </Panel>

            <Panel
              title="🏆 Bloc Tontine / Enchères"
              subtitle="KPI validés : pas de cumul caisse affiché comme richesse."
              tone="blue"
            >
              <div className="grid gap-4 md:grid-cols-4">
                <KpiCard
                  title="Mise brute cycle"
                  value={money(tontineKpi?.mise_brute_cycle)}
                  icon="💵"
                  tone="blue"
                />
                <KpiCard
                  title="Mise brute session"
                  value={money(tontineKpi?.mise_brute_session)}
                  icon="📅"
                  tone="blue"
                />
                <KpiCard
                  title="Total enchères"
                  value={money(tontineKpi?.total_encheres)}
                  icon="🔥"
                  tone="amber"
                />
                <KpiCard
                  title="Lots attribués"
                  value={new Intl.NumberFormat("fr-FR").format(
                    n(tontineKpi?.lots_attribues)
                  )}
                  icon="🎯"
                  tone="green"
                />
              </div>
            </Panel>

            <Panel
              title="📊 Résultat final"
              subtitle="Conclusion comptable simplifiée du bilan ASF-NTOL."
            >
              <div
                className={`rounded-3xl border p-8 text-center ${
                  bilanPro?.situation_globale === "DEFICIT"
                    ? "border-red-200 bg-red-50"
                    : bilanPro?.situation_globale === "EQUILIBRE"
                    ? "border-blue-200 bg-blue-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <p className="text-sm font-black uppercase tracking-[0.25em] text-slate-600">
                  {bilanPro?.situation_globale ?? "NON RENSEIGNÉ"}
                </p>
                <p className="mt-3 text-5xl font-black text-slate-950">
                  {money(bilanPro?.solde_final)}
                </p>
                <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600">
                  Formule backend : report précédent + entrées année - sorties année.
                  Le frontend affiche uniquement les résultats exposés par l’API.
                </p>
              </div>
            </Panel>
          </>
        )}
      </div>
    
{/* ================= TABLE DETAILS ================= */}
<Panel title="📊 Détail complet des opérations">
  <div className="overflow-auto">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-100 text-left">
        <tr>
          <th className="p-2">Type</th>
          <th className="p-2">Catégorie</th>
          <th className="p-2">Personne</th>
          <th className="p-2">Référence</th>
          <th className="p-2">Motif / Mode</th>
          <th className="p-2">Statut</th>
          <th className="p-2">Date</th>
          <th className="p-2 text-right">Montant</th>
        </tr>
      </thead>
      <tbody>
        {details.map((d, i) => (
          <tr key={i} className="border-b">
            <td className="p-2">{d.type_flux}</td>
            <td className="p-2">{d.categorie}</td>
            <td className="p-2">{d.personne}</td>
            <td className="p-2">{d.reference}</td>
            <td className="p-2">{d.mode_ou_motif}</td>
            <td className="p-2">{d.statut ?? "-"}</td>
            <td className="p-2">{d.date_operation}</td>
            <td className="p-2 text-right font-bold">
              {new Intl.NumberFormat("fr-FR").format(Number(d.montant || 0))} FCFA
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</Panel>

</main>
  );
}


