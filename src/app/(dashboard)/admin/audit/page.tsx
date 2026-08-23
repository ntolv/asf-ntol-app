"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";

type JournalRow = {
  evenement_id: string;
  categorie: string | null;
  date_evenement: string | null;
  date_operation: string | null;
  annee: number | null;
  mois: number | null;
  module: string | null;
  type_mouvement: string | null;
  action: string | null;
  type_flux: string | null;
  source: string | null;
  source_id: string | null;

  membre_id: string | null;
  membre_nom: string | null;

  membre_id_avant: string | null;
  membre_nom_avant: string | null;

  membre_id_apres: string | null;
  membre_nom_apres: string | null;

  rubrique_id: string | null;
  rubrique_nom: string | null;

  rubrique_id_avant: string | null;
  rubrique_nom_avant: string | null;

  rubrique_id_apres: string | null;
  rubrique_nom_apres: string | null;

  montant: number | string | null;
  montant_avant: number | string | null;
  montant_apres: number | string | null;

  reference: string | null;
  motif: string | null;

  statut_avant: string | null;
  statut_apres: string | null;

  auteur_utilisateur_id: string | null;
  auteur_nom: string | null;
  auteur_role_code: string | null;
  auteur_role_libelle: string | null;

  import_historique: boolean | null;
  metadata: Record<string, unknown> | null;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: JournalRow[];
  pagination?: Pagination;
  role_code?: string | null;
};

type Filters = {
  annee: string;
  mois: string;
  categorie: string;
  module: string;
  action: string;
  type_mouvement: string;
  auteur: string;
  membre: string;
  rubrique: string;
  q: string;
};

const EMPTY_FILTERS: Filters = {
  annee: "",
  mois: "",
  categorie: "",
  module: "",
  action: "",
  type_mouvement: "",
  auteur: "",
  membre: "",
  rubrique: "",
  q: "",
};

const MONTHS = [
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

const MODULES = [
  "ENCAISSEMENTS",
  "DECAISSEMENTS",
  "PRETS",
  "TONTINE",
  "CAISSE",
  "AIDES",
];

const ACTIONS = [
  "ENCAISSEMENT",
  "ANNULATION",
  "CORRECTION",
  "RETOUR_ARRIERE",
  "CREATION",
  "MODIFICATION",
  "SORTIE_CAISSE",
  "OCTROI_PRET",
  "DECAISSEMENT_PRET",
  "REMBOURSEMENT_PRET",
  "CLOTURE_ENCHERE",
  "DECAISSEMENT_GAIN_TONTINE",
  "REDISTRIBUTION",
  "ENTREE_CAISSE",
  "MISE_EN_RESERVE",
  "DEMANDE_APPROUVEE",
  "DEMANDE_REFUSEE",
];

function money(
  value: number | string | null | undefined
) {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) {
    return "-";
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }
  ).format(parsed);
}

function dateTimeFr(
  value: string | null | undefined
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "fr-FR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );
}

function dateFr(
  value: string | null | undefined
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "fr-FR"
  );
}

function displayCode(
  value: string | null | undefined
) {
  return String(
    value ?? "-"
  )
    .replaceAll("_", " ")
    .trim();
}

function categoryLabel(
  value: string | null | undefined
) {
  if (value === "DECISION_METIER") {
    return "Décision métier";
  }

  if (value === "MOUVEMENT_FINANCIER") {
    return "Mouvement financier";
  }

  if (value === "AUDIT") {
    return "Audit";
  }

  return displayCode(value);
}

function actionLabel(
  value: string | null | undefined
) {
  if (value === "DEMANDE_APPROUVEE") {
    return "Demande approuvée";
  }

  if (value === "DEMANDE_REFUSEE") {
    return "Demande refusée";
  }

  return displayCode(value);
}

function typeMouvementLabel(
  value: string | null | undefined
) {
  if (value === "DEMANDE_PRET") {
    return "Demande de prêt";
  }

  if (value === "DEMANDE_AIDE") {
    return "Demande d'aide";
  }

  return displayCode(value);
}

