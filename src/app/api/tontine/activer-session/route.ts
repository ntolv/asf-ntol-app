import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body?.session_id;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { success: false, error: "session_id obligatoire." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "fn_tontine_activer_session_planifiee",
      { p_session_id: sessionId }
    );

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          error: result?.message ?? "Activation de session impossible.",
          message: result?.message ?? "Activation de session impossible.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Activation de session impossible.",
      },
      { status: 500 }
    );
  }
}