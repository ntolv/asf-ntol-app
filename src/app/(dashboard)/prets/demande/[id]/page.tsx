"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DemandePret = {
  id: string;
  montant_demande?: number;
  montant_accorde?: number | null;
  motif?: string;
  statut?: string;
  created_at?: string;
  reference_unique?: string;
  document_texte?: string | null;
  signature_nom?: string | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: DemandePret | null;
};

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function readJsonSafe(response: Response) {
  const rawText = await response.text();
  try {
    return rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error("La route appelée ne renvoie pas du JSON.");
  }
}

export default function PretDemandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [demandeId, setDemandeId] = useState("");
  const [demande, setDemande] = useState<DemandePret | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveParamsAndLoad() {
      try {
        setLoading(true);
        setError("");

        const resolved = await params;
        const id = String(resolved?.id || "").trim();

        if (!id) {
          throw new Error("Identifiant de demande manquant.");
        }

        if (!cancelled) {
          setDemandeId(id);
        }

        const response = await fetch(`/api/prets/${id}`, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const json = (await readJsonSafe(response)) as ApiResponse | null;

        if (!response.ok || !json?.success || !json?.data) {
          throw new Error(json?.message || "Impossible de charger la demande.");
        }

        if (!cancelled) {
          setDemande(json.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setDemande(null);
          setError(err?.message || "Erreur lors du chargement de la demande.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    resolveParamsAndLoad();

    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Demande de prêt signée
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Consultation de la demande complète
            </h1>
            <p className="mt-3 text-sm text-slate-600 md:text-base">
              Cette page affiche le document complet signé par le membre, avec le montant demandé,
              le montant accordé si le bureau l'a adapté, et la trace de signature.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/aides"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              ← Retour à Aides / Secours / Prêts
            </Link>

            <Link
              href="/gestion-demandes"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Retour à Gestion demandes
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 shadow-sm">
          Chargement de la demande...
        </div>
      ) : !demande ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Demande introuvable.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Référence
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {demande.reference_unique || demandeId || "-"}
              </p>
            </article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Montant demandé
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(demande.montant_demande)}
              </p>
            </article>

            <article className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Montant accordé
              </p>
              <p className="mt-2 text-xl font-bold text-emerald-700">
                {formatMoney(demande.montant_accorde)}
              </p>
            </article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Statut
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {demande.statut || "-"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDate(demande.created_at)}
              </p>
            </article>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Demande complète signée
            </h2>
            <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {demande.document_texte || "Document indisponible."}
              </pre>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
