import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";

export async function POST() {
  try {
    const supabaseAuth = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabaseAuth.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: "Utilisateur non connecté" },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: utilisateur, error: readError } = await admin
      .from("utilisateurs")
      .select("id, login_count")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (readError || !utilisateur?.id) {
      return NextResponse.json(
        {
          success: false,
          message: readError?.message || "Utilisateur ASF introuvable",
        },
        { status: 404 }
      );
    }

    const { error: updateError } = await admin
      .from("utilisateurs")
      .update({
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        login_count: (utilisateur.login_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", utilisateur.id);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          message: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur login-success",
      },
      { status: 500 }
    );
  }
}