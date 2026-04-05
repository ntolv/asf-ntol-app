"use client";

import { useState } from "react";

type NotificationType =
  | "ENCHERE_SURCLASSEE"
  | "GAIN_ATTRIBUE"
  | "RETARD_CAISSE"
  | "AIDE_VALIDEE";

const notificationTypes: Array<{ value: NotificationType; label: string }> = [
  { value: "ENCHERE_SURCLASSEE", label: "Enchère dépassée" },
  { value: "GAIN_ATTRIBUE", label: "Gain attribué" },
  { value: "RETARD_CAISSE", label: "Retard caisse" },
  { value: "AIDE_VALIDEE", label: "Aide validée" },
];

export default function PushNotificationTestCard({ membreId }: { membreId: string }) {
  const [loading, setLoading] = useState(false);
  const [typeNotification, setTypeNotification] = useState<NotificationType>("ENCHERE_SURCLASSEE");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSend() {
    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          membreId,
          typeNotification,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(data?.message || "Envoi impossible.");
        return;
      }

      setMessage(data?.message || "Notification envoyée.");
    } catch (error: any) {
      setMessage(error?.message || "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">Test notifications</p>
      <p className="mt-1 text-xs text-slate-500">
        Envoi manuel de notification sur ce compte.
      </p>

      <select
        value={typeNotification}
        onChange={(event) => setTypeNotification(event.target.value as NotificationType)}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
      >
        {notificationTypes.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleSend}
        disabled={loading}
        className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Envoi..." : "Envoyer une notification test"}
      </button>

      {message ? (
        <p className="mt-3 text-sm text-slate-600">{message}</p>
      ) : null}
    </div>
  );
}