import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
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

export async function GET(
  _request: Request,
  contextParams: { params: Promise<{ id: string }> }
) {
  try {
    const params = await contextParams.params;
    const demandeId = String(params?.id || "").trim();

    if (!demandeId) {
      return NextResponse.json(
        { success: false, message: "Identifiant de demande manquant." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: userError?.message || "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const userContext = await getUserContext(user);

    if (!userContext?.success || !userContext.membreId) {
      return NextResponse.json(
        {
          success: false,
          message: userContext?.message || "Contexte utilisateur introuvable.",
        },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: demande, error } = await supabaseAdmin
      .from("demandes_prets")
      .select("*")
      .eq("id", demandeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!demande) {
      return NextResponse.json(
        {
          success: false,
          message: "Demande de prêt introuvable.",
        },
        { status: 404 }
      );
    }

    const bureau = isBureauRole(userContext.role);
    const proprietaire = String(demande.membre_id || "") === String(userContext.membreId || "");

    if (!bureau && !proprietaire) {
      return NextResponse.json(
        {
          success: false,
          message: "Accès refusé à cette demande.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: demande,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur lors du chargement de la demande de prêt.",
      },
      { status: 500 }
    );
  }
}
