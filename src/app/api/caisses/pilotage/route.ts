import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

type Row = Record<string, any>;

function n(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(
      value.replace(/\s/g, "").replace(",", ".")
    );

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function s(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bySum(rows: Row[], key: string) {
  return rows.reduce(
    (sum, row) => sum + n(row[key]),
    0
  );
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Classification temporairement conservée uniquement
 * pour les décaissements qui NE SONT PAS des prêts.
 *
 * Un prêt n'est jamais reconnu par son libellé,
 * son motif ou sa caisse.
 */
function classifyNonLoanDecaissement(
  row: Row
): "AIDE" | "AUTRE" {
  const text = [
    row.caisse_libelle,
    row.rubrique_nom,
    row.motif,
  ]
    .map(normalizeText)
    .join(" ");

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
    const perfTotalStart = performance.now();
    // ========================================================
    // 1. AUTHENTIFICATION
    // La Caisse est accessible à tout membre connecté.
    // ========================================================

    const supabaseAuth =
      await createSupabaseServerClient();

    const perfAuthStart = performance.now();

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    const perfAuthMs = performance.now() - perfAuthStart;

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Utilisateur non connecté.",
        },
        {
          status: 401,
        }
      );
    }

    const perfContextStart = performance.now();

    const context =
      await getUserContext(user);

    const perfContextMs = performance.now() - perfContextStart;

    if (
      !context?.success ||
      !context?.membreId
    ) {
      return NextResponse.json(
        {
          error:
            context?.message ||
            "Contexte utilisateur introuvable.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // 2. CLIENT SERVEUR
    // ========================================================

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ========================================================
    // 3. LECTURES PRINCIPALES
    // ========================================================

    const perfViewsStart = performance.now();

    const perfViewDetail: Record<string, number> = {};

    const [
      caisses,
      tontineCaisse,
      tontineDetails,
      retards,
      caissesSoldes,
      tresorerie,
      interetsPrets,
    ] = await Promise.all([
      (async () => {
        const start = performance.now();

        const result = await supabase
          .from("v_caisses")
          .select("*");

        perfViewDetail.v_caisses_ms =
          Math.round(performance.now() - start);

        return result;
      })(),

      (async () => {
        const start = performance.now();

        const result = await supabase
          .from("v_tontine_caisse_encheres")
          .select("*");

        perfViewDetail.v_tontine_caisse_encheres_ms =
          Math.round(performance.now() - start);

        return result;
      })(),

      (async () => {
        const start = performance.now();

        const result = await supabase
          .from("v_tontine_caisse_encheres_details")
          .select("*")
          .order(
            "date_attribution",
            { ascending: false }
          )
          .limit(10);

        perfViewDetail.v_tontine_details_ms =
          Math.round(performance.now() - start);

        return result;
      })(),

      (async () => {
        const start = performance.now();

        const result = await supabase
          .from("v_retards")
          .select("*");

        perfViewDetail.v_retards_ms =
          Math.round(performance.now() - start);

        return result;
      })(),

      (async () => {
        const start = performance.now();

        const result = await supabase
          .from("v_caisses_soldes")
          .select("*")
          .order(
            "rubrique_nom",
            { ascending: true }
          );

        perfViewDetail.v_caisses_soldes_ms =
          Math.round(performance.now() - start);

        return result;
      })(),

      (async () => {
        const start = performance.now();

        const result = await supabase
          .from("v_tresorerie_reelle")
          .select("caisse_disponible")
          .maybeSingle();

        perfViewDetail.v_tresorerie_reelle_ms =
          Math.round(performance.now() - start);

        return result;
      })(),

      (async () => {
        const start = performance.now();

        const result = await supabase
          .from("v_caisse_interets_prets")
          .select(
            "total_caisse_interets_prets"
          )
          .maybeSingle();

        perfViewDetail.v_caisse_interets_prets_ms =
          Math.round(performance.now() - start);

        return result;
      })(),
    ]);

    console.info(
      "[PILOTAGE VIEWS PERF]",
      JSON.stringify(perfViewDetail)
    );

    const perfViewsMs = performance.now() - perfViewsStart;

    if (caisses.error)
      throw caisses.error;

    if (tontineCaisse.error)
      throw tontineCaisse.error;

    if (tontineDetails.error)
      throw tontineDetails.error;

    if (retards.error)
      throw retards.error;

    if (caissesSoldes.error)
      throw caissesSoldes.error;

    if (tresorerie.error)
      throw tresorerie.error;

    if (interetsPrets.error)
      throw interetsPrets.error;

    // ========================================================
    // 4. LECTURE COMPLETE DES DECAISSEMENTS
    //
    // Aucun LIMIT arbitraire ne doit intervenir dans un KPI.
    // Pagination explicite pour dépasser également la limite
    // standard éventuelle de l'API Supabase.
    // ========================================================

    const PAGE_SIZE = 1000;

    async function fetchAllDecaissements(): Promise<Row[]> {
      const rows: Row[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("v_decaissements")
          .select("*")
          .or("statut.eq.VALIDE,statut.is.null")
          .order(
            "date_decaissement",
            { ascending: false }
          )
          .order(
            "id",
            { ascending: false }
          )
          .range(
            from,
            from + PAGE_SIZE - 1
          );

        if (error) throw error;

        const batch =
          (data ?? []) as Row[];

        rows.push(...batch);

        if (batch.length < PAGE_SIZE) {
          break;
        }

        from += PAGE_SIZE;
      }

      return rows;
    }

    // ========================================================
    // 5. SOURCE CANONIQUE DES DECAISSEMENTS DE PRETS
    //
    // v_mouvements_financiers classe un décaissement PRET
    // lorsqu'il existe la relation :
    //
    // pret_financements.decaissement_id -> decaissements.id
    //
    // La caisse, la rubrique et le texte du motif
    // n'interviennent donc plus dans cette décision.
    // ========================================================

    async function fetchAllPretMovements(): Promise<Row[]> {
      const rows: Row[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("v_mouvements_financiers")
          .select(
            "source_id,montant"
          )
          .eq(
            "origine",
            "PRET"
          )
          .eq(
            "type_flux",
            "SORTIE"
          )
          .order(
            "source_id",
            { ascending: true }
          )
          .range(
            from,
            from + PAGE_SIZE - 1
          );

        if (error) throw error;

        const batch =
          (data ?? []) as Row[];

        rows.push(...batch);

        if (batch.length < PAGE_SIZE) {
          break;
        }

        from += PAGE_SIZE;
      }

      return rows;
    }

    const perfMovementsStart = performance.now();

    const [
      decaissementRows,
      pretMovementRows,
    ] = await Promise.all([
      fetchAllDecaissements(),
      fetchAllPretMovements(),
    ]);

    const perfMovementsMs =
      performance.now() - perfMovementsStart;

    const perfCalculationsStart = performance.now();

    // ========================================================
    // 6. PREPARATION DES DONNEES
    // ========================================================

    const caisseRows =
      (caisses.data ?? []) as Row[];

    const tontineRows =
      (tontineCaisse.data ?? []) as Row[];

    const tontineDetailRows =
      (tontineDetails.data ?? []) as Row[];

    const retardRows =
      (retards.data ?? []) as Row[];

    const tresorerieRow =
      (tresorerie.data ?? {}) as Row;

    const interetsPretsRow =
      (interetsPrets.data ?? {}) as Row;

    const caissesSoldesRows =
      (caissesSoldes.data ?? []) as Row[];

    // ========================================================
    // 7. CONTRIBUTIONS
    // ========================================================

    const rubriquesMap =
      new Map<string, Row>();

    for (const row of caisseRows) {
      const key =
        s(row.rubrique) ||
        "Rubrique";

      const current =
        rubriquesMap.get(key) ?? {
          rubrique: key,
          montant_attendu: 0,
          montant_verse: 0,
          reste_a_payer: 0,
        };

      current.montant_attendu +=
        n(row.montant_attendu);

      current.montant_verse +=
        n(row.montant_verse);

      current.reste_a_payer +=
        n(row.reste_a_payer);

      rubriquesMap.set(
        key,
        current
      );
    }

    const totalAttendu =
      bySum(
        caisseRows,
        "montant_attendu"
      );

    const totalVerse =
      bySum(
        caisseRows,
        "montant_verse"
      );

    const totalReste =
      bySum(
        caisseRows,
        "reste_a_payer"
      );

    // ========================================================
    // 8. TONTINE
    // ========================================================

    const totalEncheres =
      bySum(
        tontineRows,
        "total_caisse_encheres"
      );

    const nbLotsAttribues =
      bySum(
        tontineRows,
        "nb_lots_attribues"
      );

    const partRedistribution =
      bySum(
        tontineRows,
        "part_redistribution_par_tontineur"
      );

    // ========================================================
    // 9. DECAISSEMENTS
    // ========================================================

    const pretDecaissementIds =
      new Set(
        pretMovementRows
          .map(
            (row) =>
              s(row.source_id)
          )
          .filter(Boolean)
      );

    // --------------------------------------------------------
    // PRETS
    //
    // Toutes caisses confondues.
    // Imports historiques inclus.
    // Aucune classification textuelle.
    // --------------------------------------------------------

    const totalPrets =
      bySum(
        pretMovementRows,
        "montant"
      );

    // --------------------------------------------------------
    // Les prêts étant déjà identifiés structurellement,
    // ils sont retirés avant toute classification AIDE/AUTRE.
    //
    // Cela empêche notamment un prêt financé par Solidarité
    // d'être compté comme une aide.
    // --------------------------------------------------------

    const nonLoanRows =
      decaissementRows.filter(
        (row) =>
          !pretDecaissementIds.has(
            s(row.id)
          )
      );

    const totalAides =
      nonLoanRows
        .filter(
          (row) =>
            classifyNonLoanDecaissement(
              row
            ) === "AIDE"
        )
        .reduce(
          (sum, row) =>
            sum + n(row.montant),
          0
        );

    const totalAutres =
      nonLoanRows
        .filter(
          (row) =>
            classifyNonLoanDecaissement(
              row
            ) === "AUTRE"
        )
        .reduce(
          (sum, row) =>
            sum + n(row.montant),
          0
        );

    const totalDecaissements =
      bySum(
        decaissementRows,
        "montant"
      );

    // --------------------------------------------------------
    // Contrôle interne :
    // chaque décaissement doit appartenir exactement
    // à PRET, AIDE ou AUTRE.
    // --------------------------------------------------------

    const totalClasse =
      totalPrets +
      totalAides +
      totalAutres;

    if (
      Math.abs(
        totalDecaissements -
        totalClasse
      ) > 0.01
    ) {
      throw new Error(
        `Incohérence de classification des décaissements : ` +
        `total=${totalDecaissements}, ` +
        `classé=${totalClasse}`
      );
    }

    // ========================================================
    // 10. RETARDS
    // ========================================================

    const retardsByMember =
      new Map<string, Row>();

    for (const row of retardRows) {
      const membreId =
        s(row.membre_id) ||
        s(row.nom_complet) ||
        "membre";

      const current =
        retardsByMember.get(
          membreId
        ) ?? {
          membre_id:
            row.membre_id,
          nom_complet:
            row.nom_complet,
          retard_total: 0,
          rubriques: {},
        };

      const montant =
        n(row.reste_a_payer);

      const rubrique =
        s(row.rubrique) ||
        "Rubrique";

      current.retard_total +=
        montant;

      current.rubriques[
        rubrique
      ] =
        (
          current.rubriques[
            rubrique
          ] ?? 0
        ) + montant;

      retardsByMember.set(
        membreId,
        current
      );
    }

    const membresRetard =
      Array.from(
        retardsByMember.values()
      )
        .filter(
          (row) =>
            n(row.retard_total) > 0
        )
        .sort(
          (a, b) =>
            n(b.retard_total) -
            n(a.retard_total)
        )
        .map((row) => ({
          membre_id:
            row.membre_id,

          nom_complet:
            row.nom_complet,

          retard_total:
            row.retard_total,

          rubriques:
            Object.entries(
              row.rubriques
            ).map(
              ([
                rubrique,
                montant,
              ]) => ({
                rubrique,
                montant,
              })
            ),
        }));

    const plusGrosRetardataire =
      membresRetard[0] ?? null;

    // ========================================================
    // 11. REPONSE
    // ========================================================

    const perfCalculationsMs =
      performance.now() - perfCalculationsStart;

    const perfTotalMs =
      performance.now() - perfTotalStart;

    console.info(
      "[PILOTAGE PROD PERF]",
      JSON.stringify({
        auth_ms: Math.round(perfAuthMs),
        context_ms: Math.round(perfContextMs),
        views_ms: Math.round(perfViewsMs),
        movements_ms: Math.round(perfMovementsMs),
        calculations_ms: Math.round(perfCalculationsMs),
        total_ms: Math.round(perfTotalMs),
      })
    );

    return NextResponse.json({
      tresorerie: {
        caisse_disponible:
          n(
            tresorerieRow.caisse_disponible
          ),

        total_entrees_caisses_rubriques:
          bySum(
            caissesSoldesRows,
            "total_encaisse"
          ),

        total_sorties_caisses_rubriques:
          bySum(
            caissesSoldesRows,
            "total_decaisse"
          ),

        total_caisses_rubriques:
          bySum(
            caissesSoldesRows,
            "solde_disponible"
          ),

        total_encheres:
          totalEncheres,

        total_interets_prets:
          n(
            interetsPretsRow
              .total_caisse_interets_prets
          ),

        caisses_rubriques:
          caissesSoldesRows.map(
            (row) => ({
              caisse_id:
                row.caisse_id,

              caisse_libelle:
                row.caisse_libelle,

              rubrique_id:
                row.rubrique_id,

              rubrique_nom:
                row.rubrique_nom,

              total_encaisse:
                n(
                  row.total_encaisse
                ),

              total_decaisse:
                n(
                  row.total_decaisse
                ),

              solde_disponible:
                n(
                  row.solde_disponible
                ),
            })
          ),
      },

      contributions: {
        total_attendu:
          totalAttendu,

        total_encaisse:
          totalVerse,

        reste_a_encaisser:
          totalReste,

        rubriques:
          Array.from(
            rubriquesMap.values()
          ).sort(
            (a, b) =>
              s(a.rubrique)
                .localeCompare(
                  s(b.rubrique)
                )
          ),
      },

      tontine: {
        total_encheres:
          totalEncheres,

        nb_lots_attribues:
          nbLotsAttribues,

        part_redistribution_par_tontineur:
          partRedistribution,

        derniers_gagnants:
          tontineDetailRows.map(
            (row) => ({
              periode:
                row.periode_reference,

              lot:
                row.numero_lot,

              gagnant:
                `${row.prenom ?? ""} ${row.nom ?? ""}`.trim(),

              montant_enchere:
                row.montant_verse_caisse_encheres,

              gain_reel:
                row.gain_reel,

              date_attribution:
                row.date_attribution,
            })
          ),
      },

      decaissements: {
        total_aides:
          totalAides,

        total_prets:
          totalPrets,

        total_autres:
          totalAutres,

        total_general:
          totalDecaissements,

        mouvements: [],
      },

      retards: {
        montant_total_retards:
          membresRetard.reduce(
            (sum, row) =>
              sum +
              n(row.retard_total),
            0
          ),

        nb_membres_retard:
          membresRetard.length,

        plus_gros_retardataire:
          plusGrosRetardataire
            ?.nom_complet ?? null,

        montant_plus_gros_retard:
          plusGrosRetardataire
            ?.retard_total ?? 0,

        membres:
          membresRetard,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erreur pilotage caisse",
      },
      {
        status: 500,
      }
    );
  }
}
