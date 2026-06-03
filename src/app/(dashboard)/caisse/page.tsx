"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";

type ApiData = any;

function money(value: unknown) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateFr(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR");
}

export default function CaissePage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMembreId, setSelectedMembreId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/caisses/pilotage", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const json = await res.json();

        if (!res.ok || json?.error) {
          throw new Error(json?.error || "Erreur chargement caisse");
        }

        if (!cancelled) {
          setData(json);
          const firstMembre = json?.retards?.membres?.[0];
          if (firstMembre?.membre_id) setSelectedMembreId(firstMembre.membre_id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur chargement caisse");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMembreRetard = useMemo(() => {
    const membres = data?.retards?.membres ?? [];
    return membres.find((m: any) => m.membre_id === selectedMembreId) ?? membres[0] ?? null;
  }, [data, selectedMembreId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilotage des fonds"
        subtitle="Cockpit global de la caisse de l’association : contributions, tontine, décaissements et retards."
        size="lg"
      />

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Chargement du pilotage de caisse...
        </div>
      ) : error ? (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-6">
          <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.20em] text-emerald-700">Bloc 1</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Caisse contributions</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Total attendu</p>
                <p className="mt-1 text-xl font-black">{money(data.contributions.total_attendu)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs uppercase text-emerald-700">Total encaissé</p>
                <p className="mt-1 text-xl font-black text-emerald-800">{money(data.contributions.total_encaisse)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs uppercase text-amber-700">Reste à encaisser</p>
                <p className="mt-1 text-xl font-black text-amber-800">{money(data.contributions.reste_a_encaisser)}</p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="px-3 py-3">Rubrique</th>
                    <th className="px-3 py-3">Attendu</th>
                    <th className="px-3 py-3">Encaissé</th>
                    <th className="px-3 py-3">Reste</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contributions.rubriques.map((r: any) => (
                    <tr key={r.rubrique} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-semibold">{r.rubrique}</td>
                      <td className="px-3 py-3">{money(r.montant_attendu)}</td>
                      <td className="px-3 py-3">{money(r.montant_verse)}</td>
                      <td className="px-3 py-3">{money(r.reste_a_payer)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.20em] text-emerald-700">Bloc 2</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Caisse tontine</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs uppercase text-emerald-700">Cumul enchères</p>
                <p className="mt-1 text-xl font-black text-emerald-800">{money(data.tontine.total_encheres)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Lots attribués</p>
                <p className="mt-1 text-xl font-black">{data.tontine.nb_lots_attribues}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-xs uppercase text-sky-700">Part par tontineur</p>
                <p className="mt-1 text-xl font-black text-sky-800">{money(data.tontine.part_redistribution_par_tontineur)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {data.tontine.derniers_gagnants.map((g: any, index: number) => (
                <div key={`${g.periode}-${g.lot}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-bold text-slate-900">{g.gagnant || "-"}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Session {g.periode || "-"} — Lot {g.lot ?? "-"} — Enchère {money(g.montant_enchere)} — Gain réel {money(g.gain_reel)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.20em] text-emerald-700">Bloc 3</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Décaissements</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Aides</p><p className="mt-1 text-lg font-black">{money(data.decaissements.total_aides)}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Prêts</p><p className="mt-1 text-lg font-black">{money(data.decaissements.total_prets)}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Autres</p><p className="mt-1 text-lg font-black">{money(data.decaissements.total_autres)}</p></div>
              <div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs uppercase text-rose-700">Total décaissé</p><p className="mt-1 text-lg font-black text-rose-800">{money(data.decaissements.total_general)}</p></div>
            </div>

            <div className="mt-5 grid gap-3">
              {data.decaissements.mouvements.map((m: any) => (
                <div key={m.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{m.beneficiaire || "Bénéficiaire non renseigné"}</p>
                      <p className="text-sm text-slate-600">{dateFr(m.date)} — {m.rubrique || m.caisse || "-"} — {m.motif || "-"}</p>
                    </div>
                    <p className="font-black text-rose-700">{money(m.montant)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.20em] text-emerald-700">Bloc 4</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Caisse retards</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="text-xs uppercase text-rose-700">Retards totaux</p>
                <p className="mt-1 text-xl font-black text-rose-800">{money(data.retards.montant_total_retards)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase text-slate-500">Membres en retard</p>
                <p className="mt-1 text-xl font-black">{data.retards.nb_membres_retard}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4 md:col-span-2">
                <p className="text-xs uppercase text-amber-700">Plus gros retardataire</p>
                <p className="mt-1 text-xl font-black text-amber-800">
                  {data.retards.plus_gros_retardataire || "-"} — {money(data.retards.montant_plus_gros_retard)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Sélectionner un membre</span>
                  <select
                    value={selectedMembreId}
                    onChange={(e) => setSelectedMembreId(e.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
                  >
                    {data.retards.membres.map((m: any) => (
                      <option key={m.membre_id} value={m.membre_id}>
                        {m.nom_complet} — {money(m.retard_total)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedMembreRetard ? (
                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <p className="font-black text-slate-900">{selectedMembreRetard.nom_complet}</p>
                    <p className="mt-1 text-sm font-semibold text-rose-700">
                      Retard total : {money(selectedMembreRetard.retard_total)}
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      {selectedMembreRetard.rubriques.map((r: any) => (
                        <div key={r.rubrique} className="flex justify-between gap-3">
                          <span>{r.rubrique}</span>
                          <strong>{money(r.montant)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-500">
                      <th className="px-3 py-3">Membre</th>
                      <th className="px-3 py-3">Retard total</th>
                      <th className="px-3 py-3">Détail rubriques</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.retards.membres.map((m: any) => (
                      <tr key={m.membre_id} className="border-b border-slate-100">
                        <td className="px-3 py-3 font-semibold">{m.nom_complet}</td>
                        <td className="px-3 py-3 font-bold text-rose-700">{money(m.retard_total)}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {m.rubriques.map((r: any) => `${r.rubrique} ${money(r.montant)}`).join(" • ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
