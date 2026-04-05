"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Rubrique = {
  id: string;
  nom: string;
};

export default function DecaissementPage() {
  const [rubriques, setRubriques] = useState<Rubrique[]>([]);
  const [rubriqueId, setRubriqueId] = useState("");
  const [montant, setMontant] = useState(0);
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRubriques() {
    try {
      const res = await fetch("/api/rubriques", {
        cache: "no-store",
      });

      const json = await res.json();

      if (json?.success) {
        const list = json.data ?? [];

        setRubriques(
          list.map((r: any) => ({
            id: r.id,
            nom: r.nom,
          }))
        );
      }
    } catch (err) {
      console.error("Erreur chargement rubriques", err);
    }
  }

  useEffect(() => {
    loadRubriques();
  }, []);

  function addMontant(value: number) {
    setMontant((prev) => Math.max(0, prev + value));
  }

  async function handleSubmit() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/decaissements/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rubrique_id: rubriqueId,
          montant,
          motif,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Erreur");
      }

      setMessage("Décaissement effectué avec succès");
      setMontant(0);
      setMotif("");
    } catch (err: any) {
      setMessage(err?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Décaissement
            </h1>
            <p className="text-sm text-slate-600">
              Effectuer une sortie de fonds depuis une caisse.
            </p>
          </div>

          <Link
            href="/caisse"
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            ← Retour à Caisse
          </Link>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </div>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Caisse (rubrique)
          </label>
          <select
            value={rubriqueId}
            onChange={(e) => setRubriqueId(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
          >
            <option value="">Sélectionner une caisse</option>
            {rubriques.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Montant
          </label>
          <input
            type="number"
            value={montant}
            onChange={(e) => setMontant(Number(e.target.value))}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
          />

          <div className="flex gap-2 mt-3">
            <button onClick={() => addMontant(1000)} className="rounded-full border px-4 py-2 text-sm">
              +1000
            </button>
            <button onClick={() => addMontant(5000)} className="rounded-full border px-4 py-2 text-sm">
              +5000
            </button>
            <button onClick={() => addMontant(10000)} className="rounded-full border px-4 py-2 text-sm">
              +10000
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Motif
          </label>
          <input
            type="text"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !rubriqueId || montant <= 0}
          className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-white font-semibold"
        >
          {loading ? "Traitement..." : "Valider décaissement"}
        </button>
      </section>
    </div>
  );
}
