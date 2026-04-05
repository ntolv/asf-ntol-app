import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

export async function POST(request: Request) {
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
        { success: false, error: userError?.message || "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success || !context.membreId) {
      return NextResponse.json(
        { success: false, error: context?.message || "Contexte utilisateur introuvable." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const montant = Number(body?.montant || 0);
    const motif = String(body?.motif || "").trim();

    if (montant <= 0) {
      return NextResponse.json(
        { success: false, error: "Montant invalide." },
        { status: 400 }
      );
    }

    if (!motif) {
      return NextResponse.json(
        { success: false, error: "Motif obligatoire." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { error } = await supabaseAdmin
      .from("demandes_aides")
      .insert({
        membre_id: context.membreId,
        montant_demande: montant,
        motif,
        statut: "EN_ATTENTE",
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Demande d'aide / secours transmise avec succès.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erreur lors de l'envoi de la demande d'aide." },
      { status: 500 }
    );
  }
}
