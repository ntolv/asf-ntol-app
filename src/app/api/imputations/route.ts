import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

type ImputationRow = {
  contribution_id: string;
  membre_id: string;
  membre_nom: string;
  date_contribution: string;
  montant_total: number | string;
  statut: string;

  ligne_id: string;
  rubrique_id: string;
  rubrique_nom: string;
  montant_ligne: number | string;
  ordre_affichage: number;

  contribution_created_at?: string;

  ligne_statut?: string;
  annule_at?: string | null;
  annule_par_user_id?: string | null;
  motif_annulation?: string | null;

  periode_reference?: string;
};

type CaisseEntreeRow = {
  id: string;
  caisse_id: string;
  rubrique_id: string;
  membre_id: string | null;
  montant: number | string;
  origine: string;
  source_id: string | null;
  annee_generation: number | null;
  annee_entree: number;
  date_entree: string;
  reference: string | null;
  commentaire: string | null;
  created_at: string;
};

type HistoriqueLigne = {
  ligne_id: string;
  rubrique_id: string;
  rubrique_nom: string;
  montant_ligne: number;
  ordre_affichage: number;

  ligne_statut: string;
  annule_at?: string | null;
  motif_annulation?: string | null;

  modifiable: boolean;
  retour_arriere_disponible: boolean;
};

type EncaissementHistorique = {
  contribution_id: string;
  membre_id: string;
  membre_nom: string;
  date_contribution: string;
  contribution_created_at?: string;

  periode_reference?: string;

  montant_total: number;
  statut: string;

  origine:
    | "COTISATION"
    | "REDISTRIBUTION_ENCHERES"
    | "REDISTRIBUTION_INTERETS";

  lignes: HistoriqueLigne[];
};

function getAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function isAuthorizedRole(
  roleCode: string | null | undefined
) {
  const code =
    String(roleCode ?? "")
      .trim()
      .toUpperCase();

  return [
    "ADMIN",
    "PRESIDENT",
    "TRESORIER",
  ].includes(code);
}

async function getRequestAccess() {
  const auth =
    await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await auth.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      status: 401,
      message:
        error?.message ||
        "Utilisateur non connecté.",
      context: null,
    };
  }

  const context =
    await getUserContext(user);

  if (
    !context?.success ||
    !context?.membreId
  ) {
    return {
      ok: false as const,
      status: 401,
      message:
        context?.message ||
        "Contexte utilisateur introuvable.",
      context,
    };
  }

  return {
    ok: true as const,
    status: 200,
    message: "OK",
    context,
  };
}

function parseYear(yearValue: string) {
  const match =
    /^(\d{4})$/.exec(yearValue);

  if (!match) return null;

  const year = Number(match[1]);

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    return null;
  }

  return year;
}

