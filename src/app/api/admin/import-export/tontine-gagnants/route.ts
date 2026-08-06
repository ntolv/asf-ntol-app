import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";

type ImportRow = {
  month?: number;
  member_id?: string;
  amount?: number;
};

type ImportBody = {
  year?: number;
  replace_existing?: boolean;
  rows?: ImportRow[];
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Variables Supabase manquantes");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { success: false, message: userError?.message || "Utilisateur non connecté" },
        { status: 401 }
      ),
      user: null,
    };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "fn_is_current_user_admin"
  );

  if (adminError || !isAdmin) {
    return {
      error: NextResponse.json(
        { success: false, message: "Accès réservé aux administrateurs" },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin();
    if (access.error) return access.error;

    const year = Number(request.nextUrl.searchParams.get("year"));

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { success: false, message: "Année invalide" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { data: cycles, error: cyclesError } = await admin
      .from("tontine_cycles")
      .select("id")
      .eq("annee_reference", year);

    if (cyclesError) throw cyclesError;

    const cycleIds = (cycles ?? []).map((row) => row.id);

    if (cycleIds.length === 0) {
      return NextResponse.json({
        success: true,
        winners_count: 0,
        decaissements_count: 0,
      });
    }

    const { data: sessions, error: sessionsError } = await admin
      .from("tontine_sessions")
      .select("id")
      .in("cycle_id", cycleIds)
      .gte("periode_reference", `${year}-01`)
      .lte("periode_reference", `${year}-12`);

    if (sessionsError) throw sessionsError;

    const sessionIds = (sessions ?? []).map((row) => row.id);

    let winnersCount = 0;

    if (sessionIds.length > 0) {
      const { count, error } = await admin
        .from("tontine_lots")
        .select("id", { count: "exact", head: true })
        .in("session_id", sessionIds)
        .not("gagnant_membre_id", "is", null);

      if (error) throw error;
      winnersCount = count ?? 0;
    }

    const motifPrefix = `[IMPORT GAGNANT TONTINE ${year}]%`;

    const { count: decaissementsCount, error: decaissementsError } = await admin
      .from("decaissements")
      .select("id", { count: "exact", head: true })
      .like("motif", motifPrefix);

    if (decaissementsError) throw decaissementsError;

    return NextResponse.json({
      success: true,
      winners_count: winnersCount,
      decaissements_count: decaissementsCount ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Erreur de vérification" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin();
    if (access.error || !access.user) return access.error!;

    const body = (await request.json()) as ImportBody;
    const year = Number(body.year);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const replaceExisting = Boolean(body.replace_existing);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { success: false, message: "Année invalide" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Aucun gagnant à importer" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { data, error } = await admin.rpc(
      "fn_import_tontine_gagnants_year",
      {
        p_year: year,
        p_rows: rows,
        p_replace_existing: replaceExisting,
        p_created_by: access.user.id,
      }
    );

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur pendant l'import des gagnants",
      },
      { status: 500 }
    );
  }
}