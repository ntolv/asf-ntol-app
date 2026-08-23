import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

function isBureauRole(
  role: { code?: string | null; libelle?: string | null } | null | undefined
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

function getAdminSupabase() {
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
  const supabaseAuth =
    await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser();

  if (error || !user) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: "Utilisateur non authentifié.",
        },
        { status: 401 }
      ),
    };
  }

  const context =
    await getUserContext(user);

  if (
    !context?.success ||
    !context.membreId
  ) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error:
            context?.message ||
            "Contexte membre introuvable.",
        },
        { status: 401 }
      ),
    };
  }

  if (!isBureauRole(context.role)) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error:
            "Accès réservé au Bureau.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    response: null,
    context,
  };
}

export async function GET() {
  try {
    const access =
      await requireBureau();

    if (access.response) {
      return access.response;
    }

    const supabase =
      getAdminSupabase();

    const { data, error } =
      await supabase
        .from("v_tontine_page_resume")
        .select("*")
        .limit(1)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      data ?? {
        cycle: null,
        session: null,
        lots: [],
        gagnants: [],
        encheres: [],
        message:
          "Aucune donnée tontine après remise à zéro",
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ??
          "Impossible de charger le résumé de la tontine.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access =
      await requireBureau();

    if (access.response) {
      return access.response;
    }

    const body =
      await request.json().catch(() => ({}));

    const montant =
      Number(
        body?.montant_fixe_par_tontineur ?? 0
      );

    const dateDebut =
      typeof body?.date_debut_cycle === "string"
        ? body.date_debut_cycle.trim()
        : "";

    const libelle =
      typeof body?.libelle_cycle === "string"
        ? body.libelle_cycle.trim()
        : "CYCLE ACTIF";

    if (
      !Number.isFinite(montant) ||
      montant <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Montant fixe par tontineur invalide.",
        },
        { status: 400 }
      );
    }

    if (!dateDebut) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Date de début du cycle obligatoire.",
        },
        { status: 400 }
      );
    }

    const supabase =
      getAdminSupabase();

    const { data, error } =
      await supabase.rpc(
        "fn_tontine_parametrer_cycle_depuis_bloc",
        {
          p_montant_fixe_par_tontineur:
            montant,
          p_date_debut_cycle:
            dateDebut,
          p_libelle_cycle:
            libelle || "CYCLE ACTIF",
        }
      );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    const result =
      Array.isArray(data)
        ? data[0] ?? null
        : data;

    return NextResponse.json({
      success: true,
      data: result,
      message:
        result?.message ??
        "Paramètres du cycle enregistrés avec succès.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ??
          "Impossible d'enregistrer les paramètres du cycle.",
      },
      { status: 500 }
    );
  }
}