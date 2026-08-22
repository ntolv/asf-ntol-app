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
        "Cette opération est réservée aux membres du Bureau.",
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

function currentBusinessDate() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Europe/Paris",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(new Date());

  const year =
    parts.find(
      (part) => part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) => part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) => part.type === "day"
    )?.value;

  if (!year || !month || !day) {
    throw new Error(
      "Impossible de déterminer la date métier."
    );
  }

  return `${year}-${month}-${day}`;
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
      distributionsResult,
      executionsResult,
    ] = await Promise.all([
      supabase
        .from(
          "pret_distributions_interets"
        )
        .select(
          "id, demande_pret_id, pret_id, remboursement_id, membre_id, montant_interet_distribue, date_distribution, created_at, rubrique_id, caisse_source_id, annee_generation, annee_affectation_prevue, statut_affectation, date_affectation"
        )
        .order(
          "annee_affectation_prevue",
          { ascending: false }
        )
        .order(
          "date_distribution",
          { ascending: false }
        ),

      supabase
        .from(
          "pret_interets_credit_executions"
        )
        .select(
          "id, distribution_id, beneficiaire_membre_id, execute_par_membre_id, execute_par_user_id, montant, rubrique_id, caisse_id, caisse_entree_id, credit_membre_id, date_credit, role_snapshot, commentaire, date_execution, created_at"
        )
        .order(
          "date_execution",
          { ascending: false }
        ),
    ]);

    if (distributionsResult.error) {
      throw distributionsResult.error;
    }

    if (executionsResult.error) {
      throw executionsResult.error;
    }

    const distributions =
      (distributionsResult.data ??
        []) as Row[];

    const executions =
      (executionsResult.data ??
        []) as Row[];

    const membreIds = Array.from(
      new Set(
        [
          ...distributions.map(
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
          ...distributions.map(
            (row) => row.rubrique_id
          ),

          ...executions.map(
            (row) => row.rubrique_id
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
          .select(
            "id, code, nom"
          )
          .in(
            "id",
            rubriqueIds
          );

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
      distributions.map(
        (row): Row => {
          const membre =
            membresParId.get(
              String(row.membre_id)
            ) ?? null;

          const rubrique =
            rubriquesParId.get(
              String(row.rubrique_id)
            ) ?? null;

          return {
            ...row,

            montant_interet_distribue:
              n(
                row.montant_interet_distribue
              ),

            membre: membre
              ? {
                  id: membre.id,

                  numero_membre:
                    membre.numero_membre,

                  nom_complet:
                    membre.nom_complet,
                }
              : null,

            rubrique: rubrique
              ? {
                  id: rubrique.id,
                  code: rubrique.code,
                  nom: rubrique.nom,
                }
              : null,
          };
        }
      );

    const journal: Row[] =
      executions.map(
        (row): Row => {
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
              String(row.rubrique_id)
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

            rubrique:
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
        }
      );

    const annees = Array.from(
      new Set(
        lignes
          .map((row) =>
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

        data: {
          distributions:
            lignes,

          journal,

          annees,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Erreur GET /api/bureau/interets:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Impossible de charger la surveillance des intérêts.",

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

    const distributionId =
      String(
        body?.distribution_id ?? ""
      ).trim();

    if (!distributionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Distribution d'intérêt obligatoire.",
          data: null,
        },
        { status: 400 }
      );
    }

    const supabase =
      getAdminClient();

    const {
      data: distribution,
      error: distributionError,
    } = await supabase
      .from(
        "pret_distributions_interets"
      )
      .select(
        "id, membre_id, montant_interet_distribue, rubrique_id, caisse_source_id, annee_generation, annee_affectation_prevue, statut_affectation"
      )
      .eq(
        "id",
        distributionId
      )
      .maybeSingle();

    if (distributionError) {
      throw distributionError;
    }

    if (!distribution) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Distribution d'intérêt introuvable.",
          data: null,
        },
        { status: 404 }
      );
    }

    if (
      distribution
        .statut_affectation !==
      "A_CREDITER_N_PLUS_1"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Cette distribution n'est plus en attente de crédit.",

          data: null,
        },
        { status: 409 }
      );
    }

    const dateCredit =
      currentBusinessDate();

    const anneeCredit =
      Number(
        dateCredit.slice(0, 4)
      );

    if (
      anneeCredit !==
      Number(
        distribution
          .annee_affectation_prevue
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `Cet intérêt doit être crédité en ${distribution.annee_affectation_prevue}.`,

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
      "fn_crediter_distribution_interet_bureau",
      {
        p_distribution_id:
          distributionId,

        p_date_credit:
          dateCredit,

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
          "Intérêt crédité avec succès.",

        data: {
          execution,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Erreur POST /api/bureau/interets:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Impossible de créditer cet intérêt.",

        data: null,
      },
      { status: 500 }
    );
  }
}