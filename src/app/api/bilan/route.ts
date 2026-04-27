import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

function isBureauRole(role: { code?: string | null; libelle?: string | null } | null | undefined) {
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
      session = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
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
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error(error?.message || "Utilisateur non connecté");
  }

  return data.user;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json(
        {
          success: false,
          message: context?.message || "Contexte utilisateur introuvable.",
          data: { global: null, rubriques: [], membres: [] },
        },
        { status: 401 }
      );
    }

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Accès refusé. Page réservée au bureau.",
          data: { global: null, rubriques: [], membres: [] },
        },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: global, error: globalError } = await supabaseAdmin
      .from("v_bilan_general")
      .select("*")
      .maybeSingle();

    if (globalError) throw globalError;

    const { data: rubriques, error: rubriquesError } = await supabaseAdmin
      .from("v_bilan_rubriques")
      .select("*")
      .order("rubrique_nom", { ascending: true });

    if (rubriquesError) throw rubriquesError;

    const { data: membres, error: membresError } = await supabaseAdmin
      .from("v_bilan_membres")
      .select("*")
      .order("nom_complet", { ascending: true });

    if (membresError) throw membresError;

    const { data: bilanPro, error: bilanProError } = await supabaseAdmin
      .from("v_bilan_asf_ntol_pro_max")
      .select("*")
      .maybeSingle();

    if (bilanProError) throw bilanProError;

    const { data: flux, error: fluxError } = await supabaseAdmin
      .from("v_bilan_asf_ntol_flux")
      .select("*")
      .order("type_flux", { ascending: true })
      .order("categorie", { ascending: true });

    if (fluxError) throw fluxError;

    const { data: tontineKpi, error: tontineKpiError } = await supabaseAdmin
      .from("v_tontine_kpi")
      .select("*")
      .maybeSingle();

    if (tontineKpiError) throw tontineKpiError;

    const { data: details, error: detailsError } = await supabaseAdmin
      .from("v_bilan_asf_ntol_details")
      .select("*")
      .order("type_flux", { ascending: true })
      .order("categorie", { ascending: true })
      .order("date_operation", { ascending: false });

    if (detailsError) throw detailsError;

    return NextResponse.json({
      success: true,
        message: "Bilan chargé",
        data: {
          global: global ?? null,
          rubriques: rubriques ?? [],
          membres: membres ?? [],
          bilanPro: bilanPro ?? null,
          flux: flux ?? [],
          tontineKpi: tontineKpi ?? null,
          details: details ?? [],
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur lors du chargement du bilan.",
        data: { global: null, rubriques: [], membres: [] },
      },
      { status: 401 }
    );
  }
}


