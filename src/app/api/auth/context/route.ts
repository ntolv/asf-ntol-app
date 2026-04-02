import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
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
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json(
        {
          success: false,
          message: userError.message || "Erreur récupération utilisateur",
          user: null,
          member: null,
          utilisateur: null,
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Utilisateur non connecté",
          user: null,
          member: null,
          utilisateur: null,
        },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json(
        {
          success: false,
          message: context?.message || "Erreur contexte utilisateur",
          user,
          member: null,
          utilisateur: context?.utilisateur ?? null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Contexte utilisateur chargé",
        user,
        member: context.member ?? null,
        utilisateur: context.utilisateur ?? null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur serveur auth context",
        user: null,
        member: null,
        utilisateur: null,
      },
      { status: 500 }
    );
  }
}