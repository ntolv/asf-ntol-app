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
  annees?: string[];
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
  status: "exact" | "suggestion" | "missing";
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
  if (!source.trim()) {
    return { source, target: null, score: 0, status: "missing" };
  }

  let best: T | null = null;
  let bestScore = 0;

  for (const item of values) {
    const score = similarity(source, getLabel(item));

    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  if (!best || bestScore < 65) {
    return { source, target: null, score: bestScore, status: "missing" };
  }

  return {
    source,
    target: best,
    score: bestScore,
    status: bestScore === 100 ? "exact" : "suggestion",
  };
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
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [manualYear, setManualYear] = useState("");
  const [error, setError] = useState("");

  const [loadingReference, setLoadingReference] = useState(true);
  const [membres, setMembres] = useState<MembreOption[]>([]);
  const [rubriques, setRubriques] = useState<RubriqueOption[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [loadingExisting, setLoadingExisting] = useState(false);

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
          throw new Error(result.message || "Impossible de charger les données ASF-NTOL");
        }

        if (!mounted) return;

        setMembres(result.membres ?? []);
        setRubriques(result.rubriques ?? []);
      } catch (caught: any) {
        if (!mounted) return;
        setError(caught?.message || "Erreur de chargement des données ASF-NTOL");
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
    if (textMatch) return textMatch[1];

    const yearColumn =
      detections.find((item) => item.role === "Année")?.header;

    if (!yearColumn) return "";

    for (const row of rows.slice(0, 50)) {
      const match = String(row[yearColumn] ?? "").match(/\b(20\d{2})\b/);
      if (match) return match[1];
    }

    return "";
  }, [fileName, selectedSheet, detections, rows]);

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

  const exactMembers = memberMatches.filter(
    (item) => item.status === "exact"
  ).length;

  const suggestedMembers = memberMatches.filter(
    (item) => item.status === "suggestion"
  ).length;

  const missingMembers = memberMatches.filter(
    (item) => item.status === "missing"
  ).length;

  const exactRubrics = rubricMatches.filter(
    (item) => item.status === "exact"
  ).length;

  const suggestedRubrics = rubricMatches.filter(
    (item) => item.status === "suggestion"
  ).length;

  const missingRubrics = rubricMatches.filter(
    (item) => item.status === "missing"
  ).length;

  const blockingErrors = useMemo(() => {
    const messages: string[] = [];

    if (!memberColumn) messages.push("Colonne membre non reconnue.");
    if (!monthColumn) messages.push("Colonne mois non reconnue.");
    if (rubricColumns.length === 0) messages.push("Aucune rubrique reconnue.");
    if (!activeYear) messages.push("Année non détectée.");
    if (missingMembers > 0) {
      messages.push(`${missingMembers} membre(s) sans correspondance.`);
    }

    return messages;
  }, [
    memberColumn,
    monthColumn,
    rubricColumns.length,
    activeYear,
    missingMembers,
  ]);

  function resetFile() {
    setFileName("");
    setFileSize(0);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setHeaders([]);
    setRows([]);
    setHeaderRow(null);
    setManualYear("");
    setExistingCount(0);
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
    setHeaderRow(parsed.headerIndex + 1);
    setManualYear("");
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
        title="Assistant d'import"
        subtitle="Premier type disponible : encaissements."
        padding="md"
      >
        <div className="rounded-[20px] border border-emerald-500 bg-emerald-50 p-5">
          <p className="text-base font-semibold text-slate-900">
            Encaissements
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Import des contributions mensuelles des membres, ventilées par rubrique.
          </p>
        </div>
      </SectionCard>

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
            title="Lecture du classeur"
            subtitle="Vous pouvez corriger la feuille et l'année avant de poursuivre."
            padding="md"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Feuille à analyser
                </span>

                <select
                  value={selectedSheet}
                  onChange={(event) => {
                    if (workbook) loadSheet(workbook, event.target.value);
                  }}
                  className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  {sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

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

                <span className="mt-2 block text-xs text-slate-500">
                  {manualYear
                    ? "Année saisie manuellement."
                    : detectedYear
                      ? "Année détectée automatiquement."
                      : "Année non détectée."}
                </span>
              </label>

              <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Encaissements existants
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {loadingExisting ? "..." : existingCount}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Pour l'année {activeYear || "-"}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Correspondance des membres"
            subtitle="Les noms du fichier sont comparés aux membres existants."
            padding="md"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                      Nom dans le fichier
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                      Correspondance ASF-NTOL
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                      Confiance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {memberMatches.map((item) => (
                    <tr key={item.source}>
                      <td className="rounded-l-[12px] border border-r-0 border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700">
                        {item.source}
                      </td>

                      <td className="border-y border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                        {item.target?.nom_complet || "Aucune correspondance"}
                      </td>

                      <td className="rounded-r-[12px] border border-l-0 border-slate-200 bg-white px-3 py-3 text-sm">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            item.score >= 95
                              ? "bg-emerald-100 text-emerald-700"
                              : item.score >= 80
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700",
                          ].join(" ")}
                        >
                          {item.score} %
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Correspondance des rubriques"
            subtitle="Les colonnes financières du fichier sont comparées aux rubriques existantes."
            padding="md"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                      Rubrique dans le fichier
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                      Correspondance ASF-NTOL
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                      Confiance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rubricMatches.map((item) => (
                    <tr key={item.source}>
                      <td className="rounded-l-[12px] border border-r-0 border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700">
                        {item.source}
                      </td>

                      <td className="border-y border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                        {item.target?.nom || "À créer après validation"}
                      </td>

                      <td className="rounded-r-[12px] border border-l-0 border-slate-200 bg-white px-3 py-3 text-sm">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            item.score >= 95
                              ? "bg-emerald-100 text-emerald-700"
                              : item.score >= 80
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700",
                          ].join(" ")}
                        >
                          {item.score} %
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Rapport de simulation"
            subtitle="Aucune donnée n'est encore écrite dans la base."
            padding="md"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Année", activeYear || "-"],
                ["Lignes du fichier", rows.length],
                ["Mois détectés", monthsCount],
                ["Membres exacts", exactMembers],
                ["Membres suggérés", suggestedMembers],
                ["Membres inconnus", missingMembers],
                ["Rubriques exactes", exactRubrics],
                ["Rubriques suggérées", suggestedRubrics],
                ["Rubriques à créer", missingRubrics],
                ["Données à remplacer", existingCount],
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

              <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
                <p className="text-sm text-slate-500">
                  Montant total du fichier
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-700">
                  {formatFcfa(total)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 p-5">
              {blockingErrors.length === 0 ? (
                <p className="text-sm font-medium text-emerald-700">
                  Simulation terminée sans erreur bloquante.
                </p>
              ) : (
                <div className="space-y-2">
                  {blockingErrors.map((message) => (
                    <p
                      key={message}
                      className="text-sm font-medium text-red-700"
                    >
                      • {message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Aperçu des données"
            subtitle="Les dix premières lignes de la feuille sont affichées."
            padding="md"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-700"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.slice(0, 10).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-slate-100"
                    >
                      {headers.map((header) => (
                        <td
                          key={`${rowIndex}-${header}`}
                          className="whitespace-nowrap px-3 py-3 text-slate-600"
                        >
                          {String(row[header] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}