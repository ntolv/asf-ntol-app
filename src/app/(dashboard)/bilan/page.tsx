"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BilanPro = {
  annee: number;
  annee_precedente: number | null;
  report_precedent: number | string | null;
  type_report: string | null;
  report_avoir: number | string | null;
  report_devoir: number | string | null;
  total_entrees: number | string | null;
  total_sorties: number | string | null;
  solde_final: number | string | null;
  situation_globale: string | null;

  reserve_encheres_exercice: number | string | null;
  reserve_interets_exercice: number | string | null;
  reserves_constituees_exercice: number | string | null;
};

type RubriqueRow = {
  annee: number;
  annee_precedente: number;
  rubrique_id: string;
  rubrique_nom: string;
  ordre_affichage: number;
  report_precedent: number | string | null;

  encaissements_exercice: number | string | null;
  remboursements_prets_exercice: number | string | null;
  autres_entrees_exercice: number | string | null;
  total_entrees: number | string | null;
  total_sorties: number | string | null;
  solde_final: number | string | null;

  reserve_encheres_exercice: number | string | null;
  reserve_interets_exercice: number | string | null;
  reserves_constituees_exercice: number | string | null;
};

type MembreRow = {
  annee: number;
  annee_precedente: number;
  membre_id: string;
  nom_complet: string;
  report_prets_a_rembourser: number | string | null;
  prets_octroyes_annee: number | string | null;
  remboursements_annee: number | string | null;
  prets_a_rembourser_fin_exercice: number | string | null;
};

type PatrimoineRow = {
  annee: number;
  annee_precedente: number;
  membre_id: string;
  nom_complet: string;

  report_patrimoine: number | string | null;
  contributions_annee: number | string | null;
  capital_immobilise_annee: number | string | null;
  capital_restitue_annee: number | string | null;
  interets_annee: number | string | null;
  patrimoine_fin_exercice: number | string | null;
};

type PatrimoineRubriqueRow = {
  annee: number;
  annee_precedente: number;

  membre_id: string;
  nom_complet: string;

  rubrique_id: string;
  rubrique_nom: string;

  report_precedent: number | string | null;
  contributions_annee: number | string | null;
  capital_immobilise_annee: number | string | null;
  capital_restitue_annee: number | string | null;
  fonds_disponible_fin_exercice: number | string | null;
};
type MembreRubriqueRow = {
  annee: number;
  annee_precedente: number;
  membre_id: string;
  nom_complet: string;
  rubrique_id: string;
  rubrique_nom: string;
  report_precedent: number | string | null;
  total_entrees: number | string | null;
  total_sorties_personnelles: number | string | null;
  solde_fin_exercice: number | string | null;
};

type TontineRow = {
  annee: number;
  membre_id: string;
  nom_complet: string;
  cotisations: number | string | null;
  gain: number | string | null;
  statut: string;
};

type BilanIndicateurs = {
  annee: number;

  capital_rembourse_exercice: number | string | null;
  interets_encaisses_exercice: number | string | null;

  encheres_generees_exercice: number | string | null;
  encheres_generation_deja_reaffectees: number | string | null;
  encheres_non_reaffectees_exercice: number | string | null;
  encheres_reaffectees_exercice: number | string | null;

  encheres_reserve_report_precedent: number | string | null;
  encheres_reserve_fin_exercice: number | string | null;

  interets_reaffectes_exercice: number | string | null;
  interets_reserve_report_precedent: number | string | null;
  interets_reserve_fin_exercice: number | string | null;
};

type CapitalRestantRow = {
  annee: number;
  capital_restant_fin_exercice: number | string | null;
};
type ControleRubrique = {
  rubrique_id: string;
  rubrique_nom: string;
  entrees_rubrique: number;
  entrees_membres: number;
  ecart_entrees: number;
  conforme_entrees: boolean;
};

