"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import ActionButton from "@/components/ui/ActionButton";

type ExcelRow = Record<string, string | number | boolean | null>;

type Membre = {
  id: string;
  nom_complet: string;
};

type Match = {
  source: string;
  memberId: string;
  score: number;
};

const MONTHS = new Map<string, number>([
  ["janvier", 1], ["janv", 1], ["jan", 1],
  ["fevrier", 2], ["fevr", 2], ["fev", 2],
  ["mars", 3],
  ["avril", 4], ["avr", 4],
  ["mai", 5],
  ["juin", 6],
  ["juillet", 7], ["juil", 7],
  ["aout", 8],
  ["septembre", 9], ["sept", 9],
  ["octobre", 10], ["oct", 10],
  ["novembre", 11], ["nov", 11],
  ["decembre", 12], ["dec", 12],
]);

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const cleaned = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!cleaned) return 0;

  const normalized =
    cleaned.includes(",") && !cleaned.includes(".")
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(/,/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMonth(value: unknown) {
  const text = normalize(value);
  if (MONTHS.has(text)) return MONTHS.get(text) ?? null;

  const number = Number(text);
  return Number.isInteger(number) && number >= 1 && number <= 12 ? number : null;
}

function similarity(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);

  if (!left || !right) return 0;
  if (left === right) return 100;

  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const common = [...leftTokens].filter((token) => rightTokens.has(token)).length;

  if (common > 0) {
    return Math.round(
      (common / Math.max(leftTokens.size, rightTokens.size)) * 100
    );
  }

  return 0;
}

