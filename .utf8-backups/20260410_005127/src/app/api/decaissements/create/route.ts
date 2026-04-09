import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // 🔐 AUTH (LOGIQUE EXISTANTE — ON NE CHANGE PAS)
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
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Utilisateur non connecté" },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json(
        { success: false, message: context.message },
        { status: 401 }
      );
    }

    const body = await request.json();

    const rubrique_id = body?.rubrique_id;
    const montant = Number(body?.montant || 0);
    const motif = body?.motif || null;
    const membre_id = body?.membre_id || null;

    // 🔒 VALIDATIONS
    if (!rubrique_id) {
      throw new Error("Rubrique obligatoire");
    }

    if (montant <= 0) {
      throw new Error("Montant invalide");
    }

    // 🔐 ADMIN CLIENT
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    // 💸 INSERT DECAISSEMENT
    const { error } = await supabaseAdmin.from("decaissements").insert({
      rubrique_id,
      membre_id,
      montant,
      motif,
      created_by: context.authUserId,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Décaissement enregistré",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Erreur création décaissement",
      },
      { status: 500 }
    );
  }
}
