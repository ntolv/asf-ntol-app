"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SessionData = {
  id: string;
  cycle: string;
  periode: string;
  ordre_session: number;
  statut_session: string;
  mise_brute_session: number;
  nombre_lots: number;
  date_session_prevue: string | null;
};

type LotData = {
  id: string;
  periode: string;
  lot: number;
  montant_depart_enchere: number;
  mise_brute_lot: number;
  statut_lot: string;
  gagnant: string | null;
  montant_total_relances: number;
  gain_reel: number;
};

type GagnantData = {
  id: string;
  periode: string;
  lot: number;
  nom_complet: string;
  mise_brute: number;
  total_relances: number;
  gain_reel: number;
  statut_gain: string;
};

type EnchereData = {
  id: string;
  membre_id: string;
  nom_complet: string;
  periode: string;
  lot: number;
  montant_relance: number;
  montant_total_offert: number;
  rang: number | null;
  statut: string;
  date_enchere: string | null;
};

export default function TontinePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [lots, setLots] = useState<LotData[]>([]);
  const [gagnants, setGagnants] = useState<GagnantData[]>([]);
  const [encheres, setEncheres] = useState<EnchereData[]>([]);

  useEffect(() => {
    async function loadTontineData() {
      try {
        setLoading(true);
        setError(null);

        const [
          { data: sessionsData, error: sessionsError },
          { data: lotsData, error: lotsError },
          { data: gagnantsData, error: gagnantsError },
          { data: encheresData, error: encheresError },
        ] = await Promise.all([
          supabase
            .from("v_tontine_sessions")
            .select("*")
            .order("periode", { ascending: false }),
          supabase
            .from("v_tontine_lots")
            .select("*")
            .order("periode", { ascending: false }),
          supabase
            .from("v_tontine_gagnants_resume")
            .select("*")
            .order("periode", { ascending: false }),
          supabase
            .from("v_tontine_encheres")
            .select("*")
            .order("periode", { ascending: false })
            .order("date_enchere", { ascending: false }),
        ]);

        if (sessionsError) throw sessionsError;
        if (lotsError) throw lotsError;
        if (gagnantsError) throw gagnantsError;
        if (encheresError) throw encheresError;

        setSessions(sessionsData || []);
        setLots(lotsData || []);
        setGagnants(gagnantsData || []);
        setEncheres(encheresData || []);
      } catch (err: any) {
        console.error("Erreur tontine:", JSON.stringify(err, null, 2), err);
        setError(err?.message || "Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    }

    loadTontineData();
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
      case "actif":
      case "en cours":
      case "ouverte":
      case "ouvert":
        return "text-green-700 bg-green-50";
      case "cloturee":
      case "clôturée":
      case "termine":
      case "terminé":
      case "attribue":
      case "attribué":
      case "confirme":
      case "confirmé":
        return "text-blue-700 bg-blue-50";
      case "planifiee":
      case "planifiée":
      case "brouillon":
      case "calculee":
      case "calculée":
      case "validee":
      case "validée":
      case "en attente":
      case "prévu":
        return "text-yellow-700 bg-yellow-50";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        Chargement des données tontine...
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

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold text-slate-900">Tontine</h1>
        <p className="mt-2 text-slate-600">
          Suivez les sessions, lots, gagnants et l'historique des enchères.
        </p>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Sessions</h2>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Aucune session enregistrée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Cycle</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Période</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Session</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Mise</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Lots</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Date prévue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sessions.map((session) => (
                  <tr key={session.id} className="transition-colors hover:bg-slate-50">
                    <td className="py-4 text-sm font-medium text-slate-900">{session.cycle}</td>
                    <td className="py-4 text-sm text-slate-900">{session.periode}</td>
                    <td className="py-4 text-sm text-slate-900">Session {session.ordre_session}</td>
                    <td className="py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(
                          session.statut_session
                        )}`}
                      >
                        {session.statut_session}
                      </span>
                    </td>
                    <td className="py-4 text-sm font-semibold text-slate-900">
                      {formatMontant(session.mise_brute_session)}
                    </td>
                    <td className="py-4 text-sm text-slate-900">{session.nombre_lots}</td>
                    <td className="py-4 text-sm text-slate-600">
                      {formatDate(session.date_session_prevue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Lots</h2>

        {lots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Aucun lot enregistré.
          </div>
        ) : (
          <div className="space-y-3">
            {lots.map((lot) => (
              <div key={lot.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        Lot {lot.lot}
                      </span>
                      <span className="ml-2 text-sm font-medium text-slate-900">{lot.periode}</span>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Départ enchère</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatMontant(lot.montant_depart_enchere)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Mise brute</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatMontant(lot.mise_brute_lot)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Relances</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatMontant(lot.montant_total_relances)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Gain réel</p>
                        <p className="text-sm font-semibold text-green-700">
                          {formatMontant(lot.gain_reel)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(
                        lot.statut_lot
                      )}`}
                    >
                      {lot.statut_lot}
                    </span>
                    {lot.gagnant ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        {lot.gagnant}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Gagnants</h2>

        {gagnants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Aucun gain enregistré.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Nom</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Période</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Lot</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Mise</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Relances</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Gain réel</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {gagnants.map((gagnant) => (
                  <tr key={gagnant.id} className="transition-colors hover:bg-slate-50">
                    <td className="py-4 text-sm font-medium text-slate-900">{gagnant.nom_complet}</td>
                    <td className="py-4 text-sm text-slate-900">{gagnant.periode}</td>
                    <td className="py-4 text-sm text-slate-900">Lot {gagnant.lot}</td>
                    <td className="py-4 text-sm font-semibold text-slate-900">
                      {formatMontant(gagnant.mise_brute)}
                    </td>
                    <td className="py-4 text-sm text-slate-900">
                      {formatMontant(gagnant.total_relances)}
                    </td>
                    <td className="py-4 text-sm font-semibold text-green-700">
                      {formatMontant(gagnant.gain_reel)}
                    </td>
                    <td className="py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(
                          gagnant.statut_gain
                        )}`}
                      >
                        {gagnant.statut_gain}
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
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Historique des enchères</h2>

        {encheres.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Aucune enchère enregistrée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Nom</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Période</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Lot</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Relance</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Total offert</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Rang</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut</th>
                  <th className="pb-3 text-left text-sm font-medium text-slate-500">Date enchère</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {encheres.map((enchere) => (
                  <tr key={enchere.id} className="transition-colors hover:bg-slate-50">
                    <td className="py-4 text-sm font-medium text-slate-900">{enchere.nom_complet}</td>
                    <td className="py-4 text-sm text-slate-900">{enchere.periode}</td>
                    <td className="py-4 text-sm text-slate-900">Lot {enchere.lot}</td>
                    <td className="py-4 text-sm font-semibold text-slate-900">
                      {formatMontant(enchere.montant_relance)}
                    </td>
                    <td className="py-4 text-sm font-semibold text-slate-900">
                      {formatMontant(enchere.montant_total_offert)}
                    </td>
                    <td className="py-4 text-sm text-slate-900">{enchere.rang ?? "-"}</td>
                    <td className="py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(
                          enchere.statut
                        )}`}
                      >
                        {enchere.statut}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-slate-600">
                      {formatDate(enchere.date_enchere)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
