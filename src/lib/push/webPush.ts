import webpush from "web-push";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
};

let configured = false;

function ensureWebPushConfigured() {
  if (configured) {
    return;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@asf-ntol.local";

  if (!publicKey || !privateKey) {
    throw new Error("Clés VAPID manquantes.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendWebPushNotification(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushPayload
) {
  ensureWebPushConfigured();

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-192.png",
  });

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    notificationPayload
  );
}

export function buildNotificationContent(
  typeNotification: string,
  options?: {
    url?: string | null;
    titre?: string | null;
    message?: string | null;
  }
) {
  const url = options?.url || "/";

  switch (typeNotification) {
    case "ENCHERE_SURCLASSEE":
      return {
        title: options?.titre || "Enchère dépassée",
        body: options?.message || "Une nouvelle surenchère a été enregistrée.",
        url: url || "/encheres",
      };

    case "GAIN_ATTRIBUE":
      return {
        title: options?.titre || "Gain attribué",
        body: options?.message || "Votre gain a été confirmé pour cette session.",
        url: url || "/tontine",
      };

    case "RETARD_CAISSE":
      return {
        title: options?.titre || "Alerte caisse",
        body: options?.message || "Un retard de contribution a été détecté.",
        url: url || "/caisse",
      };

    case "AIDE_VALIDEE":
      return {
        title: options?.titre || "Aide ou prêt validé",
        body: options?.message || "Une décision a été prise sur votre demande.",
        url: url || "/gestion-demandes",
      };

    default:
      return {
        title: options?.titre || "Notification ASF-NTOL",
        body: options?.message || "Vous avez une nouvelle notification.",
        url,
      };
  }
}