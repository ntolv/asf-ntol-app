import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

function getAdminSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(
    url,
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

type OrigineDecaissement =
  | "MANUEL"
  | "PRET"
  | "TONTINE"
  | "AIDE";

function detectOrigine(
  row: any,
  pretIds: Set<string>
): OrigineDecaissement {
  if (row?.tontine_lot_id) {
    return "TONTINE";
  }

  if (
    row?.id &&
    pretIds.has(
      String(row.id)
    )
  ) {
    return "PRET";
  }

  const motif =
    String(
      row?.motif ?? ""
    )
      .trim()
      .toUpperCase();

  if (
    motif.startsWith(
      "AIDE / SECOURS APPROUVÉ - DEMANDE "
    ) ||
    motif.startsWith(
      "AIDE / SECOURS APPROUVE - DEMANDE "
    )
  ) {
    return "AIDE";
  }

  return "MANUEL";
}

export async function GET(
  request: NextRequest
) {
  try {
    // ========================================================
    // 1. AUTHENTIFICATION
    // ========================================================

    const supabaseAuth =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabaseAuth.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            authError?.message ||
            "Utilisateur non connecté.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // 2. CONTEXTE UTILISATEUR
    // ========================================================

    const context =
      await getUserContext(user);

    if (
      !context?.success ||
      !context?.membreId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            context?.message ||
            "Contexte utilisateur introuvable.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // 3. AUTORISATION BUREAU
    // ========================================================

    if (
      !isAuthorizedRole(
        context.role?.code
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vous n'êtes pas autorisé à consulter les décaissements.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // 4. PARAMETRES
    // ========================================================

    const supabase =
      getAdminSupabase();

    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const caisseId =
      searchParams.get(
        "caisse_id"
      );

    const rubriqueId =
      searchParams.get(
        "rubrique_id"
      );

    const membreId =
      searchParams.get(
        "membre_id"
      );

    const anneeParam =
      searchParams.get(
        "annee"
      );

    const moisParam =
      searchParams.get(
        "mois"
      );

    const statutParam =
      String(
        searchParams.get(
          "statut"
        ) ?? ""
      )
        .trim()
        .toUpperCase();

    const limitParam =
      searchParams.get(
        "limit"
      );

    const annee =
      anneeParam
        ? Number(anneeParam)
        : null;

    const mois =
      moisParam
        ? Number(moisParam)
        : null;

    if (
      anneeParam &&
      (
        !Number.isInteger(annee) ||
        Number(annee) < 2000 ||
        Number(annee) > 2100
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Année invalide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      moisParam &&
      (
        !Number.isInteger(mois) ||
        Number(mois) < 1 ||
        Number(mois) > 12
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mois invalide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      moisParam &&
      !anneeParam
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Une année doit être sélectionnée avec le mois.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      statutParam &&
      ![
        "VALIDE",
        "ANNULE",
        "TOUS",
      ].includes(
        statutParam
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Statut invalide.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // 5. DECAISSEMENTS
    // ========================================================

    let query =
      supabase
        .from(
          "v_decaissements"
        )
        .select("*")
        .order(
          "date_decaissement",
          {
            ascending: false,
          }
        );

    if (caisseId) {
      query =
        query.eq(
          "caisse_id",
          caisseId
        );
    }

    if (rubriqueId) {
      query =
        query.eq(
          "rubrique_id",
          rubriqueId
        );
    }

    if (membreId) {
      query =
        query.eq(
          "membre_id",
          membreId
        );
    }

    if (
      statutParam &&
      statutParam !== "TOUS"
    ) {
      query =
        query.eq(
          "statut",
          statutParam
        );
    }

    if (annee) {
      const debut =
        mois
          ? new Date(
              Date.UTC(
                annee,
                mois - 1,
                1
              )
            )
          : new Date(
              Date.UTC(
                annee,
                0,
                1
              )
            );

      const fin =
        mois
          ? new Date(
              Date.UTC(
                annee,
                mois,
                1
              )
            )
          : new Date(
              Date.UTC(
                annee + 1,
                0,
                1
              )
            );

      query =
        query
          .gte(
            "date_decaissement",
            debut.toISOString()
          )
          .lt(
            "date_decaissement",
            fin.toISOString()
          );
    }

    if (limitParam) {
      const parsedLimit =
        Number(
          limitParam
        );

      if (
        Number.isFinite(
          parsedLimit
        ) &&
        parsedLimit > 0
      ) {
        query =
          query.limit(
            parsedLimit
          );
      }
    }

    const {
      data,
      error,
    } =
      await query;

    if (error) {
      throw error;
    }

    const rows =
      data ?? [];

    const ids =
      rows
        .map(
          (row: any) =>
            String(
              row?.id ?? ""
            ).trim()
        )
        .filter(Boolean);

    // ========================================================
    // 6. IDENTIFICATION DES PRETS
    // ========================================================

    const pretIds =
      new Set<string>();

    if (ids.length > 0) {
      const {
        data: financements,
        error:
          financementsError,
      } =
        await supabase
          .from(
            "pret_financements"
          )
          .select(
            "decaissement_id"
          )
          .in(
            "decaissement_id",
            ids
          );

      if (
        financementsError
      ) {
        throw financementsError;
      }

      for (
        const financement of
        financements ?? []
      ) {
        if (
          financement
            ?.decaissement_id
        ) {
          pretIds.add(
            String(
              financement
                .decaissement_id
            )
          );
        }
      }
    }

    // ========================================================
    // 7. RETOURS ARRIERE DISPONIBLES
    // ========================================================

    const sourceJournals =
      new Map<
        string,
        Array<{
          id: string;
          action: string;
          created_at: string;
        }>
      >();

    const journauxAnnules =
      new Set<string>();

    if (ids.length > 0) {
      const {
        data: journaux,
        error:
          journauxError,
      } =
        await supabase
          .from(
            "journal_modifications"
          )
          .select(
            "id, entite_id, action, metadata, created_at"
          )
          .eq(
            "entite",
            "DECAISSEMENT"
          )
          .in(
            "entite_id",
            ids
          )
          .in(
            "action",
            [
              "CORRECTION",
              "ANNULATION",
              "RETOUR_ARRIERE",
            ]
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (journauxError) {
        throw journauxError;
      }

      for (
        const journal of
        journaux ?? []
      ) {
        const action =
          String(
            journal?.action ??
            ""
          ).toUpperCase();

        const entiteId =
          String(
            journal?.entite_id ??
            ""
          );

        if (
          action ===
          "RETOUR_ARRIERE"
        ) {
          const metadata =
            (
              journal?.metadata ??
              {}
            ) as Record<
              string,
              unknown
            >;

          const sourceId =
            String(
              metadata
                ?.journal_source_id ??
              ""
            ).trim();

          if (sourceId) {
            journauxAnnules.add(
              sourceId
            );
          }

          continue;
        }

        if (
          action !==
            "CORRECTION" &&
          action !==
            "ANNULATION"
        ) {
          continue;
        }

        if (
          !sourceJournals.has(
            entiteId
          )
        ) {
          sourceJournals.set(
            entiteId,
            []
          );
        }

        sourceJournals
          .get(entiteId)!
          .push({
            id:
              String(
                journal.id
              ),
            action,
            created_at:
              String(
                journal
                  .created_at ??
                ""
              ),
          });
      }
    }

    const enrichedRows =
      rows.map(
        (row: any) => {
          const id =
            String(
              row?.id ?? ""
            );

          const origine =
            detectOrigine(
              row,
              pretIds
            );

          const statut =
            String(
              row?.statut ??
              "VALIDE"
            )
              .trim()
              .toUpperCase();

          const historique =
            sourceJournals.get(
              id
            ) ?? [];

          const journalRestaurable =
            historique.find(
              (journal) =>
                !journauxAnnules.has(
                  journal.id
                )
            );

          const canCorriger =
            statut ===
            "VALIDE";

          const canAnnuler =
            statut ===
              "VALIDE" &&
            ![
              "PRET",
              "AIDE",
            ].includes(
              origine
            );

          const canRevenirArriere =
            Boolean(
              journalRestaurable
            );

          return {
            ...row,

            origine,

            can_corriger:
              canCorriger,

            can_annuler:
              canAnnuler,

            can_revenir_arriere:
              canRevenirArriere,

            derniere_action_restaurable:
              journalRestaurable
                ?.action ??
              null,

            protection_source:
              [
                "PRET",
                "TONTINE",
                "AIDE",
              ].includes(
                origine
              ),
          };
        }
      );

    // ========================================================
    // 8. ANNEES DISPONIBLES
    // ========================================================

    const {
      data: anneesRows,
      error: anneesError,
    } =
      await supabase
        .from(
          "v_decaissements"
        )
        .select(
          "date_decaissement"
        )
        .order(
          "date_decaissement",
          {
            ascending: false,
          }
        );

    if (anneesError) {
      throw anneesError;
    }

    const annees =
      Array.from(
        new Set(
          (
            anneesRows ??
            []
          )
            .map(
              (row: any) => {
                const value =
                  row
                    ?.date_decaissement;

                if (!value) {
                  return null;
                }

                const date =
                  new Date(
                    value
                  );

                if (
                  Number.isNaN(
                    date.getTime()
                  )
                ) {
                  return null;
                }

                return String(
                  date
                    .getUTCFullYear()
                );
              }
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(
                  value
                )
            )
        )
      ).sort(
        (
          a,
          b
        ) =>
          Number(b) -
          Number(a)
      );

    // ========================================================
    // 9. RESUME
    // ========================================================

    const totalValide =
      enrichedRows.reduce(
        (
          total,
          row: any
        ) =>
          total +
          (
            String(
              row?.statut ??
              ""
            ).toUpperCase() ===
            "VALIDE"
              ? Number(
                  row?.montant ??
                  0
                )
              : 0
          ),
        0
      );

    const totalAnnule =
      enrichedRows.reduce(
        (
          total,
          row: any
        ) =>
          total +
          (
            String(
              row?.statut ??
              ""
            ).toUpperCase() ===
            "ANNULE"
              ? Number(
                  row?.montant ??
                  0
                )
              : 0
          ),
        0
      );

    return NextResponse.json(
      {
        success: true,

        count:
          enrichedRows.length,

        permissions: {
          can_manage: true,
        },

        annees,

        resume: {
          total_valide:
            totalValide,

          total_annule:
            totalAnnule,

          nombre_valides:
            enrichedRows.filter(
              (row: any) =>
                String(
                  row?.statut ??
                  ""
                ).toUpperCase() ===
                "VALIDE"
            ).length,

          nombre_annules:
            enrichedRows.filter(
              (row: any) =>
                String(
                  row?.statut ??
                  ""
                ).toUpperCase() ===
                "ANNULE"
            ).length,
        },

        data:
          enrichedRows,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "Erreur serveur GET /api/decaissements:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors du chargement des décaissements.",
      },
      {
        status: 500,
      }
    );
  }
}