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
      redistributionsResult,
      destinationsRedistributionResult,
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

      // ------------------------------------------------------
      // Redistribu­tions d'enchères affectables pendant l'exercice
      // ------------------------------------------------------

      supabase
        .from("tontine_redistributions")
        .select(
          "id, cycle_id, membre_id, montant_redistribue, base_calcul_total_relances, nombre_beneficiaires, date_redistribution, statut_redistribution, commentaire, rubrique_destination_id, caisse_destination_id, annee_generation, annee_affectation_prevue"
        )
        .eq("membre_id", membreId)
        .eq("annee_affectation_prevue", anneeSelectionnee)
        .order("annee_generation", { ascending: true }),

      // ------------------------------------------------------
      // Destinations autorisées pour les enchères
      // ------------------------------------------------------

      supabase
        .from("rubriques")
        .select("id, code, nom")
        .in("code", ["EPARGNE", "INVESTISSEMENT"])
        .order("nom", { ascending: true }),
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

    if (redistributionsResult.error) {
      throw redistributionsResult.error;
    }

    if (destinationsRedistributionResult.error) {
      throw destinationsRedistributionResult.error;
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

    const redistributions =
      (redistributionsResult.data ?? []) as Row[];

    const destinationsRedistribution =
      (destinationsRedistributionResult.data ?? []) as Row[];

    const destinationsParId = new Map(
      destinationsRedistribution.map((row) => [
        String(row.id),
        row,
      ])
    );

    const redistributionsEnrichies =
      redistributions.map((row) => {
        const destination =
          row.rubrique_destination_id
            ? destinationsParId.get(
                String(row.rubrique_destination_id)
              ) ?? null
            : null;

        return {
          ...row,

          montant_redistribue:
            n(row.montant_redistribue),

          statut:
            row.statut_redistribution,

          destination:
            destination
              ? {
                  rubrique_id:
                    destination.id,

                  code:
                    destination.code,

                  nom:
                    destination.nom,
                }
              : null,
        };
      });

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

            redistributions: {
              lignes:
                redistributionsEnrichies,

              destinations:
                destinationsRedistribution,
            },
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
export async function POST(request: NextRequest) {
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

    // ========================================================
    // ACTION DEMANDEE
    // ========================================================

    const body = await request.json();

    /*
     * Compatibilité avec le frontend actuel :
     * sans action explicite, on considère qu'il s'agit
     * du choix de destination déjà existant.
     */
    const action = String(
      body?.action ?? "VALIDER_DESTINATION"
    )
      .trim()
      .toUpperCase();

    const redistributionId =
      String(body?.redistribution_id ?? "").trim();

    const rubriqueDestinationId =
      String(body?.rubrique_destination_id ?? "").trim();

    if (!redistributionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Redistribution obligatoire.",
          data: null,
        },
        { status: 400 }
      );
    }

    if (
      action !== "VALIDER_DESTINATION" &&
      action !== "VERSER_REDISTRIBUTION"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Action de redistribution non reconnue.",
          data: null,
        },
        { status: 400 }
      );
    }

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
    // REDISTRIBUTION
    // ========================================================

    const {
      data: redistribution,
      error: redistributionError,
    } = await supabase
      .from("tontine_redistributions")
      .select(
        "id, cycle_id, membre_id, montant_redistribue, statut_redistribution, rubrique_destination_id, caisse_destination_id, annee_generation, annee_affectation_prevue, date_redistribution, commentaire"
      )
      .eq("id", redistributionId)
      .maybeSingle();

    if (redistributionError) {
      throw redistributionError;
    }

    if (!redistribution) {
      return NextResponse.json(
        {
          success: false,
          message: "Redistribution introuvable.",
          data: null,
        },
        { status: 404 }
      );
    }

    /*
     * Cette route appartient à la page personnelle du membre.
     * Elle ne permet donc d'agir que sur sa propre redistribution.
     *
     * Le contrôle Bureau sera traité séparément.
     */
    if (
      String(redistribution.membre_id) !==
      String(membreId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vous ne pouvez pas modifier cette redistribution.",
          data: null,
        },
        { status: 403 }
      );
    }

    // ========================================================
    // ACTION 1 : CHOIX DE LA DESTINATION
    // CALCULEE -> VALIDEE
    // ========================================================

    if (action === "VALIDER_DESTINATION") {
      if (!rubriqueDestinationId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Rubrique de destination obligatoire.",
            data: null,
          },
          { status: 400 }
        );
      }

      if (
        redistribution.statut_redistribution !==
        "CALCULEE"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Cette redistribution a déjà été validée ou traitée.",
            data: null,
          },
          { status: 409 }
        );
      }

      const {
        data: rubriqueDestination,
        error: rubriqueError,
      } = await supabase
        .from("rubriques")
        .select("id, code, nom")
        .eq("id", rubriqueDestinationId)
        .in("code", [
          "EPARGNE",
          "INVESTISSEMENT",
        ])
        .maybeSingle();

      if (rubriqueError) {
        throw rubriqueError;
      }

      if (!rubriqueDestination) {
        return NextResponse.json(
          {
            success: false,
            message:
              "La destination doit être Épargne ou Fonds Développement / Investissement.",
            data: null,
          },
          { status: 400 }
        );
      }

      const { error: rpcError } =
        await supabase.rpc(
          "fn_tontine_valider_destination_redistribution",
          {
            p_redistribution_id:
              redistributionId,

            p_rubrique_destination_id:
              rubriqueDestinationId,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      const {
        data: redistributionValidee,
        error: validationReadError,
      } = await supabase
        .from("tontine_redistributions")
        .select(
          "id, cycle_id, membre_id, montant_redistribue, statut_redistribution, rubrique_destination_id, caisse_destination_id, annee_generation, annee_affectation_prevue, date_redistribution, commentaire"
        )
        .eq("id", redistributionId)
        .single();

      if (validationReadError) {
        throw validationReadError;
      }

      return NextResponse.json(
        {
          success: true,

          message:
            "Destination de la redistribution enregistrée.",

          data: {
            redistribution:
              redistributionValidee,

            destination: {
              rubrique_id:
                rubriqueDestination.id,

              code:
                rubriqueDestination.code,

              nom:
                rubriqueDestination.nom,
            },
          },
        },
        { status: 200 }
      );
    }

    // ========================================================
    // ACTION 2 : VERSEMENT
    // VALIDEE -> VERSEE
    // ========================================================

    if (
      redistribution.statut_redistribution !==
      "VALIDEE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Seule une redistribution validée peut être versée.",
          data: null,
        },
        { status: 409 }
      );
    }

    if (
      !redistribution.rubrique_destination_id ||
      !redistribution.caisse_destination_id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La redistribution ne possède pas de destination complète.",
          data: null,
        },
        { status: 409 }
      );
    }

    /*
     * Date réelle d'exécution.
     * Le timestamp détaillé est aussi conservé automatiquement
     * dans le journal PostgreSQL.
     */
    const dateEntree =
      new Date().toISOString().slice(0, 10);

    const anneeEntree =
      Number(dateEntree.slice(0, 4));

    if (
      anneeEntree !==
      Number(
        redistribution.annee_affectation_prevue
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
      `${context.role?.code ?? ""} ${
        context.role?.libelle ?? ""
      }`.trim() || null;

    /*
     * Fonction atomique :
     *
     * VALIDEE -> VERSEE
     * + caisse_entrees
     * + journal d'exécution
     *
     * En cas d'erreur, PostgreSQL annule l'ensemble.
     */
    const {
      data: executionResult,
      error: executionError,
    } = await supabase.rpc(
      "fn_tontine_executer_redistribution",
      {
        p_redistribution_id:
          redistributionId,

        p_date_entree:
          dateEntree,

        p_execute_par_membre_id:
          membreId,

        p_execute_par_user_id:
          user.id,

        p_role_snapshot:
          roleSnapshot,
      }
    );

    if (executionError) {
      throw executionError;
    }

    // ========================================================
    // RELIRE L'ETAT FINAL
    // ========================================================

    const {
      data: redistributionVersee,
      error: versementReadError,
    } = await supabase
      .from("tontine_redistributions")
      .select(
        "id, cycle_id, membre_id, montant_redistribue, statut_redistribution, rubrique_destination_id, caisse_destination_id, annee_generation, annee_affectation_prevue, date_redistribution, commentaire"
      )
      .eq("id", redistributionId)
      .single();

    if (versementReadError) {
      throw versementReadError;
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "Votre redistribution a été versée.",

        data: {
          redistribution:
            redistributionVersee,

          execution:
            executionResult,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Erreur POST /api/dashboard:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Erreur lors du traitement de la redistribution.",

        data: null,
      },
      { status: 500 }
    );
  }
}
