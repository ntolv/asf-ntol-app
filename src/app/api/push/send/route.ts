import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { buildNotificationContent, sendWebPushNotification } from "@/lib/push/webPush";

type SendPushBody = {
  membreId?: string;
  typeNotification?: string;
  titre?: string;
  message?: string;
  urlCible?: string;
  donnees?: Record<string, unknown>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

function createSupabaseFromCookies(cookieHeader: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Cookie: cookieHeader,
        },
      },
    }
  );
}

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendPushBody;
    const membreId = body?.membreId?.trim();
    const typeNotification = body?.typeNotification?.trim();

    if (!membreId || !typeNotification) {
      return NextResponse.json(
        { success: false, message: "membreId et typeNotification sont obligatoires." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const cookieHeader = getCookieHeader(cookieStore);

    const supabase = createSupabaseFromCookies(cookieHeader);
    const adminSupabase = createAdminSupabase();

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

    const { data: currentUserMap, error: currentUserMapError } = await supabase
      .from("utilisateurs")
      .select("membre_id, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (currentUserMapError || !currentUserMap?.membre_id) {
      return NextResponse.json(
        { success: false, message: "Contexte membre introuvable." },
        { status: 403 }
      );
    }

    const content = buildNotificationContent(typeNotification, {
      url: body?.urlCible || null,
      titre: body?.titre || null,
      message: body?.message || null,
    });

    const { data: createdId, error: createLogError } = await adminSupabase.rpc(
      "fn_notifications_creer",
      {
        p_membre_id: membreId,
        p_type_notification: typeNotification,
        p_titre: content.title,
        p_message: content.body,
        p_url_cible: content.url,
        p_donnees: body?.donnees || {},
      }
    );

    if (createLogError || !createdId) {
      return NextResponse.json(
        { success: false, message: createLogError?.message || "Impossible de créer le log de notification." },
        { status: 500 }
      );
    }

    const { data: subscriptions, error: subscriptionError } = await adminSupabase
      .from("notifications_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("membre_id", membreId);

    if (subscriptionError) {
      await adminSupabase.rpc("fn_notifications_marquer_echec", {
        p_notification_id: createdId,
        p_erreur: subscriptionError.message,
      });

      return NextResponse.json(
        { success: false, message: subscriptionError.message || "Erreur de lecture des abonnements." },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      await adminSupabase.rpc("fn_notifications_marquer_echec", {
        p_notification_id: createdId,
        p_erreur: "Aucun abonnement push trouvé pour ce membre.",
      });

      return NextResponse.json(
        { success: false, message: "Aucun abonnement push trouvé pour ce membre." },
        { status: 404 }
      );
    }

    const sendResults = await Promise.allSettled(
      subscriptions.map((subscription) =>
        sendWebPushNotification(subscription, {
          title: content.title,
          body: content.body,
          url: content.url,
        })
      )
    );

    const hasSuccess = sendResults.some((result) => result.status === "fulfilled");
    const failures = sendResults
      .filter((result) => result.status === "rejected")
      .map((result) => (result as PromiseRejectedResult).reason?.message || "Erreur push inconnue");

    if (hasSuccess) {
      await adminSupabase.rpc("fn_notifications_marquer_envoyee", {
        p_notification_id: createdId,
      });

      return NextResponse.json({
        success: true,
        message: "Notification envoyée.",
        notificationId: createdId,
        sentCount: sendResults.filter((result) => result.status === "fulfilled").length,
        failureCount: failures.length,
        failures,
      });
    }

    await adminSupabase.rpc("fn_notifications_marquer_echec", {
      p_notification_id: createdId,
      p_erreur: failures.join(" | "),
    });

    return NextResponse.json(
      {
        success: false,
        message: "Aucun envoi push n'a réussi.",
        notificationId: createdId,
        failures,
      },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur serveur lors de l'envoi push.",
      },
      { status: 500 }
    );
  }
}