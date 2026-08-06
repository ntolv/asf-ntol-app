const fs = require("fs");

const pagePath = "./src/app/(dashboard)/admin/import-export/page.tsx";
let source = fs.readFileSync(pagePath, "utf8");

if (!source.includes('from "@supabase/supabase-js"')) {
  source = source.replace(
    'import * as XLSX from "xlsx";',
    'import * as XLSX from "xlsx";\nimport { createClient } from "@supabase/supabase-js";'
  );
}

source = source.replace(
  '  const [readyMessage, setReadyMessage] = useState("");',
  `  const [readyMessage, setReadyMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importReport, setImportReport] = useState<{
    imported_count: number;
    deleted_count: number;
    created_rubriques: number;
    year: number;
  } | null>(null);`
);

const marker = '  function resetFile() {';

if (!source.includes("async function executeImport()")) {
  const helper = `
  function parseMonthValue(value: unknown) {
    const normalized = normalize(value);

    if (MONTHS.has(normalized)) {
      return MONTHS.get(normalized) ?? null;
    }

    const numeric = Number(normalized);

    return Number.isInteger(numeric) && numeric >= 1 && numeric <= 12
      ? numeric
      : null;
  }

  async function executeImport() {
    if (!validationReady || !activeYear) return;

    setImporting(true);
    setImportProgress(10);
    setImportReport(null);
    setReadyMessage("");
    setError("");

    try {
      const year = Number(activeYear);

      const importRows = rows.flatMap((row) => {
        const sourceMember = String(row[memberColumn] ?? "").trim();
        const memberDecision = memberDecisions[sourceMember];

        if (
          !memberDecision ||
          memberDecision.mode === "ignore" ||
          !memberDecision.membreId
        ) {
          return [];
        }

        const month = parseMonthValue(row[monthColumn]);

        if (!month) {
          throw new Error(
            \`Mois invalide pour le membre \${sourceMember}\`
          );
        }

        const lignes = rubricColumns.flatMap((rubriqueKey) => {
          const decision = rubricDecisions[rubriqueKey];

          if (!decision || decision.mode === "ignore") {
            return [];
          }

          const montant = parseNumber(row[rubriqueKey]);

          if (!Number.isFinite(montant) || montant <= 0) {
            return [];
          }

          return [{ rubrique_key: rubriqueKey, montant }];
        });

        if (lignes.length === 0) {
          return [];
        }

        return [
          {
            membre_id: memberDecision.membreId,
            date_contribution:
              \`\${year}-\${String(month).padStart(2, "0")}-01\`,
            lignes,
          },
        ];
      });

      const importRubriques = rubricColumns.flatMap((rubriqueKey) => {
        const decision = rubricDecisions[rubriqueKey];

        if (!decision || decision.mode === "ignore") {
          return [];
        }

        if (decision.mode === "create") {
          return [
            {
              key: rubriqueKey,
              nom: rubriqueKey,
              rubrique_id: null,
            },
          ];
        }

        return [
          {
            key: rubriqueKey,
            nom:
              rubriques.find(
                (rubrique) => rubrique.id === decision.rubriqueId
              )?.nom || rubriqueKey,
            rubrique_id: decision.rubriqueId,
          },
        ];
      });

      if (importRows.length === 0) {
        throw new Error("Aucun encaissement valide à importer");
      }

      setImportProgress(30);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error("Configuration Supabase manquante");
      }

      const supabase = createClient(supabaseUrl, anonKey);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session utilisateur introuvable");
      }

      setImportProgress(50);

      const response = await fetch(
        "/api/admin/import-export/contributions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: \`Bearer \${session.access_token}\`,
          },
          body: JSON.stringify({
            year,
            replace_existing: existingCount > 0,
            rows: importRows,
            rubriques: importRubriques,
          }),
        }
      );

      setImportProgress(85);

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "L'import des encaissements a échoué"
        );
      }

      setImportProgress(100);
      setImportReport({
        imported_count: Number(result.imported_count ?? 0),
        deleted_count: Number(result.deleted_count ?? 0),
        created_rubriques: Number(result.created_rubriques ?? 0),
        year: Number(result.year ?? year),
      });

      setReadyMessage("Import terminé avec succès.");
    } catch (caught) {
      setImportProgress(0);
      setError(
        caught instanceof Error
          ? caught.message
          : "Erreur pendant l'import"
      );
    } finally {
      setImporting(false);
    }
  }

`;

  source = source.replace(marker, helper + marker);
}

source = source.replace(
  `                onClick={() =>
                  setReadyMessage(
                    "Validation terminée. L'import réel sera activé dans la prochaine livraison."
                  )
                }`,
  `                onClick={() => void executeImport()}`
);

source = source.replace(
  `              >
                Préparer l'import
              </ActionButton>`,
  `              >
                {importing ? "Import en cours..." : "Importer les encaissements"}
              </ActionButton>`
);

source = source.replace(
  `                disabled={!validationReady}`,
  `                disabled={!validationReady || importing}`
);

const reportMarker = `            {readyMessage ? (
              <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  {readyMessage}
                </p>
              </div>
            ) : null}`;

if (!source.includes("Progression de l'import")) {
  source = source.replace(
    reportMarker,
    `${reportMarker}

            {importing || importProgress > 0 ? (
              <div className="mt-4 rounded-[16px] border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-800">
                    Progression de l'import
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {importProgress} %
                  </p>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: \`\${importProgress}%\` }}
                  />
                </div>
              </div>
            ) : null}

            {importReport ? (
              <div className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-lg font-bold text-emerald-800">
                  Import terminé
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-emerald-700">Année</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {importReport.year}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-emerald-700">
                      Encaissements importés
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {importReport.imported_count}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-emerald-700">
                      Encaissements remplacés
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {importReport.deleted_count}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-emerald-700">
                      Rubriques créées
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {importReport.created_rubriques}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}`
  );
}

fs.writeFileSync(pagePath, source, "utf8");
console.log("Page Import / Export mise à jour.");