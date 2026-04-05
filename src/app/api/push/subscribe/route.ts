import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type PushKeys = {
  p256dh?: string;
  auth?: string;
};

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: PushKeys;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const all = cookieStore.getAll();
  return all.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PushSubscriptionPayload;

    const endpoint = body?.endpoint?.trim();
    const p256dh = body?.keys?.p256dh?.trim();
    const auth = body?.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { success: false, message: "Abonnement push invalide." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Cookie: getCookieHeader(cookieStore),
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    const { data: utilisateur, error: userMapError } = await supabase
      .from("utilisateurs")
      .select("membre_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (userMapError || !utilisateur?.membre_id) {
      return NextResponse.json(
        { success: false, message: "Membre lié introuvable." },
        { status: 404 }
      );
    }

    const payload = {
      membre_id: utilisateur.membre_id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent"),
    };

    const { error: upsertError } = await supabase
      .from("notifications_push_subscriptions")
      .upsert(payload, { onConflict: "endpoint" });

    if (upsertError) {
      return NextResponse.json(
        { success: false, message: upsertError.message || "Erreur d'enregistrement push." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Abonnement push enregistré avec succès.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur serveur sur l'abonnement push.",
      },
      { status: 500 }
    );
  }
}