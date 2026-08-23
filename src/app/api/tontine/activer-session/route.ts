import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const context =
      await getUserContext(user);

    if (!context?.success || !context.membreId) {
      return NextResponse.json(
        {
          success: false,
          error:
            context?.message ||
            "Contexte utilisateur introuvable.",
        },
        { status: 401 }
      );
    }

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Activation de session réservée au Bureau.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const sessionId = body?.session_id;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "session_id obligatoire.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "fn_tontine_activer_session_planifiee",
      {
        p_session_id: sessionId,
      }
    );

    if (error) throw error;

    const result =
      Array.isArray(data) ? data[0] : data;

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            result?.message ??
            "Activation de session impossible.",
          message:
            result?.message ??
            "Activation de session impossible.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      result,
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ??
          "Activation de session impossible.",
      },
      { status: 500 }
    );
  }
}