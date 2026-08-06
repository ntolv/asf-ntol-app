const fs = require("fs");

const sidebarPath = "./src/components/ui/AppSidebar.tsx";
const topBarPath = "./src/components/ui/AppTopBar.tsx";

let sidebar = fs.readFileSync(sidebarPath, "utf8");

if (!sidebar.includes('/admin/import-export')) {
  const pattern =
    /^(\s*\{\s*href:\s*["']\/admin\/notifications["'][^\r\n]*\},?\s*)$/m;

  if (!pattern.test(sidebar)) {
    throw new Error(
      "Entrée /admin/notifications introuvable dans AppSidebar.tsx"
    );
  }

  sidebar = sidebar.replace(
    pattern,
    `$1
  { href: "/admin/import-export", label: "Import / Export", icon: "\\uD83D\\uDCE5", section: "admin" },`
  );

  fs.writeFileSync(sidebarPath, sidebar, "utf8");
}

let topBar = fs.readFileSync(topBarPath, "utf8");

if (!topBar.includes('"/admin/import-export"')) {
  const pattern =
    /^(\s*["']\/admin\/roles["']\s*:\s*["'][^"']+["']\s*,?\s*)$/m;

  if (!pattern.test(topBar)) {
    throw new Error(
      "Entrée /admin/roles introuvable dans AppTopBar.tsx"
    );
  }

  topBar = topBar.replace(
    pattern,
    `$1
  "/admin/import-export": "Import / Export",`
  );

  fs.writeFileSync(topBarPath, topBar, "utf8");
}

console.log("Menu Import / Export ajouté sans altération UTF-8.");