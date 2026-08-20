import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

type Row = Record<string, any>;

function n(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function isBureauRole(
  role: { code?: string | null; libelle?: string | null } | null | undefined
) {
  const raw = `${role?.code ?? ""} ${role?.libelle ?? ""}`.toLowerCase();

  return (
    raw.includes("admin") ||
    raw.includes("président") ||
    raw.includes("president") ||
    raw.includes("trésorier") ||
    raw.includes("tresorier")
  );
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();

  const authCookie = cookieStore
    .getAll()
    .find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  const authTokenCookie = authCookie?.value;

  if (!authTokenCookie) {
    throw new Error("Cookie d'authentification manquant");
  }

  let accessToken: string | null = null;

  try {
    let session: any;

    if (authTokenCookie.startsWith("base64-")) {
      const encoded = authTokenCookie.replace(/^base64-/, "");

      session = JSON.parse(
        Buffer.from(encoded, "base64").toString("utf8")
      );
    } else {
      session = JSON.parse(atob(authTokenCookie));
    }

    accessToken = session.access_token ?? null;
  } catch {
    throw new Error("Cookie d'authentification invalide");
  }

  if (!accessToken) {
    throw new Error("Access token manquant dans le cookie");
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const { data, error } =
    await supabaseAuth.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error(
      error?.message || "Utilisateur non connecté"
    );
  }

  return data.user;
}

function sum(rows: Row[], field: string) {
  return rows.reduce(
    (total, row) => total + n(row[field]),
    0
  );
}

export async function GET(request: NextRequest) {
  try {
    // ========================================================
    // AUTHENTIFICATION
    // ========================================================

    const user = await getAuthenticatedUser();
    const context = await getUserContext(user);

    if (!context?.success || !context?.membreId) {
      return NextResponse.json(
        {
          success: false,
          message:
            context?.message ||
            "Membre associé à l'utilisateur introuvable.",
          data: null,
        },
        { status: 401 }
      );
    }

    const membreId = context.membreId;
    const isBureau = isBureauRole(context.role);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // ========================================================
    // MEMBRE CONNECTE
    // ========================================================

    const { data: membre, error: membreError } =
      await supabase
        .from("membres")
        .select(
          "id, numero_membre, nom, prenom, nom_complet, photo_url, est_tontineur_defaut, statut_associatif, actif"
        )
        .eq("id", membreId)
        .maybeSingle();

    if (membreError) {
      throw membreError;
    }

    if (!membre) {
      return NextResponse.json(
        {
          success: false,
          message: "Membre introuvable.",
          data: null,
        },
        { status: 404 }
      );
    }

    // ========================================================
    // ANNEES DISPONIBLES
    // ========================================================

    const { data: anneesRows, error: anneesError } =
      await supabase
        .from("v_bilan_asf_ntol_pro_max")
        .select("annee")
        .order("annee", { ascending: false });

    if (anneesError) {
      throw anneesError;
    }

    const annees = Array.from(
      new Set(
        (anneesRows ?? [])
          .map((row: any) => Number(row.annee))
          .filter((annee) => Number.isFinite(annee))
      )
    ).sort((a, b) => b - a);

    const anneeParam =
      request.nextUrl.searchParams.get("annee");

    const anneeDemandee = anneeParam
      ? Number(anneeParam)
      : NaN;

    const anneeCourante = new Date().getFullYear();

    const anneeSelectionnee =
      Number.isFinite(anneeDemandee) &&
      annees.includes(anneeDemandee)
        ? anneeDemandee
        : annees.includes(anneeCourante)
        ? anneeCourante
        : annees[0] ?? anneeCourante;

    const dateDebut =
      `${anneeSelectionnee}-01-01T00:00:00.000Z`;

    const dateFin =
      `${anneeSelectionnee + 1}-01-01T00:00:00.000Z`;

    // ========================================================
    // DONNEES ANNUELLES
    // ========================================================

    const [
      contributionsResult,
      pretsResult,
      tontineResult,
      aidesResult,
      cyclesResult,
    ] = await Promise.all([
      // ------------------------------------------------------
      // Contributions / reports / intérêts crédités
      // ------------------------------------------------------

      supabase
        .from("v_dashboard_membre_contributions_exercice")
        .select("*")
        .eq("annee", anneeSelectionnee)
        .eq("membre_id", membreId)
        .order("rubrique_nom", { ascending: true }),

      // ------------------------------------------------------
      // Situation annuelle des prêts
      // La vue Bilan gère aussi les reports de prêts N-1.
      // ------------------------------------------------------

      supabase
        .from("v_bilan_prets_membres_exercice")
        .select("*")
        .eq("annee", anneeSelectionnee)
        .eq("membre_id", membreId),

      // ------------------------------------------------------
      // Situation Tontine annuelle du membre
      // ------------------------------------------------------

      supabase
        .from("v_bilan_tontine")
        .select("*")
        .eq("annee", anneeSelectionnee)
        .eq("membre_id", membreId),

      // ------------------------------------------------------
      // Demandes d'aides créées pendant l'exercice
      // ------------------------------------------------------

      supabase
        .from("demandes_aides")
        .select(
          "id, membre_id, montant_demande, montant_accorde, motif, statut, created_at, date_traitement, commentaire_decision"
        )
        .eq("membre_id", membreId)
        .gte("created_at", dateDebut)
        .lt("created_at", dateFin)
        .order("created_at", { ascending: false }),

      // ------------------------------------------------------
      // Cycle(s) Tontine de l'exercice
      // ------------------------------------------------------

      supabase
        .from("tontine_cycles")
        .select(
          "id, code, libelle, annee_reference, date_debut, date_fin, statut_cycle, actif"
        )
        .eq("annee_reference", anneeSelectionnee)
        .order("date_debut", { ascending: true }),
    ]);

    if (contributionsResult.error) {
      throw contributionsResult.error;
    }

    if (pretsResult.error) {
      throw pretsResult.error;
    }

    if (tontineResult.error) {
      throw tontineResult.error;
    }

    if (aidesResult.error) {
      throw aidesResult.error;
    }

    if (cyclesResult.error) {
      throw cyclesResult.error;
    }

    const contributions =
      (contributionsResult.data ?? []) as Row[];

    const prets =
      (pretsResult.data ?? []) as Row[];

    const tontine =
      (tontineResult.data ?? []) as Row[];

    const aides =
      (aidesResult.data ?? []) as Row[];

    const cycles =
      (cyclesResult.data ?? []) as Row[];

    // ========================================================
    // PARTICIPATION TONTINE
    // ========================================================

    let participationTontine = false;
    let participations: Row[] = [];

    const cycleIds = cycles
      .map((cycle) => String(cycle.id ?? ""))
      .filter(Boolean);

    if (cycleIds.length > 0) {
      const { data, error } = await supabase
        .from("tontine_participants")
        .select("*")
        .eq("membre_id", membreId)
        .in("cycle_id", cycleIds);

      if (error) {
        throw error;
      }

      participations = (data ?? []) as Row[];
      participationTontine = participations.length > 0;
    }

    // Une donnée historique de Tontine constitue également
    // une preuve de participation à l'exercice concerné.
    if (tontine.length > 0) {
      participationTontine = true;
    }

    // ========================================================
    // SYNTHESE CONTRIBUTIONS
    // ========================================================

    const obligations = contributions.filter(
      (row) => row.obligation_parametree === true
    );

    const montantAttendu = obligations.reduce(
      (total, row) =>
        total + n(row.montant_attendu_annuel),
      0
    );

    const resteAVerser = obligations.reduce(
      (total, row) =>
        total + n(row.reste_a_verser),
      0
    );

    const totalReports =
      sum(contributions, "report_precedent");

    const totalEncaissements =
      sum(contributions, "encaissements_annee");

    const totalInteretsCredites =
      sum(
        contributions,
        "interets_prets_credites_annee"
      );

    const totalActif =
      sum(contributions, "total_actif");

    let statutContributions:
      | "NON_EVALUE"
      | "A_JOUR"
      | "A_REGULARISER" = "NON_EVALUE";

    if (obligations.length > 0) {
      statutContributions =
        resteAVerser > 0
          ? "A_REGULARISER"
          : "A_JOUR";
    }

    // ========================================================
    // SYNTHESE AIDES
    // ========================================================

    const totalAidesDemandees = aides.reduce(
      (total, aide) =>
        total + n(aide.montant_demande),
      0
    );

    const totalAidesAccordees = aides.reduce(
      (total, aide) =>
        total + n(aide.montant_accorde),
      0
    );

    // ========================================================
    // REPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,
        message: "Dashboard annuel chargé",

        data: {
          annees,
          anneeSelectionnee,

          utilisateur: {
            is_bureau: isBureau,
          },

          membre: {
            ...membre,
          },

          contributions: {
            synthese: {
              nb_obligations_parametrees:
                obligations.length,

              montant_attendu:
                montantAttendu,

              report_precedent:
                totalReports,

              encaissements_annee:
                totalEncaissements,

              interets_prets_credites:
                totalInteretsCredites,

              total_actif:
                totalActif,

              reste_a_verser:
                obligations.length > 0
                  ? resteAVerser
                  : null,

              statut:
                statutContributions,
            },

            rubriques:
              contributions,
          },

          prets: {
            lignes: prets,
          },

          interets: {
            total_credite_annee:
              totalInteretsCredites,

            rubriques:
              contributions
                .filter(
                  (row) =>
                    n(
                      row.interets_prets_credites_annee
                    ) !== 0
                )
                .map((row) => ({
                  rubrique_id:
                    row.rubrique_id,

                  rubrique_nom:
                    row.rubrique_nom,

                  montant:
                    n(
                      row.interets_prets_credites_annee
                    ),
                })),
          },

          aides: {
            total_demande:
              totalAidesDemandees,

            total_accorde:
              totalAidesAccordees,

            demandes:
              aides,
          },

          tontine: {
            est_tontineur_cycle:
              participationTontine,

            est_tontineur_defaut:
              membre.est_tontineur_defaut === true,

            cycles,
            participations,
            bilan:
              tontine,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Erreur GET /api/dashboard:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Erreur lors du chargement du Dashboard.",

        data: null,
      },
      { status: 500 }
    );
  }
}