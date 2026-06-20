import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

function n(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function s(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bySum(rows: Row[], key: string) {
  return rows.reduce((sum, row) => sum + n(row[key]), 0);
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function classifyDecaissement(row: Row): "AIDE" | "PRET" | "AUTRE" {
  const text = [
    row.caisse_libelle,
    row.rubrique_nom,
    row.motif,
  ].map(normalizeText).join(" ");

  if (
    text.includes("pret") ||
    text.includes("prets") ||
    text.includes("investissement") ||
    text.includes("developpement")
  ) {
    return "PRET";
  }

  if (
    text.includes("aide") ||
    text.includes("secours") ||
    text.includes("solidarite")
  ) {
    return "AIDE";
  }

  return "AUTRE";
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [
      caisses,
      tontineCaisse,
      tontineDetails,
      decaissements,
      retards,
      tresorerie,
    ] = await Promise.all([
      supabase.from("v_caisses").select("*"),
      supabase.from("v_tontine_caisse_encheres").select("*"),
      supabase.from("v_tontine_caisse_encheres_details").select("*").order("date_attribution", { ascending: false }).limit(10),
      supabase.from("v_decaissements").select("*").order("date_decaissement", { ascending: false }).limit(20),
      supabase.from("v_retards").select("*"),
      supabase.from("v_tresorerie_reelle").select("caisse_disponible").maybeSingle(),
    ]);

    if (caisses.error) throw caisses.error;
    if (tontineCaisse.error) throw tontineCaisse.error;
    if (tontineDetails.error) throw tontineDetails.error;
    if (decaissements.error) throw decaissements.error;
    if (retards.error) throw retards.error;
    if (tresorerie.error) throw tresorerie.error;

    const caisseRows = (caisses.data ?? []) as Row[];
    const tontineRows = (tontineCaisse.data ?? []) as Row[];
    const tontineDetailRows = (tontineDetails.data ?? []) as Row[];
    const decaissementRows = (decaissements.data ?? []) as Row[];
    const retardRows = (retards.data ?? []) as Row[];
    const tresorerieRow = (tresorerie.data ?? {}) as Row;

    const rubriquesMap = new Map<string, Row>();

    for (const row of caisseRows) {
      const key = s(row.rubrique) || "Rubrique";
      const current = rubriquesMap.get(key) ?? {
        rubrique: key,
        montant_attendu: 0,
        montant_verse: 0,
        reste_a_payer: 0,
      };

      current.montant_attendu += n(row.montant_attendu);
      current.montant_verse += n(row.montant_verse);
      current.reste_a_payer += n(row.reste_a_payer);

      rubriquesMap.set(key, current);
    }

    const totalAttendu = bySum(caisseRows, "montant_attendu");
    const totalVerse = bySum(caisseRows, "montant_verse");
    const totalReste = bySum(caisseRows, "reste_a_payer");

    const totalEncheres = bySum(tontineRows, "total_caisse_encheres");
    const nbLotsAttribues = bySum(tontineRows, "nb_lots_attribues");
    const partRedistribution = bySum(tontineRows, "part_redistribution_par_tontineur");

    const totalDecaissements = bySum(decaissementRows, "montant");

    const totalAides = decaissementRows
      .filter((row) => classifyDecaissement(row) === "AIDE")
      .reduce((sum, row) => sum + n(row.montant), 0);

    const totalPrets = decaissementRows
      .filter((row) => classifyDecaissement(row) === "PRET")
      .reduce((sum, row) => sum + n(row.montant), 0);

    const totalAutres = decaissementRows
      .filter((row) => classifyDecaissement(row) === "AUTRE")
      .reduce((sum, row) => sum + n(row.montant), 0);

    const retardsByMember = new Map<string, Row>();

    for (const row of retardRows) {
      const membreId = s(row.membre_id) || s(row.nom_complet) || "membre";
      const current = retardsByMember.get(membreId) ?? {
        membre_id: row.membre_id,
        nom_complet: row.nom_complet,
        retard_total: 0,
        rubriques: {},
      };

      const montant = n(row.reste_a_payer);
      const rubrique = s(row.rubrique) || "Rubrique";

      current.retard_total += montant;
      current.rubriques[rubrique] = (current.rubriques[rubrique] ?? 0) + montant;

      retardsByMember.set(membreId, current);
    }

    const membresRetard = Array.from(retardsByMember.values())
      .filter((row) => n(row.retard_total) > 0)
      .sort((a, b) => n(b.retard_total) - n(a.retard_total))
      .map((row) => ({
        membre_id: row.membre_id,
        nom_complet: row.nom_complet,
        retard_total: row.retard_total,
        rubriques: Object.entries(row.rubriques).map(([rubrique, montant]) => ({
          rubrique,
          montant,
        })),
      }));

    const plusGrosRetardataire = membresRetard[0] ?? null;

    return NextResponse.json({
      tresorerie: {
        caisse_disponible: n(tresorerieRow.caisse_disponible),
      },
      contributions: {
        total_attendu: totalAttendu,
        total_encaisse: totalVerse,
        reste_a_encaisser: totalReste,
        rubriques: Array.from(rubriquesMap.values()).sort((a, b) => s(a.rubrique).localeCompare(s(b.rubrique))),
      },
      tontine: {
        total_encheres: totalEncheres,
        nb_lots_attribues: nbLotsAttribues,
        part_redistribution_par_tontineur: partRedistribution,
        derniers_gagnants: tontineDetailRows.map((row) => ({
          periode: row.periode_reference,
          lot: row.numero_lot,
          gagnant: `${row.prenom ?? ""} ${row.nom ?? ""}`.trim(),
          montant_enchere: row.montant_verse_caisse_encheres,
          gain_reel: row.gain_reel,
          date_attribution: row.date_attribution,
        })),
      },
      decaissements: {
        total_aides: totalAides,
        total_prets: totalPrets,
        total_autres: totalAutres,
        total_general: totalDecaissements,
        mouvements: decaissementRows.map((row) => ({
          id: row.id,
          date: row.date_decaissement,
          caisse: row.caisse_libelle,
          rubrique: row.rubrique_nom,
          beneficiaire: row.membre_nom_complet,
          montant: row.montant,
          motif: row.motif,
        })),
      },
      retards: {
        montant_total_retards: membresRetard.reduce((sum, row) => sum + n(row.retard_total), 0),
        nb_membres_retard: membresRetard.length,
        plus_gros_retardataire: plusGrosRetardataire?.nom_complet ?? null,
        montant_plus_gros_retard: plusGrosRetardataire?.retard_total ?? 0,
        membres: membresRetard,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur pilotage caisse" },
      { status: 500 }
    );
  }
}