function findHeaderRow(matrix: unknown[][]) {
  let bestIndex = 0;
  let bestScore = -1;

  matrix.slice(0, 20).forEach((row, index) => {
    const values = row.map(normalize).filter(Boolean);
    let score = values.length;

    if (values.some((value) => value.includes("mois"))) score += 5;
    if (values.some((value) => value.includes("gagnant"))) score += 5;
    if (values.some((value) => value.includes("montant"))) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
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
  const headers = (nonEmpty[headerIndex] ?? []).map((value, index) =>
    String(value ?? "").trim() || `Colonne ${index + 1}`
  );

  const rows: ExcelRow[] = [];

  for (let index = headerIndex + 1; index < nonEmpty.length; index += 1) {
    const source = nonEmpty[index] ?? [];
    const record: ExcelRow = {};

    headers.forEach((header, columnIndex) => {
      record[header] = (source[columnIndex] ?? null) as ExcelRow[string];
    });

    rows.push(record);
  }

  return { headers, rows };
}

function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} FCFA`;
}

export default function ImportTontineGagnantsPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [membres, setMembres] = useState<Membre[]>([]);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [pendingSheet, setPendingSheet] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [year, setYear] = useState("");
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [existingWinners, setExistingWinners] = useState(0);
  const [existingDecaissements, setExistingDecaissements] = useState(0);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMembers() {
      const response = await fetch("/api/imputations/form-data", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        setError(result?.message || "Impossible de charger les membres");
        return;
      }

      setMembres(result.membres ?? []);
    }

    void loadMembers();
  }, []);

  const monthColumn = useMemo(
    () => headers.find((header) => normalize(header).includes("mois")) ?? "",
    [headers]
  );

  const winnerColumn = useMemo(
    () =>
      headers.find((header) => {
        const value = normalize(header);
        return value.includes("gagnant") || value.includes("vainqueur");
      }) ?? "",
    [headers]
  );

  const amountColumn = useMemo(
    () =>
      headers.find((header) => {
        const value = normalize(header);
        return value.includes("montant") && value.includes("recu");
      }) ?? "",
    [headers]
  );

  const validRows = useMemo(() => {
    if (!monthColumn || !winnerColumn || !amountColumn) return [];

    return rows.flatMap((row) => {
      const month = parseMonth(row[monthColumn]);
      const winner = String(row[winnerColumn] ?? "").trim();
      const amount = parseAmount(row[amountColumn]);

      if (!month || !winner || amount <= 0) return [];
      if (normalize(winner).includes("total tontines")) return [];

      return [{ month, winner, amount }];
    });
  }, [rows, monthColumn, winnerColumn, amountColumn]);

  const uniqueWinners = useMemo(
    () =>
      Array.from(new Set(validRows.map((row) => row.winner))).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [validRows]
  );

  useEffect(() => {
    setMatches((current) => {
      const next: Record<string, Match> = {};

      for (const winner of uniqueWinners) {
        if (current[winner]) {
          next[winner] = current[winner];
          continue;
        }

        let bestMemberId = "";
        let bestScore = 0;

        for (const member of membres) {
          const score = similarity(winner, member.nom_complet);

          if (score > bestScore) {
            bestScore = score;
            bestMemberId = member.id;
          }
        }

        next[winner] = {
          source: winner,
          memberId: bestScore >= 65 ? bestMemberId : "",
          score: bestScore,
        };
      }

      return next;
    });
  }, [uniqueWinners, membres]);

  useEffect(() => {
    async function checkExisting() {
      if (year.length !== 4) {
        setExistingWinners(0);
        setExistingDecaissements(0);
        return;
      }

      const response = await fetch(
        `/api/admin/import-export/tontine-gagnants?year=${encodeURIComponent(year)}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        setError(result?.message || "Impossible de vérifier les données existantes");
        return;
      }

      setExistingWinners(Number(result.winners_count ?? 0));
      setExistingDecaissements(Number(result.decaissements_count ?? 0));
    }

    void checkExisting();
  }, [year]);

  const unresolved = uniqueWinners.filter(
    (winner) => !matches[winner]?.memberId
  );

  const total = validRows.reduce((sum, row) => sum + row.amount, 0);

  const ready =
    validRows.length > 0 &&
    year.length === 4 &&
    unresolved.length === 0 &&
    ((existingWinners === 0 && existingDecaissements === 0) || confirmReplace);

  function loadSheet(nextWorkbook: XLSX.WorkBook, name: string) {
    const sheet = nextWorkbook.Sheets[name];
    if (!sheet) throw new Error("Feuille introuvable");

    const parsed = parseSheet(sheet);

    setSelectedSheet(name);
    setPendingSheet("");
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setReport(null);
    setError("");

    const detectedYear = `${fileName} ${name}`.match(/\b(20\d{2})\b/)?.[1];
    if (detectedYear) setYear(detectedYear);
  }

  async function processFile(file: File) {
    setError("");
    setReport(null);

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!extension || !["xlsx", "xls"].includes(extension)) {
      setError("Sélectionnez un fichier .xlsx ou .xls");
      return;
    }

    const buffer = await file.arrayBuffer();
    const nextWorkbook = XLSX.read(buffer, { type: "array", cellDates: true });

    setFileName(file.name);
    setWorkbook(nextWorkbook);
    setSheetNames(nextWorkbook.SheetNames);
    setRows([]);
    setHeaders([]);
    setSelectedSheet("");

    const detectedYear = file.name.match(/\b(20\d{2})\b/)?.[1];
    if (detectedYear) setYear(detectedYear);

    if (nextWorkbook.SheetNames.length === 1) {
      loadSheet(nextWorkbook, nextWorkbook.SheetNames[0]);
    }
  }

  async function executeImport() {
    if (!ready) return;

    setImporting(true);
    setProgress(20);
    setReport(null);
    setError("");

    try {
      const importRows = validRows.map((row) => ({
        month: row.month,
        member_id: matches[row.winner].memberId,
        amount: row.amount,
      }));

      setProgress(50);

      const response = await fetch(
        "/api/admin/import-export/tontine-gagnants",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            year: Number(year),
            replace_existing: existingWinners > 0 || existingDecaissements > 0,
            rows: importRows,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Import impossible");
      }

      setProgress(100);
      setReport(result);
    } catch (caught) {
      setProgress(0);
      setError(caught instanceof Error ? caught.message : "Erreur pendant l'import");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import des gagnants de la tontine"
        subtitle="Import historique des gagnants et création automatique des décaissements Tontine."
        size="lg"
      />

      <SectionCard title="Fichier Excel" padding="md">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) void processFile(file);
          }}
        />

        <div
          onDragEnter={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void processFile(file);
          }}
          className={[
            "rounded-[20px] border-2 border-dashed p-8 text-center",
            dragging
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-300 bg-slate-50",
          ].join(" ")}
        >
          <p className="text-lg font-semibold text-slate-900">
            {fileName || "Déposer le fichier Excel"}
          </p>

          <div className="mx-auto mt-5 max-w-xs">
            <ActionButton
              variant="outline"
              size="md"
              fullWidth
              onClick={() => inputRef.current?.click()}
            >
              Parcourir...
            </ActionButton>
          </div>
        </div>
      </SectionCard>

      {fileName && sheetNames.length > 1 && rows.length === 0 ? (
        <SectionCard
          title="Choix de la feuille"
          subtitle="Sélection obligatoire avant l'analyse."
          padding="md"
        >
          <div className="max-w-xl">
            <select
              value={pendingSheet}
              onChange={(event) => setPendingSheet(event.target.value)}
              className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
            >
              <option value="">Choisir une feuille</option>
              {sheetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <div className="mt-4 max-w-xs">
              <ActionButton
                variant="primary"
                size="md"
                fullWidth
                disabled={!pendingSheet}
                onClick={() => {
                  if (workbook && pendingSheet) loadSheet(workbook, pendingSheet);
                }}
              >
                Analyser cette feuille
              </ActionButton>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {rows.length > 0 ? (
        <>
          <SectionCard title="Analyse du fichier" padding="md">
            <div className="grid gap-4 md:grid-cols-4">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Année
                </span>
                <input
                  value={year}
                  onChange={(event) =>
                    setYear(event.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="w-full rounded-[12px] border border-slate-300 px-4 py-3"
                />
              </label>

              <div className="rounded-[16px] border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Gagnants à importer</p>
                <p className="mt-2 text-3xl font-bold">{validRows.length}</p>
              </div>

              <div className="rounded-[16px] border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Montant total</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {formatFcfa(total)}
                </p>
              </div>

              <div className="rounded-[16px] border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Données existantes</p>
                <p className="mt-2 text-sm font-semibold">
                  {existingWinners} gagnant(s), {existingDecaissements} décaissement(s)
                </p>
              </div>
            </div>

            {!monthColumn || !winnerColumn || !amountColumn ? (
              <div className="mt-4 rounded-[16px] border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  Colonnes attendues : Mois, Gagnant(e), Montant reçu (FCFA).
                </p>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Correspondance des gagnants"
            subtitle="Associez chaque nom du fichier à un membre existant."
            padding="md"
          >
            <div className="space-y-3">
              {uniqueWinners.map((winner) => (
                <div
                  key={winner}
                  className="grid gap-3 rounded-[16px] border border-slate-200 p-4 md:grid-cols-2"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{winner}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Confiance automatique : {matches[winner]?.score ?? 0} %
                    </p>
                  </div>

                  <select
                    value={matches[winner]?.memberId ?? ""}
                    onChange={(event) =>
                      setMatches((current) => ({
                        ...current,
                        [winner]: {
                          source: winner,
                          memberId: event.target.value,
                          score: current[winner]?.score ?? 0,
                        },
                      }))
                    }
                    className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Choisir un membre</option>
                    {membres.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.nom_complet}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </SectionCard>

          {(existingWinners > 0 || existingDecaissements > 0) ? (
            <SectionCard title="Remplacement de l'année" padding="md">
              <label className="flex items-start gap-3 rounded-[16px] border border-amber-200 bg-amber-50 p-4">
                <input
                  type="checkbox"
                  checked={confirmReplace}
                  onChange={(event) => setConfirmReplace(event.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm font-medium text-amber-800">
                  Je confirme le remplacement des gagnants {year} et des décaissements
                  Tontine créés par un import précédent.
                </span>
              </label>
            </SectionCard>
          ) : null}

          <SectionCard title="Lancer l'import" padding="md">
            <div className="max-w-sm">
              <ActionButton
                variant="primary"
                size="md"
                fullWidth
                disabled={!ready || importing}
                onClick={() => void executeImport()}
              >
                {importing ? "Import en cours..." : "Importer les gagnants"}
              </ActionButton>
            </div>

            {importing || progress > 0 ? (
              <div className="mt-4">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-[16px] border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            ) : null}

            {report ? (
              <div className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-lg font-bold text-emerald-800">Import terminé</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <p><strong>Année :</strong> {report.year}</p>
                  <p><strong>Gagnants :</strong> {report.imported_winners}</p>
                  <p><strong>Décaissements :</strong> {report.created_decaissements}</p>
                  <p><strong>Total :</strong> {formatFcfa(Number(report.total_amount ?? 0))}</p>
                </div>
              </div>
            ) : null}
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}