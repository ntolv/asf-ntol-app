"use client";

import { useEffect, useState } from "react";

type MontantAttenteData = {
  id: string;
  membre_id: string;
  nom_complet: string;
  montant_initial: number;
  montant_restant: number;
  statut: string;
  date: string | null;
};

type ImputationData = {
  id: string;
  membre_id: string;
  nom_complet: string;
  rubrique: string;
  periode: string;
  montant: number;
  date: string;
};

type ResumeData = {
  total_montants_attente: number;
  total_impute: number;
  nombre_imputations: number;
};

type ImputationsApiResponse = {
  montantsAttente: MontantAttenteData[];
  imputations: ImputationData[];
  resume: ResumeData;
};

export default function ImputationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [montantsAttente, setMontantsAttente] = useState<MontantAttenteData[]>([]);
  const [imputations, setImputations] = useState<ImputationData[]>([]);
  const [resume, setResume] = useState<ResumeData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImputationsData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/imputations", {
          method: "GET",
          cache: "no-store"
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Erreur lors du chargement des imputations");
        }

        if (!cancelled) {
          const typedPayload = payload as ImputationsApiResponse;
          setMontantsAttente(typedPayload.montantsAttente || []);
          setImputations(typedPayload.imputations || []);
          setResume(
            typedPayload.resume || {
              total_montants_attente: 0,
              total_impute: 0,
              nombre_imputations: 0
            }
          );
        }
      } catch (err: any) {
        console.error("Erreur imputations:", err);
        if (!cancelled) {
          setError(err?.message || "Erreur lors du chargement des données");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadImputationsData();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatMontant = (montant: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
    }).format(montant || 0);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const getStatutColor = (statut: string) => {
    switch ((statut || "").toLowerCase()) {
      case "payé":
      case "payee":
      case "valide":
      case "validée":
        return "text-green-700 bg-green-50";
      case "en attente":
      case "en_attente":
      case "partiellement_impute":
        return "text-yellow-700 bg-yellow-50";
      case "retard":
      case "en retard":
      case "en_retard":
        return "text-red-700 bg-red-50";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        
        </section>
      </div>
    </main>
  );
}
