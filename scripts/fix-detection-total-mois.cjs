const fs = require("fs");

const pagePath = "./src/app/(dashboard)/admin/import-export/page.tsx";
let source = fs.readFileSync(pagePath, "utf8");

const oldBlock = `  if (
    /(^| )(total|montant total|total du mois|total mensuel)( |$)/.test(value)
  ) {
    return "Total";
  }`;

const newBlock = `  if (
    value === "total" ||
    value.startsWith("total du mois") ||
    value.startsWith("total mensuel") ||
    value.startsWith("montant total") ||
    value.includes("total du mois")
  ) {
    return "Total";
  }`;

if (!source.includes(oldBlock)) {
  throw new Error("Bloc de détection Total introuvable.");
}

source = source.replace(oldBlock, newBlock);

fs.writeFileSync(pagePath, source, "utf8");
console.log("Détection de « Total du mois (FCFA) » corrigée.");