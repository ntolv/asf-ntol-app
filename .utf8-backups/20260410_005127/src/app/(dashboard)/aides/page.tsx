"use client";

import Link from "next/link";
import { useState } from "react";

type ApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

async function readJsonSafe(response: Response) {
  const rawText = await response.text();
  try {
    return rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error("La route appelée ne renvoie pas du JSON.");
  }
}

export default function AidesPage() {
  const [loadingAide, setLoadingAide] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingPret, setLoadingPret] = useState(false);

  const [messageAide, setMessageAide] = useState("");
  const [errorAide, setErrorAide] = useState("");

  const [messagePret, setMessagePret] = useState("");
  const [errorPret, setErrorPret] = useState("");

  const [montantAide, setMontantAide] = useState(0);
  const [motifAide, setMotifAide] = useState("");

  const [montantPret, setMontantPret] = useState(0);
  const [motifPret, setMotifPret] = useState("");
  const [conditionsAcceptees, setConditionsAcceptees] = useState(false);

  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  function addMontantAide(value: number) {
    setMontantAide((prev) => Math.max(0, Number(prev || 0) + value));
  }

  function addMontantPret(value: number) {
    setMontantPret((prev) => Math.max(0, Number(prev || 0) + value));
  }

  async function handleSubmitAide() {
    try {
      setLoadingAide(true);
      setErrorAide("");
      setMessageAide("");

      const response = await fetch("/api/aides/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          montant: Number(montantAide || 0),
          motif: motifAide,
        }),
      });

      const json = (await readJsonSafe(response)) as ApiResponse | null;

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.error || json?.message || "Erreur lors de l'envoi de la demande d'aide."
        );
      }

      setMessageAide(
        json?.message || "Demande d'aide / secours transmise avec succès."
      );
      setMontantAide(0);
      setMotifAide("");
    } catch (err: any) {
      setErrorAide(
        err?.message || "Erreur lors de l'envoi de la demande d'aide."
      );
    } finally {
      setLoadingAide(false);
    }
  }

  async function handleRequestOtp() {
    try {
      setLoadingOtp(true);
      setErrorPret("");
      setMessagePret("");

      const response = await fetch("/api/prets/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          montant: Number(montantPret || 0),
          motif: motifPret,
          conditions_acceptees: conditionsAcceptees,
        }),
      });

      const json = (await readJsonSafe(response)) as ApiResponse | null;

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.error || json?.message || "Erreur lors de l'envoi du code OTP."
        );
      }

      setOtpRequested(true);
      setMessagePret(json?.message || "Code OTP envoyé par email.");
    } catch (err: any) {
      setErrorPret(err?.message || "Erreur lors de l'envoi du code OTP.");
    } finally {
      setLoadingOtp(false);
    }
  }

  async function handleVerifyOtpAndSubmitPret() {
    try {
      setLoadingPret(true);
      setErrorPret("");
      setMessagePret("");

      const response = await fetch("/api/prets/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          otp: otpCode,
        }),
      });

      const json = (await readJsonSafe(response)) as ApiResponse | null;

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.error || json?.message || "Erreur lors de la validation du code OTP."
        );
      }

      setMessagePret(
        json?.message || "OTP validé. Demande de prêt transmise avec succès."
      );
      setMontantPret(0);
      setMotifPret("");
      setConditionsAcceptees(false);
      setOtpCode("");
      setOtpRequested(false);
    } catch (err: any) {
      setErrorPret(
        err?.message || "Erreur lors de la validation du code OTP."
      );
    } finally {
      setLoadingPret(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Aides / Secours / Prêts / Prêts
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Aides / Secours / Prêts / Prêts
            </h1>
            <p className="mt-3 text-sm text-slate-600 md:text-base">
              Cette page sert uniquement à transmettre une demande d'aide / secours
              ou une demande de prêt. Le backend gère toute la logique métier,
              la génération du document signé, l'OTP, les validations et les notifications.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/caisse"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              ← Retour à Caisse
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Aide / Secours
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Faire une demande d'aide ou de secours
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Le membre renseigne uniquement le montant demandé et le motif.
            </p>
          </div>

          {errorAide ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorAide}
            </div>
          ) : null}

          {messageAide ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {messageAide}
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Montant demandé
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={montantAide}
                onChange={(e) =>
                  setMontantAide(Math.max(0, Number(e.target.value || 0)))
                }
                disabled={loadingAide}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addMontantAide(5000)}
                  disabled={loadingAide}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700"
                >
                  +5000 FCFA
                </button>

                <button
                  type="button"
                  onClick={() => addMontantAide(10000)}
                  disabled={loadingAide}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700"
                >
                  +10000 FCFA
                </button>

                <button
                  type="button"
                  onClick={() => addMontantAide(25000)}
                  disabled={loadingAide}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700"
                >
                  +25000 FCFA
                </button>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Montant saisi : {formatMoney(montantAide)}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Motif
              </label>
              <textarea
                value={motifAide}
                onChange={(e) => setMotifAide(e.target.value)}
                disabled={loadingAide}
                rows={5}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmitAide}
              disabled={
                loadingAide ||
                Number(montantAide || 0) <= 0 ||
                !motifAide.trim()
              }
              className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingAide
                ? "Transmission..."
                : "Transmettre la demande d'aide / secours"}
            </button>
          </div>
        </article>

        <article className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Prêt
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Faire une demande de prêt
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Le membre renseigne uniquement le montant demandé et le motif.
              Le backend gère le document signé et le flux OTP email.
            </p>
          </div>

          {errorPret ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorPret}
            </div>
          ) : null}

          {messagePret ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {messagePret}
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Montant demandé
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={montantPret}
                onChange={(e) =>
                  setMontantPret(Math.max(0, Number(e.target.value || 0)))
                }
                disabled={loadingOtp || loadingPret}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addMontantPret(10000)}
                  disabled={loadingOtp || loadingPret}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700"
                >
                  +10000 FCFA
                </button>

                <button
                  type="button"
                  onClick={() => addMontantPret(25000)}
                  disabled={loadingOtp || loadingPret}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700"
                >
                  +25000 FCFA
                </button>

                <button
                  type="button"
                  onClick={() => addMontantPret(50000)}
                  disabled={loadingOtp || loadingPret}
                  className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700"
                >
                  +50000 FCFA
                </button>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Montant saisi : {formatMoney(montantPret)}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Motif
              </label>
              <textarea
                value={motifPret}
                onChange={(e) => setMotifPret(e.target.value)}
                disabled={loadingOtp || loadingPret}
                rows={5}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
              />
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Conditions de prêt
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>La demande de prêt est examinée par le bureau de l'association.</p>
                <p>Le membre demandeur s'engage à rembourser intégralement toute somme qui lui sera accordée.</p>
                <p>Le montant accordé peut être différent du montant demandé.</p>
                <p>Le décaissement n'intervient qu'après validation officielle du bureau.</p>
              </div>

              <label className="mt-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={conditionsAcceptees}
                  onChange={(e) => setConditionsAcceptees(e.target.checked)}
                  disabled={loadingOtp || loadingPret}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span className="text-sm text-slate-700">
                  J'ai lu les conditions du prêt appliquées par l'association et je m'engage à rembourser la dette qui me sera accordée.
                </span>
              </label>
            </div>

            {!otpRequested ? (
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={
                  loadingOtp ||
                  loadingPret ||
                  Number(montantPret || 0) <= 0 ||
                  !motifPret.trim() ||
                  !conditionsAcceptees
                }
                className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingOtp ? "Envoi du code..." : "Recevoir le code OTP par email"}
              </button>
            ) : (
              <div className="space-y-4 rounded-[24px] border border-emerald-200 bg-emerald-50/50 p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Code OTP reçu par email
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    disabled={loadingPret}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
                    placeholder="Saisir le code OTP"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleVerifyOtpAndSubmitPret}
                    disabled={loadingPret || !otpCode.trim()}
                    className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingPret
                      ? "Validation..."
                      : "Valider OTP et transmettre la demande"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpRequested(false);
                      setOtpCode("");
                      setMessagePret("");
                      setErrorPret("");
                    }}
                    disabled={loadingPret}
                    className="w-full rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
                  >
                    Revenir à la saisie
                  </button>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

