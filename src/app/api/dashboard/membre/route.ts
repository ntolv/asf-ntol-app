import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

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

    if (userError) {
      return NextResponse.json(
        {
          success: false,
          message: userError.message || "Erreur récupération utilisateur",
          data: {
            rubriques: [],
            financement: null,
          },
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Utilisateur non connecté",
          data: {
            rubriques: [],
            financement: null,
          },
        },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json(
        {
          success: false,
          message: context?.message || "Erreur contexte utilisateur",
          data: {
            rubriques: [],
            financement: null,
          },
        },
        { status: 200 }
      );
    }

    const membreId = context.membreId;

    if (!membreId) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucun membre lié à l'utilisateur connecté",
          data: {
            rubriques: [],
            financement: null,
          },
        },
        { status: 200 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data: rubriques, error: rubriquesError } = await supabaseAdmin
      .from("v_dashboard_membre_rubriques")
      .select("*")
      .eq("membre_id", membreId)
      .order("rubrique_nom", { ascending: true });

    if (rubriquesError) {
      throw rubriquesError;
    }

    const { data: financement, error: financementError } = await supabaseAdmin
      .from("v_dashboard_membre_aides_prets")
      .select("*")
      .eq("membre_id", membreId)
      .maybeSingle();

    if (financementError) {
      throw financementError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Dashboard membre chargé",
        data: {
          rubriques: rubriques ?? [],
          financement: financement ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur serveur dashboard membre",
        data: {
          rubriques: [],
          financement: null,
        },
      },
      { status: 500 }
    );
  }
}
