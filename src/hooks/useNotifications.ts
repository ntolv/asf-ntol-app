"use client";

import { useEffect, useState } from "react";
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

function normalizeType(value: string | null | undefined): Notification["type"] {
  const v = String(value || "").toLowerCase();

  if (v.includes("success") || v.includes("ok") || v.includes("valide")) {
    return "success";
  }

  if (v.includes("warning") || v.includes("retard") || v.includes("alerte")) {
    return "warning";
  }

  if (v.includes("error") || v.includes("erreur") || v.includes("echec")) {
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
  };
}

export function useNotifications(userId: string | undefined) {
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    loading: true,
    error: null,
    unreadCount: 0,
  });

  useEffect(() => {
    if (!userId) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("membre_id", userId)
          .order("date_envoi", { ascending: false })
          .limit(20);

        if (error) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: error.message || "Erreur lors du chargement des notifications",
          }));
          return;
        }

        const notifications = (data || []).map(normalizeNotification);
        const unreadCount = notifications.filter((n) => !n.lue).length;

        setState({
          notifications,
          loading: false,
          error: null,
          unreadCount,
        });
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || "Erreur lors du chargement des notifications",
        }));
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
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
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ date_lecture: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) {
        console.error("Erreur lors du marquage comme lu:", error);
        return;
      }

      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                lue: true,
                date_lecture: new Date().toISOString(),
              }
            : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (error) {
      console.error("Erreur lors du marquage comme lu:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("notifications")
        .update({ date_lecture: now })
        .eq("membre_id", userId)
        .is("date_lecture", null);

      if (error) {
        console.error("Erreur lors du marquage de toutes comme lues:", error);
        return;
      }

      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({
          ...n,
          lue: true,
          date_lecture: n.date_lecture || now,
        })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("Erreur lors du marquage de toutes comme lues:", error);
    }
  };

  return {
    ...state,
    markAsRead,
    markAllAsRead,
  };
}