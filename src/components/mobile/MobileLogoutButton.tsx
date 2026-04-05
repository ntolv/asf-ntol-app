"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function MobileLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Erreur déconnexion mobile:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="mobile-pro-logout-btn"
      aria-label="Se déconnecter"
    >
      <LogOut className="mobile-pro-logout-btn__icon" />
      <span className="mobile-pro-logout-btn__label">
        {loading ? "Déconnexion..." : "Déconnexion"}
      </span>
    </button>
  );
}