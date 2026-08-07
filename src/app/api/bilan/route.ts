import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

function isBureauRole(
  role: { code?: string | null; libelle?: string | null } | null | undefined
) {
  const raw = `${role?.code ?? ""} ${role?.libelle ?? ""}`.toLowerCase();

  return (
    raw.includes("admin") ||
    raw.includes("président") ||
    raw.includes("president") ||
    raw.includes("trésorier") ||
    raw.includes("tresorier")
  );
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();

  const authCookie = cookieStore
    .getAll()
    .find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  const authTokenCookie = authCookie?.value;

  if (!authTokenCookie) {
    throw new Error("Cookie d'authentification manquant");
  }

  let accessToken: string | null = null;

  try {
    let session: any;

    if (authTokenCookie.startsWith("base64-")) {
      const encoded = authTokenCookie.replace(/^base64-/, "");
      session = JSON.parse(
        Buffer.from(encoded, "base64").toString("utf8")
      );
    } else {
      session = JSON.parse(atob(authTokenCookie));
    }

    accessToken = session.access_token ?? null;
  } catch {
    throw new Error("Cookie d'authentification invalide");
  }

  if (!accessToken) {
    throw new Error("Access token manquant dans le cookie");
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error(error?.message || "Utilisateur non connecté");
  }

  return data.user;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json(
        {
          success: false,
          message: context?.message || "Contexte utilisateur introuvable.",
          data: null,
        },
        { status: 401 }
      );
    }

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Accès refusé. Page réservée au bureau.",
          data: null,
        },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const url = new URL(request.url);
    const anneeParam = url.searchParams.get("annee");
    const anneeDemandee = anneeParam ? Number(anneeParam) : NaN;

    const { data: anneesRows, error: anneesError } = await supabaseAdmin
      .from("v_bilan_asf_ntol_pro_max")
      .select("annee")
      .order("annee", { ascending: false });

    if (anneesError) throw anneesError;

    const annees = Array.from(
      new Set(
        (anneesRows ?? [])
          .map((row: any) => Number(row.annee))
          .filter((annee) => Number.isFinite(annee))
      )
    ).sort((a, b) => b - a);

    if (annees.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "Aucun exercice disponible.",
          data: {
            annees: [],
            anneeSelectionnee: null,
            bilanPro: null,
            bilanPrecedent: null,
            rubriques: [],
            membres: [],
            membresRubriques: [],
            details: [],
            importsHistoriques: [],
          },
        },
        { status: 200 }
      );
    }

    const anneeSelectionnee =
      Number.isFinite(anneeDemandee) && annees.includes(anneeDemandee)
        ? anneeDemandee
        : annees[0];

    const [
      bilanResult,
      rubriquesResult,
      membresResult,
      membresRubriquesResult,
      detailsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("v_bilan_asf_ntol_pro_max")
        .select("*")
        .eq("annee", anneeSelectionnee)
        .maybeSingle(),

      supabaseAdmin
        .from("v_bilan_rubriques_exercice")
        .select("*")
        .eq("annee", anneeSelectionnee)
        .order("ordre_affichage", { ascending: true }),

      supabaseAdmin
        .from("v_bilan_membres_exercice")
        .select("*")
        .eq("annee", anneeSelectionnee)
        .order("nom_complet", { ascending: true }),

      supabaseAdmin
        .from("v_bilan_membres_rubriques_exercice")
        .select("*")
        .eq("annee", anneeSelectionnee)
        .order("rubrique_nom", { ascending: true })
        .order("nom_complet", { ascending: true }),

      supabaseAdmin
        .from("v_bilan_details_exercice")
        .select("*")
        .eq("annee", anneeSelectionnee)
        .order("date_operation", { ascending: false }),
    ]);

    if (bilanResult.error) throw bilanResult.error;
    if (rubriquesResult.error) throw rubriquesResult.error;
    if (membresResult.error) throw membresResult.error;
    if (membresRubriquesResult.error) throw membresRubriquesResult.error;
    if (detailsResult.error) throw detailsResult.error;

    const bilanPro: any = bilanResult.data ?? null;

    let bilanPrecedent: any = null;

    if (bilanPro?.annee_precedente) {
      const { data, error } = await supabaseAdmin
        .from("v_bilan_asf_ntol_pro_max")
        .select("*")
        .eq("annee", Number(bilanPro.annee_precedente))
        .maybeSingle();

      if (error) throw error;

      bilanPrecedent = data ?? null;
    }

    const details = detailsResult.data ?? [];

    const importsHistoriques = details.filter(
      (row: any) => row.import_historique === true
    );

    const rubriques = rubriquesResult.data ?? [];
    const membresRubriques = membresRubriquesResult.data ?? [];

    const controleRubriques = rubriques.map((rubrique: any) => {
      const lignesMembres = membresRubriques.filter(
        (row: any) => row.rubrique_id === rubrique.rubrique_id
      );

      const entreesMembres = lignesMembres.reduce(
        (sum: number, row: any) => sum + Number(row.total_entrees ?? 0),
        0
      );

      const entreesRubrique = Number(rubrique.total_entrees ?? 0);

      return {
        rubrique_id: rubrique.rubrique_id,
        rubrique_nom: rubrique.rubrique_nom,
        entrees_rubrique: entreesRubrique,
        entrees_membres: entreesMembres,
        ecart_entrees: entreesRubrique - entreesMembres,
        conforme_entrees:
          Math.abs(entreesRubrique - entreesMembres) < 0.01,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Bilan annuel chargé",
        data: {
          annees,
          anneeSelectionnee,
          bilanPro,
          bilanPrecedent,
          rubriques,
          membres: membresResult.data ?? [],
          membresRubriques,
          details,
          importsHistoriques,
          controleRubriques,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erreur GET /api/bilan:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur lors du chargement du bilan.",
        data: null,
      },
      { status: 500 }
    );
  }
}
