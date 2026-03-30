import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("tontine_sessions")
      .select(`
        id,
        libelle,
        periode_reference,
        ordre_session,
        statut_session,
        nb_lots_effectif,
        date_debut_encheres,
        duree_par_lot_minutes,
        lot_en_cours_index,
        statut_encheres,
        montant_depart_enchere_session,
        derniere_enchere_at
      `)
      .order("periode_reference", { ascending: false })
      .order("ordre_session", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const normalized = (data ?? []).map((row) => ({
      id: row.id,
      libelle: row.libelle,
      periode: row.periode_reference,
      ordre_session: row.ordre_session,
      statut_session: row.statut_session,
      nombre_lots: row.nb_lots_effectif,
      date_debut_encheres: row.date_debut_encheres,
      duree_par_lot_minutes: row.duree_par_lot_minutes,
      lot_en_cours_index: row.lot_en_cours_index,
      statut_encheres: row.statut_encheres,
      montant_depart_enchere_session: row.montant_depart_enchere_session,
      derniere_enchere_at: row.derniere_enchere_at,
    }));

    return NextResponse.json(normalized);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
