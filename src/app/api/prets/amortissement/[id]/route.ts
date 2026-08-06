import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

type RemboursementRow = {
  id: string;
  date_remboursement: string;
  montant_rembourse: number | string;
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

function roundFcfa(value: number) {
  return Math.round(Number(value || 0));
}

function firstDayOfMonth(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  );
}

function nextMonth(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
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

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export async function GET(
  _request: Request,
  contextParams: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const params = await contextParams.params;
    const demandeId = String(params?.id ?? "").trim();

    if (!demandeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Identifiant de demande manquant.",
        },
        { status: 400 }
      );
    }

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
            userError?.message || "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const userContext = await getUserContext(user);

    if (!userContext?.success || !userContext.membreId) {
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

    const { data: demande, error: demandeError } =
      await supabaseAdmin
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
          message: "Demande de prêt introuvable.",
        },
        { status: 404 }
      );
    }

    const bureau = isBureauRole(userContext.role);

    const proprietaire =
      String(demande.membre_id ?? "") ===
      String(userContext.membreId);

    if (!bureau && !proprietaire) {
      return NextResponse.json(
        {
          success: false,
          message: "Accès refusé à ce tableau d’amortissement.",
        },
        { status: 403 }
      );
    }

    const statut = String(
      demande.statut ?? demande.statut_demande ?? ""
    ).toUpperCase();

    if (!statut.includes("APPROUV")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le tableau d’amortissement est disponible uniquement pour un prêt approuvé.",
        },
        { status: 400 }
      );
    }

    const montantDemande = roundFcfa(
      Number(demande.montant_demande || 0)
    );

    const montantAccorde = roundFcfa(
      Number(demande.montant_accorde || 0)
    );

    if (montantAccorde <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Le montant accordé est invalide.",
        },
        { status: 400 }
      );
    }

    const dateApprobationRaw =
      demande.date_traitement ||
      demande.date_decision ||
      demande.created_at;

    if (!dateApprobationRaw) {
      return NextResponse.json(
        {
          success: false,
          message: "La date d’approbation est introuvable.",
        },
        { status: 400 }
      );
    }

    const dateApprobation = new Date(dateApprobationRaw);

    if (Number.isNaN(dateApprobation.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "La date d’approbation est invalide.",
        },
        { status: 400 }
      );
    }

    const { data: membre, error: membreError } =
      await supabaseAdmin
        .from("membres")
        .select("id, nom_complet, numero_membre")
        .eq("id", demande.membre_id)
        .maybeSingle();

    if (membreError) {
      throw membreError;
    }

    const { data: pret, error: pretError } =
      await supabaseAdmin
        .from("prets")
        .select("*")
        .eq("demande_pret_id", demandeId)
        .maybeSingle();

    if (pretError) {
      throw pretError;
    }

    let remboursements: RemboursementRow[] = [];

    if (pret?.id) {
      const { data, error } = await supabaseAdmin
        .from("remboursements")
        .select(
          "id, date_remboursement, montant_rembourse"
        )
        .eq("pret_id", pret.id)
        .order("date_remboursement", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      remboursements = (data ?? []) as RemboursementRow[];
    }

    const { data: financementsData, error: financementsError } =
      await supabaseAdmin
        .from("pret_financements")
        .select(
          "id, rubrique_id, caisse_id, montant_finance"
        )
        .eq("demande_pret_id", demandeId)
        .order("created_at", {
          ascending: true,
        });

    if (financementsError) {
      throw financementsError;
    }

    const financements =
      (financementsData ?? []) as FinancementRow[];

    const rubriqueIds = Array.from(
      new Set(
        financements
          .map((item) => String(item.rubrique_id ?? ""))
          .filter(Boolean)
      )
    );

    let rubriques: RubriqueRow[] = [];

    if (rubriqueIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("rubriques")
        .select("*")
        .in("id", rubriqueIds);

      if (error) {
        throw error;
      }

      rubriques = (data ?? []) as RubriqueRow[];
    }

    const repartitionFinancement = financements.map((item) => {
      const rubrique = rubriques.find(
        (row) => String(row.id) === String(item.rubrique_id)
      );

      return {
        financement_id: item.id,
        rubrique_id: item.rubrique_id,
        rubrique_nom:
          String(
            rubrique?.nom ??
              rubrique?.libelle ??
              "Rubrique"
          ).trim() || "Rubrique",
        caisse_id: item.caisse_id,
        montant_finance: roundFcfa(
          Number(item.montant_finance || 0)
        ),
      };
    });

    const remboursementsParMois = new Map<string, number>();

    remboursements.forEach((remboursement) => {
      const date = new Date(remboursement.date_remboursement);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = monthKey(date);
      const previous = remboursementsParMois.get(key) ?? 0;

      remboursementsParMois.set(
        key,
        previous +
          roundFcfa(
            Number(remboursement.montant_rembourse || 0)
          )
      );
    });

    const dateDebut = firstDayOfMonth(dateApprobation);
    const currentYear = new Date().getFullYear();

    const endYear = Math.max(
      currentYear,
      dateDebut.getUTCFullYear()
    );

    const dateFin = new Date(Date.UTC(endYear, 11, 1));

    const lignes: LigneAmortissement[] = [];

    let moisCourant = dateDebut;
    let solde = montantAccorde;

    while (moisCourant.getTime() <= dateFin.getTime()) {
      const soldeDebut = roundFcfa(solde);

      const interet =
        soldeDebut > 0
          ? roundFcfa(soldeDebut * 0.01)
          : 0;

      const remboursementEnregistre = roundFcfa(
        remboursementsParMois.get(monthKey(moisCourant)) ?? 0
      );

      const detteAvantRemboursement =
        soldeDebut + interet;

      const remboursementRetenu = Math.min(
        remboursementEnregistre,
        detteAvantRemboursement
      );

      const soldeFin = Math.max(
        0,
        roundFcfa(
          detteAvantRemboursement -
            remboursementRetenu
        )
      );

      lignes.push({
        annee: moisCourant.getUTCFullYear(),
        mois: moisCourant.getUTCMonth() + 1,
        mois_libelle: monthLabel(moisCourant),
        solde_debut: soldeDebut,
        interet,
        remboursement: remboursementRetenu,
        solde_fin: soldeFin,
      });

      solde = soldeFin;
      moisCourant = nextMonth(moisCourant);
    }

    return NextResponse.json({
      success: true,
      data: {
        demande_id: demandeId,
        pret_id: pret?.id ?? null,
        reference:
          demande.reference_unique || demande.id,
        membre: {
          id: membre?.id ?? demande.membre_id,
          nom_complet:
            membre?.nom_complet ||
            demande.signature_nom ||
            "-",
          numero_membre:
            membre?.numero_membre ||
            demande.document_json?.numero_membre ||
            "-",
        },
        date_approbation:
          dateApprobation.toISOString(),
        montant_demande: montantDemande,
        montant_accorde: montantAccorde,
        taux_mensuel: 1,
        situation_arretee_au: `${endYear}-12-31`,
        financements: repartitionFinancement,
        remboursements: remboursements.map((item) => ({
          id: item.id,
          date_remboursement: item.date_remboursement,
          montant_rembourse: roundFcfa(
            Number(item.montant_rembourse || 0)
          ),
        })),
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
          "Erreur lors du calcul du tableau d’amortissement.",
      },
      { status: 500 }
    );
  }
}
