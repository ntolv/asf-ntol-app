import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function addMonths(dateString: string, months: number) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Date de début du cycle invalide");
  }

  const result = new Date(date);
  result.setMonth(result.getMonth() + months);

  const yyyy = result.getFullYear();
  const mm = String(result.getMonth() + 1).padStart(2, "0");
  const dd = String(result.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("tontine_parametres_cycle")
      .select(`
        id,
        libelle_cycle,
        montant_fixe_par_tontineur,
        nb_tontineurs_inscrits,
        mise_brute_cycle,
        actif,
        date_debut_cycle,
        date_fin_cycle,
        annee_cycle,
        created_at,
        updated_at
      `)
      .order("actif", { ascending: false })
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!row) {
      return NextResponse.json({
        configured: false,
        libelle_cycle: "CYCLE ACTIF",
        montant_fixe_par_tontineur: 0,
        nb_tontineurs_inscrits: 0,
        mise_brute_cycle: 0,
        date_debut_cycle: null,
        date_fin_cycle: null,
        annee_cycle: null,
        calcul_detail: null,
      });
    }

    return NextResponse.json({
      configured: true,
      libelle_cycle: row.libelle_cycle ?? "CYCLE ACTIF",
      montant_fixe_par_tontineur: Number(row.montant_fixe_par_tontineur || 0),
      nb_tontineurs_inscrits: Number(row.nb_tontineurs_inscrits || 0),
      mise_brute_cycle: Number(row.mise_brute_cycle || 0),
      date_debut_cycle: row.date_debut_cycle ?? null,
      date_fin_cycle: row.date_fin_cycle ?? null,
      annee_cycle: row.annee_cycle != null ? Number(row.annee_cycle) : null,
      calcul_detail:
        row.date_debut_cycle && row.date_fin_cycle
          ? `Cycle de 12 mois du ${row.date_debut_cycle} au ${row.date_fin_cycle}`
          : null,
    });
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
    const libelleCycle = String(body?.libelle_cycle ?? "CYCLE ACTIF").trim() || "CYCLE ACTIF";
    const dateDebutCycle = String(body?.date_debut_cycle ?? "").trim();

    if (!dateDebutCycle) {
      return NextResponse.json(
        { error: "Date de début du cycle obligatoire" },
        { status: 400 }
      );
    }

    if (!montant || montant <= 0) {
      return NextResponse.json(
        { error: "Le montant fixe par tontineur doit être supérieur à 0 FCFA." },
        { status: 400 }
      );
    }

    const dateFinCycle = addMonths(dateDebutCycle, 11);
    const anneeCycle = Number(dateDebutCycle.slice(0, 4));

    const supabase = getSupabase();

    const { count: nbTontineurs, error: countError } = await supabase
      .from("membres")
      .select("*", { count: "exact", head: true })
      .eq("est_tontineur_defaut", true);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const totalTontineurs = Number(nbTontineurs || 0);
    const miseBruteCycle = montant * totalTontineurs * 12;

    const { error: deactivateError } = await supabase
      .from("tontine_parametres_cycle")
      .update({ actif: false, updated_at: new Date().toISOString() })
      .eq("actif", true);

    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    }

    const payload = {
      libelle_cycle: libelleCycle,
      montant_fixe_par_tontineur: montant,
      nb_tontineurs_inscrits: totalTontineurs,
      mise_brute_cycle: miseBruteCycle,
      actif: true,
      date_debut_cycle: dateDebutCycle,
      date_fin_cycle: dateFinCycle,
      annee_cycle: anneeCycle,
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from("tontine_parametres_cycle")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    try {
      await supabase.rpc("fn_tontine_generer_suivi_cycle");
    } catch {
      // on n'échoue pas ici pour ne pas casser la page Tontine
    }

    return NextResponse.json({
      success: true,
      message: "Paramètres du cycle enregistrés avec succès",
      configured: true,
      libelle_cycle: inserted?.libelle_cycle ?? libelleCycle,
      montant_fixe_par_tontineur: Number(inserted?.montant_fixe_par_tontineur || montant),
      nb_tontineurs_inscrits: Number(inserted?.nb_tontineurs_inscrits || totalTontineurs),
      mise_brute_cycle: Number(inserted?.mise_brute_cycle || miseBruteCycle),
      date_debut_cycle: inserted?.date_debut_cycle ?? dateDebutCycle,
      date_fin_cycle: inserted?.date_fin_cycle ?? dateFinCycle,
      annee_cycle: inserted?.annee_cycle ?? anneeCycle,
      calcul_detail: `Cycle de 12 mois du ${inserted?.date_debut_cycle ?? dateDebutCycle} au ${inserted?.date_fin_cycle ?? dateFinCycle}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}