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

export async function GET() {
  try {
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
          data: { global: null, rubriques: [], membres: [] },
        },
        { status: 401 }
      );
    }

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

    return NextResponse.json(
      {
        success: true,
        message: "Bilan chargé",
        data: {
          global: global ?? null,
          rubriques: rubriques ?? [],
          membres: membres ?? [],
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
      { status: 500 }
    );
  }
}
