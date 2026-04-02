"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Phone, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

interface MemberData {
  nom_complet: string;
  compte_active: boolean;
  telephone: string;
}

type FinalizeResponse = {
  success: boolean;
  message?: string;
  redirect_to?: string;
  email?: string;
};

export default function PreinscriptionPage() {
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"lookup" | "register" | "exists">("lookup");
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error } = await supabase.rpc("fn_preinscription_lookup_telephone", {
        p_telephone: telephone,
      });

      if (error) {
        setError("Numéro non reconnu. Veuillez contacter l'administrateur.");
        return;
      }

      if (data && data.length > 0) {
        const member = data[0];
        setMemberData({
          nom_complet: member.nom_complet,
          compte_active: member.compte_active,
          telephone: member.telephone,
        });

        if (member.compte_active) {
          setStep("exists");
          setError("Ce compte est déjà activé. Connecte-toi directement.");
        } else {
          setStep("register");
          setSuccess(`Membre reconnu : ${member.nom_complet}`);
        }
      } else {
        setError("Numéro non reconnu. Veuillez contacter l'administrateur.");
      }
    } catch {
      setError("Erreur lors de la vérification. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!memberData) {
      setError("Aucun membre trouvé.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/preinscription/finaliser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telephone: memberData.telephone,
          email,
          password,
        }),
      });

      const result = (await response.json()) as FinalizeResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Erreur lors de la finalisation");
      }

      setSuccess(result.message || "Préinscription finalisée avec succès.");

      const target = result.redirect_to || "/login";
      router.push(`${target}?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la finalisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            ASF-NTOL
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Préinscription</h1>
          <p className="mt-2 text-sm text-slate-600">
            Active ton accès à partir de ton numéro de téléphone reconnu.
          </p>
        </div>

        {step === "lookup" && (
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-10 py-3 text-sm outline-none transition focus:border-emerald-500"
                  placeholder="Entrez votre numéro"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Vérification..." : "Vérifier"}
            </button>
          </form>
        )}

        {step === "register" && memberData && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-700">{memberData.nom_complet}</p>
              <p className="mt-1 text-xs text-slate-600">{memberData.telephone}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email de connexion
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-10 py-3 text-sm outline-none transition focus:border-emerald-500"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-10 py-3 pr-12 text-sm outline-none transition focus:border-emerald-500"
                  placeholder="Minimum 6 caractères"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-10 py-3 pr-12 text-sm outline-none transition focus:border-emerald-500"
                  placeholder="Confirmez le mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Finalisation..." : "Finaliser mon inscription"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        {step === "exists" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Ce compte est déjà activé. Utilise directement la page de connexion.
            </div>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Aller à la connexion
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
}