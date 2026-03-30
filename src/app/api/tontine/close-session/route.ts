import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id requis" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: sessionCheck, error: sessionCheckError } = await supabase
      .from("tontine_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionCheckError || !sessionCheck) {
      return NextResponse.json(
        { error: sessionCheckError?.message || "Session introuvable" },
        { status: 404 }
      );
    }

    if (sessionCheck.statut_session === "CLOTUREE") {
      return NextResponse.json(
        { error: "Session déjà clôturée" },
        { status: 400 }
      );
    }

    const session = sessionCheck;

    const { data: lots, error: lotsError } = await supabase
      .from("tontine_lots")
      .select("*")
      .eq("session_id", session_id)
      .order("numero_lot", { ascending: true });

    if (lotsError) {
      return NextResponse.json(
        { error: lotsError.message },
        { status: 500 }
      );
    }

    const { data: existingWinners, error: winnersError } = await supabase
      .from("tontine_gagnants")
      .select("membre_id")
      .eq("cycle_id", session.cycle_id);

    if (winnersError) {
      return NextResponse.json(
        { error: winnersError.message },
        { status: 500 }
      );
    }

    const alreadyWon = new Set((existingWinners ?? []).map((x: any) => x.membre_id));
    const results: any[] = [];

    for (const lot of lots ?? []) {
      const { data: existingLotWinner, error: existingLotWinnerError } = await supabase
        .from("tontine_gagnants")
        .select("id")
        .eq("lot_id", lot.id)
        .maybeSingle();

      if (existingLotWinnerError) {
        return NextResponse.json(
          { error: existingLotWinnerError.message },
          { status: 500 }
        );
      }

      if (existingLotWinner?.id) {
        results.push({ lot_id: lot.id, status: "deja_cloture" });
        continue;
      }

      const { data: bids, error: bidsError } = await supabase
        .from("tontine_encheres")
        .select("*")
        .eq("lot_id", lot.id)
        .order("montant_total_offert", { ascending: false });

      if (bidsError) {
        return NextResponse.json(
          { error: bidsError.message },
          { status: 500 }
        );
      }

      if (!bids || bids.length === 0) {
        const { error: closeEmptyLotError } = await supabase
          .from("tontine_lots")
          .update({ statut_lot: "CLOTURE" })
          .eq("id", lot.id);

        if (closeEmptyLotError) {
          return NextResponse.json(
            { error: closeEmptyLotError.message },
            { status: 500 }
          );
        }

        results.push({ lot_id: lot.id, status: "aucune_enchere" });
        continue;
      }

      const winningBid = bids.find((b: any) => !alreadyWon.has(b.membre_id));

      if (!winningBid) {
        const { error: closeNoEligibleLotError } = await supabase
          .from("tontine_lots")
          .update({ statut_lot: "CLOTURE" })
          .eq("id", lot.id);

        if (closeNoEligibleLotError) {
          return NextResponse.json(
            { error: closeNoEligibleLotError.message },
            { status: 500 }
          );
        }

        results.push({ lot_id: lot.id, status: "aucun_gagnant_eligible" });
        continue;
      }

      alreadyWon.add(winningBid.membre_id);

      const miseBrute = Number(lot.mise_brute_lot || 0);
      const totalRelances = Number(winningBid.montant_total_offert || 0);
      const gainReel = miseBrute - totalRelances;

      const { error: gagnantError } = await supabase
        .from("tontine_gagnants")
        .insert({
          cycle_id: session.cycle_id,
          session_id: session.id,
          lot_id: lot.id,
          membre_id: winningBid.membre_id,
          mise_brute: miseBrute,
          total_relances: totalRelances,
          gain_reel: gainReel,
          date_attribution: new Date().toISOString(),
          statut_gain: "ATTRIBUE",
          commentaire: "Clôture automatique simultanée",
        });

      if (gagnantError) {
        return NextResponse.json(
          { error: gagnantError.message },
          { status: 500 }
        );
      }

      const { error: closeLotError } = await supabase
        .from("tontine_lots")
        .update({
          statut_lot: "CLOTURE",
          gagnant_membre_id: winningBid.membre_id,
          montant_total_relances: totalRelances,
          gain_reel: gainReel,
          date_cloture: new Date().toISOString(),
        })
        .eq("id", lot.id);

      if (closeLotError) {
        return NextResponse.json(
          { error: closeLotError.message },
          { status: 500 }
        );
      }

      results.push({
        lot_id: lot.id,
        status: "gagnant_attribue",
        membre_id: winningBid.membre_id,
      });
    }

    const { error: closeSessionError } = await supabase
      .from("tontine_sessions")
      .update({
        statut_encheres: "TERMINE",
        statut_session: "CLOTUREE",
      })
      .eq("id", session.id);

    if (closeSessionError) {
      return NextResponse.json(
        { error: closeSessionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
