import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

type RoleInfo =
  | {
      code?: string | null;
      libelle?: string | null;
    }
  | null
  | undefined;

type Row = Record<string, any>;

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function isBureauRole(role: RoleInfo) {
  const raw =
    `${role?.code ?? ""} ${role?.libelle ?? ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  return (
    raw.includes("admin") ||
    raw.includes("president") ||
    raw.includes("tresorier")
  );
}

function getYear(value: unknown) {
  const parsed = Number(value);

  if (
    Number.isInteger(parsed) &&
    parsed >= 2000 &&
    parsed <= 2100
  ) {
    return parsed;
  }

  return new Date().getFullYear();
}

function yearOf(value: unknown) {
  if (!value) return null;

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getUTCFullYear();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const exercice = getYear(
      url.searchParams.get("exercice")
    );

    const dateDebut =
      `${exercice}-01-01T00:00:00.000Z`;

    const dateFin =
      `${exercice + 1}-01-01T00:00:00.000Z`;

    // ========================================================
    // AUTHENTIFICATION
    // ========================================================

    const cookieStore = await cookies();

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message:
            userError?.message ||
            "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const context =
      await getUserContext(user);

    if (
      !context?.success ||
      !context.membreId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            context?.message ||
            "Contexte utilisateur introuvable.",
        },
        { status: 401 }
      );
    }

    const bureau =
      isBureauRole(context.role);

    const membreId =
      String(context.membreId);

    const supabaseAdmin =
      createClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    // ========================================================
    // ANNEES DISPONIBLES
    // ========================================================

    let allPretsQuery =
      supabaseAdmin
        .from("prets")
        .select("date_octroi");

    if (!bureau) {
      allPretsQuery =
        allPretsQuery.eq(
          "membre_id",
          membreId
        );
    }

    let allAidesQuery =
      supabaseAdmin
        .from("aides_solidarite")
        .select("date_aide");

    if (!bureau) {
      allAidesQuery =
        allAidesQuery.eq(
          "membre_id",
          membreId
        );
    }

    const [
      allPretsResult,
      allAidesResult,
    ] = await Promise.all([
      allPretsQuery,
      allAidesQuery,
    ]);

    if (allPretsResult.error) {
      throw allPretsResult.error;
    }

    if (allAidesResult.error) {
      throw allAidesResult.error;
    }

    const exercicesSet =
      new Set<number>();

    exercicesSet.add(
      new Date().getFullYear()
    );

    exercicesSet.add(exercice);

    for (
      const row of
      (allPretsResult.data ?? []) as Row[]
    ) {
      const annee =
        yearOf(row.date_octroi);

      if (annee) {
        exercicesSet.add(annee);
      }
    }

    for (
      const row of
      (allAidesResult.data ?? []) as Row[]
    ) {
      const annee =
        yearOf(row.date_aide);

      if (annee) {
        exercicesSet.add(annee);
      }
    }

    const exercices =
      Array.from(exercicesSet)
        .sort((a, b) => b - a);

    // ========================================================
    // PRETS REELS DE L'EXERCICE
    // ========================================================

    let pretsQuery =
      supabaseAdmin
        .from("prets")
        .select(`
          id,
          membre_id,
          date_octroi,
          montant_accorde,
          solde_restant,
          statut_pret,
          origine_pret,
          reference_import_historique
        `)
        .gte(
          "date_octroi",
          dateDebut
        )
        .lt(
          "date_octroi",
          dateFin
        );

    if (!bureau) {
      pretsQuery =
        pretsQuery.eq(
          "membre_id",
          membreId
        );
    }

    const {
      data: pretsData,
      error: pretsError,
    } = await pretsQuery.order(
      "date_octroi",
      { ascending: true }
    );

    if (pretsError) {
      throw pretsError;
    }

    const prets =
      (pretsData ?? []) as Row[];

    // ========================================================
    // AIDES REELLES DE L'EXERCICE
    // ========================================================

    let aidesQuery =
      supabaseAdmin
        .from("aides_solidarite")
        .select(`
          id,
          demande_aide_id,
          membre_id,
          rubrique_id,
          date_aide,
          montant_accorde,
          statut_aide,
          commentaire,
          origine_aide,
          reference_import_historique
        `)
        .gte(
          "date_aide",
          dateDebut
        )
        .lt(
          "date_aide",
          dateFin
        );

    if (!bureau) {
      aidesQuery =
        aidesQuery.eq(
          "membre_id",
          membreId
        );
    }

    const {
      data: aidesData,
      error: aidesError,
    } = await aidesQuery.order(
      "date_aide",
      { ascending: true }
    );

    if (aidesError) {
      throw aidesError;
    }

    const aides =
      (aidesData ?? []) as Row[];

    // ========================================================
    // RUBRIQUES / CAISSES
    // ========================================================

    const [
      rubriquesResult,
      caissesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("rubriques")
        .select("*")
        .order(
          "created_at",
          { ascending: true }
        ),

      supabaseAdmin
        .from("caisses")
        .select(`
          id,
          rubrique_id,
          libelle,
          actif,
          created_at
        `)
        .eq("actif", true)
        .order(
          "created_at",
          { ascending: true }
        ),
    ]);

    if (rubriquesResult.error) {
      throw rubriquesResult.error;
    }

    if (caissesResult.error) {
      throw caissesResult.error;
    }

    const rubriques =
      (rubriquesResult.data ?? []) as Row[];

    const caisses =
      (caissesResult.data ?? []) as Row[];

    const rubriquesMap =
      new Map<string, Row>();

    for (const rubrique of rubriques) {
      rubriquesMap.set(
        String(rubrique.id),
        rubrique
      );
    }

    const caissesMap =
      new Map<string, Row>();

    for (const caisse of caisses) {
      caissesMap.set(
        String(caisse.id),
        caisse
      );
    }

    // ========================================================
    // FINANCEMENTS PRETS
    // ========================================================

    const pretIds =
      prets.map((pret) =>
        String(pret.id)
      );

    let financementsPrets: Row[] = [];

    if (pretIds.length > 0) {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from("pret_financements")
          .select(`
            id,
            pret_id,
            rubrique_id,
            caisse_id,
            montant_finance,
            decaissement_id
          `)
          .in(
            "pret_id",
            pretIds
          );

      if (error) {
        throw error;
      }

      financementsPrets =
        (data ?? []) as Row[];
    }

    // ========================================================
    // FINANCEMENTS AIDES
    // ========================================================

    const aideIds =
      aides.map((aide) =>
        String(aide.id)
      );

    let financementsAides: Row[] = [];

    if (aideIds.length > 0) {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from("aide_financements")
          .select(`
            id,
            aide_id,
            rubrique_id,
            caisse_id,
            montant_finance,
            decaissement_id
          `)
          .in(
            "aide_id",
            aideIds
          );

      if (error) {
        throw error;
      }

      financementsAides =
        (data ?? []) as Row[];
    }

    // ========================================================
    // ENRICHISSEMENT FINANCEMENTS
    // ========================================================

    function enrichirFinancement(
      row: Row
    ): Row {
      const rubrique =
        rubriquesMap.get(
          String(
            row.rubrique_id ?? ""
          )
        ) ?? null;

      const caisse =
        caissesMap.get(
          String(
            row.caisse_id ?? ""
          )
        ) ?? null;

      return {
        ...row,

        montant_finance:
          numberValue(
            row.montant_finance
          ),

        rubrique_nom:
          rubrique?.nom ??
          rubrique?.libelle ??
          rubrique?.code ??
          "Rubrique",

        caisse_libelle:
          caisse?.libelle ??
          "Caisse",
      };
    }

    const financementsPretsEnrichis =
      financementsPrets.map(
        enrichirFinancement
      );

    const financementsAidesEnrichis =
      financementsAides.map(
        enrichirFinancement
      );

    // ========================================================
    // FINANCEMENTS PAR OPERATION
    // ========================================================

    const financementsParPret =
      new Map<string, Row[]>();

    for (
      const financement of
      financementsPretsEnrichis
    ) {
      const key =
        String(
          financement.pret_id
        );

      const current =
        financementsParPret.get(key) ??
        [];

      current.push(financement);

      financementsParPret.set(
        key,
        current
      );
    }

    const financementsParAide =
      new Map<string, Row[]>();

    for (
      const financement of
      financementsAidesEnrichis
    ) {
      const key =
        String(
          financement.aide_id
        );

      const current =
        financementsParAide.get(key) ??
        [];

      current.push(financement);

      financementsParAide.set(
        key,
        current
      );
    }

    // ========================================================
    // MEMBRES
    // ========================================================

    const membreIds =
      Array.from(
        new Set(
          [
            ...prets,
            ...aides,
          ]
            .map((item) =>
              String(
                item.membre_id ?? ""
              ).trim()
            )
            .filter(Boolean)
        )
      );

    const membresMap =
      new Map<string, Row>();

    if (membreIds.length > 0) {
      const {
        data: membresData,
        error: membresError,
      } =
        await supabaseAdmin
          .from("membres")
          .select(`
            id,
            nom_complet,
            numero_membre
          `)
          .in("id", membreIds);

      if (membresError) {
        throw membresError;
      }

      for (
        const membre of
        membresData ?? []
      ) {
        membresMap.set(
          String(membre.id),
          membre
        );
      }
    }

    const pretsEnrichis =
      prets.map((pret) => ({
        ...pret,

        montant_accorde:
          numberValue(
            pret.montant_accorde
          ),

        solde_restant:
          numberValue(
            pret.solde_restant
          ),

        membres:
          pret.membre_id
            ? membresMap.get(
                String(
                  pret.membre_id
                )
              ) ?? null
            : null,

        financements:
          financementsParPret.get(
            String(pret.id)
          ) ?? [],

        peut_rembourser:
          bureau &&
          numberValue(
            pret.solde_restant
          ) > 0 &&
          ![
            "SOLDE",
            "CLOTURE",
            "CLOTUREE",
          ].includes(
            stringValue(
              pret.statut_pret
            ).toUpperCase()
          ),

        peut_reaffecter:
          bureau,
      }));

    const aidesEnrichies =
      aides.map((aide) => ({
        ...aide,

        montant_accorde:
          numberValue(
            aide.montant_accorde
          ),

        membres:
          aide.membre_id
            ? membresMap.get(
                String(
                  aide.membre_id
                )
              ) ?? null
            : null,

        financements:
          financementsParAide.get(
            String(aide.id)
          ) ?? [],

        peut_reaffecter:
          bureau,
      }));

    // ========================================================
    // SYNTHESE
    //
    // IMPORTANT :
    // solde_restant est nommé "reste_a_rembourser".
    // On ne le présente PAS comme du capital restant,
    // car il peut contenir des intérêts.
    // ========================================================

    const montantPrets =
      prets.reduce(
        (total, pret) =>
          total +
          numberValue(
            pret.montant_accorde
          ),
        0
      );

    const montantAides =
      aides.reduce(
        (total, aide) =>
          total +
          numberValue(
            aide.montant_accorde
          ),
        0
      );

    const resteARembourser =
      prets.reduce(
        (total, pret) =>
          total +
          Math.max(
            0,
            numberValue(
              pret.solde_restant
            )
          ),
        0
      );

    // ========================================================
    // REPARTITION PAR RUBRIQUE
    // ========================================================

    type RepartitionItem = {
      rubrique_id: string;
      rubrique_nom: string;
      caisse_id: string;
      caisse_libelle: string;
      prets: number;
      aides: number;
      total: number;
    };

    const repartitionMap =
      new Map<
        string,
        RepartitionItem
      >();

    function addRepartition(
      financement: Row,
      type: "PRET" | "AIDE"
    ) {
      const rubriqueId =
        String(
          financement.rubrique_id ??
          ""
        );

      const caisseId =
        String(
          financement.caisse_id ??
          ""
        );

      const key =
        `${rubriqueId}|${caisseId}`;

      const current =
        repartitionMap.get(key) ?? {
          rubrique_id:
            rubriqueId,

          rubrique_nom:
            financement.rubrique_nom ??
            "Rubrique",

          caisse_id:
            caisseId,

          caisse_libelle:
            financement.caisse_libelle ??
            "Caisse",

          prets: 0,
          aides: 0,
          total: 0,
        };

      const montant =
        numberValue(
          financement.montant_finance
        );

      if (type === "PRET") {
        current.prets += montant;
      } else {
        current.aides += montant;
      }

      current.total =
        current.prets +
        current.aides;

      repartitionMap.set(
        key,
        current
      );
    }

    for (
      const financement of
      financementsPretsEnrichis
    ) {
      addRepartition(
        financement,
        "PRET"
      );
    }

    for (
      const financement of
      financementsAidesEnrichis
    ) {
      addRepartition(
        financement,
        "AIDE"
      );
    }

    const repartition =
      Array.from(
        repartitionMap.values()
      ).sort((a, b) =>
        a.rubrique_nom.localeCompare(
          b.rubrique_nom,
          "fr"
        )
      );

    // ========================================================
    // RUBRIQUES DISPONIBLES POUR REAFFECTATION
    // BUREAU UNIQUEMENT
    // ========================================================

    let rubriquesFinancement: Row[] = [];

    if (bureau) {
      rubriquesFinancement =
        await Promise.all(
          caisses.map(
            async (caisse) => {
              const rubrique =
                rubriquesMap.get(
                  String(
                    caisse.rubrique_id
                  )
                ) ?? null;

              const {
                data: soldeData,
                error: soldeError,
              } =
                await supabaseAdmin.rpc(
                  "fn_caisse_solde_disponible",
                  {
                    p_caisse_id:
                      caisse.id,
                  }
                );

              if (soldeError) {
                throw soldeError;
              }

              return {
                rubrique_id:
                  caisse.rubrique_id,

                rubrique_nom:
                  rubrique?.nom ??
                  rubrique?.libelle ??
                  rubrique?.code ??
                  "Rubrique",

                caisse_id:
                  caisse.id,

                caisse_libelle:
                  caisse.libelle,

                solde_actuel:
                  numberValue(
                    soldeData
                  ),
              };
            }
          )
        );

      rubriquesFinancement.sort(
        (a, b) =>
          String(
            a.rubrique_nom
          ).localeCompare(
            String(
              b.rubrique_nom
            ),
            "fr"
          )
      );
    }

    // ========================================================
    // REPONSE
    // ========================================================

    return NextResponse.json({
      success: true,

      data: {
        exercice,
        exercices,

        is_bureau:
          bureau,

        scope:
          bureau
            ? "TOUS"
            : "MOI",

        synthese: {
          nombre_prets:
            prets.length,

          montant_prets:
            montantPrets,

          nombre_aides:
            aides.length,

          montant_aides:
            montantAides,

          total_finance:
            montantPrets +
            montantAides,

          reste_a_rembourser:
            resteARembourser,
        },

        repartition,

        prets:
          pretsEnrichis,

        aides:
          aidesEnrichies,

        rubriques_financement:
          rubriquesFinancement,
      },
    });
  } catch (error: any) {
    console.error(
      "Erreur GET /api/prets-aides/synthese :",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Erreur lors du chargement de la synthèse prêts et aides.",
      },
      { status: 500 }
    );
  }
}


