"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  compact?: boolean;
  className?: string;
};

export default function LogoutButton({ compact = false, className = "" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);

      if (!supabase?.auth) {
        throw new Error("Client Supabase indisponible");
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // Nettoyer les storages locaux (compatibilité)
      try {
        localStorage.clear();
      } catch {}

      try {
        sessionStorage.clear();
      } catch {}

      // Redirection immédiate vers login
      window.location.replace("/login");
    } catch (error) {
      console.error("Erreur logout:", error);
      alert("La déconnexion a échoué. Veuillez réessayer.");
      setLoading(false);
    }
  }

  const baseClass = compact
    ? "rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm"
    : "inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm";

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`${baseClass} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? "Déconnexion..." : "Déconnexion"}
    </button>
  );
}
