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
};

type RubriqueRow = {
  annee: number;
  annee_precedente: number;
  rubrique_id: string;
  rubrique_nom: string;
  ordre_affichage: number;
  report_precedent: number | string | null;
  total_entrees: number | string | null;
  total_sorties: number | string | null;
  solde_final: number | string | null;
};

type MembreRow = {
  annee: number;
  annee_precedente: number;
  membre_id: string;
  nom_complet: string;
  report_participations: number | string | null;
  participations_annee: number | string | null;
  sorties_personnelles_annee: number | string | null;
  participations_fin_exercice: number | string | null;
  report_prets_a_rembourser: number | string | null;
  prets_octroyes_annee: number | string | null;
  remboursements_annee: number | string | null;
  prets_a_rembourser_fin_exercice: number | string | null;
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

type DetailRow = {
  origine: string;
  source_id: string;
  annee: number;
  date_operation: string | null;
  date_creation: string | null;
  type_flux: string;
  membre_id: string | null;
  nom_complet: string | null;
  rubrique_id: string | null;
  rubrique_nom: string | null;
  reference: string | null;
  commentaire: string | null;
  montant: number | string | null;
  import_historique: boolean;
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
  | "prets"
  | "controle"
  | "mouvements";

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
    membresRubriques?: MembreRubriqueRow[];
    details?: DetailRow[];
    importsHistoriques?: DetailRow[];
    controleRubriques?: ControleRubrique[];
  };
};

