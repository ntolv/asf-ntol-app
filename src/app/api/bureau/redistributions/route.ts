import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

type Row = Record<string, any>;

function n(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function isBureauRole(
  role:
    | {
        code?: string | null;
        libelle?: string | null;
      }
    | null
    | undefined
) {
  const raw =
    `${role?.code ?? ""} ${role?.libelle ?? ""}`.toLowerCase();

  return (
    raw.includes("admin") ||
    raw.includes("président") ||
    raw.includes("president") ||
    raw.includes("trésorier") ||
    raw.includes("tresorier")
  );
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function requireBureau() {
  const auth =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      status: 401,
      message: "Utilisateur non connecté.",
      user: null,
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
      user,
      context,
    };
  }

  if (!isBureauRole(context.role)) {
    return {
      ok: false as const,
      status: 403,
      message:
        "Cette page est réservée aux membres du Bureau.",
      user,
      context,
    };
  }

  return {
    ok: true as const,
    user,
    context,
  };
}

export async function GET() {
  try {
    const access =
      await requireBureau();

    if (!access.ok) {
      return NextResponse.json(
        {
          success: false,
          message: access.message,
          data: null,
        },
        { status: access.status }
      );
    }

    const supabase =
      getAdminClient();

    const [
      redistributionsResult,
      executionsResult,
    ] = await Promise.all([
      supabase
        .from("tontine_redistributions")
        .select(
          "id, cycle_id, membre_id, montant_redistribue, base_calcul_total_relances, nombre_beneficiaires, date_redistribution, statut_redistribution, commentaire, rubrique_destination_id, caisse_destination_id, annee_generation, annee_affectation_prevue, created_at, updated_at"
        )
        .order(
          "annee_affectation_prevue",
          { ascending: false }
        )
        .order(
          "created_at",
          { ascending: false }
        ),

      supabase
        .from(
          "tontine_redistribution_executions"
        )
        .select(
          "id, redistribution_id, beneficiaire_membre_id, execute_par_membre_id, execute_par_user_id, mode_execution, action, montant, rubrique_destination_id, caisse_destination_id, caisse_entree_id, date_entree, role_snapshot, commentaire, date_execution, created_at"
        )
        .order(
          "date_execution",
          { ascending: false }
        ),
    ]);

    if (redistributionsResult.error) {
      throw redistributionsResult.error;
    }

    if (executionsResult.error) {
      throw executionsResult.error;
    }

    const redistributions =
      (redistributionsResult.data ?? []) as Row[];

    const executions =
      (executionsResult.data ?? []) as Row[];

    const membreIds = Array.from(
      new Set(
        [
          ...redistributions.map(
            (row) => row.membre_id
          ),
          ...executions.map(
            (row) =>
              row.beneficiaire_membre_id
          ),
          ...executions.map(
            (row) =>
              row.execute_par_membre_id
          ),
        ].filter(Boolean)
      )
    );

    const rubriqueIds = Array.from(
      new Set(
        [
          ...redistributions.map(
            (row) =>
              row.rubrique_destination_id
          ),
          ...executions.map(
            (row) =>
              row.rubrique_destination_id
          ),
        ].filter(Boolean)
      )
    );

    let membres: Row[] = [];
    let rubriques: Row[] = [];

    if (membreIds.length > 0) {
      const result =
        await supabase
          .from("membres")
          .select(
            "id, numero_membre, nom_complet"
          )
          .in("id", membreIds);

      if (result.error) {
        throw result.error;
      }

      membres =
        (result.data ?? []) as Row[];
    }

    if (rubriqueIds.length > 0) {
      const result =
        await supabase
          .from("rubriques")
          .select("id, code, nom")
          .in("id", rubriqueIds);

      if (result.error) {
        throw result.error;
      }

      rubriques =
        (result.data ?? []) as Row[];
    }

    const membresParId =
      new Map(
        membres.map((row) => [
          String(row.id),
          row,
        ])
      );

    const rubriquesParId =
      new Map(
        rubriques.map((row) => [
          String(row.id),
          row,
        ])
      );

    const lignes: Row[] =
      redistributions.map((row): Row => {
        const membre =
          membresParId.get(
            String(row.membre_id)
          ) ?? null;

        const rubrique =
          row.rubrique_destination_id
            ? rubriquesParId.get(
                String(
                  row.rubrique_destination_id
                )
              ) ?? null
            : null;

        return {
          ...row,

          montant_redistribue:
            n(row.montant_redistribue),

          membre: membre
            ? {
                id: membre.id,
                numero_membre:
                  membre.numero_membre,
                nom_complet:
                  membre.nom_complet,
              }
            : null,

          destination: rubrique
            ? {
                id: rubrique.id,
                code: rubrique.code,
                nom: rubrique.nom,
              }
            : null,

          situation:
            row.statut_redistribution ===
            "CALCULEE"
              ? "DESTINATION_A_CHOISIR"
              : row.statut_redistribution ===
                "VALIDEE"
              ? "VERSEMENT_A_EFFECTUER"
              : row.statut_redistribution ===
                "VERSEE"
              ? "TERMINE"
              : row.statut_redistribution,
        };
      });

    const journal =
      executions.map((row) => {
        const beneficiaire =
          membresParId.get(
            String(
              row.beneficiaire_membre_id
            )
          ) ?? null;

        const executant =
          membresParId.get(
            String(
              row.execute_par_membre_id
            )
          ) ?? null;

        const rubrique =
          rubriquesParId.get(
            String(
              row.rubrique_destination_id
            )
          ) ?? null;

        return {
          ...row,

          montant:
            n(row.montant),

          beneficiaire:
            beneficiaire
              ? {
                  id:
                    beneficiaire.id,

                  numero_membre:
                    beneficiaire.numero_membre,

                  nom_complet:
                    beneficiaire.nom_complet,
                }
              : null,

          executant:
            executant
              ? {
                  id:
                    executant.id,

                  numero_membre:
                    executant.numero_membre,

                  nom_complet:
                    executant.nom_complet,
                }
              : null,

          destination:
            rubrique
              ? {
                  id:
                    rubrique.id,

                  code:
                    rubrique.code,

                  nom:
                    rubrique.nom,
                }
              : null,
        };
      });

    const synthese = {
      calculees: {
        nombre:
          lignes.filter(
            (row) =>
              row.statut_redistribution ===
              "CALCULEE"
          ).length,

        montant:
          lignes
            .filter(
              (row) =>
                row.statut_redistribution ===
                "CALCULEE"
            )
            .reduce(
              (total, row) =>
                total +
                n(row.montant_redistribue),
              0
            ),
      },

      validees: {
        nombre:
          lignes.filter(
            (row) =>
              row.statut_redistribution ===
              "VALIDEE"
          ).length,

        montant:
          lignes
            .filter(
              (row) =>
                row.statut_redistribution ===
                "VALIDEE"
            )
            .reduce(
              (total, row) =>
                total +
                n(row.montant_redistribue),
              0
            ),
      },

      versees: {
        nombre:
          lignes.filter(
            (row) =>
              row.statut_redistribution ===
              "VERSEE"
          ).length,

        montant:
          lignes
            .filter(
              (row) =>
                row.statut_redistribution ===
                "VERSEE"
            )
            .reduce(
              (total, row) =>
                total +
                n(row.montant_redistribue),
              0
            ),
      },
    };

    const annees = Array.from(
      new Set(
        lignes
          .map(
            (row) =>
              Number(
                row.annee_affectation_prevue
              )
          )
          .filter(Number.isFinite)
      )
    ).sort(
      (a, b) => b - a
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Surveillance Bureau chargée.",

        data: {
          synthese,
          redistributions:
            lignes,
          journal,
          membres,
          annees,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Erreur GET /api/bureau/redistributions:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Erreur lors du chargement du Dashboard Bureau.",

        data: null,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const access =
      await requireBureau();

    if (!access.ok) {
      return NextResponse.json(
        {
          success: false,
          message: access.message,
          data: null,
        },
        { status: access.status }
      );
    }

    const body =
      await request.json();

    const redistributionId =
      String(
        body?.redistribution_id ?? ""
      ).trim();

    if (!redistributionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Redistribution obligatoire.",
          data: null,
        },
        { status: 400 }
      );
    }

    const supabase =
      getAdminClient();

    const {
      data: redistribution,
      error: redistributionError,
    } = await supabase
      .from("tontine_redistributions")
      .select(
        "id, membre_id, statut_redistribution, rubrique_destination_id, caisse_destination_id, annee_affectation_prevue"
      )
      .eq(
        "id",
        redistributionId
      )
      .maybeSingle();

    if (redistributionError) {
      throw redistributionError;
    }

    if (!redistribution) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Redistribution introuvable.",
          data: null,
        },
        { status: 404 }
      );
    }

    if (
      redistribution
        .statut_redistribution !==
      "VALIDEE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Seule une redistribution VALIDEE peut être exécutée par le Bureau.",
          data: null,
        },
        { status: 409 }
      );
    }

    if (
      !redistribution
        .rubrique_destination_id ||
      !redistribution
        .caisse_destination_id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Destination de redistribution incomplète.",
          data: null,
        },
        { status: 409 }
      );
    }

    const dateEntree =
      new Date()
        .toISOString()
        .slice(0, 10);

    const anneeEntree =
      Number(
        dateEntree.slice(0, 4)
      );

    if (
      anneeEntree !==
      Number(
        redistribution
          .annee_affectation_prevue
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `Cette redistribution doit être affectée en ${redistribution.annee_affectation_prevue}.`,

          data: null,
        },
        { status: 409 }
      );
    }

    const roleSnapshot =
      `${
        access.context.role?.code ??
        ""
      } ${
        access.context.role?.libelle ??
        ""
      }`.trim() || null;

    const {
      data: execution,
      error: executionError,
    } = await supabase.rpc(
      "fn_tontine_executer_redistribution",
      {
        p_redistribution_id:
          redistributionId,

        p_date_entree:
          dateEntree,

        p_execute_par_membre_id:
          access.context.membreId,

        p_execute_par_user_id:
          access.user.id,

        p_role_snapshot:
          roleSnapshot,
      }
    );

    if (executionError) {
      throw executionError;
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Redistribution exécutée par le Bureau.",
        data: {
          execution,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Erreur POST /api/bureau/redistributions:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Erreur lors de l'exécution de la redistribution.",

        data: null,
      },
      { status: 500 }
    );
  }
}