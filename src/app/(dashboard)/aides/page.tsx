"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DemandeAideData = {
  id: string;
  membre_id: string;
  date_demande: string;
  objet: string;
  motif: string | null;
  montant_demande: number;
  statut: string;
  commentaire_decision: string | null;
};

type AideSolidariteData = {
  id: string;
  membre_id: string;
  date_aide: string;
  rubrique: string;
  montant_accorde: number;
  mode_decaissement: string | null;
  statut: string;
  commentaire: string | null;
};

export default function AidesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demandesAide, setDemandesAide] = useState<DemandeAideData[]>([]);
  const [aidesSolidarite, setAidesSolidarite] = useState<AideSolidariteData[]>([]);

  useEffect(() => {
    async function loadAidesData() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session?.user?.id) throw new Error("Session utilisateur introuvable");

        const authUserId = session.user.id;

        const { data: utilisateur, error: utilisateurError } = await supabase
          .from("utilisateurs")
          .select("id, membre_id")
          .eq("auth_user_id", authUserId)
          .maybeSingle();

        if (utilisateurError) throw utilisateurError;
        if (!utilisateur?.membre_id) throw new Error("Membre non trouvé");

        const membreId = utilisateur.membre_id;

        const [
          { data: demandesData, error: demandesError },
          { data: aidesData, error: aidesError },
        ] = await Promise.all([
          supabase
            .from("v_demandes_aide")
            .select("*")
            .eq("membre_id", membreId)
            .order("date_demande", { ascending: false }),
          supabase
            .from("v_aides_solidarite")
            .select("*")
            .eq("membre_id", membreId)
            .order("date_aide", { ascending: false }),
        ]);

        if (demandesError) throw demandesError;
        if (aidesError) throw aidesError;

        setDemandesAide(demandesData || []);
        setAidesSolidarite(aidesData || []);
      } catch (err: any) {
        console.error("Erreur aides:", JSON.stringify(err, null, 2), err);
        setError(err?.message || "Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    }

    loadAidesData();
  }, []);

  const formatMontant = (montant: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
    }).format(montant);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const getStatutColor = (statut: string) => {
    switch ((statut || "").toLowerCase()) {
      case "accordee":
      case "accordée":
      case "versee":
      case "versée":
      case "acceptee":
      case "acceptée":
        return "text-green-700 bg-green-50";
      case "soumise":
      case "en_etude":
      case "en étude":
      case "en attente":
        return "text-yellow-700 bg-yellow-50";
      case "refusee":
      case "refusée":
      case "annulee":
      case "annulée":
        return "text-red-700 bg-red-50";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        Chargement des aides...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        <p className="font-semibold">Erreur lors du chargement des données</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  const totalDemandesAide = demandesAide.length;
  const totalAidesAccordees = aidesSolidarite.length;
  const montantTotalAccorde = aidesSolidarite.reduce((sum, aide) => sum + aide.montant_accorde, 0);

  return (
    <main className="bg-green-50/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <h1 className="text-3xl font-bold text-slate-900">Aides</h1>
          <p className="mt-2 text-slate-600">
            Consultez vos demandes d'aide et les aides de solidarité accordées.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Demandes d'aide</p>
                <p className="text-2xl font-bold text-slate-900">{totalDemandesAide}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11M9 21V3m4 18h8m-4 0V9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Aides accordées</p>
                <p className="text-2xl font-bold text-green-700">{totalAidesAccordees}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-3">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Montant total</p>
                <p className="text-2xl font-bold text-emerald-700">{formatMontant(montantTotalAccorde)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Demandes d'aide</h2>

          {demandesAide.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucune demande d'aide enregistrée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Date demande</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Objet</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Motif</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Montant demandé</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {demandesAide.map((demande) => (
                    <tr key={demande.id} className="transition-colors hover:bg-slate-50">
                      <td className="py-4 text-sm text-slate-900">{formatDate(demande.date_demande)}</td>
                      <td className="py-4 text-sm font-medium text-slate-900">{demande.objet}</td>
                      <td className="py-4 text-sm text-slate-600">{demande.motif || "-"}</td>
                      <td className="py-4 text-sm font-semibold text-slate-900">
                        {formatMontant(demande.montant_demande)}
                      </td>
                      <td className="py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(demande.statut)}`}>
                          {demande.statut}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-slate-600">
                        {demande.commentaire_decision || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Aides de solidarité</h2>

          {aidesSolidarite.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucune aide de solidarité accordée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Date aide</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Rubrique</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Montant accordé</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Mode décaissement</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {aidesSolidarite.map((aide) => (
                    <tr key={aide.id} className="transition-colors hover:bg-slate-50">
                      <td className="py-4 text-sm text-slate-900">{formatDate(aide.date_aide)}</td>
                      <td className="py-4 text-sm font-medium text-slate-900">{aide.rubrique}</td>
                      <td className="py-4 text-sm font-semibold text-green-700">
                        {formatMontant(aide.montant_accorde)}
                      </td>
                      <td className="py-4 text-sm text-slate-900">{aide.mode_decaissement || "-"}</td>
                      <td className="py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(aide.statut)}`}>
                          {aide.statut}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-slate-600">{aide.commentaire || "-"}</td>
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
