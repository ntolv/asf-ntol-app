"use client";

import { useState } from "react";
import { registerPush, subscribePushOnServer } from "@/lib/push/registerPush";

export default function EnablePushButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleEnable() {
    setLoading(true);
    setMessage(null);

    const result = await registerPush();

    if (!("subscription" in result)) {
      setMessage(result.message);
      setLoading(false);
      return;
    }

    const save = await subscribePushOnServer(result.subscription);

    setMessage(save.message);
    setLoading(false);
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleEnable}
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Activation..." : "Activer les notifications"}
      </button>

      {message ? (
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      ) : null}
    </div>
  );
}