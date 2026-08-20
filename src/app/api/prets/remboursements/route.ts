import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

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

function asAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

export async function POST(request: Request) {
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
        },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success) {
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

    // ========================================================
    // SECURITE :
    // PRESIDENT / TRESORIER / ADMIN UNIQUEMENT
    // ========================================================

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Seuls le Président, le Trésorier et l’Administrateur peuvent enregistrer un remboursement.",
        },
        { status: 403 }
      );
    }

    const utilisateurId = String(
      context.utilisateur?.id ?? ""
    ).trim();

    if (!utilisateurId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Utilisateur ASF-NTOL introuvable pour l’enregistrement du remboursement.",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // CORPS DE LA REQUETE
    // ========================================================

    const body = await request.json();

    const pretId = String(
      body?.pret_id ?? ""
    ).trim();

    const montant = asAmount(
      body?.montant
    );

    const commentaire = String(
      body?.commentaire ?? ""
    ).trim();

    if (!pretId) {
      return NextResponse.json(
        {
          success: false,
          message: "Identifiant du prêt manquant.",
        },
        { status: 400 }
      );
    }

    if (montant <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le montant du remboursement doit être supérieur à zéro.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // CLIENT ADMIN SUPABASE
    // ========================================================

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
    // RECALCUL DE LA DETTE A AUJOURD'HUI
    //
    // Important :
    // avant d'autoriser le remboursement, on s'assure que
    // toutes les échéances d'intérêt arrivées à maturité
    // sont déjà intégrées au solde.
    // ========================================================

    const {
      error: recalculError,
    } = await supabaseAdmin.rpc(
      "fn_recalculer_interets_pret_mensuel",
      {
        p_pret_id: pretId,
      }
    );

    if (recalculError) {
      throw recalculError;
    }

    // ========================================================
    // LECTURE DU PRET
    // ========================================================

    const {
      data: pret,
      error: pretError,
    } = await supabaseAdmin
      .from("prets")
      .select(
        `
          id,
          membre_id,
          demande_pret_id,
          date_octroi,
          montant_accorde,
          solde_restant,
          statut_pret,
          date_prochain_recalcul_interet
        `
      )
      .eq("id", pretId)
      .maybeSingle();

    if (pretError) {
      throw pretError;
    }

    if (!pret) {
      return NextResponse.json(
        {
          success: false,
          message: "Prêt introuvable.",
        },
        { status: 404 }
      );
    }

    const statutPret = String(
      pret.statut_pret ?? ""
    ).toUpperCase();

    if (statutPret === "ANNULE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ce prêt est annulé et ne peut pas recevoir de remboursement.",
        },
        { status: 400 }
      );
    }

    if (statutPret === "SOLDE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ce prêt est déjà entièrement remboursé.",
        },
        { status: 400 }
      );
    }

    const soldeAvant = asAmount(
      pret.solde_restant
    );

    if (soldeAvant <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune dette restante sur ce prêt.",
        },
        { status: 400 }
      );
    }

    if (montant > soldeAvant + 0.01) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Le remboursement (${montant} FCFA) dépasse ` +
            `le solde restant (${soldeAvant} FCFA).`,
        },
        { status: 400 }
      );
    }

    // ========================================================
    // REFERENCE AUTOMATIQUE
    // ========================================================

    const now = new Date();

    const dateReference = now
      .toISOString()
      .replace(/\D/g, "")
      .slice(0, 14);

    const suffix =
      crypto
        .randomUUID()
        .slice(0, 8)
        .toUpperCase();

    const referencePaiement =
      `RMB-${dateReference}-${suffix}`;

    // ========================================================
    // ENREGISTREMENT
    //
    // L'INSERT déclenche automatiquement :
    //
    // 1. recalcul des intérêts
    // 2. recalcul du solde
    // 3. ventilation intérêts / capital
    // 4. ventilation par caisse
    // 5. restitution du capital membre
    // 6. génération des distributions d'intérêts éventuelles
    //
    // Tout ceci se produit dans la transaction SQL de l'INSERT.
    // ========================================================

    const {
      data: remboursement,
      error: remboursementError,
    } = await supabaseAdmin
      .from("remboursements")
      .insert({
        pret_id: pret.id,
        membre_id: pret.membre_id,
        date_remboursement:
          now.toISOString(),
        montant_rembourse: montant,
        mode_paiement: "ENCAISSEMENT",
        reference_paiement:
          referencePaiement,
        commentaire:
          commentaire || null,
        cree_par_user_id: utilisateurId,
      })
      .select(
        `
          id,
          pret_id,
          membre_id,
          date_remboursement,
          montant_rembourse,
          mode_paiement,
          reference_paiement,
          commentaire
        `
      )
      .single();

    if (remboursementError) {
      throw remboursementError;
    }

    // ========================================================
    // RESULTAT COMPTABLE DU REMBOURSEMENT
    // ========================================================

    const {
      data: ventilation,
      error: ventilationError,
    } = await supabaseAdmin
      .from(
        "pret_remboursements_ventilation"
      )
      .select(
        `
          montant_rembourse,
          interets_exigibles_avant,
          montant_interets_paye,
          capital_restant_avant,
          montant_capital_rembourse
        `
      )
      .eq(
        "remboursement_id",
        remboursement.id
      )
      .maybeSingle();

    if (ventilationError) {
      throw ventilationError;
    }

    const {
      data: ventilationCaisses,
      error: ventilationCaissesError,
    } = await supabaseAdmin
      .from(
        "pret_remboursements_ventilation_caisses"
      )
      .select(
        `
          rubrique_source_id,
          caisse_source_id,
          taux_financement,
          montant_capital_restitue,
          montant_interets_encaisse,
          type_destination,
          statut_interet
        `
      )
      .eq(
        "remboursement_id",
        remboursement.id
      );

    if (ventilationCaissesError) {
      throw ventilationCaissesError;
    }

    // ========================================================
    // NOUVEAU SOLDE
    // ========================================================

    const {
      data: pretApres,
      error: pretApresError,
    } = await supabaseAdmin
      .from("prets")
      .select(
        `
          id,
          solde_restant,
          statut_pret,
          date_prochain_recalcul_interet
        `
      )
      .eq("id", pret.id)
      .single();

    if (pretApresError) {
      throw pretApresError;
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Remboursement enregistré avec succès.",

        data: {
          remboursement,
          ventilation,
          ventilation_caisses:
            ventilationCaisses ?? [],
          pret: pretApres,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "Erreur remboursement prêt :",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur lors de l’enregistrement du remboursement.",
      },
      { status: 500 }
    );
  }
}