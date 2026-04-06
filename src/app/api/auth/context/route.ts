import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();

    const context = await getUserContext({
      headers: {
        get: (name: string) => headerStore.get(name),
      },
      cookies: {
        getAll: () => cookieStore.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        })),
      },
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
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur contexte utilisateur",
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
      { status: 500 }
    );
  }
}