"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as XLSX from "xlsx";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import ActionButton from "@/components/ui/ActionButton";
import LoadingState from "@/components/ui/LoadingState";

type ExcelRow = Record<string, string | number | boolean | null>;

type MembreOption = {
  id: string;
  nom_complet: string;
};

type RubriqueOption = {
  id: string;
  nom: string;
  ordre_affichage: number;
};

type FormDataResponse = {
  success: boolean;
  membres?: MembreOption[];
  rubriques?: RubriqueOption[];
  message?: string;
};

type ExistingResponse = {
  success: boolean;
  count?: number;
  message?: string;
};

type MatchResult<T> = {
  source: string;
  target: T | null;
  score: number;
};

type MemberDecision = {
  mode: "associate" | "ignore";
  membreId: string;
};

type RubricDecision = {
  mode: "associate" | "create" | "ignore";
  rubriqueId: string;
};

const MONTHS = new Map<string, number>([
  ["janvier", 1],
  ["janv", 1],
  ["jan", 1],
  ["fevrier", 2],
  ["fevr", 2],
  ["fev", 2],
  ["mars", 3],
  ["avril", 4],
  ["avr", 4],
  ["mai", 5],
  ["juin", 6],
  ["juillet", 7],
  ["juil", 7],
  ["aout", 8],
  ["septembre", 9],
  ["sept", 9],
  ["octobre", 10],
  ["oct", 10],
  ["novembre", 11],
  ["nov", 11],
  ["decembre", 12],
  ["dec", 12],
]);

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-\/\\]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace(/[^\d,.-]/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function findHeaderRow(rows: unknown[][]) {
  let bestIndex = 0;
  let bestScore = -1;

  rows.slice(0, 20).forEach((row, index) => {
    const values = row.map(normalize).filter(Boolean);
    if (values.length < 2) return;

    let score = values.length;

    if (values.some((value) => /(nom|membre|adherent)/.test(value))) score += 6;
    if (values.some((value) => /(mois|periode)/.test(value))) score += 4;
    if (values.some((value) => /(total|montant)/.test(value))) score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function uniqueHeaders(values: unknown[]) {
  const counts = new Map<string, number>();

  return values.map((value, index) => {
    const base = String(value ?? "").trim() || `Colonne ${index + 1}`;
    const count = counts.get(base) ?? 0;

    counts.set(base, count + 1);

    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

function roleFor(header: string) {
  const value = normalize(header);

  if (/(^| )(nom|membre|adherent|participant)( |$)/.test(value)) return "Membre";
  if (/(^| )(mois|periode)( |$)/.test(value)) return "Mois";
  if (/(^| )(annee|exercice)( |$)/.test(value)) return "Année";
  if (/(^| )(total|montant total)( |$)/.test(value)) return "Total";

  if (
    /(epargne|tontine|solidarite|fonctionnement|aga|developpement|investissement|acompte|fonds|cotisation)/.test(
      value
    )
  ) {
    return "Rubrique";
  }

  return "Ignorer";
}

function parseSheet(sheet: XLSX.WorkSheet) {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  const nonEmpty = matrix.filter((row) =>
    row.some((cell) => normalize(cell) !== "")
  );

  const headerIndex = findHeaderRow(nonEmpty);
  const headers = uniqueHeaders(nonEmpty[headerIndex] ?? []);
  const rows: ExcelRow[] = [];

  for (let index = headerIndex + 1; index < nonEmpty.length; index += 1) {
    const source = nonEmpty[index] ?? [];
    const record: ExcelRow = {};

    headers.forEach((header, columnIndex) => {
      record[header] = (source[columnIndex] ?? null) as ExcelRow[string];
    });

    if (Object.values(record).some((value) => normalize(value) !== "")) {
      rows.push(record);
    }
  }

  return { headerIndex, headers, rows };
}

function levenshtein(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);

  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const matrix = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0)
  );

  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

function similarity(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);

  if (!left || !right) return 0;
  if (left === right) return 100;

  const distance = levenshtein(left, right);
  const maxLength = Math.max(left.length, right.length);

  let score = Math.round((1 - distance / maxLength) * 100);

  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const commonTokens = [...leftTokens].filter((token) => rightTokens.has(token));

  if (commonTokens.length > 0) {
    const tokenScore = Math.round(
      (commonTokens.length / Math.max(leftTokens.size, rightTokens.size)) * 100
    );

    score = Math.max(score, tokenScore);
  }

  return Math.max(0, Math.min(100, score));
}

function bestMatch<T>(
  source: string,
  values: T[],
  getLabel: (item: T) => string
): MatchResult<T> {
  let best: T | null = null;
  let bestScore = 0;

  for (const item of values) {
    const score = similarity(source, getLabel(item));

    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  if (bestScore < 65) {
    return { source, target: null, score: bestScore };
  }

  return { source, target: best, score: bestScore };
}

function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} FCFA`;
}

export default function ImportExportPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [manualYear, setManualYear] = useState("");
  const [error, setError] = useState("");

  const [loadingReference, setLoadingReference] = useState(true);
  const [membres, setMembres] = useState<MembreOption[]>([]);
  const [rubriques, setRubriques] = useState<RubriqueOption[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const [memberDecisions, setMemberDecisions] = useState<
    Record<string, MemberDecision>
  >({});

  const [rubricDecisions, setRubricDecisions] = useState<
    Record<string, RubricDecision>
  >({});

  const [confirmCreateRubrics, setConfirmCreateRubrics] = useState(false);
  const [confirmReplaceYear, setConfirmReplaceYear] = useState(false);
  const [readyMessage, setReadyMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadReferenceData() {
      setLoadingReference(true);

      try {
        const response = await fetch("/api/imputations/form-data", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as FormDataResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Impossible de charger les données ASF-NTOL"
          );
        }

        if (!mounted) return;

        setMembres(result.membres ?? []);
        setRubriques(result.rubriques ?? []);
      } catch (caught: any) {
        if (!mounted) return;

        setError(
          caught?.message || "Erreur de chargement des données ASF-NTOL"
        );
      } finally {
        if (mounted) setLoadingReference(false);
      }
    }

    void loadReferenceData();

    return () => {
      mounted = false;
    };
  }, []);

  const detections = useMemo(
    () => headers.map((header) => ({ header, role: roleFor(header) })),
    [headers]
  );

  const memberColumn =
    detections.find((item) => item.role === "Membre")?.header ?? "";

  const monthColumn =
    detections.find((item) => item.role === "Mois")?.header ?? "";

  const totalColumn =
    detections.find((item) => item.role === "Total")?.header ?? "";

  const rubricColumns = detections
    .filter((item) => item.role === "Rubrique")
    .map((item) => item.header);

  const detectedYear = useMemo(() => {
    const textMatch = `${fileName} ${selectedSheet}`.match(/\b(20\d{2})\b/);

    return textMatch?.[1] ?? "";
  }, [fileName, selectedSheet]);

  const activeYear = manualYear || detectedYear;

  useEffect(() => {
    let mounted = true;

    async function loadExistingCount() {
      if (!activeYear || activeYear.length !== 4) {
        setExistingCount(0);
        return;
      }

      setLoadingExisting(true);

      try {
        const response = await fetch(
          `/api/imputations?annee=${encodeURIComponent(activeYear)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = (await response.json()) as ExistingResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Impossible de vérifier les encaissements existants"
          );
        }

        if (mounted) setExistingCount(result.count ?? 0);
      } catch (caught: any) {
        if (mounted) {
          setError(
            caught?.message || "Erreur de vérification des encaissements existants"
          );
        }
      } finally {
        if (mounted) setLoadingExisting(false);
      }
    }

    void loadExistingCount();

    return () => {
      mounted = false;
    };
  }, [activeYear]);

  const sourceMembers = useMemo(() => {
    if (!memberColumn) return [];

    return Array.from(
      new Set(
        rows
          .map((row) => String(row[memberColumn] ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows, memberColumn]);

  const memberMatches = useMemo(
    () =>
      sourceMembers.map((source) =>
        bestMatch(source, membres, (item) => item.nom_complet)
      ),
    [sourceMembers, membres]
  );

  const rubricMatches = useMemo(
    () =>
      rubricColumns.map((source) =>
        bestMatch(source, rubriques, (item) => item.nom)
      ),
    [rubricColumns, rubriques]
  );

  useEffect(() => {
    const next: Record<string, MemberDecision> = {};

    for (const item of memberMatches) {
      next[item.source] = {
        mode: "associate",
        membreId: item.target?.id ?? "",
      };
    }

    setMemberDecisions(next);
  }, [memberMatches]);

  useEffect(() => {
    const next: Record<string, RubricDecision> = {};

    for (const item of rubricMatches) {
      next[item.source] = item.target
        ? {
            mode: "associate",
            rubriqueId: item.target.id,
          }
        : {
            mode: "create",
            rubriqueId: "",
          };
    }

    setRubricDecisions(next);
  }, [rubricMatches]);

  const monthsCount = useMemo(() => {
    if (!monthColumn) return 0;

    return new Set(
      rows
        .map((row) => {
          const value = normalize(row[monthColumn]);

          if (MONTHS.has(value)) return MONTHS.get(value);

          const number = Number(value);

          return Number.isInteger(number) && number >= 1 && number <= 12
            ? number
            : null;
        })
        .filter((value): value is number => value !== null)
    ).size;
  }, [rows, monthColumn]);

  const total = useMemo(() => {
    if (totalColumn) {
      return rows.reduce((sum, row) => sum + parseNumber(row[totalColumn]), 0);
    }

    return rows.reduce(
      (sum, row) =>
        sum +
        rubricColumns.reduce(
          (lineSum, column) => lineSum + parseNumber(row[column]),
          0
        ),
      0
    );
  }, [rows, totalColumn, rubricColumns]);

  const unresolvedMembers = sourceMembers.filter((source) => {
    const decision = memberDecisions[source];

    return !decision || (decision.mode === "associate" && !decision.membreId);
  });

  const unresolvedRubrics = rubricColumns.filter((source) => {
    const decision = rubricDecisions[source];

    return !decision || (decision.mode === "associate" && !decision.rubriqueId);
  });

  const rubricsToCreate = rubricColumns.filter(
    (source) => rubricDecisions[source]?.mode === "create"
  );

  const ignoredMembers = sourceMembers.filter(
    (source) => memberDecisions[source]?.mode === "ignore"
  );

  const ignoredRubrics = rubricColumns.filter(
    (source) => rubricDecisions[source]?.mode === "ignore"
  );

  const validationReady =
    rows.length > 0 &&
    Boolean(activeYear) &&
    Boolean(memberColumn) &&
    Boolean(monthColumn) &&
    unresolvedMembers.length === 0 &&
    unresolvedRubrics.length === 0 &&
    (rubricsToCreate.length === 0 || confirmCreateRubrics) &&
    (existingCount === 0 || confirmReplaceYear);

  function resetFile() {
    setFileName("");
    setFileSize(0);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setHeaders([]);
    setRows([]);
    setManualYear("");
    setExistingCount(0);
    setMemberDecisions({});
    setRubricDecisions({});
    setConfirmCreateRubrics(false);
    setConfirmReplaceYear(false);
    setReadyMessage("");
    setError("");

    if (inputRef.current) inputRef.current.value = "";
  }

  function loadSheet(nextWorkbook: XLSX.WorkBook, name: string) {
    const sheet = nextWorkbook.Sheets[name];

    if (!sheet) {
      throw new Error(`Feuille introuvable : ${name}`);
    }

    const parsed = parseSheet(sheet);

    setSelectedSheet(name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setManualYear("");
    setConfirmCreateRubrics(false);
    setConfirmReplaceYear(false);
    setReadyMessage("");
  }

  async function processFile(file: File) {
    setError("");

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension || !["xlsx", "xls"].includes(extension)) {
      setError("Sélectionnez un fichier .xlsx ou .xls.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const nextWorkbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      if (nextWorkbook.SheetNames.length === 0) {
        throw new Error("Le classeur ne contient aucune feuille.");
      }

      setFileName(file.name);
      setFileSize(file.size);
      setWorkbook(nextWorkbook);
      setSheetNames(nextWorkbook.SheetNames);

      loadSheet(nextWorkbook, nextWorkbook.SheetNames[0]);
    } catch (caught: any) {
      resetFile();
      setError(caught?.message || "Impossible de lire le fichier Excel.");
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) void processFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) void processFile(file);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export"
        subtitle="Assistant centralisé pour analyser et importer les données de l'association."
        size="lg"
      />

      <SectionCard
        title="Import des encaissements"
        subtitle="Fichier → Analyse → Validation → Import → Résultat"
        padding="md"
      >
        <div className="grid gap-4 md:grid-cols-5">
          {[
            "1. Fichier",
            "2. Analyse",
            "3. Validation",
            "4. Import",
            "5. Résultat",
          ].map((step, index) => {
            const active = rows.length > 0 ? index <= 2 : index === 0;

            return (
              <div
                key={step}
                className={[
                  "rounded-[16px] border px-4 py-4 text-center text-sm font-semibold",
                  active
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-400",
                ].join(" ")}
              >
                {step}
              </div>
            );
          })}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onInputChange}
        />

        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={onDrop}
          className={[
            "mt-6 rounded-[20px] border-2 border-dashed p-8 text-center transition",
            dragging
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-300 bg-slate-50",
          ].join(" ")}
        >
          <p className="text-lg font-semibold text-slate-900">
            {fileName || "Déposer votre fichier Excel"}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {fileName
              ? `${new Intl.NumberFormat("fr-FR").format(fileSize)} octets`
              : "Glissez le fichier ici ou sélectionnez-le avec le bouton."}
          </p>

          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
            <ActionButton
              variant="outline"
              size="md"
              fullWidth
              onClick={() => inputRef.current?.click()}
            >
              {fileName ? "Choisir un autre fichier" : "Parcourir..."}
            </ActionButton>

            {fileName ? (
              <ActionButton
                variant="outline"
                size="md"
                fullWidth
                onClick={resetFile}
              >
                Retirer le fichier
              </ActionButton>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-[16px] border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        ) : null}
      </SectionCard>

      {loadingReference ? (
        <LoadingState
          message="Chargement des membres et rubriques ASF-NTOL..."
          size="md"
          variant="default"
        />
      ) : null}

      {rows.length > 0 ? (
        <>
          <SectionCard
            title="Période et remplacement"
            subtitle="Vérifiez l'année puis confirmez le remplacement si des données existent déjà."
            padding="md"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Année
                </span>

                <input
                  value={activeYear}
                  onChange={(event) =>
                    setManualYear(
                      event.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="2025"
                  className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
                />
              </label>

              <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Encaissements existants
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {loadingExisting ? "..." : existingCount}
                </p>
              </div>
            </div>

            {existingCount > 0 ? (
              <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-amber-200 bg-amber-50 p-4">
                <input
                  type="checkbox"
                  checked={confirmReplaceYear}
                  onChange={(event) =>
                    setConfirmReplaceYear(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <span className="text-sm font-medium text-amber-800">
                  Je confirme le remplacement complet des {existingCount} encaissements
                  existants pour l'année {activeYear}.
                </span>
              </label>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Validation des membres"
            subtitle="Associez chaque nom du fichier à un membre existant ou ignorez ses lignes."
            padding="md"
          >
            <div className="space-y-3">
              {memberMatches.map((item) => {
                const decision = memberDecisions[item.source];

                return (
                  <div
                    key={item.source}
                    className="grid gap-3 rounded-[16px] border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_1.5fr_auto]"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Nom dans Excel
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {item.source}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Suggestion : {item.target?.nom_complet || "aucune"} ({item.score} %)
                      </p>
                    </div>

                    <select
                      value={
                        decision?.mode === "ignore"
                          ? "__ignore__"
                          : decision?.membreId ?? ""
                      }
                      onChange={(event) => {
                        const value = event.target.value;

                        setMemberDecisions((current) => ({
                          ...current,
                          [item.source]:
                            value === "__ignore__"
                              ? { mode: "ignore", membreId: "" }
                              : { mode: "associate", membreId: value },
                        }));
                      }}
                      className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Choisir un membre</option>

                      {membres.map((membre) => (
                        <option key={membre.id} value={membre.id}>
                          {membre.nom_complet}
                        </option>
                      ))}

                      <option value="__ignore__">Ignorer les lignes de ce nom</option>
                    </select>

                    <div className="flex items-center">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          decision?.mode === "ignore"
                            ? "bg-slate-100 text-slate-600"
                            : decision?.membreId
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700",
                        ].join(" ")}
                      >
                        {decision?.mode === "ignore"
                          ? "Ignoré"
                          : decision?.membreId
                            ? "Validé"
                            : "À traiter"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Validation des rubriques"
            subtitle="Associez chaque colonne à une rubrique existante, créez-la ou ignorez-la."
            padding="md"
          >
            <div className="space-y-3">
              {rubricMatches.map((item) => {
                const decision = rubricDecisions[item.source];

                return (
                  <div
                    key={item.source}
                    className="grid gap-3 rounded-[16px] border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_1.5fr_auto]"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Colonne Excel
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {item.source}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Suggestion : {item.target?.nom || "création"} ({item.score} %)
                      </p>
                    </div>

                    <select
                      value={
                        decision?.mode === "create"
                          ? "__create__"
                          : decision?.mode === "ignore"
                            ? "__ignore__"
                            : decision?.rubriqueId ?? ""
                      }
                      onChange={(event) => {
                        const value = event.target.value;

                        setRubricDecisions((current) => ({
                          ...current,
                          [item.source]:
                            value === "__create__"
                              ? { mode: "create", rubriqueId: "" }
                              : value === "__ignore__"
                                ? { mode: "ignore", rubriqueId: "" }
                                : { mode: "associate", rubriqueId: value },
                        }));
                      }}
                      className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Choisir une rubrique</option>

                      {rubriques.map((rubrique) => (
                        <option key={rubrique.id} value={rubrique.id}>
                          {rubrique.nom}
                        </option>
                      ))}

                      <option value="__create__">
                        Créer « {item.source} » pour {activeYear}
                      </option>

                      <option value="__ignore__">Ignorer cette colonne</option>
                    </select>

                    <div className="flex items-center">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          decision?.mode === "create"
                            ? "bg-amber-100 text-amber-700"
                            : decision?.mode === "ignore"
                              ? "bg-slate-100 text-slate-600"
                              : decision?.rubriqueId
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700",
                        ].join(" ")}
                      >
                        {decision?.mode === "create"
                          ? "À créer"
                          : decision?.mode === "ignore"
                            ? "Ignorée"
                            : decision?.rubriqueId
                              ? "Validée"
                              : "À traiter"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {rubricsToCreate.length > 0 ? (
              <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-amber-200 bg-amber-50 p-4">
                <input
                  type="checkbox"
                  checked={confirmCreateRubrics}
                  onChange={(event) =>
                    setConfirmCreateRubrics(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />

                <span className="text-sm font-medium text-amber-800">
                  Je confirme la création de {rubricsToCreate.length} rubrique(s)
                  pour l'année {activeYear}.
                </span>
              </label>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Résumé avant import"
            subtitle="Cette étape prépare l'import réel sans écrire dans la base."
            padding="md"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Année", activeYear || "-"],
                ["Lignes Excel", rows.length],
                ["Mois détectés", monthsCount],
                ["Membres ignorés", ignoredMembers.length],
                ["Rubriques à créer", rubricsToCreate.length],
                ["Rubriques ignorées", ignoredRubrics.length],
                ["Données remplacées", existingCount],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {value}
                  </p>
                </div>
              ))}

              <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Montant total du fichier
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {formatFcfa(total)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[16px] border border-slate-200 bg-slate-50 p-4">
              {validationReady ? (
                <p className="text-sm font-medium text-emerald-700">
                  Toutes les décisions obligatoires sont validées.
                </p>
              ) : (
                <div className="space-y-1 text-sm font-medium text-red-700">
                  {unresolvedMembers.length > 0 ? (
                    <p>• {unresolvedMembers.length} membre(s) restent à traiter.</p>
                  ) : null}

                  {unresolvedRubrics.length > 0 ? (
                    <p>• {unresolvedRubrics.length} rubrique(s) restent à traiter.</p>
                  ) : null}

                  {rubricsToCreate.length > 0 && !confirmCreateRubrics ? (
                    <p>• La création des rubriques doit être confirmée.</p>
                  ) : null}

                  {existingCount > 0 && !confirmReplaceYear ? (
                    <p>• Le remplacement des données existantes doit être confirmé.</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-5 max-w-sm">
              <ActionButton
                variant="primary"
                size="md"
                fullWidth
                disabled={!validationReady}
                onClick={() =>
                  setReadyMessage(
                    "Validation terminée. L'import réel sera activé dans la prochaine livraison."
                  )
                }
              >
                Préparer l'import
              </ActionButton>
            </div>

            {readyMessage ? (
              <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  {readyMessage}
                </p>
              </div>
            ) : null}
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}