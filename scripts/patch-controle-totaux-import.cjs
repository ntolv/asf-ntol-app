const fs = require("fs");

const pagePath = "./src/app/(dashboard)/admin/import-export/page.tsx";
let source = fs.readFileSync(pagePath, "utf8");

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Bloc introuvable : ${label}`);
  }
  source = source.replace(search, replacement);
}

const oldParseNumber = `function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(
    String(value ?? "")
      .replace(/\\s/g, "")
      .replace(/[^\\d,.-]/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}`;

const newParseNumber = `function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  let text = String(value ?? "")
    .replace(/\\u00a0/g, " ")
    .replace(/[^\\d,.-]/g, "")
    .trim();

  if (!text) return 0;

  const commaCount = (text.match(/,/g) || []).length;
  const dotCount = (text.match(/\\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");

    if (lastComma > lastDot) {
      text = text.replace(/\\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (commaCount > 0) {
    const parts = text.split(",");

    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      text = parts.join("");
    } else {
      text = text.replace(",", ".");
    }
  } else if (dotCount > 0) {
    const parts = text.split(".");

    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      text = parts.join("");
    }
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}`;

replaceOnce(oldParseNumber, newParseNumber, "parseNumber");

const oldTotalRole = `  if (/(^| )(total|montant total)( |$)/.test(value)) return "Total";`;
const newTotalRole = `  if (
    /(^| )(total|montant total|total du mois|total mensuel)( |$)/.test(value)
  ) {
    return "Total";
  }`;

replaceOnce(oldTotalRole, newTotalRole, "détection colonne total");

const totalMemoMarker = `  const total = useMemo(() => {
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
  }, [rows, totalColumn, rubricColumns]);`;

const totalMemoReplacement = `  const total = useMemo(() => {
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

  const lineInconsistencies = useMemo(() => {
    if (!totalColumn) return [];

    return rows.flatMap((row, index) => {
      const declaredTotal = parseNumber(row[totalColumn]);
      const calculatedTotal = rubricColumns.reduce(
        (sum, column) => sum + parseNumber(row[column]),
        0
      );

      const difference = calculatedTotal - declaredTotal;

      if (Math.abs(difference) < 0.5) {
        return [];
      }

      return [
        {
          rowNumber: index + 2,
          member: memberColumn
            ? String(row[memberColumn] ?? "").trim() || "Membre non renseigné"
            : "Membre non renseigné",
          month: monthColumn
            ? String(row[monthColumn] ?? "").trim() || "Mois non renseigné"
            : "Mois non renseigné",
          declaredTotal,
          calculatedTotal,
          difference,
        },
      ];
    });
  }, [rows, totalColumn, rubricColumns, memberColumn, monthColumn]);`;

replaceOnce(totalMemoMarker, totalMemoReplacement, "contrôle cohérence lignes");

const oldValidationReady = `    (rubricsToCreate.length === 0 || confirmCreateRubrics) &&
    (existingCount === 0 || confirmReplaceYear);`;

const newValidationReady = `    (rubricsToCreate.length === 0 || confirmCreateRubrics) &&
    (existingCount === 0 || confirmReplaceYear) &&
    Boolean(totalColumn) &&
    lineInconsistencies.length === 0;`;

replaceOnce(oldValidationReady, newValidationReady, "validationReady");

const oldSummaryGridItem = `                ["Données remplacées", existingCount],`;

const newSummaryGridItem = `                ["Données remplacées", existingCount],
                ["Lignes incohérentes", lineInconsistencies.length],`;

replaceOnce(oldSummaryGridItem, newSummaryGridItem, "résumé incohérences");

const oldWarnings = `                  {existingCount > 0 && !confirmReplaceYear ? (
                    <p>• Le remplacement des données existantes doit être confirmé.</p>
                  ) : null}`;

const newWarnings = `                  {existingCount > 0 && !confirmReplaceYear ? (
                    <p>• Le remplacement des données existantes doit être confirmé.</p>
                  ) : null}

                  {!totalColumn ? (
                    <p>• La colonne « Total du mois » n'a pas été reconnue.</p>
                  ) : null}

                  {lineInconsistencies.length > 0 ? (
                    <p>
                      • {lineInconsistencies.length} ligne(s) présentent un écart
                      entre la somme des rubriques et le total du mois.
                    </p>
                  ) : null}`;

replaceOnce(oldWarnings, newWarnings, "messages blocage");

const sectionMarker = `          <SectionCard
            title="Résumé avant import"`;

if (!source.includes('title="Contrôle des totaux mensuels"')) {
  const coherenceSection = `          <SectionCard
            title="Contrôle des totaux mensuels"
            subtitle="La somme des rubriques de chaque ligne doit correspondre au Total du mois."
            padding="md"
          >
            {!totalColumn ? (
              <div className="rounded-[16px] border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  La colonne « Total du mois » n'a pas été reconnue.
                </p>
              </div>
            ) : lineInconsistencies.length === 0 ? (
              <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  Toutes les lignes sont cohérentes. Montant total du fichier :
                  {" "}{formatFcfa(total)}.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-[16px] border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700">
                    {lineInconsistencies.length} incohérence(s) détectée(s).
                    L'import est bloqué.
                  </p>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                          Ligne
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                          Membre
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                          Mois
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-400">
                          Total du mois
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-400">
                          Somme rubriques
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-400">
                          Écart
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {lineInconsistencies.slice(0, 100).map((item) => (
                        <tr key={item.rowNumber}>
                          <td className="rounded-l-[12px] border border-r-0 border-red-200 bg-white px-3 py-3 text-sm text-slate-700">
                            {item.rowNumber}
                          </td>
                          <td className="border-y border-red-200 bg-white px-3 py-3 text-sm text-slate-700">
                            {item.member}
                          </td>
                          <td className="border-y border-red-200 bg-white px-3 py-3 text-sm text-slate-700">
                            {item.month}
                          </td>
                          <td className="border-y border-red-200 bg-white px-3 py-3 text-right text-sm text-slate-700">
                            {formatFcfa(item.declaredTotal)}
                          </td>
                          <td className="border-y border-red-200 bg-white px-3 py-3 text-right text-sm text-slate-700">
                            {formatFcfa(item.calculatedTotal)}
                          </td>
                          <td className="rounded-r-[12px] border border-l-0 border-red-200 bg-white px-3 py-3 text-right text-sm font-semibold text-red-700">
                            {formatFcfa(item.difference)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {lineInconsistencies.length > 100 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Seules les 100 premières incohérences sont affichées.
                  </p>
                ) : null}
              </>
            )}
          </SectionCard>

`;

  replaceOnce(
    sectionMarker,
    coherenceSection + sectionMarker,
    "section contrôle totaux"
  );
}

fs.writeFileSync(pagePath, source, "utf8");
console.log("Contrôle des totaux mensuels ajouté.");