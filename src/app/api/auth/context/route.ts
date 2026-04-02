import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "Utilisateur non connecté",
      });
    }

    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json({
        success: false,
        message: context?.message || "Erreur contexte utilisateur",
      });
    }

    return NextResponse.json({
      success: true,
      user,
      member: context.member,
      utilisateur: context.utilisateur,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || "Erreur serveur",
    });
  }
}