"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  lotId: string;
  membreId: string;
  onSuccess?: () => void;
};

type EncherirResponseRow = {
  success: boolean;
  message: string;
  session_id: string;
  lot_id: string;
  membre_id: string;
  statut_session: string;
  statut_lot: string;
  montant_depart: number;
  montant_actuel: number;
  montant_relance: number;
  nouveau_montant_total: number;
  total_relances_lot: number;
};

export default function EncherirModal({ lotId, membreId, onSuccess }: Props) {
  const [montant, setMontant] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    try {
      setLoading(true);
      setMessage(null);

      const montantRelance = Number(montant);

      if (!Number.isFinite(montantRelance) || montantRelance <= 0) {
        setMessage("Montant invalide");
        return;
      }

      const { data, error } = await supabase.rpc("fn_encherir", {
        p_lot_id: lotId,
        p_membre_id: membreId,
        p_montant_relance: montantRelance,
        p_commentaire: null,
      });

      if (error) {
        console.error("Erreur fn_encherir:", error);
        setMessage(error.message || "Erreur lors de l'enchère");
        return;
      }

      const rows = (data as EncherirResponseRow[] | null) ?? [];
      const row = rows[0];

      if (!row?.success) {
        setMessage(row?.message || "Erreur inconnue");
        return;
      }

      setMessage("✅ Enchère enregistrée");
      setMontant("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Erreur handleSubmit:", err);
      setMessage(err?.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-emerald-900">Renchérir</h3>

      <input
        type="number"
        min="0"
        step="100"
        placeholder="Montant de relance"
        value={montant}
        onChange={(e) => setMontant(e.target.value)}
        className="mb-3 w-full rounded-xl border border-emerald-200 px-3 py-2 outline-none focus:border-emerald-500"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[1000, 5000, 10000].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setMontant(String(v))}
            className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            +{v}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-2 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Envoi..." : "Valider l'enchère"}
      </button>

      {message && (
        <p className="mt-3 text-center text-sm text-slate-700">{message}</p>
      )}
    </div>
  );
}
