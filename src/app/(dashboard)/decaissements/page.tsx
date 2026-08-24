"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import ActionButton from "@/components/ui/ActionButton";

type Rubrique = {
  id: string;
  nom: string;
};

function isBureauRole(
  role: unknown,
  roleCode: unknown
) {
  const raw =
    `${String(roleCode || "")} ${String(role || "")}`.toLowerCase();

  return (
    raw.includes("admin") ||
    raw.includes("président") ||
    raw.includes("president") ||
    raw.includes("trésorier") ||
    raw.includes("tresorier")
  );
}

export default function DecaissementPage() {
  const [rubriques, setRubriques] = useState<Rubrique[]>([]);
  const [rubriqueId, setRubriqueId] = useState("");
  const [montant, setMontant] = useState(0);
  const [motif, setMotif] = useState("");
  const [dateDecaissement, setDateDecaissement] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const auth: any = useAuth?.() ?? {};

  const canAccessBureau =
    isBureauRole(
      auth?.member?.role,
      auth?.member?.roleCode
    );

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
          date_decaissement: dateDecaissement,
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

  if (auth?.loading === true) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Chargement...
      </div>
    );
  }

  if (!canAccessBureau) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Accès refusé"
          subtitle="Cette page est réservée au Bureau."
        />

        <SectionCard
          title="Accès non autorisé"
          padding="md"
        >
          <p className="text-sm text-slate-600">
            Seuls le Président, le Trésorier et l'Administrateur peuvent effectuer des décaissements.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Décaissement"
        subtitle="Effectuer une sortie de fonds depuis une caisse."
        actions={
          <Link href="/caisse">
            <ActionButton variant="secondary" size="md">
              ← Retour à Caisse
            </ActionButton>
          </Link>
        }
        size="md"
      />

      {message && (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </div>
      )}

      <SectionCard title="Formulaire de décaissement" padding="md">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Caisse (rubrique)
            </label>
            <select
              value={rubriqueId}
              onChange={(e) => setRubriqueId(e.target.value)}
              className="w-full rounded-[12px] border border-slate-300 px-4 py-3"
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
              className="w-full rounded-[12px] border border-slate-300 px-4 py-3"
            />

            <div className="flex gap-2 mt-3">
              <ActionButton 
                variant="outline" 
                size="sm"
                onClick={() => addMontant(1000)}
              >
                +1000
              </ActionButton>
              <ActionButton 
                variant="outline" 
                size="sm"
                onClick={() => addMontant(5000)}
              >
                +5000
              </ActionButton>
              <ActionButton 
                variant="outline" 
                size="sm"
                onClick={() => addMontant(10000)}
              >
                +10000
              </ActionButton>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date du décaissement
            </label>
            <input
              type="date"
              value={dateDecaissement}
              onChange={(e) => setDateDecaissement(e.target.value)}
              className="w-full rounded-[12px] border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Motif
            </label>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full rounded-[12px] border border-slate-300 px-4 py-3"
            />
          </div>

          <ActionButton
            onClick={handleSubmit}
            disabled={loading || !rubriqueId || montant <= 0 || !dateDecaissement}
            variant="primary"
            size="md"
            fullWidth
            loading={loading}
          >
            Valider décaissement
          </ActionButton>
        </div>
      </SectionCard>
    </div>
  );
}