function badgeClass(
  category: string | null,
  action: string | null
) {
  if (
    category === "AUDIT"
  ) {
    if (
      action === "ANNULATION"
    ) {
      return "border-rose-200 bg-rose-50 text-rose-800";
    }

    if (
      action === "RETOUR_ARRIERE"
    ) {
      return "border-amber-200 bg-amber-50 text-amber-800";
    }

    if (
      action === "CORRECTION"
    ) {
      return "border-sky-200 bg-sky-50 text-sky-800";
    }

    return "border-violet-200 bg-violet-50 text-violet-800";
  }

  if (
    category === "DECISION_METIER"
  ) {
    if (
      action === "DEMANDE_REFUSEE"
    ) {
      return "border-rose-200 bg-rose-50 text-rose-800";
    }

    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function mouvementLabel(
  row: JournalRow
) {
  if (
    row.categorie === "DECISION_METIER"
  ) {
    return actionLabel(
      row.action
    );
  }
  if (
    row.categorie === "AUDIT"
  ) {
    if (
      row.action === "CORRECTION"
    ) {
      return "Correction";
    }

    if (
      row.action === "ANNULATION"
    ) {
      return "Annulation";
    }

    if (
      row.action === "RETOUR_ARRIERE"
    ) {
      return "Retour en arrière";
    }
  }

  return displayCode(
    row.action
  );
}

function montantPrincipal(
  row: JournalRow
) {
  if (
    row.categorie === "AUDIT"
  ) {
    if (
      row.action === "ANNULATION"
    ) {
      return row.montant_avant;
    }

    return (
      row.montant_apres ??
      row.montant_avant
    );
  }

  return row.montant;
}

function BeforeAfter({
  before,
  after,
  empty = "-",
}: {
  before: React.ReactNode;
  after: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const beforeEmpty =
    before === null ||
    before === undefined ||
    before === "";

  const afterEmpty =
    after === null ||
    after === undefined ||
    after === "";

  if (
    beforeEmpty &&
    afterEmpty
  ) {
    return (
      <span className="text-slate-400">
        {empty}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700">
        {beforeEmpty
          ? empty
          : before}
      </span>

      <span className="text-slate-400">
        →
      </span>

      <span className="rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">
        {afterEmpty
          ? empty
          : after}
      </span>
    </div>
  );
}

export default function JournalGeneralPage() {
  const [rows, setRows] =
    useState<JournalRow[]>([]);

  const [
    pagination,
    setPagination,
  ] = useState<Pagination>({
    page: 1,
    page_size: 50,
    total: 0,
    total_pages: 1,
  });

  const [filters, setFilters] =
    useState<Filters>(
      EMPTY_FILTERS
    );

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<Filters>(
      EMPTY_FILTERS
    );

  const [page, setPage] =
    useState(1);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    expandedId,
    setExpandedId,
  ] =
    useState<string | null>(
      null
    );

  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(0);

  const [
    urlReady,
    setUrlReady,
  ] = useState(false);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const initialFilters: Filters = {
      ...EMPTY_FILTERS,
      annee:
        params.get("annee") ?? "",
      mois:
        params.get("mois") ?? "",
      categorie:
        params.get("categorie") ?? "",
      module:
        params.get("module") ?? "",
      action:
        params.get("action") ?? "",
      type_mouvement:
        params.get("type_mouvement") ?? "",
      auteur:
        params.get("auteur") ?? "",
      membre:
        params.get("membre") ?? "",
      rubrique:
        params.get("rubrique") ?? "",
      q:
        params.get("q") ?? "",
    };

    const requestedPage =
      Number(
        params.get("page") ?? "1"
      );

    setFilters({
      ...initialFilters,
    });

    setAppliedFilters({
      ...initialFilters,
    });

    setPage(
      Number.isInteger(
        requestedPage
      ) &&
        requestedPage > 0
        ? requestedPage
        : 1
    );

    setUrlReady(true);
  }, []);
  const currentYear =
    new Date().getFullYear();

  const years =
    useMemo(() => {
      const values: number[] =
        [];

      for (
        let year =
          currentYear;
        year >= 2024;
        year -= 1
      ) {
        values.push(year);
      }

      return values;
    }, [currentYear]);

  const hasFilters =
    useMemo(() => {
      return Object.values(
        appliedFilters
      ).some(
        (value) =>
          String(value).trim() !== ""
      );
    }, [appliedFilters]);

  const buildParams =
    useCallback(() => {
      const params =
        new URLSearchParams();

      params.set(
        "page",
        String(page)
      );

      for (
        const [
          key,
          rawValue,
        ] of Object.entries(
          appliedFilters
        )
      ) {
        const value =
          String(
            rawValue ?? ""
          ).trim();

        if (value) {
          params.set(
            key,
            value
          );
        }
      }

      return params;
    }, [
      appliedFilters,
      page,
    ]);

  const loadJournal =
    useCallback(
      async (
        signal?: AbortSignal
      ) => {
        try {
          setLoading(true);
          setError("");

          const params =
            buildParams();

          const response =
            await fetch(
              `/api/admin/audit?${params.toString()}`,
              {
                cache:
                  "no-store",
                headers: {
                  Accept:
                    "application/json",
                },
                signal,
              }
            );

          const json =
            (await response.json()) as ApiResponse;

          if (
            !response.ok ||
            !json?.success
          ) {
            throw new Error(
              json?.message ||
                "Impossible de charger le Journal général."
            );
          }

          setRows(
            Array.isArray(
              json.data
            )
              ? json.data
              : []
          );

          setPagination(
            json.pagination ?? {
              page,
              page_size: 50,
              total: 0,
              total_pages: 1,
            }
          );

          setExpandedId(
            null
          );
        } catch (err) {
          if (
            err instanceof DOMException &&
            err.name ===
              "AbortError"
          ) {
            return;
          }

          setError(
            err instanceof Error
              ? err.message
              : "Erreur de chargement."
          );

          setRows([]);
        } finally {
          setLoading(false);
        }
      },
      [
        buildParams,
        page,
      ]
    );

  useEffect(() => {
    if (!urlReady) {
      return;
    }

    const controller =
      new AbortController();

    void loadJournal(
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [
    loadJournal,
    refreshKey,
    urlReady,
  ]);

  function updateFilter(
    key: keyof Filters,
    value: string
  ) {
    setFilters(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  function applyFilters() {
    setPage(1);
    setAppliedFilters({
      ...filters,
    });
  }

  function resetFilters() {
    setFilters({
      ...EMPTY_FILTERS,
    });

    setAppliedFilters({
      ...EMPTY_FILTERS,
    });

    setPage(1);
  }

  function handleSearchKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter"
    ) {
      applyFilters();
    }
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Administration
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              Journal général
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Traçabilité centralisée des mouvements financiers, corrections,
              annulations et retours en arrière de l&apos;ASF-NTOL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Événements
              </p>

              <p className="mt-1 text-xl font-black text-slate-900">
                {pagination.total.toLocaleString(
                  "fr-FR"
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setRefreshKey(
                  (value) =>
                    value + 1
                )
              }
              disabled={loading}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  loading
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              />

              Actualiser
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-emerald-700" />

          <h2 className="text-lg font-black text-slate-900">
            Filtres
          </h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Année
            </span>

            <select
              value={
                filters.annee
              }
              onChange={(e) =>
                updateFilter(
                  "annee",
                  e.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-400"
            >
              <option value="">
                Toutes
              </option>

              {years.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Mois
            </span>

            <select
              value={
                filters.mois
              }
              onChange={(e) =>
                updateFilter(
                  "mois",
                  e.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-400"
            >
              <option value="">
                Tous
              </option>

              {MONTHS.map(
                (month) => (
                  <option
                    key={
                      month.value
                    }
                    value={
                      month.value
                    }
                  >
                    {month.label}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Catégorie
            </span>

            <select
              value={
                filters.categorie
              }
              onChange={(e) =>
                updateFilter(
                  "categorie",
                  e.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-400"
            >
              <option value="">
                Toutes
              </option>

              <option value="MOUVEMENT_FINANCIER">
                Mouvement financier
              </option>

              <option value="AUDIT">
                Audit
              </option>
                <option value="DECISION_METIER">Décision métier</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Module
            </span>

            <select
              value={
                filters.module
              }
              onChange={(e) =>
                updateFilter(
                  "module",
                  e.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-400"
            >
              <option value="">
                Tous
              </option>

              {MODULES.map(
                (module) => (
                  <option
                    key={module}
                    value={module}
                  >
                    {displayCode(
                      module
                    )}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Action
            </span>

            <select
              value={
                filters.action
              }
              onChange={(e) =>
                updateFilter(
                  "action",
                  e.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-400"
            >
              <option value="">
                Toutes
              </option>

              {ACTIONS.map(
                (action) => (
                  <option
                    key={action}
                    value={action}
                  >
                    {actionLabel(action)}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Type de mouvement
            </span>

            <input
              value={
                filters.type_mouvement
              }
              onChange={(e) =>
                updateFilter(
                  "type_mouvement",
                  e.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder="Ex. PRET, ENCHERE..."
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Auteur
            </span>

            <input
              value={
                filters.auteur
              }
              onChange={(e) =>
                updateFilter(
                  "auteur",
                  e.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder="Nom de l'auteur"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Membre
            </span>

            <input
              value={
                filters.membre
              }
              onChange={(e) =>
                updateFilter(
                  "membre",
                  e.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder="Membre concerné"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Rubrique / caisse
            </span>

            <input
              value={
                filters.rubrique
              }
              onChange={(e) =>
                updateFilter(
                  "rubrique",
                  e.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder="Rubrique ou caisse"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Recherche
            </span>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={
                  filters.q
                }
                onChange={(e) =>
                  updateFilter(
                    "q",
                    e.target.value
                  )
                }
                onKeyDown={
                  handleSearchKeyDown
                }
                placeholder="Motif, référence..."
                className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400"
              />
            </div>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={
              applyFilters
            }
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            <Filter className="h-4 w-4" />

            Appliquer les filtres
          </button>

          <button
            type="button"
            onClick={
              resetFilters
            }
            disabled={
              !hasFilters &&
              Object.values(
                filters
              ).every(
                (value) =>
                  !String(
                    value
                  ).trim()
              )
            }
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />

            Réinitialiser
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          <p className="font-bold">
            Erreur
          </p>

          <p className="mt-2">
            {error}
          </p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Événements
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Une opération utilisateur est affichée sur une seule ligne.
            </p>
          </div>

          <p className="text-sm font-semibold text-slate-600">
            Page{" "}
            {pagination.page} /{" "}
            {pagination.total_pages}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Chargement du Journal général...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Aucun événement correspondant aux filtres sélectionnés.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">
                      Date
                    </th>

                    <th className="px-4 py-3">
                      Module
                    </th>

                    <th className="px-4 py-3">
                      Action
                    </th>

                    <th className="px-4 py-3">
                      Membre
                    </th>

                    <th className="px-4 py-3">
                      Rubrique
                    </th>

                    <th className="px-4 py-3 text-right">
                      Montant
                    </th>

                    <th className="px-4 py-3">
                      Auteur
                    </th>

                    <th className="w-14 px-4 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (row) => {
                      const expanded =
                        expandedId ===
                        row.evenement_id;

                      return (
                        <FragmentRow
                          key={
                            row.evenement_id
                          }
                          row={row}
                          expanded={
                            expanded
                          }
                          onToggle={() =>
                            setExpandedId(
                              expanded
                                ? null
                                : row.evenement_id
                            )
                          }
                        />
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {rows.map(
                (row) => {
                  const expanded =
                    expandedId ===
                    row.evenement_id;

                  return (
                    <article
                      key={
                        row.evenement_id
                      }
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-500">
                            {dateTimeFr(
                              row.date_evenement
                            )}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                              {displayCode(
                                row.module
                              )}
                            </span>

                            <span
                              className={[
                                "rounded-full border px-2.5 py-1 text-xs font-bold",
                                badgeClass(
                                  row.categorie,
                                  row.action
                                ),
                              ].join(
                                " "
                              )}
                            >
                              {mouvementLabel(
                                row
                              )}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(
                              expanded
                                ? null
                                : row.evenement_id
                            )
                          }
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
                          aria-label="Afficher les détails"
                        >
                          {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm">
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Membre
                          </p>

                          <p className="font-bold text-slate-900">
                            {row.membre_nom ||
                              "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Rubrique
                          </p>

                          <p className="font-semibold text-slate-700">
                            {row.rubrique_nom ||
                              "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Montant
                          </p>

                          <p className="font-black text-emerald-800">
                            {money(
                              montantPrincipal(
                                row
                              )
                            )}
                          </p>
                        </div>
                      </div>

                      {expanded ? (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <DetailContent
                            row={
                              row
                            }
                          />
                        </div>
                      ) : null}
                    </article>
                  );
                }
              )}
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {pagination.total ===
            0
              ? "0 événement"
              : `${
                  (pagination.page -
                    1) *
                    pagination.page_size +
                  1
                } à ${Math.min(
                  pagination.page *
                    pagination.page_size,
                  pagination.total
                )} sur ${pagination.total.toLocaleString(
                  "fr-FR"
                )}`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={
                loading ||
                pagination.page <=
                  1
              }
              onClick={() =>
                setPage(
                  Math.max(
                    1,
                    pagination.page -
                      1
                  )
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />

              Précédent
            </button>

            <button
              type="button"
              disabled={
                loading ||
                pagination.page >=
                  pagination.total_pages
              }
              onClick={() =>
                setPage(
                  Math.min(
                    pagination.total_pages,
                    pagination.page +
                      1
                  )
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Suivant

              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function FragmentRow({
  row,
  expanded,
  onToggle,
}: {
  row: JournalRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-100 align-top transition hover:bg-slate-50/60">
        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
          {dateTimeFr(
            row.date_evenement
          )}
        </td>

        <td className="px-4 py-4">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
            {displayCode(
              row.module
            )}
          </span>
        </td>

        <td className="px-4 py-4">
          <span
            className={[
              "inline-flex rounded-full border px-2.5 py-1 text-xs font-bold",
              badgeClass(
                row.categorie,
                row.action
              ),
            ].join(" ")}
          >
            {mouvementLabel(
              row
            )}
          </span>
        </td>

        <td className="px-4 py-4 font-semibold text-slate-900">
          {row.membre_nom ||
            "-"}
        </td>

        <td className="px-4 py-4 text-slate-700">
          {row.rubrique_nom ||
            "-"}
        </td>

        <td className="whitespace-nowrap px-4 py-4 text-right font-black text-slate-900">
          {money(
            montantPrincipal(
              row
            )
          )}
        </td>

        <td className="px-4 py-4 text-slate-600">
          {row.auteur_nom ? (
            <>
              <p className="font-semibold text-slate-800">
                {
                  row.auteur_nom
                }
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {row.auteur_role_libelle ||
                  row.auteur_role_code ||
                  "-"}
              </p>
            </>
          ) : (
            <span className="text-slate-400">
              -
            </span>
          )}
        </td>

        <td className="px-4 py-4 text-right">
          <button
            type="button"
            onClick={onToggle}
            title={
              expanded
                ? "Masquer les détails"
                : "Afficher les détails"
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-slate-100 bg-slate-50/70">
          <td
            colSpan={8}
            className="px-5 py-5"
          >
            <DetailContent
              row={row}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function DetailContent({
  row,
}: {
  row: JournalRow;
}) {
  const isAudit =
    row.categorie ===
    "AUDIT";

  const isDecision =
    row.categorie ===
    "DECISION_METIER";

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-black text-slate-900">
          Détail de l&apos;opération
        </h3>

        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Date opération
            </dt>

            <dd className="mt-1 font-semibold text-slate-800">
              {dateFr(
                row.date_operation
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Catégorie
            </dt>

            <dd className="mt-1 font-semibold text-slate-800">
              {categoryLabel(
                row.categorie
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Type mouvement
            </dt>

            <dd className="mt-1 font-semibold text-slate-800">
              {typeMouvementLabel(
                row.type_mouvement
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              {isDecision ? "Action" : "Flux"}
            </dt>

            <dd className="mt-1 font-semibold text-slate-800">
              {isDecision
                ? mouvementLabel(row)
                : displayCode(
                    row.type_flux
                  )}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Référence
            </dt>

            <dd className="mt-1 break-all font-mono text-xs text-slate-700">
              {row.reference ||
                "-"}
            </dd>
          </div>

          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Source
            </dt>

            <dd className="mt-1 font-semibold text-slate-800">
              {displayCode(
                row.source
              )}
            </dd>
          </div>
        </dl>

        {row.motif ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Motif / commentaire
            </p>

            <p className="mt-2 text-sm text-slate-700">
              {row.motif}
            </p>
          </div>
        ) : null}

        {row.import_historique ? (
          <div className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            Import historique
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-black text-slate-900">
          {isAudit
            ? "Avant / après"
            : isDecision
            ? "Décision"
            : "Informations financières"}
        </h3>

        {isAudit ? (
          <div className="mt-4 grid gap-4 text-sm">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Membre
              </p>

              <BeforeAfter
                before={
                  row.membre_nom_avant
                }
                after={
                  row.membre_nom_apres
                }
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Rubrique
              </p>

              <BeforeAfter
                before={
                  row.rubrique_nom_avant
                }
                after={
                  row.rubrique_nom_apres
                }
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Montant
              </p>

              <BeforeAfter
                before={
                  row.montant_avant !==
                    null &&
                  row.montant_avant !==
                    undefined
                    ? money(
                        row.montant_avant
                      )
                    : null
                }
                after={
                  row.montant_apres !==
                    null &&
                  row.montant_apres !==
                    undefined
                    ? money(
                        row.montant_apres
                      )
                    : null
                }
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Statut
              </p>

              <BeforeAfter
                before={
                  row.statut_avant
                }
                after={
                  row.statut_apres
                }
              />
            </div>
          </div>
        ) : isDecision ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Montant demandé
              </p>

              <p className="mt-2 text-xl font-black text-slate-900">
                {row.montant_avant !== null &&
                row.montant_avant !== undefined
                  ? money(row.montant_avant)
                  : "-"}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Montant accordé
              </p>

              <p className="mt-2 text-xl font-black text-emerald-900">
                {row.montant_apres !== null &&
                row.montant_apres !== undefined
                  ? money(row.montant_apres)
                  : "-"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Membre
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {row.membre_nom || "-"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Statut
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {displayCode(
                  row.statut_apres
                )}
              </p>
            </div>
          </div>
        ) : (<div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Montant
              </p>

              <p className="mt-2 text-xl font-black text-emerald-900">
                {money(
                  row.montant
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Membre
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {row.membre_nom ||
                  "-"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Rubrique
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {row.rubrique_nom ||
                  "-"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Type de flux
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {displayCode(
                  row.type_flux
                )}
              </p>
            </div>
          </div>)}
        {row.auteur_nom ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {isDecision ? "Décidé par" : "Auteur"}
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {row.auteur_nom}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {row.auteur_role_libelle ||
                row.auteur_role_code ||
                "-"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
