import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

function emptyContext(message: string, status = 200) {
  return NextResponse.json(
    {
      success: false,
      message,
      authUserId: null,
      membreId: null,
      email: null,
      telephone: null,
      nom: null,
      role: null,
      roleCode: null,
      user: null,
      utilisateur: null,
      member: null,
    },
    { status }
  );
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return emptyContext(error?.message || "Utilisateur non connecté");
    }

    const context = await getUserContext({
      id: user.id,
      email: user.email ?? null,
    });

    if (!context.success) {
      return NextResponse.json(
        {
          success: false,
          message: context.message || "Contexte utilisateur indisponible",
          authUserId: context.authUserId ?? null,
          membreId: context.membreId ?? null,
          email: context.email ?? null,
          telephone: context.member?.telephone ?? null,
          nom: context.member?.nom_complet ?? context.member?.nom ?? null,
          role: context.role?.libelle ?? context.member?.role ?? null,
          roleCode: context.role?.code ?? context.member?.role_code ?? null,
          user: context.user ?? null,
          utilisateur: context.utilisateur ?? null,
          member: context.member ?? null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: context.message || "Contexte utilisateur OK",
      authUserId: context.authUserId ?? null,
      membreId: context.membreId ?? null,
      email: context.email ?? null,
      telephone: context.member?.telephone ?? null,
      nom: context.member?.nom_complet ?? context.member?.nom ?? null,
      role: context.role?.libelle ?? context.member?.role ?? null,
      roleCode: context.role?.code ?? context.member?.role_code ?? null,
      user: context.user ?? null,
      utilisateur: context.utilisateur ?? null,
      member: context.member ?? null,
    });
  } catch (error: any) {
    return emptyContext(error?.message || "Erreur contexte utilisateur", 500);
  }
}
