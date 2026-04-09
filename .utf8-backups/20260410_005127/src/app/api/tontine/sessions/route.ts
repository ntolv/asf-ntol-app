import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ✅ ON UTILISE LA VUE BACKEND (SOURCE DE VÉRITÉ)
    const { data, error } = await supabase
      .from("v_tontine_sessions_disponibles_selection")
      .select("*")
      .order("ordre_session", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sessions = data ?? [];

    // ✅ SESSION ACTIVE = PREMIERE SESSION DISPONIBLE
    const sessionActive =
      sessions.find((s) => s.est_premiere_session_disponible) || null;

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        libelle: s.libelle,
        periode: s.periode_reference,
        ordre_session: s.ordre_session,
        statut_session: s.statut_session,
        statut_encheres: s.statut_encheres,
        est_selectionnable: s.est_selectionnable,
        est_active: s.est_premiere_session_disponible,
      })),
      session_active: sessionActive
        ? {
            id: sessionActive.id,
            libelle: sessionActive.libelle,
            periode: sessionActive.periode_reference,
            ordre_session: sessionActive.ordre_session,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
