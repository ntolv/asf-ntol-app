"use client";

import { useEffect, useState } from "react";

type DemandePretData = {
  id: string;
  membre_id: string;
  date_demande: string;
  objet: string;
  montant_demande: number;
  duree_souhaitee: number | null;
  statut: string;
  avis_tresorier: string | null;
};

type PretData = {
  id: string;
  membre_id: string;
  date_octroi: string;
  montant_accorde: number;
  taux_interet: number;
  solde_restant: number;
  date_prochain_recalcul: string | null;
  date_fin_prevue: string | null;
  statut: string;
};

type RemboursementData = {
  id: string;
  pret_id: string;
  date_remboursement: string;
  montant_rembourse: number;
  mode_paiement: string | null;
  reference_paiement: string | null;
};

type ResumeData = {
  totalPrets: number;
  soldeRestantCumule: number;
  totalRembourse: number;
  totalDemandesPret: number;
};

type PretsApiResponse = {
  demandesPret: DemandePretData[];
  prets: PretData[];
  remboursements: RemboursementData[];
  resume: ResumeData;
};

export default function PretsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demandesPret, setDemandesPret] = useState<DemandePretData[]>([]);
  const [prets, setPrets] = useState<PretData[]>([]);
  const [remboursements, setRemboursements] = useState<RemboursementData[]>([]);
  const [resume, setResume] = useState<ResumeData>({
    totalPrets: 0,
    soldeRestantCumule: 0,
    totalRembourse: 0,
    totalDemandesPret: 0
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPretsData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/prets", {
          method: "GET",
          cache: "no-store"
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Erreur lors du chargement des prêts");
        }

        if (!cancelled) {
          const typedPayload = payload as PretsApiResponse;
          setDemandesPret(typedPayload.demandesPret || []);
          setPrets(typedPayload.prets || []);
          setRemboursements(typedPayload.remboursements || []);
          setResume(
            typedPayload.resume || {
              totalPrets: 0,
              soldeRestantCumule: 0,
              totalRembourse: 0,
              totalDemandesPret: 0
            }
          );
        }
      } catch (err: any) {
        console.error("Erreur prêts:", err);

        if (!cancelled) {
          setError(err?.message || "Erreur lors du chargement des données");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPretsData();

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
      case "validee":
      case "validée":
      case "accorde":
      case "accordé":
      case "actif":
      case "en_retard":
      case "en retard":
        return "text-green-700 bg-green-50";
      case "soumise":
      case "en_etude":
      case "en étude":
      case "suspendu":
        return "text-yellow-700 bg-yellow-50";
      case "refusee":
      case "refusée":
      case "annule":
      case "annulé":
      case "solde":
        return "text-red-700 bg-red-50";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Chargement des prêts...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="font-semibold">Erreur lors du chargement des données</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-green-50/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <h1 className="text-3xl font-bold text-slate-900">Prêts</h1>
          <p className="mt-2 text-slate-600">
            Consultez vos demandes de prêts, les prêts accordés et les remboursements.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total prêts</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{resume.totalPrets}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Solde restant</p>
            <p className="mt-2 text-2xl font-bold text-orange-700">{formatMontant(resume.soldeRestantCumule)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total remboursé</p>
            <p className="mt-2 text-2xl font-bold text-green-700">{formatMontant(resume.totalRembourse)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Demandes de prêt</p>
            <p className="mt-2 text-2xl font-bold text-purple-700">{resume.totalDemandesPret}</p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Demandes de prêts</h2>

          {demandesPret.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucune demande de prêt enregistrée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Date demande</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Objet</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Montant demandé</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Durée souhaitée</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Avis trésorier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {demandesPret.map((demande) => (
                    <tr key={demande.id} className="transition-colors hover:bg-slate-50">
                      <td className="py-4 text-sm text-slate-900">{formatDate(demande.date_demande)}</td>
                      <td className="py-4 text-sm font-medium text-slate-900">{demande.objet}</td>
                      <td className="py-4 text-sm font-semibold text-slate-900">
                        {formatMontant(demande.montant_demande)}
                      </td>
                      <td className="py-4 text-sm text-slate-900">
                        {demande.duree_souhaitee ? `${demande.duree_souhaitee} mois` : "-"}
                      </td>
                      <td className="py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(demande.statut)}`}>
                          {demande.statut}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-slate-600">{demande.avis_tresorier || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Prêts accordés</h2>

          {prets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucun prêt accordé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Date octroi</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Montant accordé</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Taux intérêt</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Solde restant</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Prochain recalcul</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Fin prévue</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {prets.map((pret) => (
                    <tr key={pret.id} className="transition-colors hover:bg-slate-50">
                      <td className="py-4 text-sm text-slate-900">{formatDate(pret.date_octroi)}</td>
                      <td className="py-4 text-sm font-semibold text-slate-900">
                        {formatMontant(pret.montant_accorde)}
                      </td>
                      <td className="py-4 text-sm text-slate-900">{pret.taux_interet}%</td>
                      <td className="py-4 text-sm font-semibold text-orange-700">
                        {formatMontant(pret.solde_restant)}
                      </td>
                      <td className="py-4 text-sm text-slate-600">{formatDate(pret.date_prochain_recalcul)}</td>
                      <td className="py-4 text-sm text-slate-600">{formatDate(pret.date_fin_prevue)}</td>
                      <td className="py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(pret.statut)}`}>
                          {pret.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Remboursements</h2>

          {remboursements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucun remboursement enregistré.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Date remboursement</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Montant remboursé</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Mode paiement</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Référence paiement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {remboursements.map((remboursement) => (
                    <tr key={remboursement.id} className="transition-colors hover:bg-slate-50">
                      <td className="py-4 text-sm text-slate-900">{formatDate(remboursement.date_remboursement)}</td>
                      <td className="py-4 text-sm font-semibold text-green-700">
                        {formatMontant(remboursement.montant_rembourse)}
                      </td>
                      <td className="py-4 text-sm text-slate-900">{remboursement.mode_paiement || "-"}</td>
                      <td className="py-4 text-sm text-slate-600">
                        {remboursement.reference_paiement || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
