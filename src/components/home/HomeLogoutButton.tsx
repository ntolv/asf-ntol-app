"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomeLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Erreur deconnexion:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home-logout-zone">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="home-logout-button"
        aria-label="Se déconnecter"
      >
        <span className="home-logout-button__icon" aria-hidden="true">⎋</span>
        <span className="home-logout-button__label">
          {loading ? "Déconnexion..." : "Déconnexion"}
        </span>
      </button>
    </div>
  );
}