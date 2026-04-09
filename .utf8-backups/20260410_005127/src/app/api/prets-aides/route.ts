import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

function isBureauRole(role: { code?: string | null; libelle?: string | null } | null | undefined) {
  const raw = `${role?.code ?? ""} ${role?.libelle ?? ""}`.toLowerCase();
  return (
    raw.includes("admin") ||
    raw.includes("président") ||
    raw.includes("president") ||
    raw.includes("trésorier") ||
    raw.includes("tresorier")
  );
}

function attachMembres<T extends { membre_id?: string | null }>(
  rows: T[],
  membresMap: Map<string, any>
) {
  return rows.map((row) => ({
    ...row,
    membres: row.membre_id ? membresMap.get(String(row.membre_id)) ?? null : null,
  }));
}

export async function GET() {
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
        {
          success: false,
          message: userError?.message || "Utilisateur non authentifié.",
          data: { aides: [], prets: [] },
        },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json(
        {
          success: false,
          message: context?.message || "Contexte utilisateur introuvable.",
          data: { aides: [], prets: [] },
        },
        { status: 401 }
      );
    }

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Accès refusé. Page réservée au bureau.",
          data: { aides: [], prets: [] },
        },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data: aides, error: aidesError } = await supabaseAdmin
      .from("demandes_aides")
      .select("*")
      .order("created_at", { ascending: false });

    if (aidesError) throw aidesError;

    const { data: prets, error: pretsError } = await supabaseAdmin
      .from("demandes_prets")
      .select("*")
      .order("created_at", { ascending: false });

    if (pretsError) throw pretsError;

    const membreIds = Array.from(
      new Set(
        [...(aides ?? []), ...(prets ?? [])]
          .map((item: any) => item?.membre_id)
          .filter((value: any) => !!value)
          .map((value: any) => String(value))
      )
    );

    let membresMap = new Map<string, any>();

    if (membreIds.length > 0) {
      const { data: membres, error: membresError } = await supabaseAdmin
        .from("membres")
        .select("id, nom_complet, numero_membre, telephone, email")
        .in("id", membreIds);

      if (membresError) throw membresError;

      membresMap = new Map(
        (membres ?? []).map((membre: any) => [String(membre.id), membre])
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Demandes prêts / aides chargées",
        data: {
          aides: attachMembres(aides ?? [], membresMap),
          prets: attachMembres(prets ?? [], membresMap),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur lors du chargement des demandes prêts / aides.",
        data: { aides: [], prets: [] },
      },
      { status: 500 }
    );
  }
}
