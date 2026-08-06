"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Notification {
  id: string;
  membre_id: string;
  utilisateur_id: string | null;
  type_notification: string;
  titre: string;
  message: string;
  canal: string | null;
  statut_notification: string | null;
  date_envoi: string | null;
  date_lecture: string | null;
  created_at: string;
  updated_at: string | null;
  url_cible: string | null;
  donnees?: Record<string, unknown> | null;
  lue: boolean;
  type: "info" | "success" | "warning" | "error";
  date_creation: string;
}

interface NotificationsState {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
}

const NOTIFICATION_READ_EVENT = "asf-notification-read";
const ALL_NOTIFICATIONS_READ_EVENT = "asf-all-notifications-read";

function normalizeType(
  value: string | null | undefined
): Notification["type"] {
  const normalized = String(value || "").toLowerCase();

  if (
    normalized.includes("success") ||
    normalized.includes("ok") ||
    normalized.includes("valide") ||
    normalized.includes("approuve")
  ) {
    return "success";
  }

  if (
    normalized.includes("warning") ||
    normalized.includes("retard") ||
    normalized.includes("alerte") ||
    normalized.includes("attente")
  ) {
    return "warning";
  }

  if (
    normalized.includes("error") ||
    normalized.includes("erreur") ||
    normalized.includes("echec") ||
    normalized.includes("refuse")
  ) {
    return "error";
  }

  return "info";
}

function normalizeNotification(row: any): Notification {
  return {
    ...row,
    lue: Boolean(row.date_lecture),
    type: normalizeType(row.type_notification),
    date_creation: row.date_envoi || row.created_at,
    url_cible: row.url_cible ?? null,
    donnees: row.donnees ?? null,
  };
}

async function readJsonSafe(response: Response) {
  const rawText = await response.text();

  try {
    return rawText ? JSON.parse(rawText) : null;
  } catch {
    return null;
  }
}

export function useNotifications(userId: string | undefined) {
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    loading: true,
    error: null,
    unreadCount: 0,
  });

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setState({
        notifications: [],
        loading: false,
        error: null,
        unreadCount: 0,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("membre_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        setState((previous) => ({
          ...previous,
          loading: false,
          error:
            error.message ||
            "Erreur lors du chargement des notifications.",
        }));
        return;
      }

      const notifications = (data || []).map(normalizeNotification);

      setState({
        notifications,
        loading: false,
        error: null,
        unreadCount: notifications.filter(
          (notification) => !notification.lue
        ).length,
      });
    } catch (error: any) {
      setState((previous) => ({
        ...previous,
        loading: false,
        error:
          error?.message ||
          "Erreur lors du chargement des notifications.",
      }));
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`notifications-${userId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `membre_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    function handleNotificationRead(event: Event) {
      const customEvent = event as CustomEvent<{
        notificationId: string;
        readAt: string;
      }>;

      const notificationId = customEvent.detail?.notificationId;
      const readAt = customEvent.detail?.readAt;

      if (!notificationId || !readAt) {
        return;
      }

      setState((previous) => {
        const notification = previous.notifications.find(
          (item) => item.id === notificationId
        );

        if (!notification || notification.lue) {
          return previous;
        }

        return {
          ...previous,
          notifications: previous.notifications.map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  lue: true,
                  date_lecture: readAt,
                }
              : item
          ),
          unreadCount: Math.max(0, previous.unreadCount - 1),
        };
      });
    }

    function handleAllNotificationsRead() {
      const now = new Date().toISOString();

      setState((previous) => ({
        ...previous,
        notifications: previous.notifications.map((notification) => ({
          ...notification,
          lue: true,
          date_lecture: notification.date_lecture || now,
        })),
        unreadCount: 0,
      }));
    }

    window.addEventListener(
      NOTIFICATION_READ_EVENT,
      handleNotificationRead
    );

    window.addEventListener(
      ALL_NOTIFICATIONS_READ_EVENT,
      handleAllNotificationsRead
    );

    return () => {
      window.removeEventListener(
        NOTIFICATION_READ_EVENT,
        handleNotificationRead
      );

      window.removeEventListener(
        ALL_NOTIFICATIONS_READ_EVENT,
        handleAllNotificationsRead
      );
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    const existingNotification = state.notifications.find(
      (notification) => notification.id === notificationId
    );

    if (!existingNotification || existingNotification.lue) {
      return true;
    }

    const readAt = new Date().toISOString();

    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_READ_EVENT, {
        detail: {
          notificationId,
          readAt,
        },
      })
    );

    try {
      const response = await fetch("/api/notifications/lecture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          notification_id: notificationId,
        }),
      });

      const result = await readJsonSafe(response);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            "Impossible d'enregistrer la lecture de la notification."
        );
      }

      return true;
    } catch (error) {
      console.error(
        "Erreur lors du marquage comme lu :",
        error
      );

      await fetchNotifications();
      return false;
    }
  };

  const markAllAsRead = async () => {
    if (!userId || state.unreadCount === 0) {
      return true;
    }

    window.dispatchEvent(
      new CustomEvent(ALL_NOTIFICATIONS_READ_EVENT)
    );

    try {
      const response = await fetch("/api/notifications/lecture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          tout: true,
        }),
      });

      const result = await readJsonSafe(response);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            "Impossible d'enregistrer la lecture des notifications."
        );
      }

      return true;
    } catch (error) {
      console.error(
        "Erreur lors du marquage de toutes comme lues :",
        error
      );

      await fetchNotifications();
      return false;
    }
  };

  return {
    ...state,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
  };
}
