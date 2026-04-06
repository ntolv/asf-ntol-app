import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("tontine_parametres_cycle")
      .select("*")
      .eq("actif", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      data ?? {
        configured: false,
        libelle_cycle: "CYCLE ACTIF",
        montant_fixe_par_tontineur: 0,
        nb_tontineurs_inscrits: 0,
        mise_brute_cycle: 0,
        date_debut_cycle: null,
        date_fin_cycle: null,
        annee_cycle: null,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const montant = Number(body?.montant_fixe_par_tontineur ?? 0);
    const dateDebut = String(body?.date_debut_cycle ?? "").trim();
    const libelleCycle = String(body?.libelle_cycle ?? "CYCLE ACTIF").trim();

    if (!dateDebut) {
      return NextResponse.json(
        { error: "Date de début du cycle obligatoire" },
        { status: 400 }
      );
    }

    if (!montant || montant <= 0) {
      return NextResponse.json(
        { error: "Montant fixe par tontineur invalide" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase.rpc("fn_tontine_parametrer_cycle_depuis_bloc", {
      p_montant_fixe_par_tontineur: montant,
      p_date_debut_cycle: dateDebut,
      p_libelle_cycle: libelleCycle || "CYCLE ACTIF",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: Boolean(row?.success),
      message: row?.message || "Paramètres cycle enregistrés",
      cycle_id: row?.cycle_id ?? null,
      date_fin_cycle: row?.date_fin_cycle ?? null,
      nb_tontineurs_inscrits: row?.nb_tontineurs_inscrits ?? 0,
      mise_brute_cycle: row?.mise_brute_cycle ?? 0,
      total_sessions: row?.total_sessions ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}