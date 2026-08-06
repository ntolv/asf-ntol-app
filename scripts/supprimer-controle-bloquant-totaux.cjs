const fs = require("fs");

const pagePath = "./src/app/(dashboard)/admin/import-export/page.tsx";
let source = fs.readFileSync(pagePath, "utf8");

/*
 * 1. Le contrôle des totaux ne doit plus bloquer l'import.
 */
source = source.replace(
  `    (existingCount === 0 || confirmReplaceYear) &&
    Boolean(totalColumn) &&
    lineInconsistencies.length === 0;`,
  `    (existingCount === 0 || confirmReplaceYear);`
);

/*
 * 2. Retirer les messages bloquants liés à Total du mois.
 */
source = source.replace(
  `
                  {!totalColumn ? (
                    <p>• La colonne « Total du mois » n'a pas été reconnue.</p>
                  ) : null}

                  {lineInconsistencies.length > 0 ? (
                    <p>
                      • {lineInconsistencies.length} ligne(s) présentent un écart
                      entre la somme des rubriques et le total du mois.
                    </p>
                  ) : null}`,
  ``
);

/*
 * 3. Retirer la carte "Lignes incohérentes" du résumé.
 */
source = source.replace(
  `
                ["Lignes incohérentes", lineInconsistencies.length],`,
  ``
);

/*
 * 4. Retirer entièrement le bloc visuel "Contrôle des totaux mensuels".
 */
const startMarker = `          <SectionCard
            title="Contrôle des totaux mensuels"`;

const endMarker = `          <SectionCard
            title="Résumé avant import"`;

const startIndex = source.indexOf(startMarker);
const endIndex = source.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
  source =
    source.slice(0, startIndex) +
    source.slice(endIndex);
}

/*
 * Le calcul du montant affiché reste inchangé :
 * - colonne Total si elle est reconnue ;
 * - sinon somme des rubriques.
 */

fs.writeFileSync(pagePath, source, "utf8");
console.log("Contrôle bloquant des totaux supprimé.");