function getDateRange(
  yearValue: string,
  monthValue: string
) {
  const year =
    parseYear(yearValue);

  if (!year) {
    return null;
  }

  if (!monthValue) {
    return {
      start: `${year}-01-01`,
      end: `${year + 1}-01-01`,
    };
  }

  const month =
    Number(monthValue);

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const startMonth =
    String(month).padStart(
      2,
      "0"
    );

  if (month === 12) {
    return {
      start:
        `${year}-${startMonth}-01`,

      end:
        `${year + 1}-01-01`,
    };
  }

  const endMonth =
    String(month + 1).padStart(
      2,
      "0"
    );

  return {
    start:
      `${year}-${startMonth}-01`,

    end:
      `${year}-${endMonth}-01`,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    // ========================================================
    // 1. AUTHENTIFICATION
    // ========================================================

    const access =
      await getRequestAccess();

    if (!access.ok) {
      return NextResponse.json(
        {
          success: false,
          message: access.message,
        },
        {
          status: access.status,
        }
      );
    }

    const canManage =
      isAuthorizedRole(
        access.context?.role?.code
      );

    const supabase =
      getAdminClient();

    const searchParams =
      request.nextUrl.searchParams;

    const membreId =
      searchParams
        .get("membre_id")
        ?.trim() || "";

    const annee =
      searchParams
        .get("annee")
        ?.trim() || "";

    const mois =
      searchParams
        .get("mois")
        ?.trim() || "";

    const rubriqueId =
      searchParams
        .get("rubrique_id")
        ?.trim() || "";

    if (mois && !annee) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Une année doit être sélectionnée pour filtrer par mois",
        },
        {
          status: 400,
        }
      );
    }

    const range =
      annee
        ? getDateRange(
            annee,
            mois
          )
        : null;

    if (annee && !range) {
      return NextResponse.json(
        {
          success: false,

          message:
            mois
              ? "Année ou mois invalide"
              : "Année invalide. Format attendu : YYYY",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // 2. CONTRIBUTIONS
    //
    // IMPORTANT :
    // on utilise la vue TOUS STATUTS afin que les corrections
    // et annulations restent visibles dans l'Historique.
    // ========================================================

    let contributionsQuery =
      supabase
        .from(
          "v_contributions_imputations_tous_statuts"
        )
        .select("*")
        .order(
          "date_contribution",
          {
            ascending: false,
          }
        )
        .order(
          "contribution_created_at",
          {
            ascending: false,
          }
        )
        .order(
          "ordre_affichage",
          {
            ascending: true,
          }
        );

    if (membreId) {
      contributionsQuery =
        contributionsQuery.eq(
          "membre_id",
          membreId
        );
    }

    if (rubriqueId) {
      contributionsQuery =
        contributionsQuery.eq(
          "rubrique_id",
          rubriqueId
        );
    }

    if (range) {
      contributionsQuery =
        contributionsQuery
          .gte(
            "date_contribution",
            range.start
          )
          .lt(
            "date_contribution",
            range.end
          );
    }

    const {
      data: contributionsData,
      error: contributionsError,
    } =
      await contributionsQuery.limit(
        3000
      );

    if (contributionsError) {
      throw contributionsError;
    }

    const rows =
      (contributionsData ??
        []) as ImputationRow[];

    /*
     * --------------------------------------------------------
     * IDENTIFIER LES LIGNES CREEES PAR UNE CORRECTION
     *
     * Une ligne peut revenir en arrière uniquement si elle
     * possède dans le journal une CREATION dont l'origine
     * est CORRECTION.
     *
     * On interroge par petits lots pour éviter une URL
     * PostgREST trop longue sur un historique important.
     * --------------------------------------------------------
     */

    const lignesIssuesCorrection =
      new Set<string>();

    const ligneIds =
      Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.ligne_id
            )
            .filter(Boolean)
        )
      );

    const auditChunkSize =
      200;

    for (
      let index = 0;
      index < ligneIds.length;
      index += auditChunkSize
    ) {
      const chunk =
        ligneIds.slice(
          index,
          index + auditChunkSize
        );

      const {
        data: auditCorrections,
        error: auditCorrectionsError,
      } =
        await supabase
          .from(
            "journal_modifications"
          )
          .select(
            "entite_id, metadata"
          )
          .eq(
            "entite",
            "CONTRIBUTION_IMPUTATION"
          )
          .eq(
            "action",
            "CREATION"
          )
          .in(
            "entite_id",
            chunk
          );

      if (
        auditCorrectionsError
      ) {
        throw auditCorrectionsError;
      }

      for (
        const audit of
        auditCorrections ?? []
      ) {
        const metadata =
          (audit.metadata ??
            {}) as Record<
              string,
              unknown
            >;

        if (
          audit.entite_id &&
          String(
            metadata.origine ??
              ""
          ) ===
            "CORRECTION"
        ) {
          lignesIssuesCorrection.add(
            String(
              audit.entite_id
            )
          );
        }
      }
    }

    const groupedMap =
      new Map<
        string,
        EncaissementHistorique
      >();

    for (const row of rows) {
      if (
        !groupedMap.has(
          row.contribution_id
        )
      ) {
        groupedMap.set(
          row.contribution_id,
          {
            contribution_id:
              row.contribution_id,

            membre_id:
              row.membre_id,

            membre_nom:
              row.membre_nom,

            date_contribution:
              row.date_contribution,

            contribution_created_at:
              row.contribution_created_at,

            periode_reference:
              row.periode_reference,

            montant_total:
              0,

            statut:
              row.statut,

            origine:
              "COTISATION",

            lignes: [],
          }
        );
      }

      const group =
        groupedMap.get(
          row.contribution_id
        )!;

      const ligneStatut =
        String(
          row.ligne_statut ??
            "VALIDE"
        ).toUpperCase();

      group.lignes.push({
        ligne_id:
          row.ligne_id,

        rubrique_id:
          row.rubrique_id,

        rubrique_nom:
          row.rubrique_nom,

        montant_ligne:
          Number(
            row.montant_ligne ??
              0
          ),

        ordre_affichage:
          Number(
            row.ordre_affichage ??
              0
          ),

        ligne_statut:
          ligneStatut,

        annule_at:
          row.annule_at ??
          null,

        motif_annulation:
          row.motif_annulation ??
          null,

        modifiable:
          canManage &&
          row.statut ===
            "VALIDE" &&
          ligneStatut ===
            "VALIDE",

        retour_arriere_disponible:
          canManage &&
          row.statut ===
            "VALIDE" &&
          ligneStatut ===
            "VALIDE" &&
          lignesIssuesCorrection.has(
            row.ligne_id
          ),
      });
    }

    const contributions =
      Array.from(
        groupedMap.values()
      ).map((item) => {
        const lignes =
          item.lignes.sort(
            (a, b) =>
              a.ordre_affichage -
              b.ordre_affichage
          );

        /*
         * Le montant financier de l'historique doit exclure
         * les lignes annulées.
         *
         * Leur montant initial reste toutefois visible sur
         * chaque ligne pour la traçabilité.
         */
        const totalActif =
          item.statut ===
          "VALIDE"
            ? lignes
                .filter(
                  (ligne) =>
                    ligne.ligne_statut ===
                    "VALIDE"
                )
                .reduce(
                  (
                    sum,
                    ligne
                  ) =>
                    sum +
                    Number(
                      ligne.montant_ligne ??
                        0
                    ),
                  0
                )
            : 0;

        return {
          ...item,
          montant_total:
            totalActif,
          lignes,
        };
      });

    // ========================================================
    // 3. REDISTRIBUTIONS REELLEMENT CREDITEES
    // ========================================================

    let entreesQuery =
      supabase
        .from("caisse_entrees")
        .select(
          "id, caisse_id, rubrique_id, membre_id, montant, origine, source_id, annee_generation, annee_entree, date_entree, reference, commentaire, created_at"
        )
        .in("origine", [
          "REDISTRIBUTION_ENCHERES",
          "REDISTRIBUTION_INTERETS",
        ])
        .order(
          "date_entree",
          {
            ascending: false,
          }
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (membreId) {
      entreesQuery =
        entreesQuery.eq(
          "membre_id",
          membreId
        );
    }

    if (rubriqueId) {
      entreesQuery =
        entreesQuery.eq(
          "rubrique_id",
          rubriqueId
        );
    }

    if (range) {
      entreesQuery =
        entreesQuery
          .gte(
            "date_entree",
            range.start
          )
          .lt(
            "date_entree",
            range.end
          );
    }

    const {
      data: entreesData,
      error: entreesError,
    } =
      await entreesQuery.limit(
        2000
      );

    if (entreesError) {
      throw entreesError;
    }

    const entrees =
      (entreesData ??
        []) as CaisseEntreeRow[];

    // ========================================================
    // 4. LIBELLES MEMBRES / RUBRIQUES
    // ========================================================

    const membreIds =
      Array.from(
        new Set(
          entrees
            .map(
              (row) =>
                row.membre_id
            )
            .filter(
              (
                id
              ): id is string =>
                Boolean(id)
            )
        )
      );

    const rubriqueIds =
      Array.from(
        new Set(
          entrees
            .map(
              (row) =>
                row.rubrique_id
            )
            .filter(Boolean)
        )
      );

    const membresMap =
      new Map<
        string,
        string
      >();

    const rubriquesMap =
      new Map<
        string,
        {
          nom: string;
          ordre_affichage: number;
        }
      >();

    if (membreIds.length > 0) {
      const {
        data: membres,
        error: membresError,
      } =
        await supabase
          .from("membres")
          .select(
            "id, nom_complet"
          )
          .in(
            "id",
            membreIds
          );

      if (membresError) {
        throw membresError;
      }

      for (
        const membre of
        membres ?? []
      ) {
        membresMap.set(
          String(
            membre.id
          ),
          String(
            membre.nom_complet ??
              "Membre inconnu"
          )
        );
      }
    }

    if (
      rubriqueIds.length >
      0
    ) {
      const {
        data: rubriques,
        error: rubriquesError,
      } =
        await supabase
          .from("rubriques")
          .select(
            "id, nom, ordre_affichage"
          )
          .in(
            "id",
            rubriqueIds
          );

      if (rubriquesError) {
        throw rubriquesError;
      }

      for (
        const rubrique of
        rubriques ?? []
      ) {
        rubriquesMap.set(
          String(
            rubrique.id
          ),
          {
            nom:
              String(
                rubrique.nom ??
                  "Rubrique inconnue"
              ),

            ordre_affichage:
              Number(
                rubrique
                  .ordre_affichage ??
                  0
              ),
          }
        );
      }
    }

    const redistributions:
      EncaissementHistorique[] =
      entrees.map(
        (row) => {
          const rubrique =
            rubriquesMap.get(
              row.rubrique_id
            );

          const origine:
            | "REDISTRIBUTION_ENCHERES"
            | "REDISTRIBUTION_INTERETS" =
            row.origine ===
            "REDISTRIBUTION_INTERETS"
              ? "REDISTRIBUTION_INTERETS"
              : "REDISTRIBUTION_ENCHERES";

          return {
            contribution_id:
              `caisse-entree-${row.id}`,

            membre_id:
              row.membre_id ??
              "",

            membre_nom:
              row.membre_id
                ? membresMap.get(
                    row.membre_id
                  ) ??
                  "Membre inconnu"
                : "Sans membre",

            date_contribution:
              row.date_entree,

            contribution_created_at:
              row.created_at,

            montant_total:
              Number(
                row.montant ??
                  0
              ),

            statut:
              origine ===
              "REDISTRIBUTION_ENCHERES"
                ? "VERSEE"
                : "CREDITE",

            origine,

            lignes: [
              {
                ligne_id:
                  `caisse-entree-ligne-${row.id}`,

                rubrique_id:
                  row.rubrique_id,

                rubrique_nom:
                  rubrique?.nom ??
                  "Rubrique inconnue",

                montant_ligne:
                  Number(
                    row.montant ??
                      0
                  ),

                ordre_affichage:
                  rubrique
                    ?.ordre_affichage ??
                  0,

                ligne_statut:
                  "VALIDE",

                annule_at:
                  null,

                motif_annulation:
                  null,

                /*
                 * Une redistribution n'est pas une cotisation
                 * manuelle et ne doit pas être corrigée depuis
                 * les actions d'encaissement.
                 */
                modifiable:
                  false,

                retour_arriere_disponible:
                  false,
              },
            ],
          };
        }
      );

    // ========================================================
    // 5. HISTORIQUE UNIQUE
    // ========================================================

    const historique =
      [
        ...contributions,
        ...redistributions,
      ].sort(
        (a, b) => {
          const dateA =
            new Date(
              a.date_contribution
            ).getTime();

          const dateB =
            new Date(
              b.date_contribution
            ).getTime();

          if (
            dateA !== dateB
          ) {
            return (
              dateB -
              dateA
            );
          }

          const createdA =
            a.contribution_created_at
              ? new Date(
                  a.contribution_created_at
                ).getTime()
              : 0;

          const createdB =
            b.contribution_created_at
              ? new Date(
                  b.contribution_created_at
                ).getTime()
              : 0;

          return (
            createdB -
            createdA
          );
        }
      );

    return NextResponse.json({
      success: true,

      permissions: {
        can_manage_encaissements:
          canManage,
      },

      role_code:
        access.context?.role?.code ??
        null,

      filters: {
        membre_id:
          membreId ||
          null,

        annee:
          annee ||
          null,

        mois:
          mois ||
          null,

        rubrique_id:
          rubriqueId ||
          null,
      },

      count:
        historique.length,

      contributions:
        historique,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Impossible de charger l'historique des encaissements",
      },
      {
        status: 500,
      }
    );
  }
}


