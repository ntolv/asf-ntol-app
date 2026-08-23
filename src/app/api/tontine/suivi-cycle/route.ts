import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    const supabaseAuth =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    const context =
      await getUserContext(user);

    if (!context?.success || !context.membreId) {
      return NextResponse.json(
        {
          error:
            context?.message ||
            "Contexte membre introuvable.",
        },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } =
      await supabase.rpc(
        "fn_tontine_get_suivi_cycle"
      );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erreur serveur",
      },
      { status: 500 }
    );
  }
}