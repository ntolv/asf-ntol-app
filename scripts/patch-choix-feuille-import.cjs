const fs = require("fs");

const pagePath = "./src/app/(dashboard)/admin/import-export/page.tsx";
let source = fs.readFileSync(pagePath, "utf8");

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Bloc introuvable : ${label}`);
  }

  source = source.replace(search, replacement);
}

if (!source.includes('const [pendingSheet, setPendingSheet]')) {
  replaceOnce(
    '  const [selectedSheet, setSelectedSheet] = useState("");',
    `  const [selectedSheet, setSelectedSheet] = useState("");
  const [pendingSheet, setPendingSheet] = useState("");`,
    "état pendingSheet"
  );
}

if (!source.includes('setPendingSheet("");\n    setHeaders([]);')) {
  replaceOnce(
    `    setSelectedSheet("");
    setHeaders([]);`,
    `    setSelectedSheet("");
    setPendingSheet("");
    setHeaders([]);`,
    "réinitialisation pendingSheet"
  );
}

if (!source.includes('setPendingSheet("");\n    setHeaders(parsed.headers);')) {
  replaceOnce(
    `    setSelectedSheet(name);
    setHeaders(parsed.headers);`,
    `    setSelectedSheet(name);
    setPendingSheet("");
    setHeaders(parsed.headers);`,
    "nettoyage pendingSheet après choix"
  );
}

const oldProcessBlock = `      setFileName(file.name);
      setFileSize(file.size);
      setWorkbook(nextWorkbook);
      setSheetNames(nextWorkbook.SheetNames);

      loadSheet(nextWorkbook, nextWorkbook.SheetNames[0]);`;

const newProcessBlock = `      setFileName(file.name);
      setFileSize(file.size);
      setWorkbook(nextWorkbook);
      setSheetNames(nextWorkbook.SheetNames);
      setReadyMessage("");
      setImportReport(null);
      setImportProgress(0);

      if (nextWorkbook.SheetNames.length === 1) {
        loadSheet(nextWorkbook, nextWorkbook.SheetNames[0]);
      } else {
        setSelectedSheet("");
        setPendingSheet("");
        setHeaders([]);
        setRows([]);
        setManualYear("");
        setExistingCount(0);
        setMemberDecisions({});
        setRubricDecisions({});
        setConfirmCreateRubrics(false);
        setConfirmReplaceYear(false);
      }`;

if (!source.includes('if (nextWorkbook.SheetNames.length === 1)')) {
  replaceOnce(
    oldProcessBlock,
    newProcessBlock,
    "sélection conditionnelle de la feuille"
  );
}

const insertMarker = `      {loadingReference ? (
        <LoadingState`;

if (!source.includes('title="Choix de la feuille"')) {
  const selectionBlock = `      {fileName && sheetNames.length > 1 && rows.length === 0 ? (
        <SectionCard
          title="Choix de la feuille"
          subtitle={\`Ce classeur contient \${sheetNames.length} feuilles. Sélectionnez celle à importer.\`}
          padding="md"
        >
          <div className="max-w-xl">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Feuille à importer
              </span>

              <select
                value={pendingSheet}
                onChange={(event) => setPendingSheet(event.target.value)}
                className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
              >
                <option value="">Choisir une feuille</option>

                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5 max-w-xs">
              <ActionButton
                variant="primary"
                size="md"
                fullWidth
                disabled={!pendingSheet}
                onClick={() => {
                  if (!workbook || !pendingSheet) return;

                  try {
                    loadSheet(workbook, pendingSheet);
                    setError("");
                  } catch (caught) {
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : "Impossible de lire cette feuille."
                    );
                  }
                }}
              >
                Analyser cette feuille
              </ActionButton>
            </div>
          </div>
        </SectionCard>
      ) : null}

`;

  replaceOnce(
    insertMarker,
    selectionBlock + insertMarker,
    "interface de choix de feuille"
  );
}

fs.writeFileSync(pagePath, source, "utf8");
console.log("Choix obligatoire de la feuille ajouté.");