const fs = require("fs");

const sidebarPath = "./src/components/ui/AppSidebar.tsx";
const topBarPath = "./src/components/ui/AppTopBar.tsx";

let sidebar = fs.readFileSync(sidebarPath, "utf8");

if (!sidebar.includes('/admin/import-export/tontine-gagnants')) {
  const marker = /^(\s*\{\s*href:\s*["']\/admin\/import-export["'][^\r\n]*\},?\s*)$/m;

  if (!marker.test(sidebar)) {
    throw new Error("Entrée /admin/import-export introuvable dans AppSidebar.tsx");
  }

  sidebar = sidebar.replace(
    marker,
    `$1
  { href: "/admin/import-export/tontine-gagnants", label: "Import gagnants tontine", icon: "🏆", section: "admin" },`
  );

  fs.writeFileSync(sidebarPath, sidebar, "utf8");
}

let topBar = fs.readFileSync(topBarPath, "utf8");

if (!topBar.includes('"/admin/import-export/tontine-gagnants"')) {
  const marker = /^(\s*["']\/admin\/import-export["']\s*:\s*["'][^"']+["']\s*,?\s*)$/m;

  if (!marker.test(topBar)) {
    throw new Error("Entrée /admin/import-export introuvable dans AppTopBar.tsx");
  }

  topBar = topBar.replace(
    marker,
    `$1
  "/admin/import-export/tontine-gagnants": "Import gagnants tontine",`
  );

  fs.writeFileSync(topBarPath, topBar, "utf8");
}

console.log("Navigation Import gagnants tontine ajoutée.");