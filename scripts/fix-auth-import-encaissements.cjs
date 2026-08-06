const fs = require("fs");

const pagePath = "./src/app/(dashboard)/admin/import-export/page.tsx";
let source = fs.readFileSync(pagePath, "utf8");

source = source.replace(
  '\nimport { createClient } from "@supabase/supabase-js";',
  ""
);

const oldSessionBlock = `      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
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
          body: JSON.stringify({`;

const newSessionBlock = `      setImportProgress(50);

      const response = await fetch(
        "/api/admin/import-export/contributions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({`;

if (!source.includes(oldSessionBlock)) {
  throw new Error("Bloc de session navigateur introuvable dans la page.");
}

source = source.replace(oldSessionBlock, newSessionBlock);

fs.writeFileSync(pagePath, source, "utf8");
console.log("Authentification de l'import corrigée.");