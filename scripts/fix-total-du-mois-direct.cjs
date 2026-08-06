const fs = require("fs");

const pagePath = "./src/app/(dashboard)/admin/import-export/page.tsx";
let source = fs.readFileSync(pagePath, "utf8");

const oldBlock = `  const totalColumn =
    detections.find((item) => item.role === "Total")?.header ?? "";`;

const newBlock = `  const totalColumn =
    headers.find((header) => {
      const value = normalize(header);

      return (
        value === "total du mois fcfa" ||
        value.startsWith("total du mois") ||
        value.includes("total du mois")
      );
    }) ??
    detections.find((item) => item.role === "Total")?.header ??
    "";`;

if (!source.includes(oldBlock)) {
  throw new Error("Bloc totalColumn introuvable.");
}

source = source.replace(oldBlock, newBlock);

fs.writeFileSync(pagePath, source, "utf8");
console.log("Détection directe de « Total du mois (FCFA) » ajoutée.");