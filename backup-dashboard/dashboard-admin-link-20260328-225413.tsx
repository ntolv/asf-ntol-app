"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import { getCurrentMembreId } from "@/lib/getCurrentMembreId";

type MembreData = {
  nom_complet: string;
  email: string | null;
  telephone: string | null;
  statut_associatif: string;
  categorie?: string | null;
};

type NotificationData = {
  id: string;
  titre: string;
  message: string;
  created_at: string;
  statut_notification: string;
};

type ContributionData = {
  id: string;
  periode: string;
  montant_total: number;
  mode_paiement: string | null;
  statut: string;
  date_paiement: string | null;
};

type RetardData = {
  id: string;
  rubrique: string;
  periode: string;
  montant_attendu: number;
  montant_paye: number;
  reste_a_payer: number;
  statut: string;
};

type Bloc1RubriqueData = {
  rubrique_id: string;
  rubrique_code: string;
  rubrique_nom: string;
  ordre_affichage: number;
  montant_attendu: number;
  montant_paye: number;
  reste_a_payer: number;
  statut: string;
};

type Bloc2MembreSessionData = {
  total_attendu: number;
  total_paye: number;
  reste_a_payer: number;
  nb_rubriques: number;
  nb_a_jour: number;
  nb_en_retard: number;
  statut_global: string;
};

type Bloc3MembreSituationData = {
  membre_id: string;
  nom_complet: string;
  categorie: string | null;
  statut_associatif: string;
  periode_reference: string;
  total_attendu: number;
  total_paye: number;
  reste_a_payer: number;
  nb_rubriques: number;
  nb_a_jour: number;
  nb_a_payer: number;
  nb_partiel: number;
  nb_en_retard: number;
  nb_non_parametre: number;
  progression_pct: number;
  statut_global: string;
};

