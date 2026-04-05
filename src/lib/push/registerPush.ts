function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    bytes[i] = rawData.charCodeAt(i);
  }

  return bytes.buffer.slice(0);
}

export type PushRegistrationResult =
  | { success: true; subscription: PushSubscription }
  | { success: false; message: string };

export async function registerPush(): Promise<PushRegistrationResult> {
  try {
    if (typeof window === "undefined") {
      return { success: false, message: "Navigation indisponible côté serveur." };
    }

    if (!("serviceWorker" in navigator)) {
      return { success: false, message: "Service Worker non supporté sur cet appareil." };
    }

    if (!("PushManager" in window)) {
      return { success: false, message: "Push API non supportée sur cet appareil." };
    }

    if (!("Notification" in window)) {
      return { success: false, message: "Notifications non supportées sur cet appareil." };
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      return { success: false, message: "Clé publique VAPID manquante." };
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return { success: false, message: "Permission de notification refusée." };
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToArrayBuffer(vapidPublicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    return { success: true, subscription };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Impossible d'enregistrer les notifications push.",
    };
  }
}

export async function subscribePushOnServer(
  subscription: PushSubscription
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || "Erreur lors de l'enregistrement de l'abonnement push.",
      };
    }

    return {
      success: true,
      message: data?.message || "Notifications activées.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Erreur réseau lors de l'enregistrement push.",
    };
  }
}