type SectionKey =
  | "rubriques"
  | "reports-membres"
  | "tontine"
  | "prets"
  | "controle";

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    annees?: number[];
    anneeSelectionnee?: number | null;
    bilanPro?: BilanPro | null;
    bilanPrecedent?: BilanPro | null;
    rubriques?: RubriqueRow[];
    membres?: MembreRow[];
    patrimoine?: PatrimoineRow[];
    patrimoineRubriques?: PatrimoineRubriqueRow[];
    membresRubriques?: MembreRubriqueRow[];
    tontine?: TontineRow[];
    indicateurs?: BilanIndicateurs | null;
    capitalRestant?: CapitalRestantRow | null;
    controleRubriques?: ControleRubrique[];
  };
};

function n(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function money(value: number | string | null | undefined) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n(value))} FCFA`;
}

function dateFr(value: string | null | undefined) {
  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR").format(d);
}

function pct(current: number, previous: number) {
  if (!previous) {
    if (!current) return "0 %";
    return "N/A";
  }

  const value = ((current - previous) / Math.abs(previous)) * 100;

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)} %`;
}

function KpiCard({
  title,
  value,
  subtitle,
  tone = "slate",
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "green" | "red" | "blue" | "amber" | "slate";
}) {
  const classes = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    red: "border-red-200 bg-red-50 text-red-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    slate: "border-slate-200 bg-white text-slate-950",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${classes}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black">{value}</p>

      {subtitle ? (
        <p className="mt-2 text-xs font-semibold opacity-70">{subtitle}</p>
      ) : null}
    </div>
  );
}