function n(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function money(value: number | string | null | undefined) {
  return `${new Intl.NumberFormat("fr-FR").format(n(value))} FCFA`;
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
  const [membresRubriques, setMembresRubriques] =
    useState<MembreRubriqueRow[]>([]);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [imports, setImports] = useState<DetailRow[]>([]);
  const [controles, setControles] =
    useState<ControleRubrique[]>([]);

  const [filtreMembre, setFiltreMembre] = useState("");
  const [filtreRubrique, setFiltreRubrique] = useState("");
  const [filtreOrigine, setFiltreOrigine] = useState("");
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

      setMembresRubriques(
        Array.isArray(json.data?.membresRubriques)
          ? json.data!.membresRubriques!
          : []
      );

      setDetails(
        Array.isArray(json.data?.details)
          ? json.data!.details!
          : []
      );

      setImports(
        Array.isArray(json.data?.importsHistoriques)
          ? json.data!.importsHistoriques!
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

  const detailsFiltres = useMemo(() => {
    return details.filter((row) => {
      if (
        filtreMembre &&
        !String(row.nom_complet ?? "")
          .toLowerCase()
          .includes(filtreMembre.toLowerCase())
      ) {
        return false;
      }

      if (
        filtreRubrique &&
        row.rubrique_nom !== filtreRubrique
      ) {
        return false;
      }

      if (
        filtreOrigine &&
        row.origine !== filtreOrigine
      ) {
        return false;
      }

      return true;
    });
  }, [
    details,
    filtreMembre,
    filtreRubrique,
    filtreOrigine,
  ]);

  const origines = useMemo(
    () =>
      Array.from(
        new Set(
          details
            .map((row) => row.origine)
            .filter(Boolean)
        )
      ).sort(),
    [details]
  );

  const rubriquesDetails = useMemo(
    () =>
      Array.from(
        new Set(
          details
            .map((row) => row.rubrique_nom)
            .filter(
              (value): value is string => Boolean(value)
            )
        )
      ).sort(),
    [details]
  );

  const membresDisponibles = useMemo(() => {
    return Array.from(
      new Map(
        membresRubriques.map((row) => [
          row.membre_id,
          {
            id: row.membre_id,
            nom: row.nom_complet,
          },
        ])
      ).values()
    ).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [membresRubriques]);

  const lignesMembreSelectionne = useMemo(() => {
    if (!membreSelectionne) return [];

    return membresRubriques.filter(
      (row) => row.membre_id === membreSelectionne
    );
  }, [membresRubriques, membreSelectionne]);

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
                href="/dashboard"
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
              title: "Reports par membre",
              description: "Répartition des reports et participations individuelles.",
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
            {
              key: "mouvements" as SectionKey,
              icon: "📒",
              title: "Détail des mouvements",
              description: "Grand Livre et traçabilité des opérations.",
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

        {sectionActive === "rubriques" ? (
        <Panel
          id="rubriques"
          title="Situation des caisses par rubrique"
          subtitle={`Report ${
            bilan?.annee_precedente ?? "initial"
          }, entrées, sorties et solde de l'exercice ${
            anneeSelectionnee ?? ""
          }.`}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">Rubrique</th>
                  <th className="p-3 text-right">
                    Report (
                    {bilan?.annee_precedente ?? "Initial"})
                  </th>
                  <th className="p-3 text-right">
                    Entrées {anneeSelectionnee}
                  </th>
                  <th className="p-3 text-right">
                    Sorties {anneeSelectionnee}
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
                      {money(row.total_entrees)}
                    </td>

                    <td className="p-3 text-right font-semibold text-red-700">
                      {money(row.total_sorties)}
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
            title="Situation d'un membre"
            subtitle={`Sélectionnez un membre pour consulter sa situation pour l'exercice ${
              anneeSelectionnee ?? ""
            }.`}
          >
            <div className="mb-6 max-w-xl">
              <label
                htmlFor="membre-report"
                className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500"
              >
                Membre
              </label>

              <select
                id="membre-report"
                value={membreSelectionne}
                onChange={(event) =>
                  setMembreSelectionne(event.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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

            {!membreSelectionne ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="font-bold text-slate-700">
                  Sélectionnez un membre pour consulter sa situation.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Les reports et les mouvements de chaque rubrique seront affichés ici.
                </p>
              </div>
            ) : (
              <>
                {(() => {
                  const membreSynthese = membres.find(
                    (row) => row.membre_id === membreSelectionne
                  );

                  return membreSynthese ? (
                    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <KpiCard
                        title={`Report participations (${
                          bilan?.annee_precedente ?? "Initial"
                        })`}
                        value={money(
                          membreSynthese.report_participations
                        )}
                        tone="blue"
                      />

                      <KpiCard
                        title={`Participations ${
                          anneeSelectionnee ?? ""
                        }`}
                        value={money(
                          membreSynthese.participations_annee
                        )}
                        tone="green"
                      />

                      <KpiCard
                        title={`Participations fin ${
                          anneeSelectionnee ?? ""
                        }`}
                        value={money(
                          membreSynthese.participations_fin_exercice
                        )}
                        tone="slate"
                      />

                      <KpiCard
                        title="Prêts à rembourser"
                        value={money(
                          membreSynthese.prets_a_rembourser_fin_exercice
                        )}
                        tone={
                          n(
                            membreSynthese.prets_a_rembourser_fin_exercice
                          ) > 0
                            ? "amber"
                            : "green"
                        }
                      />
                    </div>
                  ) : null;
                })()}

                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-sm">
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
                          Entrées {anneeSelectionnee}
                        </th>

                        <th className="p-3 text-right">
                          Sorties {anneeSelectionnee}
                        </th>

                        <th className="p-3 text-right">
                          Solde {anneeSelectionnee}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {lignesMembreSelectionne.map((row) => (
                        <tr
                          key={`${row.membre_id}-${row.rubrique_id}`}
                          className="border-b border-slate-100"
                        >
                          <td className="p-3 font-bold text-slate-900">
                            {row.rubrique_nom}
                          </td>

                          <td className="p-3 text-right">
                            {money(row.report_precedent)}
                          </td>

                          <td className="p-3 text-right font-semibold text-emerald-700">
                            {money(row.total_entrees)}
                          </td>

                          <td className="p-3 text-right font-semibold text-red-700">
                            {money(
                              row.total_sorties_personnelles
                            )}
                          </td>

                          <td className="p-3 text-right font-black text-slate-950">
                            {money(row.solde_fin_exercice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {lignesMembreSelectionne.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
                    Aucune situation par rubrique trouvée pour ce membre sur cet exercice.
                  </div>
                ) : null}
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

        {sectionActive === "mouvements" ? (
          <>
        <Panel
          id="mouvements"
          title="Grand Livre des mouvements"
          subtitle="Toutes les opérations ayant alimenté le bilan de l'exercice."
        >
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <input
              value={filtreMembre}
              onChange={(event) =>
                setFiltreMembre(event.target.value)
              }
              placeholder="Filtrer par membre..."
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />

            <select
              value={filtreRubrique}
              onChange={(event) =>
                setFiltreRubrique(event.target.value)
              }
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">
                Toutes les rubriques
              </option>

              {rubriquesDetails.map((rubrique) => (
                <option
                  key={rubrique}
                  value={rubrique}
                >
                  {rubrique}
                </option>
              ))}
            </select>

            <select
              value={filtreOrigine}
              onChange={(event) =>
                setFiltreOrigine(event.target.value)
              }
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">
                Toutes les origines
              </option>

              {origines.map((origine) => (
                <option
                  key={origine}
                  value={origine}
                >
                  {origine}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Origine</th>
                  <th className="p-3">Membre</th>
                  <th className="p-3">Rubrique</th>
                  <th className="p-3">Référence</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">
                    Montant
                  </th>
                  <th className="p-3">Import</th>
                </tr>
              </thead>

              <tbody>
                {detailsFiltres.map((row) => (
                  <tr
                    key={`${row.origine}-${row.source_id}-${row.rubrique_id ?? "x"}`}
                    className="border-b border-slate-100"
                  >
                    <td className="p-3">
                      {dateFr(row.date_operation)}
                    </td>

                    <td className="p-3 font-semibold">
                      {row.origine}
                    </td>

                    <td className="p-3">
                      {row.nom_complet ?? "-"}
                    </td>

                    <td className="p-3">
                      {row.rubrique_nom ?? "-"}
                    </td>

                    <td className="p-3 text-xs">
                      {row.reference ?? "-"}
                    </td>

                    <td className="p-3">
                      {row.type_flux}
                    </td>

                    <td
                      className={`p-3 text-right font-black ${
                        row.type_flux === "SORTIE"
                          ? "text-red-700"
                          : row.type_flux === "ENTREE"
                          ? "text-emerald-700"
                          : "text-slate-900"
                      }`}
                    >
                      {money(row.montant)}
                    </td>

                    <td className="p-3">
                      {row.import_historique
                        ? "📥 Historique"
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          id="imports"
          title="Mouvements issus d'imports historiques"
          subtitle="Les opérations importées restent rattachées à leur véritable exercice métier."
        >
          {imports.length === 0 ? (
            <p className="text-sm text-slate-600">
              Aucun mouvement historique importé pour cet
              exercice.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                  <tr>
                    <th className="p-3">Date métier</th>
                    <th className="p-3">Origine</th>
                    <th className="p-3">Membre</th>
                    <th className="p-3">Rubrique</th>
                    <th className="p-3 text-right">
                      Montant
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {imports.map((row) => (
                    <tr
                      key={`${row.origine}-${row.source_id}-${row.rubrique_id ?? "x"}`}
                      className="border-b border-slate-100"
                    >
                      <td className="p-3">
                        {dateFr(row.date_operation)}
                      </td>

                      <td className="p-3">
                        {row.origine}
                      </td>

                      <td className="p-3">
                        {row.nom_complet ?? "-"}
                      </td>

                      <td className="p-3">
                        {row.rubrique_nom ?? "-"}
                      </td>

                      <td className="p-3 text-right font-black">
                        {money(row.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
          </>
        ) : null}
      </div>
    </main>
  );
}






