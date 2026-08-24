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

function isBureauRole(role: RoleInfo) {
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

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateKey(value: unknown) {
  if (!value) return "";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function normalizeText(value: unknown) {
  return stringValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildLegacyAideKey(row: Row) {
  return [
    stringValue(row.membre_id),
    numberValue(row.montant_demande),
    normalizeText(row.motif),
    dateKey(
      row.date_traitement ??
        row.date_decision ??
        row.created_at
    ),
  ].join("|");
}

function buildCanoniqueAideKey(row: Row) {
  return [
    stringValue(row.membre_id),
    numberValue(row.montant_demande),
    normalizeText(
      row.motif ??
        row.objet_demande
    ),
    dateKey(
      row.date_decision ??
        row.date_demande ??
        row.created_at
    ),
  ].join("|");
}

export async function GET() {
  try {
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
          data: {
            is_bureau: false,
            scope: "MOI",
            aides: [],
            prets: [],
          },
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
          data: {
            is_bureau: false,
            scope: "MOI",
            aides: [],
            prets: [],
          },
        },
        { status: 401 }
      );
    }

    const bureau =
      isBureauRole(context.role);

    const membreConnecteId =
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
    // 1. PRETS REELS
    //
    // SOURCE DE VERITE :
    // public.prets
    //
    // Ceci inclut :
    // - prêts issus de l'application
    // - prêts historiques sans demande_pret_id
    // ========================================================

    let pretsReelsQuery =
      supabaseAdmin
        .from("prets")
        .select(`
          id,
          demande_pret_id,
          membre_id,
          date_octroi,
          montant_accorde,
          taux_interet,
          solde_restant,
          statut_pret,
          date_fin_prevue,
          origine_pret,
          reference_import_historique,
          date_import_historique,
          commentaire,
          created_at,
          updated_at
        `);

    if (!bureau) {
      pretsReelsQuery =
        pretsReelsQuery.eq(
          "membre_id",
          membreConnecteId
        );
    }

    const {
      data: pretsReelsData,
      error: pretsReelsError,
    } =
      await pretsReelsQuery.order(
        "date_octroi",
        { ascending: false }
      );

    if (pretsReelsError) {
      throw pretsReelsError;
    }

    const pretsReels =
      (pretsReelsData ?? []) as Row[];

    // ========================================================
    // 2. DEMANDES DE PRET
    //
    // Conservées pour :
    // - demandes en attente
    // - demandes refusées
    // - demandes n'ayant pas encore produit de prêt réel
    //
    // Une demande ayant déjà un prêt réel ne sera PAS
    // renvoyée comme deuxième ligne.
    // ========================================================

    let demandesPretsQuery =
      supabaseAdmin
        .from("demandes_prets")
        .select("*");

    if (!bureau) {
      demandesPretsQuery =
        demandesPretsQuery.eq(
          "membre_id",
          membreConnecteId
        );
    }

    const {
      data: demandesPretsData,
      error: demandesPretsError,
    } =
      await demandesPretsQuery.order(
        "created_at",
        { ascending: false }
      );

    if (demandesPretsError) {
      throw demandesPretsError;
    }

    const demandesPrets =
      (demandesPretsData ?? []) as Row[];

    const demandesPretsMap =
      new Map<string, Row>();

    for (const demande of demandesPrets) {
      demandesPretsMap.set(
        String(demande.id),
        demande
      );
    }

    const demandeIdsAvecPret =
      new Set(
        pretsReels
          .map((pret) =>
            stringValue(
              pret.demande_pret_id
            )
          )
          .filter(Boolean)
      );

    // ========================================================
    // NORMALISATION DES PRETS REELS
    // ========================================================

    const pretsNormalises: Row[] =
      pretsReels.map((pret) => {
        const demandeId =
          stringValue(
            pret.demande_pret_id
          ) || null;

        const demande =
          demandeId
            ? demandesPretsMap.get(
                demandeId
              ) ?? null
            : null;

        return {
          id: String(pret.id),

          pret_id:
            String(pret.id),

          demande_id:
            demandeId,

          membre_id:
            pret.membre_id,

          montant_demande:
            numberValue(
              demande?.montant_demande ??
                pret.montant_accorde
            ),

          montant_accorde:
            numberValue(
              pret.montant_accorde
            ),

          objet_pret:
            demande?.objet_pret ??
            null,

          motif:
            demande?.motif ??
            pret.commentaire ??
            (
              String(
                pret.origine_pret ??
                  ""
              )
                .toUpperCase()
                .includes("HISTOR")
                ? "Prêt historique"
                : "Prêt accordé"
            ),

          statut:
            pret.statut_pret ??
            demande?.statut ??
            demande?.statut_demande ??
            "ACTIF",

          statut_demande:
            demande?.statut_demande ??
            demande?.statut ??
            null,

          commentaire_decision:
            demande
              ?.commentaire_decision ??
            pret.commentaire ??
            null,

          reference_unique:
            demande
              ?.reference_unique ??
            pret
              .reference_import_historique ??
            pret.id,

          document_texte:
            demande?.document_texte ??
            null,

          created_at:
            pret.date_octroi ??
            pret.created_at,

          date_traitement:
            demande?.date_traitement ??
            demande?.date_decision ??
            pret.date_octroi,

          date_octroi:
            pret.date_octroi,

          solde_restant:
            numberValue(
              pret.solde_restant
            ),

          origine_pret:
            pret.origine_pret ??
            "APPLICATION",

          historique:
            String(
              pret.origine_pret ?? ""
            )
              .toUpperCase()
              .includes("HISTOR"),

          a_un_pret_reel: true,
        };
      });

    // ========================================================
    // DEMANDES SANS PRET REEL
    // ========================================================

    const demandesSansPret: Row[] =
      demandesPrets
        .filter(
          (demande) =>
            !demandeIdsAvecPret.has(
              String(demande.id)
            )
        )
        .map((demande) => ({
          ...demande,

          id:
            String(demande.id),

          pret_id:
            null,

          demande_id:
            String(demande.id),

          historique:
            false,

          origine_pret:
            "DEMANDE",

          a_un_pret_reel:
            false,
        }));

    const prets: Row[] = [
      ...pretsNormalises,
      ...demandesSansPret,
    ];

    // ========================================================
    // 3. AIDES REELLES
    //
    // SOURCE METIER :
    // public.aides_solidarite
    //
    // demande_aide_id référence le canonique :
    // public.demandes_aide
    // ========================================================

    let aidesReellesQuery =
      supabaseAdmin
        .from("aides_solidarite")
        .select("*");

    if (!bureau) {
      aidesReellesQuery =
        aidesReellesQuery.eq(
          "membre_id",
          membreConnecteId
        );
    }

    const {
      data: aidesReellesData,
      error: aidesReellesError,
    } =
      await aidesReellesQuery.order(
        "date_aide",
        { ascending: false }
      );

    if (aidesReellesError) {
      throw aidesReellesError;
    }

    const aidesReelles =
      (aidesReellesData ?? []) as Row[];

    // ========================================================
    // 4. DEMANDES AIDE CANONIQUES
    // ========================================================

    let demandesAideQuery =
      supabaseAdmin
        .from("demandes_aide")
        .select("*");

    if (!bureau) {
      demandesAideQuery =
        demandesAideQuery.eq(
          "membre_id",
          membreConnecteId
        );
    }

    const {
      data: demandesAideData,
      error: demandesAideError,
    } =
      await demandesAideQuery.order(
        "created_at",
        { ascending: false }
      );

    if (demandesAideError) {
      throw demandesAideError;
    }

    const demandesAide =
      (demandesAideData ?? []) as Row[];

    const demandesAideMap =
      new Map<string, Row>();

    for (const demande of demandesAide) {
      demandesAideMap.set(
        String(demande.id),
        demande
      );
    }

    const demandesAideAvecAide =
      new Set(
        aidesReelles
          .map((aide) =>
            stringValue(
              aide.demande_aide_id
            )
          )
          .filter(Boolean)
      );

    const aidesNormalisees: Row[] =
      aidesReelles.map((aide) => {
        const demandeId =
          stringValue(
            aide.demande_aide_id
          );

        const demande =
          demandesAideMap.get(
            demandeId
          ) ?? null;

        return {
          id:
            String(aide.id),

          aide_id:
            String(aide.id),

          demande_id:
            demandeId || null,

          membre_id:
            aide.membre_id,

          montant_demande:
            numberValue(
              demande?.montant_demande ??
                aide.montant_accorde
            ),

          montant_accorde:
            numberValue(
              aide.montant_accorde
            ),

          motif:
            demande?.motif ??
            demande?.objet_demande ??
            aide.commentaire ??
            "Aide de solidarité",

          statut:
            aide.statut_aide ??
            demande?.statut_demande ??
            "ACCORDEE",

          commentaire_decision:
            demande
              ?.commentaire_decision ??
            aide.commentaire ??
            null,

          created_at:
            aide.date_aide ??
            aide.created_at,

          date_traitement:
            demande?.date_decision ??
            aide.date_aide,

          reference:
            aide.reference_decaissement ??
            aide.id,

          origine_aide:
            "AIDE_SOLIDARITE",

          a_une_aide_reelle:
            true,
        };
      });

    // ========================================================
    // DEMANDES CANONIQUES SANS AIDE REELLE
    // ========================================================

    const demandesAideSansAide: Row[] =
      demandesAide
        .filter(
          (demande) =>
            !demandesAideAvecAide.has(
              String(demande.id)
            )
        )
        .map((demande) => ({
          id:
            String(demande.id),

          aide_id:
            null,

          demande_id:
            String(demande.id),

          membre_id:
            demande.membre_id,

          montant_demande:
            numberValue(
              demande.montant_demande
            ),

          montant_accorde:
            0,

          motif:
            demande.motif ??
            demande.objet_demande ??
            "-",

          statut:
            demande.statut_demande ??
            "-",

          commentaire_decision:
            demande
              .commentaire_decision ??
            null,

          created_at:
            demande.date_demande ??
            demande.created_at,

          date_traitement:
            demande.date_decision ??
            null,

          reference:
            demande.id,

          origine_aide:
            "DEMANDE_AIDE",

          a_une_aide_reelle:
            false,
        }));

    // ========================================================
    // 5. ANCIENNE TABLE demandes_aides
    //
    // Compatibilité temporaire.
    // Cette table est obsolète mais l'ancien code l'utilise
    // encore. On évite autant que possible les doublons avec
    // le modèle canonique.
    // ========================================================

    let legacyAidesQuery =
      supabaseAdmin
        .from("demandes_aides")
        .select("*");

    if (!bureau) {
      legacyAidesQuery =
        legacyAidesQuery.eq(
          "membre_id",
          membreConnecteId
        );
    }

    const {
      data: legacyAidesData,
      error: legacyAidesError,
    } =
      await legacyAidesQuery.order(
        "created_at",
        { ascending: false }
      );

    if (legacyAidesError) {
      throw legacyAidesError;
    }

    const legacyAides =
      (legacyAidesData ?? []) as Row[];

    const canonicalKeys =
      new Set(
        demandesAide.map(
          buildCanoniqueAideKey
        )
      );

    const legacyAidesUniques: Row[] =
      legacyAides
        .filter(
          (legacy) =>
            !canonicalKeys.has(
              buildLegacyAideKey(
                legacy
              )
            )
        )
        .map((legacy) => ({
          id:
            String(legacy.id),

          aide_id:
            null,

          demande_id:
            String(legacy.id),

          membre_id:
            legacy.membre_id,

          montant_demande:
            numberValue(
              legacy.montant_demande
            ),

          montant_accorde:
            numberValue(
              legacy.montant_accorde
            ),

          motif:
            legacy.motif ?? "-",

          statut:
            legacy.statut ?? "-",

          commentaire_decision:
            legacy
              .commentaire_decision ??
            null,

          created_at:
            legacy.created_at,

          date_traitement:
            legacy.date_traitement,

          reference:
            legacy.id,

          origine_aide:
            "LEGACY_DEMANDES_AIDES",

          a_une_aide_reelle:
            false,
        }));

    const aides: Row[] = [
      ...aidesNormalisees,
      ...demandesAideSansAide,
      ...legacyAidesUniques,
    ];

    // ========================================================
    // 6. SECURITE DEFENSIVE
    //
    // Même si toutes les requêtes ont déjà été filtrées,
    // on applique une deuxième barrière avant la réponse.
    // ========================================================

    const pretsAutorises: Row[] =
      bureau
        ? prets
        : prets.filter(
            (item) =>
              String(
                item.membre_id ?? ""
              ) === membreConnecteId
          );

    const aidesAutorisees: Row[] =
      bureau
        ? aides
        : aides.filter(
            (item) =>
              String(
                item.membre_id ?? ""
              ) === membreConnecteId
          );

    // ========================================================
    // 7. MEMBRES
    // ========================================================

    const membreIds =
      Array.from(
        new Set(
          [
            ...pretsAutorises,
            ...aidesAutorisees,
          ]
            .map((item) =>
              stringValue(
                item.membre_id
              )
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
          .select(
            `
              id,
              nom_complet,
              numero_membre,
              telephone,
              email
            `
          )
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

    function attachMembre(
      rows: Row[]
    ) {
      return rows.map((row) => ({
        ...row,

        membres:
          row.membre_id
            ? membresMap.get(
                String(row.membre_id)
              ) ?? null
            : null,
      }));
    }

    return NextResponse.json({
      success: true,

      message:
        bureau
          ? "Suivi global des prêts et aides chargé."
          : "Votre suivi personnel des prêts et aides est chargé.",

      data: {
        is_bureau:
          bureau,

        scope:
          bureau
            ? "TOUS"
            : "MOI",

        membre_id:
          membreConnecteId,

        aides:
          attachMembre(
            aidesAutorisees
          ),

        prets:
          attachMembre(
            pretsAutorises
          ),
      },
    });
  } catch (error: any) {
    console.error(
      "Erreur GET /api/prets-aides :",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Erreur lors du chargement du suivi des prêts et aides.",

        data: {
          is_bureau: false,
          scope: "MOI",
          aides: [],
          prets: [],
        },
      },
      { status: 500 }
    );
  }
}