function Panel({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
    >
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950 md:text-2xl">
          {title}
        </h2>

        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

export default function BilanPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [annees, setAnnees] = useState<number[]>([]);
  const [anneeSelectionnee, setAnneeSelectionnee] =
    useState<number | null>(null);

  const [bilan, setBilan] = useState<BilanPro | null>(null);
  const [bilanPrecedent, setBilanPrecedent] =
    useState<BilanPro | null>(null);

  const [rubriques, setRubriques] = useState<RubriqueRow[]>([]);
  const [membres, setMembres] = useState<MembreRow[]>([]);
  const [patrimoine, setPatrimoine] = useState<PatrimoineRow[]>([]);
  const [patrimoineRubriques, setPatrimoineRubriques] =
    useState<PatrimoineRubriqueRow[]>([]);
  const [membresRubriques, setMembresRubriques] =
    useState<MembreRubriqueRow[]>([]);
  const [tontine, setTontine] = useState<TontineRow[]>([]);
  const [indicateurs, setIndicateurs] =
    useState<BilanIndicateurs | null>(null);

  const [capitalRestant, setCapitalRestant] =
    useState<CapitalRestantRow | null>(null);
  const [membreTontineSelectionne, setMembreTontineSelectionne] = useState("");
  const [controles, setControles] =
    useState<ControleRubrique[]>([]);

  const [sectionActive, setSectionActive] = useState<SectionKey | null>(null);
  const [membreSelectionne, setMembreSelectionne] = useState("");

  function ouvrirSection(section: SectionKey) {
    setSectionActive(section);

    window.setTimeout(() => {
      const element = document.getElementById(section);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 80);
  }

  async function loadData(annee?: number | null) {
    try {
      setLoading(true);
      setError("");

      const url = annee
        ? `/api/bilan?annee=${annee}`
        : "/api/bilan";

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const raw = await response.text();
      const json = raw ? (JSON.parse(raw) as ApiResponse) : null;

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.message || "Erreur lors du chargement du bilan."
        );
      }

      setAnnees(
        Array.isArray(json.data?.annees)
          ? json.data!.annees!
          : []
      );

      setAnneeSelectionnee(
        json.data?.anneeSelectionnee ?? null
      );

      setBilan(json.data?.bilanPro ?? null);
      setBilanPrecedent(json.data?.bilanPrecedent ?? null);
      setIndicateurs(
        json.data?.indicateurs ?? null
      );

      setCapitalRestant(
        json.data?.capitalRestant ?? null
      );

      setRubriques(
        Array.isArray(json.data?.rubriques)
          ? json.data!.rubriques!
          : []
      );

      setMembres(
        Array.isArray(json.data?.membres)
          ? json.data!.membres!
          : []
      );

      setPatrimoine(
        Array.isArray(json.data?.patrimoine)
          ? json.data!.patrimoine!
          : []
      );

      setPatrimoineRubriques(
        Array.isArray(json.data?.patrimoineRubriques)
          ? json.data!.patrimoineRubriques!
          : []
      );

      setMembresRubriques(
        Array.isArray(json.data?.membresRubriques)
          ? json.data!.membresRubriques!
          : []
      );

      setTontine(
        Array.isArray(json.data?.tontine)
          ? json.data!.tontine!
          : []
      );

      setControles(
        Array.isArray(json.data?.controleRubriques)
          ? json.data!.controleRubriques!
          : []
      );
    } catch (err: any) {
      setError(
        err?.message || "Erreur lors du chargement du bilan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const membresDisponibles = useMemo(() => {
    return patrimoine
      .map((row) => ({
        id: row.membre_id,
        nom: row.nom_complet,
      }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [patrimoine]);

  const patrimoineMembreSelectionne = useMemo(() => {
    if (!membreSelectionne) return null;

    return (
      patrimoine.find(
        (row) => row.membre_id === membreSelectionne
      ) ?? null
    );
  }, [patrimoine, membreSelectionne]);

  const lignesMembreSelectionne = useMemo(() => {
    if (!membreSelectionne) return [];

    return patrimoineRubriques.filter(
      (row) => row.membre_id === membreSelectionne
    );
  }, [patrimoineRubriques, membreSelectionne]);
  const membresTontineDisponibles = useMemo(() => {
    return [...tontine].sort((a, b) =>
      a.nom_complet.localeCompare(b.nom_complet)
    );
  }, [tontine]);

  const situationTontineSelectionnee = useMemo(() => {
    if (!membreTontineSelectionne) return null;

    return (
      tontine.find(
        (row) => row.membre_id === membreTontineSelectionne
      ) ?? null
    );
  }, [tontine, membreTontineSelectionne]);

  const totalCotisationsTontine = useMemo(() => {
    return tontine.reduce(
      (sum, row) => sum + n(row.cotisations),
      0
    );
  }, [tontine]);

  const totalGainsTontine = useMemo(() => {
    return tontine.reduce(
      (sum, row) => sum + n(row.gain),
      0
    );
  }, [tontine]);

  const nbGagnantsTontine = useMemo(() => {
    return tontine.filter(
      (row) => row.statut === "GAGNANT"
    ).length;
  }, [tontine]);

  const nbAttenteTontine = useMemo(() => {
    return tontine.filter(
      (row) => row.statut !== "GAGNANT"
    ).length;
  }, [tontine]);

  const totalPrets = useMemo(
    () =>
      membres.reduce(
        (sum, row) =>
          sum + n(row.prets_a_rembourser_fin_exercice),
        0
      ),
    [membres]
  );

  const nbMembresAvecPret = useMemo(
    () =>
      membres.filter(
        (row) =>
          n(row.prets_a_rembourser_fin_exercice) > 0
      ).length,
    [membres]
  );

  const controlesConformes = controles.every(
    (row) => row.conforme_entrees
  );

  if (loading && !bilan) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
      
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-10 text-center font-bold text-slate-700">
          Chargement du bilan...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
                ASF-NTOL
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Bilan financier annuel
              </h1>

              <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                Reports, entrées, sorties, situation des rubriques,
                participations des membres et prêts à rembourser.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="annee-bilan"
                  className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-300"
                >
                  Exercice
                </label>

                <select
                  id="annee-bilan"
                  value={anneeSelectionnee ?? ""}
                  onChange={(event) => {
                    const value = Number(event.target.value);

                    if (Number.isFinite(value)) {
                      setAnneeSelectionnee(value);
                      setMembreSelectionne("");
                      setMembreTontineSelectionne("");
                      loadData(value);
                    }
                  }}
                  className="min-w-[120px] rounded-2xl border border-white/20 bg-white px-4 py-3 font-black text-slate-950"
                >
                  {annees.map((annee) => (
                    <option key={annee} value={annee}>
                      {annee}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadData(anneeSelectionnee)
                }
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950"
              >
                Actualiser
              </button>

              <Link
                href="/"
                className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-bold text-white"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 font-semibold text-red-800">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            {
              key: "rubriques" as SectionKey,
              icon: "🏦",
              title: "Situation des caisses",
              description: "Reports, entrées, sorties et soldes par rubrique.",
            },
            {
              key: "reports-membres" as SectionKey,
              icon: "👥",
              title: "Situation patrimoniale",
              description: "Épargne et Fonds Développement / Investissement du membre.",
            },
            {
              key: "tontine" as SectionKey,
              icon: "🎯",
              title: "Situation Tontine",
              description: "Cotisations, gain reçu et statut du membre dans le cycle.",
            },
            {
              key: "prets" as SectionKey,
              icon: "💳",
              title: "Prêts à rembourser",
              description: "Reports, prêts octroyés, remboursements et restant dû.",
            },
            {
              key: "controle" as SectionKey,
              icon: "✅",
              title: "Contrôle de cohérence",
              description: "Vérification des rubriques et des comptes membres.",
            },
          ].map((item) => {
            const active = sectionActive === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => ouvrirSection(item.key)}
                className={`group rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  active
                    ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100"
                    : "border-slate-200 bg-white hover:border-emerald-300"
                }`}
              >
                <div className="text-2xl">{item.icon}</div>

                <h2
                  className={`mt-3 text-sm font-black ${
                    active
                      ? "text-emerald-900"
                      : "text-slate-950 group-hover:text-emerald-800"
                  }`}
                >
                  {item.title}
                </h2>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>

                <p className="mt-4 text-xs font-black text-emerald-700">
                  {active ? "Section ouverte ↓" : "Consulter →"}
                </p>
              </button>
            );
          })}
        </section>

        <section
          id="synthese"
          className="scroll-mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            title={`Report (${
              bilan?.annee_precedente ?? "Initial"
            })`}
            value={money(bilan?.report_precedent)}
            subtitle={bilan?.type_report ?? "NEUTRE"}
            tone={
              n(bilan?.report_precedent) < 0
                ? "red"
                : "blue"
            }
          />

          <KpiCard
            title={`Entrées ${anneeSelectionnee ?? ""}`}
            value={money(bilan?.total_entrees)}
            subtitle={
              bilanPrecedent
                ? `N-1 : ${money(
                    bilanPrecedent.total_entrees
                  )} • ${pct(
                    n(bilan?.total_entrees),
                    n(bilanPrecedent.total_entrees)
                  )}`
                : undefined
            }
            tone="green"
          />

          <KpiCard
            title={`Sorties ${anneeSelectionnee ?? ""}`}
            value={money(bilan?.total_sorties)}
            subtitle={
              bilanPrecedent
                ? `N-1 : ${money(
                    bilanPrecedent.total_sorties
                  )} • ${pct(
                    n(bilan?.total_sorties),
                    n(bilanPrecedent.total_sorties)
                  )}`
                : undefined
            }
            tone="red"
          />

          <KpiCard
            title={`Solde ${anneeSelectionnee ?? ""}`}
            value={money(bilan?.solde_final)}
            subtitle={bilan?.situation_globale ?? ""}
            tone={
              n(bilan?.solde_final) < 0
                ? "red"
                : "green"
            }
          />
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">
                Réserves constituées pendant {anneeSelectionnee ?? ""}
              </p>

              <p className="mt-2 text-2xl font-black text-amber-950">
                {money(bilan?.reserves_constituees_exercice)}
              </p>

              <p className="mt-2 max-w-3xl text-sm font-semibold text-amber-900">
                Les entrées et les sorties restent les flux réellement constatés.
                Les réserves constituées pendant l'exercice sont exclues du solde disponible.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold text-amber-950">
                Enchères : {money(bilan?.reserve_encheres_exercice)}
              </div>

              <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold text-amber-950">
                Intérêts : {money(bilan?.reserve_interets_exercice)}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <KpiCard
            title={`Capital remboursé ${anneeSelectionnee ?? ""}`}
            value={money(indicateurs?.capital_rembourse_exercice)}
            subtitle="Capital déjà comptabilisé dans le solde."
            tone="blue"
          />

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">
              Intérêts encaissés {anneeSelectionnee ?? ""}
            </p>

            <p className="mt-2 text-2xl font-black text-amber-950">
              {money(indicateurs?.interets_encaisses_exercice)}
            </p>

            <p className="mt-2 text-xs font-semibold text-amber-800">
              Ces intérêts seront redistribués N+1.
            </p>

            <div className="mt-4 border-t border-amber-200 pt-3 text-xs font-bold text-amber-950">
              Réserve au 31/12 :{" "}
              {money(indicateurs?.interets_reserve_fin_exercice)}
            </div>
          </div>

          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-800">
              Enchères {anneeSelectionnee ?? ""}
            </p>

            <div className="mt-4 space-y-2 text-sm text-violet-950">

              <div className="flex justify-between gap-4">
                <span>Réserve au 01/01</span>
                <strong>
                  {money(indicateurs?.encheres_reserve_report_precedent)}
                </strong>
              </div>

              <div className="flex justify-between gap-4">
                <span>Générées pendant N</span>
                <strong>
                  {money(indicateurs?.encheres_generees_exercice)}
                </strong>
              </div>

              <div className="flex justify-between gap-4">
                <span>Réaffectées pendant N</span>
                <strong>
                  {money(indicateurs?.encheres_reaffectees_exercice)}
                </strong>
              </div>

              <div className="flex justify-between gap-4 border-t border-violet-200 pt-3">
                <span className="font-black">
                  Réserve au 31/12
                </span>

                <strong className="text-lg">
                  {money(indicateurs?.encheres_reserve_fin_exercice)}
                </strong>
              </div>

            </div>

            <p className="mt-3 text-xs font-semibold text-violet-800">
              Réserve non réaffectée : hors solde.
            </p>
          </div>

          <KpiCard
            title={`Capital restant au 31/12/${anneeSelectionnee ?? ""}`}
            value={money(capitalRestant?.capital_restant_fin_exercice)}
            subtitle="Encours de capital restant à rembourser."
            tone="slate"
          />

        </section>
        {sectionActive === "rubriques" ? (
          <Panel
            id="rubriques"
            title="Situation des caisses par rubrique"
            subtitle={`Report ${
              bilan?.annee_precedente ?? "initial"
            }, détail des entrées, sorties, réserves et solde de l'exercice ${
              anneeSelectionnee ?? ""
            }.`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="p-3">
                      Rubrique
                    </th>

                    <th className="p-3 text-right">
                      Report (
                      {bilan?.annee_precedente ?? "Initial"})
                    </th>

                    <th className="p-3 text-right">
                      Encaissements {anneeSelectionnee}
                    </th>

                    <th className="p-3 text-right">
                      Remb. prêts {anneeSelectionnee}
                    </th>

                    <th className="p-3 text-right">
                      Autres entrées {anneeSelectionnee}
                    </th>

                    <th className="p-3 text-right">
                      Total entrées {anneeSelectionnee}
                    </th>

                    <th className="p-3 text-right">
                      Sorties {anneeSelectionnee}
                    </th>

                    <th className="p-3 text-right">
                      Réserves {anneeSelectionnee}
                    </th>

                    <th className="p-3 text-right">
                      Solde {anneeSelectionnee}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rubriques.map((row) => (
                    <tr
                      key={row.rubrique_id}
                      className="border-b border-slate-100"
                    >
                      <td className="p-3 font-bold text-slate-900">
                        {row.rubrique_nom}
                      </td>

                      <td className="p-3 text-right">
                        {money(row.report_precedent)}
                      </td>

                      <td className="p-3 text-right font-semibold text-emerald-700">
                        {money(row.encaissements_exercice)}
                      </td>

                      <td className="p-3 text-right font-semibold text-blue-700">
                        {money(row.remboursements_prets_exercice)}
                      </td>

                      <td className="p-3 text-right font-semibold text-violet-700">
                        {money(row.autres_entrees_exercice)}
                      </td>

                      <td className="p-3 text-right font-black text-emerald-800">
                        {money(row.total_entrees)}
                      </td>

                      <td className="p-3 text-right font-semibold text-red-700">
                        {money(row.total_sorties)}
                      </td>

                      <td className="p-3 text-right font-semibold text-amber-700">
                        {money(row.reserves_constituees_exercice)}
                      </td>

                      <td className="p-3 text-right font-black text-slate-950">
                        {money(row.solde_final)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}

        {sectionActive === "reports-membres" ? (
          <Panel
            id="reports-membres"
            title="Situation patrimoniale d'un membre"
            subtitle="Le patrimoine individuel comprend uniquement l'Épargne et le Fonds Développement / Investissement."
          >
            <div className="mb-6 max-w-xl">
              <label
                htmlFor="membre-patrimoine"
                className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500"
              >
                Sélectionner un membre
              </label>

              <select
                id="membre-patrimoine"
                value={membreSelectionne}
                onChange={(event) =>
                  setMembreSelectionne(event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-sm"
              >
                <option value="">
                  Sélectionner un membre...
                </option>

                {membresDisponibles.map((membre) => (
                  <option
                    key={membre.id}
                    value={membre.id}
                  >
                    {membre.nom}
                  </option>
                ))}
              </select>
            </div>

            {!patrimoineMembreSelectionne ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-600">
                Sélectionnez un membre pour consulter son patrimoine.
              </div>
            ) : (
              <>
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

                  <KpiCard
                    title={`Report ${
                      bilan?.annee_precedente ?? "Initial"
                    }`}
                    value={money(
                      patrimoineMembreSelectionne.report_patrimoine
                    )}
                    tone="blue"
                  />

                  <KpiCard
                    title={`Contributions ${
                      anneeSelectionnee ?? ""
                    }`}
                    value={money(
                      patrimoineMembreSelectionne.contributions_annee
                    )}
                    tone="green"
                  />

                  <KpiCard
                    title="Capital immobilisé"
                    value={money(
                      patrimoineMembreSelectionne.capital_immobilise_annee
                    )}
                    tone="amber"
                  />

                  <KpiCard
                    title="Capital restitué"
                    value={money(
                      patrimoineMembreSelectionne.capital_restitue_annee
                    )}
                    tone="blue"
                  />

                  <KpiCard
                    title="Intérêts redistribués"
                    value={money(
                      patrimoineMembreSelectionne.interets_annee
                    )}
                    tone="green"
                  />

                  <KpiCard
                    title={`Patrimoine disponible ${
                      anneeSelectionnee ?? ""
                    }`}
                    value={money(
                      patrimoineMembreSelectionne.patrimoine_fin_exercice
                    )}
                    tone="slate"
                  />

                </div>

                <div className="overflow-x-auto">

                  <table className="min-w-[1050px] w-full text-sm">

                    <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                      <tr>

                        <th className="p-3">
                          Rubrique
                        </th>

                        <th className="p-3 text-right">
                          Report
                        </th>

                        <th className="p-3 text-right">
                          Contributions
                        </th>

                        <th className="p-3 text-right">
                          Capital immobilisé
                        </th>

                        <th className="p-3 text-right">
                          Capital restitué
                        </th>

                        <th className="p-3 text-right">
                          Disponible
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {lignesMembreSelectionne.map((row) => (

                        <tr
                          key={`${row.membre_id}-${row.rubrique_id}`}
                          className="border-b border-slate-100"
                        >

                          <td className="p-3 font-black text-slate-950">
                            {row.rubrique_nom}
                          </td>

                          <td className="p-3 text-right">
                            {money(row.report_precedent)}
                          </td>

                          <td className="p-3 text-right font-semibold text-emerald-700">
                            {money(row.contributions_annee)}
                          </td>

                          <td className="p-3 text-right font-semibold text-amber-700">
                            {money(row.capital_immobilise_annee)}
                          </td>

                          <td className="p-3 text-right font-semibold text-blue-700">
                            {money(row.capital_restitue_annee)}
                          </td>

                          <td className="p-3 text-right font-black text-slate-950">
                            {money(
                              row.fonds_disponible_fin_exercice
                            )}
                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                    Calcul du patrimoine
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    Report + Contributions - Capital immobilisé + Capital restitué + Intérêts redistribués = Patrimoine disponible
                  </p>

                </div>

              </>
            )}
          </Panel>
        ) : null}


        
{sectionActive === "tontine" ? (
          <Panel
            id="tontine"
            title="Situation Tontine d'un membre"
            subtitle={`Sélectionnez un membre pour consulter sa situation Tontine pour l'exercice ${
              anneeSelectionnee ?? ""
            }.`}
          >

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <KpiCard
                title={`Total cotisé ${anneeSelectionnee ?? ""}`}
                value={money(totalCotisationsTontine)}
                tone="green"
              />

              <KpiCard
                title={`Total redistribué ${anneeSelectionnee ?? ""}`}
                value={money(totalGainsTontine)}
                tone="blue"
              />

              <KpiCard
                title="Gagnants"
                value={String(nbGagnantsTontine)}
                tone="green"
              />

              <KpiCard
                title="En attente"
                value={String(nbAttenteTontine)}
                tone="amber"
              />

            </div>


            <div className="mb-6 max-w-xl">

              <label
                htmlFor="membre-tontine"
                className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500"
              >
                Sélectionner un membre
              </label>

              <select
                id="membre-tontine"
                value={membreTontineSelectionne}
                onChange={(event) =>
                  setMembreTontineSelectionne(event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-sm"
              >

                <option value="">
                  Sélectionner un membre...
                </option>

                {membresTontineDisponibles.map((membre) => (
                  <option
                    key={membre.membre_id}
                    value={membre.membre_id}
                  >
                    {membre.nom_complet}
                  </option>
                ))}

              </select>

            </div>


            {!situationTontineSelectionnee ? (

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">

                <p className="font-bold text-slate-700">
                  Sélectionnez un membre pour consulter sa situation Tontine.
                </p>

              </div>

            ) : (

              <>

                <div className="grid gap-4 md:grid-cols-3">

                  <KpiCard
                    title="Cotisations Tontine"
                    value={money(
                      situationTontineSelectionnee.cotisations
                    )}
                    tone="green"
                  />

                  <KpiCard
                    title="Montant perçu"
                    value={money(
                      situationTontineSelectionnee.gain
                    )}
                    tone={
                      n(situationTontineSelectionnee.gain) > 0
                        ? "blue"
                        : "slate"
                    }
                  />

                  <KpiCard
                    title="Statut"
                    value={
                      situationTontineSelectionnee.statut
                    }
                    tone={
                      situationTontineSelectionnee.statut === "GAGNANT"
                        ? "green"
                        : "amber"
                    }
                  />

                </div>


                <div className="mt-6 overflow-x-auto">

                  <table className="min-w-[700px] w-full text-sm">

                    <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">

                      <tr>

                        <th className="p-3">
                          Membre
                        </th>

                        <th className="p-3 text-right">
                          Cotisations
                        </th>

                        <th className="p-3 text-right">
                          Montant perçu
                        </th>

                        <th className="p-3 text-center">
                          Statut
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      <tr className="border-b border-slate-100">

                        <td className="p-3 font-black text-slate-950">
                          {situationTontineSelectionnee.nom_complet}
                        </td>

                        <td className="p-3 text-right font-semibold text-emerald-700">
                          {money(
                            situationTontineSelectionnee.cotisations
                          )}
                        </td>

                        <td className="p-3 text-right font-semibold text-blue-700">
                          {money(
                            situationTontineSelectionnee.gain
                          )}
                        </td>

                        <td className="p-3 text-center font-black">
                          {situationTontineSelectionnee.statut}
                        </td>

                      </tr>

                    </tbody>

                  </table>

                </div>

              </>

            )}

          </Panel>
        ) : null}


        
{sectionActive === "prets" ? (
<Panel
          id="prets"
          title="Prêts à rembourser"
          subtitle="Les prêts sont présentés séparément des participations et ne sont jamais compensés avec elles."
        >
          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <KpiCard
              title="Capital restant à rembourser"
              value={money(totalPrets)}
              tone={totalPrets > 0 ? "amber" : "green"}
            />

            <KpiCard
              title="Membres avec prêt ouvert"
              value={String(nbMembresAvecPret)}
              tone="blue"
            />
          </div>

          <div className="space-y-3">
            {membres
              .filter(
                (row) =>
                  n(row.report_prets_a_rembourser) > 0 ||
                  n(row.prets_octroyes_annee) > 0 ||
                  n(
                    row.prets_a_rembourser_fin_exercice
                  ) > 0
              )
              .map((row) => (
                <div
                  key={row.membre_id}
                  className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-5"
                >
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Membre
                    </p>

                    <p className="mt-1 font-black">
                      {row.nom_complet}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Report
                    </p>

                    <p className="mt-1 font-bold">
                      {money(
                        row.report_prets_a_rembourser
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Octroyé
                    </p>

                    <p className="mt-1 font-bold">
                      {money(row.prets_octroyes_annee)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Remboursé
                    </p>

                    <p className="mt-1 font-bold">
                      {money(row.remboursements_annee)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Reste à rembourser
                    </p>

                    <p className="mt-1 font-black text-red-700">
                      {money(
                        row.prets_a_rembourser_fin_exercice
                      )}
                    </p>
                  </div>
                </div>
              ))}

            {nbMembresAvecPret === 0 ? (
              <p className="text-sm text-slate-600">
                Aucun prêt à rembourser pour cet exercice.
              </p>
            ) : null}
          </div>
        </Panel>
        ) : null}

        {sectionActive === "controle" ? (
        <Panel
          id="controle"
          title="Contrôle de cohérence"
          subtitle="Vérification des entrées par rubrique avec la somme des participations membres."
        >
          <div
            className={`mb-5 rounded-2xl border p-4 font-black ${
              controlesConformes
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {controlesConformes
              ? "✅ Toutes les entrées par rubrique sont cohérentes."
              : "❌ Un ou plusieurs écarts ont été détectés."}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">Rubrique</th>
                  <th className="p-3 text-right">
                    Entrées rubrique
                  </th>
                  <th className="p-3 text-right">
                    Somme membres
                  </th>
                  <th className="p-3 text-right">Écart</th>
                  <th className="p-3 text-center">
                    Statut
                  </th>
                </tr>
              </thead>

              <tbody>
                {controles.map((row) => (
                  <tr
                    key={row.rubrique_id}
                    className="border-b border-slate-100"
                  >
                    <td className="p-3 font-semibold">
                      {row.rubrique_nom}
                    </td>

                    <td className="p-3 text-right">
                      {money(row.entrees_rubrique)}
                    </td>

                    <td className="p-3 text-right">
                      {money(row.entrees_membres)}
                    </td>

                    <td className="p-3 text-right font-bold">
                      {money(row.ecart_entrees)}
                    </td>

                    <td className="p-3 text-center">
                      {row.conforme_entrees
                        ? "✅ Conforme"
                        : "❌ Écart"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        ) : null}

      </div>
    </main>
  );
}









