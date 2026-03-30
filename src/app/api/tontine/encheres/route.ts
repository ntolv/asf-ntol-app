import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lot_id = searchParams.get("lot_id");

  if (!lot_id) {
    return NextResponse.json({ error: "lot_id requis" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("v_tontine_encheres")
    .select("*")
    .eq("lot_id", lot_id)
    .order("montant_total_offert", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const lot_id = body.lot_id as string;
    const membre_id = body.membre_id as string;
    const montant_relance = Number(body.montant_relance || 0);

    if (!lot_id || !membre_id || montant_relance <= 0) {
      return NextResponse.json(
        { error: "lot_id, membre_id et montant_relance sont requis" },
        { status: 400 }
      );
    }

    const { data: membreData, error: membreError } = await supabase
      .from("membres")
      .select("id")
      .eq("id", membre_id)
      .maybeSingle();

    if (membreError || !membreData?.id) {
      return NextResponse.json(
        { error: membreError?.message || "Membre introuvable" },
        { status: 404 }
      );
    }

    const { data: lot, error: lotError } = await supabase
      .from("tontine_lots")
      .select("*")
      .eq("id", lot_id)
      .single();

    if (lotError || !lot) {
      return NextResponse.json(
        { error: lotError?.message || "Lot introuvable" },
        { status: 404 }
      );
    }

    if (lot.statut_lot !== "OUVERT" && lot.statut_lot !== "EN_COURS") {
      return NextResponse.json(
        { error: "Ce lot n'accepte pas d'enchères" },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("tontine_sessions")
      .select("*")
      .eq("id", lot.session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || "Session introuvable" },
        { status: 404 }
      );
    }

    const { data: dejaGagnant } = await supabase
      .from("tontine_gagnants")
      .select("id")
      .eq("cycle_id", session.cycle_id)
      .eq("membre_id", membre_id)
      .maybeSingle();

    if (dejaGagnant?.id) {
      return NextResponse.json(
        { error: "Ce membre a déjà gagné dans ce cycle" },
        { status: 400 }
      );
    }

    const { data: best } = await supabase
      .from("tontine_encheres")
      .select("montant_total_offert")
      .eq("lot_id", lot_id)
      .order("montant_total_offert", { ascending: false })
      .limit(1)
      .maybeSingle();

    const base = Number(best?.montant_total_offert ?? lot.montant_depart_enchere ?? 0);
    const total = base + montant_relance;

    const { data: enchere, error } = await supabase
      .from("tontine_encheres")
      .insert({
        lot_id,
        session_id: lot.session_id,
        cycle_id: session.cycle_id,
        membre_id,
        montant_relance,
        montant_total_offert: total,
        statut_enchere: "ACTIVE",
        date_enchere: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !enchere) {
      return NextResponse.json(
        { error: error?.message || "Erreur création enchère" },
        { status: 500 }
      );
    }

    const { data: encheresLot } = await supabase
      .from("tontine_encheres")
      .select("id, montant_total_offert")
      .eq("lot_id", lot_id)
      .order("montant_total_offert", { ascending: false });

    if (encheresLot && encheresLot.length > 0) {
      for (let i = 0; i < encheresLot.length; i++) {
        await supabase
          .from("tontine_encheres")
          .update({
            rang_snapshot: i + 1,
            statut_enchere: i === 0 ? "ACTIVE" : "SURCLASSEE",
          })
          .eq("id", encheresLot[i].id);
      }

      await supabase
        .from("tontine_lots")
        .update({
          statut_lot: "EN_COURS",
          montant_total_relances: Number(encheresLot[0].montant_total_offert || 0),
          gain_reel: Number(lot.mise_brute_lot || 0) - Number(encheresLot[0].montant_total_offert || 0),
        })
        .eq("id", lot_id);
    }

    return NextResponse.json({ success: true, enchere });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}



