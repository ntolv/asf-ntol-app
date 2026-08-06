import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

export async function POST(request: Request) {
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
        },
        { status: 401 }
      );
    }

    const userContext = await getUserContext(user);

    if (!userContext?.success || !userContext.membreId) {
      return NextResponse.json(
        {
          success: false,
          message:
            userContext?.message || "Contexte utilisateur introuvable.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const notificationId = String(
      body?.notification_id ?? ""
    ).trim();

    const toutMarquer = body?.tout === true;
    const now = new Date().toISOString();

    if (!toutMarquer && !notificationId) {
      return NextResponse.json(
        {
          success: false,
          message: "notification_id obligatoire.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    let query = supabaseAdmin
      .from("notifications")
      .update({
        date_lecture: now,
        updated_at: now,
      })
      .eq("membre_id", userContext.membreId)
      .is("date_lecture", null);

    if (!toutMarquer) {
      query = query.eq("id", notificationId);
    }

    const { data, error } = await query.select("id, date_lecture");

    if (error) {
      throw error;
    }

    if (!toutMarquer && (!data || data.length === 0)) {
      const { data: notificationExistante, error: verificationError } =
        await supabaseAdmin
          .from("notifications")
          .select("id, date_lecture")
          .eq("id", notificationId)
          .eq("membre_id", userContext.membreId)
          .maybeSingle();

      if (verificationError) {
        throw verificationError;
      }

      if (!notificationExistante) {
        return NextResponse.json(
          {
            success: false,
            message: "Notification introuvable ou accès refusé.",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      date_lecture: now,
      notifications_modifiees: data?.length ?? 0,
    });
  } catch (error: any) {
    console.error("Erreur lecture notification :", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur lors de l'enregistrement de la lecture.",
      },
      { status: 500 }
    );
  }
}
