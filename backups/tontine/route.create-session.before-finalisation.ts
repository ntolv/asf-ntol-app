import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: cycle, error: cycleError } = await supabase
      .from("tontine_cycles")
      .select("id")
      .eq("actif", true)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json(
        { error: "Pas de cycle actif" },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("tontine_sessions")
      .insert({
        cycle_id: cycle.id,
        libelle: body.libelle,
        periode_reference: body.periode,
        ordre_session: body.ordre_session,
        statut_session: "OUVERTE",
        mise_brute_session: body.mise,
        nb_lots_effectif: body.nb_lots
      })
      .select()
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || "Erreur création session" },
        { status: 500 }
      );
    }

    const nbLots = Number(body.nb_lots || 0);
    const mise = Number(body.mise || 0);

    const lots = Array.from({ length: nbLots }, (_, index) => ({
      session_id: session.id,
      numero_lot: index + 1,
      libelle: `Lot ${index + 1}`,
      montant_depart_enchere: 0,
      mise_brute_lot: mise,
      statut_lot: "OUVERT",
      montant_total_relances: 0,
      gain_reel: mise
    }));

    if (lots.length > 0) {
      const { error: lotsError } = await supabase
        .from("tontine_lots")
        .insert(lots);

      if (lotsError) {
        return NextResponse.json(
          { error: lotsError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      session_id: session.id,
      nb_lots: nbLots
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}


