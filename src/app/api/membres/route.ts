import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    // 1. récupérer contexte utilisateur
    const { membreId, role } = await getUserContext();

    // 2. client service (lecture backend)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. récupérer membres
    const { data, error } = await supabase
      .from("v_membres")
      .select(`
        id,
        nom_complet,
        email,
        categorie,
        telephone,
        statut_associatif,
        est_tontineur_defaut,
        actif,
        created_at,
        date_adhesion,
        photo_url,
        photo_storage_path
      `)
      .order("nom_complet", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        membreId,
        role
      }
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erreur serveur" },
      { status: 401 }
    );
  }
}