function getPeriodeCourante() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membre, setMembre] = useState<MembreData | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [contributions, setContributions] = useState<ContributionData[]>([]);
  const [retards, setRetards] = useState<RetardData[]>([]);
  const [situationRubriques, setSituationRubriques] = useState<Bloc1RubriqueData[]>([]);
  const [bloc2, setBloc2] = useState<Bloc2MembreSessionData | null>(null);
  const [bloc3, setBloc3] = useState<Bloc3MembreSituationData | null>(null);

  const periodeCourante = useMemo(() => getPeriodeCourante(), []);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const membreId = await getCurrentMembreId();

        const { data: membreData, error: membreError } = await supabase
          .from("v_membres")
          .select("nom_complet, email, telephone, statut_associatif, categorie")
          .eq("id", membreId)
          .maybeSingle();

        if (membreError) throw membreError;
        if (!membreData) throw new Error("Membre non trouvé");

        setMembre(membreData);

        const [
          bloc1Result,
          bloc2Result,
          bloc3Result,
          contributionsResult,
          retardsResult,
          notificationsResult,
        ] = await Promise.all([
          withTimeout(
            Promise.resolve(
              supabase.rpc("fn_dashboard_bloc1_rubriques", {
                p_periode: periodeCourante,
              })
            ),
            5000
          ),
          withTimeout(
            Promise.resolve(
              supabase.rpc("fn_dashboard_bloc2_membre_session", {
                p_periode: periodeCourante,
              })
            ),
            5000
          ),
          withTimeout(
            Promise.resolve(
              supabase.rpc("fn_dashboard_bloc3_membre_situation", {
                p_periode: periodeCourante,
              })
            ),
            5000
          ),
          withTimeout(
            Promise.resolve(
              supabase
                .from("v_contributions")
                .select("*")
                .eq("membre_id", membreId)
                .order("periode", { ascending: false })
                .limit(5)
            ),
            5000
          ),
          withTimeout(
            Promise.resolve(
              supabase
                .from("v_retards")
                .select("*")
                .eq("membre_id", membreId)
                .order("periode", { ascending: false })
            ),
            5000
          ),
          withTimeout(
            Promise.resolve(
              supabase
                .from("notifications")
                .select("id, titre, message, created_at, statut_notification")
                .eq("membre_id", membreId)
                .order("created_at", { ascending: false })
                .limit(5)
            ),
            5000
          ),
        ]);

        const { data: bloc1Data, error: bloc1Error } = bloc1Result;
        const { data: bloc2Data, error: bloc2Error } = bloc2Result;
        const { data: bloc3Data, error: bloc3Error } = bloc3Result;
        const { data: contributionsData, error: contributionsError } = contributionsResult;
        const { data: retardsData, error: retardsError } = retardsResult;
        const { data: notificationsData, error: notificationsError } = notificationsResult;

        if (bloc1Error) throw bloc1Error;
        if (bloc2Error) throw bloc2Error;
        if (bloc3Error) throw bloc3Error;
        if (contributionsError) throw contributionsError;
        if (retardsError) throw retardsError;
        if (notificationsError) throw notificationsError;

        const safeBloc1 = (bloc1Data || []) as Bloc1RubriqueData[];
        const safeBloc2 = ((bloc2Data || [])[0] || null) as Bloc2MembreSessionData | null;
        const safeBloc3 = ((bloc3Data || [])[0] || null) as Bloc3MembreSituationData | null;
        const safeContributions = (contributionsData || []) as ContributionData[];
        const safeRetards = (retardsData || []) as RetardData[];
        const safeNotifications = (notificationsData || []) as NotificationData[];

        setSituationRubriques(safeBloc1);
        setBloc2(safeBloc2);
        setBloc3(safeBloc3);
        setContributions(safeContributions);
        setRetards(safeRetards);
        setNotifications(safeNotifications);
      } catch (err: any) {
        console.error("Erreur dashboard:", err);
        setError(err?.message || "Erreur lors du chargement de vos informations");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [periodeCourante]);

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
      case "a_jour":
      case "à jour":
        return "text-green-700 bg-green-50";
      case "partiel":
        return "text-yellow-700 bg-yellow-50";
      case "a_payer":
      case "à payer":
        return "text-orange-700 bg-orange-50";
      case "retard":
      case "en_retard":
      case "en retard":
        return "text-red-700 bg-red-50";
      case "en_attente_parametrage":
        return "text-slate-700 bg-slate-100";
      case "non_parametre":
        return "text-slate-700 bg-slate-100";
      case "en_cours":
        return "text-yellow-700 bg-yellow-50";
      case "payé":
      case "payee":
      case "payée":
        return "text-green-700 bg-green-50";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  const getStatutGlobalLabel = (statut: string | null | undefined) => {
    switch ((statut || "").toUpperCase()) {
      case "A_JOUR":
        return "À jour";
      case "EN_RETARD":
        return "En retard";
      case "EN_COURS":
        return "En cours";
      case "NON_PARAMETRE":
        return "Non paramétré";
      default:
        return statut || "Non défini";
    }
  };

  const getStatutGlobalIcon = (statut: string | null | undefined) => {
    switch ((statut || "").toUpperCase()) {
      case "A_JOUR":
        return "✅";
      case "EN_RETARD":
        return "⚠️";
      case "EN_COURS":
        return "🟡";
      case "NON_PARAMETRE":
        return "⚙️";
      default:
        return "•";
    }
  };

  const getProgressionColor = (progression: number) => {
    if (progression >= 100) return "bg-green-600";
    if (progression > 0) return "bg-yellow-500";
    return "bg-slate-300";
  };

  if (loading) {
    return (
      <main className="p-4 md:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Chargement du tableau de bord...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-4 md:p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="font-semibold">Erreur lors du chargement de vos informations</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!membre) {
    return (
      <main className="p-4 md:p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-700 shadow-sm">
          Impossible de charger le membre connecté.
        </div>
      </main>
    );
  }

  const whatsappHref = membre.telephone
    ? `https://wa.me/${membre.telephone.replace(/\D/g, "")}`
    : "#";

  const telephoneHref = membre.telephone ? `tel:${membre.telephone}` : "#";

  return (
    <main className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-gradient-to-br from-white to-green-50/30 p-6 shadow-lg ring-1 ring-green-100">
          <div className="mb-4">
            <p className="text-sm font-medium uppercase tracking-wide text-green-700">
              Association Famille NTOL
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
              Tableau de bord
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Période : {periodeCourante}
            </p>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-green-600 text-2xl font-bold text-white shadow-md">
                {membre.nom_complet?.slice(0, 1) || "A"}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  {membre.nom_complet}
                </h2>
                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    Statut : {membre.statut_associatif}
                  </span>
                  {membre.categorie ? (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                      {membre.categorie}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                <p className="mt-1 font-medium text-slate-800">
                  {membre.email || "Non renseigné"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Téléphone</p>
                <p className="mt-1 font-medium text-slate-800">
                  {membre.telephone || "Non renseigné"}
                </p>
              </div>

              <a
                href={telephoneHref}
                className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-green-700"
              >
                📞 Appeler
              </a>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-green-200 bg-green-50 px-4 py-3 font-semibold text-green-700 transition hover:bg-green-100"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </section>

        {bloc2 && (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-medium text-slate-500">Total attendu</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatMontant(Number(bloc2.total_attendu || 0))}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {bloc2.nb_rubriques} rubrique{bloc2.nb_rubriques > 1 ? "s" : ""}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-medium text-slate-500">Total payé</p>
              <p className="mt-2 text-2xl font-bold text-green-700">
                {formatMontant(Number(bloc2.total_paye || 0))}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {bloc2.nb_a_jour} rubrique{bloc2.nb_a_jour > 1 ? "s" : ""} à jour
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-medium text-slate-500">Reste à payer</p>
              <p className="mt-2 text-2xl font-bold text-orange-700">
                {formatMontant(Number(bloc2.reste_a_payer || 0))}
              </p>
              <p className="mt-2 text-sm text-slate-500">Solde de la période</p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-medium text-slate-500">Retards</p>
              <p className="mt-2 text-2xl font-bold text-red-700">
                {bloc2.nb_en_retard}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {bloc2.nb_en_retard > 0 ? "En retard" : "À jour"}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-medium text-slate-500">Situation globale</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {getStatutGlobalIcon(bloc2.statut_global)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {getStatutGlobalLabel(bloc2.statut_global)}
              </p>
            </div>
          </section>
        )}

        {bloc3 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Situation détaillée du membre
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Période : {bloc3.periode_reference}
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {getStatutGlobalLabel(bloc3.statut_global)}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Rubriques total
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {bloc3.nb_rubriques}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  À jour
                </p>
                <p className="text-lg font-bold text-green-700">
                  {bloc3.nb_a_jour}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  À payer
                </p>
                <p className="text-lg font-bold text-orange-700">
                  {bloc3.nb_a_payer}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Partiel
                </p>
                <p className="text-lg font-bold text-yellow-700">
                  {bloc3.nb_partiel}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  En retard
                </p>
                <p className="text-lg font-bold text-red-700">
                  {bloc3.nb_en_retard}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Non paramétré
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {bloc3.nb_non_parametre}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Progression de la période
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {Number(bloc3.progression_pct || 0)}%
                </p>
              </div>

              <div className="h-3 w-full rounded-full bg-slate-200">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getProgressionColor(
                    Number(bloc3.progression_pct || 0)
                  )}`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, Number(bloc3.progression_pct || 0))
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-sm text-slate-600">
                Statut global : {getStatutGlobalLabel(bloc3.statut_global)}
              </p>
            </div>
          </section>
        )}

        {situationRubriques.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Situation contributive par rubrique
            </h2>

            <div className="space-y-4">
              {situationRubriques.map((situation) => {
                const pourcentage =
                  Number(situation.montant_attendu || 0) > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (Number(situation.montant_paye || 0) /
                            Number(situation.montant_attendu || 0)) *
                            100
                        )
                      )
                    : 0;

                return (
                  <div
                    key={situation.rubrique_id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="mb-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
                            {situation.rubrique_nom}
                          </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-4">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Attendu
                            </p>
                            <p className="text-lg font-bold text-slate-900">
                              {formatMontant(Number(situation.montant_attendu || 0))}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Payé
                            </p>
                            <p className="text-lg font-bold text-green-700">
                              {formatMontant(Number(situation.montant_paye || 0))}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Reste
                            </p>
                            <p className="text-lg font-bold text-orange-700">
                              {formatMontant(Number(situation.reste_a_payer || 0))}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Statut
                            </p>
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-medium ${getStatutColor(
                                situation.statut
                              )}`}
                            >
                              {situation.statut}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex min-w-[180px] flex-col items-end gap-2">
                        <div className="h-2 w-full rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-green-600 transition-all duration-300"
                            style={{ width: `${pourcentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{pourcentage}% payé</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {retards.length > 0 && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-red-800">
                Retards en cours - Action requise
              </h2>
              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                {retards.length} retard{retards.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {retards.map((retard) => (
                <div key={retard.id} className="rounded-2xl border border-red-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="mb-2">
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                          {retard.rubrique}
                        </span>
                        <span className="ml-2 text-sm font-medium text-slate-900">
                          {retard.periode}
                        </span>
                      </div>

                      <div className="grid gap-2 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500">Attendu</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatMontant(Number(retard.montant_attendu || 0))}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500">Payé</p>
                          <p className="text-sm font-semibold text-green-700">
                            {formatMontant(Number(retard.montant_paye || 0))}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500">Reste</p>
                          <p className="text-sm font-semibold text-red-700">
                            {formatMontant(Number(retard.reste_a_payer || 0))}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(retard.statut)}`}>
                        {retard.statut}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {contributions.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Historique récent</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Période</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Montant</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Mode</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Date paiement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {contributions.map((contribution) => (
                    <tr key={contribution.id} className="transition-colors hover:bg-slate-50">
                      <td className="py-4 text-sm font-medium text-slate-900">{contribution.periode}</td>
                      <td className="py-4 text-sm font-semibold text-slate-900">
                        {formatMontant(Number(contribution.montant_total || 0))}
                      </td>
                      <td className="py-4 text-sm text-slate-600">
                        {contribution.mode_paiement || "Non spécifié"}
                      </td>
                      <td className="py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(contribution.statut)}`}>
                          {contribution.statut}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-slate-600">
                        {formatDate(contribution.date_paiement)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-gradient-to-br from-white to-green-50/20 p-6 shadow-sm ring-1 ring-green-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Notifications récentes</h2>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Aucune notification récente.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-semibold text-slate-900">{notification.titre}</h3>
                    <span className="text-xs text-slate-500">
                      {new Date(notification.created_at).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Statut : {notification.statut_notification}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
