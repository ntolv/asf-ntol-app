import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lot_id = searchParams.get("lot_id");

  if (!lot_id) {
    return NextResponse.json({ error: "lot_id requis" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data, error } = await supabase
    .from("v_tontine_encheres")
    .select("*")
    .eq("lot_id", lot_id)
    .order("montant_total_offert", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

type FnEncherirRow = {
  success: boolean;
  message: string;
  session_id: string;
  lot_id: string;
  membre_id: string;
  statut_session: string;
  statut_lot: string;
  montant_depart: number;
  montant_actuel: number;
  montant_relance: number;
  nouveau_montant_total: number;
  total_relances_lot: number;
};

export async function POST(req: Request) {
  try {
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
        { error: userError?.message || "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success || !context.membreId) {
      return NextResponse.json(
        { error: context?.message || "Contexte membre introuvable" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const lot_id = String(body?.lot_id || "").trim();
    const montant_relance = Number(body?.montant_relance || 0);
    const commentaire =
      typeof body?.commentaire === "string" && body.commentaire.trim().length > 0
        ? body.commentaire.trim()
        : null;

    if (!lot_id || !Number.isFinite(montant_relance) || montant_relance <= 0) {
      return NextResponse.json(
        { error: "lot_id et montant_relance sont requis" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data: membreData, error: membreError } = await supabase
      .from("membres")
      .select("id")
      .eq("id", context.membreId)
      .maybeSingle();

    if (membreError || !membreData?.id) {
      return NextResponse.json(
        { error: membreError?.message || "Membre connecté introuvable" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase.rpc("fn_encherir", {
      p_lot_id: lot_id,
      p_membre_id: membreData.id,
      p_montant_relance: montant_relance,
      p_commentaire: commentaire,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erreur backend fn_encherir" },
        { status: 400 }
      );
    }

    const rows = (data as FnEncherirRow[] | null) ?? [];
    const row = rows[0];

    if (!row) {
      return NextResponse.json(
        { error: "Aucune réponse retournée par fn_encherir" },
        { status: 500 }
      );
    }

    if (!row.success) {
      return NextResponse.json(
        { error: row.message || "Enchère refusée" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: row.message,
      enchere: row,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
