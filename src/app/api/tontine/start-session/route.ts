import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { session_id, duree } = await req.json();

    if (!session_id || !duree || Number(duree) <= 0) {
      return NextResponse.json(
        { error: "session_id et duree requis" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("tontine_sessions")
      .update({
        date_debut_encheres: now,
        duree_par_lot_minutes: Number(duree),
        lot_en_cours_index: 1,
        statut_encheres: "EN_COURS",
      })
      .eq("id", session_id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
