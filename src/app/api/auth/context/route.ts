import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Cookie: cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; "),
          },
        },
      }
    );

    // 🔐 utilisateur connecté
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        message: "Utilisateur non connecté",
        membreId: null,
      });
    }

    // 🔗 lien utilisateur -> membre
    const { data: utilisateur, error: userError } = await supabase
      .from("utilisateurs")
      .select("membre_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (userError || !utilisateur?.membre_id) {
      return NextResponse.json({
        success: false,
        message: "Lien membre introuvable",
        membreId: null,
      });
    }

    // 📦 récupération infos membre
    const { data: membre } = await supabase
      .from("membres")
      .select("id, email, telephone, nom_complet")
      .eq("id", utilisateur.membre_id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      message: "Contexte utilisateur OK",
      authUserId: user.id,
      membreId: utilisateur.membre_id,
      email: membre?.email ?? null,
      telephone: membre?.telephone ?? null,
      nom: membre?.nom_complet ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || "Erreur contexte utilisateur",
      membreId: null,
    });
  }
}