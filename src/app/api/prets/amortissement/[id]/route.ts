import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

type RemboursementRow = {
  id: string;
  date_remboursement: string;
  montant_rembourse: number | string;
  mode_paiement?: string | null;
  reference_paiement?: string | null;
};

type FinancementRow = {
  id: string;
  rubrique_id: string;
  caisse_id: string;
  montant_finance: number | string;
};

type RubriqueRow = {
  id: string;
  nom?: string | null;
  libelle?: string | null;
};

type InteretRow = {
  date_recalcul: string;
  montant_interet_calcule: number | string;
};

type LigneAmortissement = {
  annee: number;
  mois: number;
  mois_libelle: string;
  solde_debut: number;
  interet: number;
  remboursement: number;
  solde_fin: number;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  const raw = normalizeText(
    `${role?.code ?? ""} ${role?.libelle ?? ""}`
  );

  return (
    raw.includes("admin") ||
    raw.includes("president") ||
    raw.includes("tresorier")
  );
}

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function firstDayOfMonth(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1
    )
  );
}

function nextMonth(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      1
    )
  );
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return (
    label.charAt(0).toUpperCase() +
    label.slice(1)
  );
}

export async function GET(
  _request: Request,
  contextParams: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const params = await contextParams.params;

    const demandeId = String(
      params?.id ?? ""
    ).trim();

    if (!demandeId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Identifiant de demande manquant.",
        },
        { status: 400 }
      );
    }

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

    const userContext =
      await getUserContext(user);

    if (
      !userContext?.success ||
      !userContext.membreId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            userContext?.message ||
            "Contexte utilisateur introuvable.",
        },
        { status: 401 }
      );
    }

    const bureau =
      isBureauRole(userContext.role);

    const supabaseAdmin = createClient(
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
    // DEMANDE
    // ========================================================

    const {
      data: demande,
      error: demandeError,
    } = await supabaseAdmin
      .from("demandes_prets")
      .select("*")
      .eq("id", demandeId)
      .maybeSingle();

    if (demandeError) {
      throw demandeError;
    }

    if (!demande) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Demande de prêt introuvable.",
        },
        { status: 404 }
      );
    }

    // ========================================================
    // SECURITE :
    //
    // Bureau => tous les prêts
    // Membre => son propre prêt uniquement
    // ========================================================

    const proprietaire =
      String(demande.membre_id ?? "") ===
      String(userContext.membreId);

    if (!bureau && !proprietaire) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Accès refusé à ce tableau d’amortissement.",
        },
        { status: 403 }
      );
    }

    const statutDemande = String(
      demande.statut ??
        demande.statut_demande ??
        ""
    ).toUpperCase();

    if (!statutDemande.includes("APPROUV")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le tableau d’amortissement est disponible uniquement pour un prêt approuvé.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // PRET COMPTABLE REEL
    // ========================================================

    const {
      data: pret,
      error: pretError,
    } = await supabaseAdmin
      .from("prets")
      .select(
        `
          id,
          demande_pret_id,
          membre_id,
          date_octroi,
          montant_accorde,
          taux_interet,
          mode_interet,
          capitalisation_interets,
          solde_restant,
          statut_pret,
          date_prochain_recalcul_interet
        `
      )
      .eq("demande_pret_id", demandeId)
      .maybeSingle();

    if (pretError) {
      throw pretError;
    }

    if (!pret) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le prêt comptable associé à cette demande est introuvable.",
        },
        { status: 404 }
      );
    }

    const dateOctroi = new Date(
      pret.date_octroi
    );

    if (Number.isNaN(dateOctroi.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La date d’octroi du prêt est invalide.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // MEMBRE
    // ========================================================

    const {
      data: membre,
      error: membreError,
    } = await supabaseAdmin
      .from("membres")
      .select(
        "id, nom_complet, numero_membre"
      )
      .eq("id", pret.membre_id)
      .maybeSingle();

    if (membreError) {
      throw membreError;
    }

    // ========================================================
    // FINANCEMENTS
    // ========================================================

    const {
      data: financementsData,
      error: financementsError,
    } = await supabaseAdmin
      .from("pret_financements")
      .select(
        `
          id,
          rubrique_id,
          caisse_id,
          montant_finance
        `
      )
      .eq("pret_id", pret.id)
      .order(
        "created_at",
        { ascending: true }
      );

    if (financementsError) {
      throw financementsError;
    }

    const financements =
      (financementsData ?? []) as FinancementRow[];

    const rubriqueIds = Array.from(
      new Set(
        financements
          .map(
            (item) =>
              String(
                item.rubrique_id ?? ""
              )
          )
          .filter(Boolean)
      )
    );

    let rubriques: RubriqueRow[] = [];

    if (rubriqueIds.length > 0) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("rubriques")
        .select("*")
        .in("id", rubriqueIds);

      if (error) {
        throw error;
      }

      rubriques =
        (data ?? []) as RubriqueRow[];
    }

    const repartitionFinancement =
      financements.map((item) => {
        const rubrique =
          rubriques.find(
            (row) =>
              String(row.id) ===
              String(item.rubrique_id)
          );

        return {
          financement_id: item.id,
          rubrique_id:
            item.rubrique_id,
          rubrique_nom:
            String(
              rubrique?.nom ??
                rubrique?.libelle ??
                "Rubrique"
            ).trim() || "Rubrique",
          caisse_id:
            item.caisse_id,
          montant_finance:
            roundMoney(
              Number(
                item.montant_finance || 0
              )
            ),
        };
      });

    // ========================================================
    // REMBOURSEMENTS REELS
    // ========================================================

    const {
      data: remboursementsData,
      error: remboursementsError,
    } = await supabaseAdmin
      .from("remboursements")
      .select(
        `
          id,
          date_remboursement,
          montant_rembourse,
          mode_paiement,
          reference_paiement
        `
      )
      .eq("pret_id", pret.id)
      .order(
        "date_remboursement",
        { ascending: true }
      );

    if (remboursementsError) {
      throw remboursementsError;
    }

    const remboursements =
      (remboursementsData ?? []) as RemboursementRow[];

    // ========================================================
    // INTERETS REELLEMENT CALCULES PAR LE MOTEUR SUPABASE
    //
    // Aucun intérêt fictif n'est calculé ici.
    // ========================================================

    const {
      data: interetsData,
      error: interetsError,
    } = await supabaseAdmin
      .from("prets_interets_recalculs")
      .select(
        `
          date_recalcul,
          montant_interet_calcule
        `
      )
      .eq("pret_id", pret.id)
      .eq(
        "statut_recalcul",
        "APPLIQUE"
      )
      .order(
        "date_recalcul",
        { ascending: true }
      );

    if (interetsError) {
      throw interetsError;
    }

    const interets =
      (interetsData ?? []) as InteretRow[];

    // ========================================================
    // REGROUPEMENT MENSUEL
    // ========================================================

    const remboursementsParMois =
      new Map<string, number>();

    for (const remboursement of remboursements) {
      const date = new Date(
        remboursement.date_remboursement
      );

      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const key = monthKey(date);

      remboursementsParMois.set(
        key,
        roundMoney(
          (
            remboursementsParMois.get(key) ??
            0
          ) +
            Number(
              remboursement.montant_rembourse ||
                0
            )
        )
      );
    }

    const interetsParMois =
      new Map<string, number>();

    for (const interetRow of interets) {
      const date = new Date(
        interetRow.date_recalcul
      );

      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const key = monthKey(date);

      interetsParMois.set(
        key,
        roundMoney(
          (
            interetsParMois.get(key) ??
            0
          ) +
            Number(
              interetRow.montant_interet_calcule ||
                0
            )
        )
      );
    }

    // ========================================================
    // TABLEAU :
    //
    // de la date d'octroi
    // jusqu'au mois courant uniquement.
    //
    // Aucune projection fictive dans le futur.
    // ========================================================

    const dateDebut =
      firstDayOfMonth(dateOctroi);

    const maintenant =
      new Date();

    const dateFin =
      firstDayOfMonth(maintenant);

    const lignes:
      LigneAmortissement[] = [];

    let moisCourant =
      dateDebut;

    let solde =
      roundMoney(
        Number(
          pret.montant_accorde || 0
        )
      );

    while (
      moisCourant.getTime() <=
      dateFin.getTime()
    ) {
      const key =
        monthKey(moisCourant);

      const soldeDebut =
        roundMoney(solde);

      const interet =
        roundMoney(
          interetsParMois.get(key) ??
            0
        );

      const remboursement =
        roundMoney(
          remboursementsParMois.get(key) ??
            0
        );

      const soldeFin =
        Math.max(
          0,
          roundMoney(
            soldeDebut +
              interet -
              remboursement
          )
        );

      lignes.push({
        annee:
          moisCourant.getUTCFullYear(),

        mois:
          moisCourant.getUTCMonth() +
          1,

        mois_libelle:
          monthLabel(moisCourant),

        solde_debut:
          soldeDebut,

        interet,

        remboursement,

        solde_fin:
          soldeFin,
      });

      solde =
        soldeFin;

      moisCourant =
        nextMonth(moisCourant);
    }

    // ========================================================
    // REPONSE
    // ========================================================

    return NextResponse.json({
      success: true,

      data: {
        demande_id:
          demandeId,

        pret_id:
          pret.id,

        is_bureau:
          bureau,

        reference:
          demande.reference_unique ||
          demande.id,

        membre: {
          id:
            membre?.id ??
            pret.membre_id,

          nom_complet:
            membre?.nom_complet ||
            demande.signature_nom ||
            "-",

          numero_membre:
            membre?.numero_membre ||
            demande.document_json
              ?.numero_membre ||
            "-",
        },

        date_approbation:
          pret.date_octroi,

        montant_demande:
          roundMoney(
            Number(
              demande.montant_demande ||
                0
            )
          ),

        montant_accorde:
          roundMoney(
            Number(
              pret.montant_accorde ||
                0
            )
          ),

        taux_mensuel:
          roundMoney(
            Number(
              pret.taux_interet ||
                0
            ) * 100
          ),

        solde_restant:
          roundMoney(
            Number(
              pret.solde_restant ||
                0
            )
          ),

        statut_pret:
          pret.statut_pret,

        date_prochain_recalcul_interet:
          pret.date_prochain_recalcul_interet,

        situation_arretee_au:
          maintenant.toISOString(),

        financements:
          repartitionFinancement,

        remboursements:
          remboursements.map(
            (item) => ({
              id:
                item.id,

              date_remboursement:
                item.date_remboursement,

              montant_rembourse:
                roundMoney(
                  Number(
                    item.montant_rembourse ||
                      0
                  )
                ),

              mode_paiement:
                item.mode_paiement ??
                null,

              reference_paiement:
                item.reference_paiement ??
                null,
            })
          ),

        lignes,
      },
    });
  } catch (error: any) {
    console.error(
      "Erreur tableau amortissement :",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Erreur lors du chargement du tableau d’amortissement.",
      },
      { status: 500 }
    );
  }
}