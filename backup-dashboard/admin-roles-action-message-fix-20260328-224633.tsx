"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AdminUtilisateurData = {
  utilisateur_id: string;
  membre_id: string;
  nom_complet: string | null;
  email_connexion: string | null;
  statut_compte: string;
  utilisateur_actif: boolean;
  role_id: string | null;
  role_code: string | null;
  role_libelle: string | null;
  principal: boolean | null;
};

type AdminRoleData = {
  role_id: string;
  code: string;
  libelle: string;
  description: string | null;
  ordre_affichage: number | null;
};

type ActionResultData = {
  success: boolean;
  message: string;
  utilisateur_id?: string | null;
  role_id?: string | null;
};

export default function AdminRolesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAnyAdmin, setHasAnyAdmin] = useState<boolean | null>(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean | null>(null);
  const [utilisateurs, setUtilisateurs] = useState<AdminUtilisateurData[]>([]);
  const [roles, setRoles] = useState<AdminRoleData[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [savingUtilisateurId, setSavingUtilisateurId] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const pageReadyForAdmin = useMemo(() => {
    return hasAnyAdmin === true && isCurrentUserAdmin === true;
  }, [hasAnyAdmin, isCurrentUserAdmin]);

  async function loadBaseStatus() {
    const [
      hasAnyAdminResult,
      isCurrentUserAdminResult,
    ] = await Promise.all([
      supabase.rpc("fn_admin_has_any_admin"),
      supabase.rpc("fn_is_current_user_admin"),
    ]);

    if (hasAnyAdminResult.error) {
      throw new Error(`Erreur contrôle admin global: ${hasAnyAdminResult.error.message}`);
    }

    if (isCurrentUserAdminResult.error) {
      throw new Error(`Erreur contrôle admin utilisateur: ${isCurrentUserAdminResult.error.message}`);
    }

    setHasAnyAdmin(Boolean(hasAnyAdminResult.data));
    setIsCurrentUserAdmin(Boolean(isCurrentUserAdminResult.data));

    return {
      hasAnyAdmin: Boolean(hasAnyAdminResult.data),
      isCurrentUserAdmin: Boolean(isCurrentUserAdminResult.data),
    };
  }

  async function loadAdminData() {
    const [utilisateursResult, rolesResult] = await Promise.all([
      supabase.rpc("fn_admin_list_utilisateurs"),
      supabase.rpc("fn_admin_list_roles"),
    ]);

    if (utilisateursResult.error) {
      throw new Error(`Erreur chargement utilisateurs: ${utilisateursResult.error.message}`);
    }

    if (rolesResult.error) {
      throw new Error(`Erreur chargement rôles: ${rolesResult.error.message}`);
    }

    const safeUtilisateurs = (utilisateursResult.data || []) as AdminUtilisateurData[];
    const safeRoles = (rolesResult.data || []) as AdminRoleData[];

    setUtilisateurs(safeUtilisateurs);
    setRoles(safeRoles);

    const nextSelectedRoles: Record<string, string> = {};
    for (const utilisateur of safeUtilisateurs) {
      if (utilisateur.utilisateur_id) {
        nextSelectedRoles[utilisateur.utilisateur_id] = utilisateur.role_id || "";
      }
    }
    setSelectedRoles(nextSelectedRoles);
  }

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);
      setActionMessage(null);

      const status = await loadBaseStatus();

      if (status.hasAnyAdmin && status.isCurrentUserAdmin) {
        await loadAdminData();
      } else {
        setUtilisateurs([]);
        setRoles([]);
      }
    } catch (err: any) {
      console.error("Erreur page admin roles:", err);
      setError(err?.message || "Erreur lors du chargement de l'administration des rôles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function handleBootstrapFirstAdmin() {
    try {
      setBootstrapping(true);
      setError(null);
      setActionMessage(null);

      const { data, error } = await supabase.rpc("fn_bootstrap_first_admin");

      if (error) {
        throw new Error(`Erreur bootstrap: ${error.message}`);
      }

      const result = ((data || [])[0] || null) as ActionResultData | null;

      if (!result?.success) {
        throw new Error(result?.message || "Bootstrap admin impossible");
      }

      setActionMessage(result.message || "Bootstrap admin effectué.");
      await loadPage();
    } catch (err: any) {
      console.error("Erreur bootstrap admin:", err);
      setError(err?.message || "Erreur lors du bootstrap admin");
    } finally {
      setBootstrapping(false);
    }
  }

  async function handleSaveRole(utilisateurId: string) {
    try {
      const selectedRoleId = selectedRoles[utilisateurId];

      if (!selectedRoleId) {
        setError("Veuillez sélectionner un rôle avant d'enregistrer.");
        return;
      }

      setSavingUtilisateurId(utilisateurId);
      setError(null);
      setActionMessage(null);

      console.log("[ADMIN ROLES] handleSaveRole:start", {
        utilisateurId,
        selectedRoleId,
      });

      const { data, error } = await supabase.rpc("fn_admin_set_role_principal", {
        p_utilisateur_id: utilisateurId,
        p_role_id: selectedRoleId,
      });

      console.log("[ADMIN ROLES] handleSaveRole:rpc-response", {
        utilisateurId,
        selectedRoleId,
        data,
        error,
      });

      if (error) {
        throw new Error(`Erreur mise à jour rôle: ${error.message}`);
      }

      const result = ((data || [])[0] || null) as ActionResultData | null;

      console.log("[ADMIN ROLES] handleSaveRole:parsed-result", result);

      if (!result?.success) {
        throw new Error(result?.message || "Mise à jour du rôle impossible");
      }

      setActionMessage(result.message || "Rôle mis à jour avec succès.");
      await loadPage();

      console.log("[ADMIN ROLES] handleSaveRole:success", {
        utilisateurId,
        selectedRoleId,
      });
    } catch (err: any) {
      console.error("Erreur enregistrement rôle:", err);
      setError(err?.message || "Erreur lors de la mise à jour du rôle");
    } finally {
      setSavingUtilisateurId(null);
    }
  }

  function getRoleBadgeClass(roleCode: string | null | undefined) {
    switch ((roleCode || "").toUpperCase()) {
      case "ADMIN":
        return "bg-green-100 text-green-700";
      case "TRESORIER":
        return "bg-amber-100 text-amber-700";
      case "MEMBRE":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          Chargement de l'administration des rôles...
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-2">
          <p className="text-sm font-medium uppercase tracking-wide text-green-700">
            Administration
          </p>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Administration des rôles
          </h1>
        </div>
        <p className="text-sm text-slate-600">
          Bootstrap du premier admin et gestion des rôles utilisateurs.
        </p>
      </section>

      {error && (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="font-semibold">Erreur</p>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      )}

      {actionMessage && (
        <section className="rounded-3xl border border-green-200 bg-green-50 p-6 text-green-700 shadow-sm">
          <p className="font-semibold">Succès</p>
          <p className="mt-2 text-sm">{actionMessage}</p>
        </section>
      )}

      {hasAnyAdmin === false && (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">
            Bootstrap du premier administrateur
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Aucun administrateur n'existe encore. Vous pouvez vous définir comme premier admin.
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleBootstrapFirstAdmin}
              disabled={bootstrapping}
              className="rounded-2xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bootstrapping ? "Bootstrap en cours..." : "Me définir comme premier admin"}
            </button>
          </div>
        </section>
      )}

      {hasAnyAdmin === true && isCurrentUserAdmin === false && (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">Accès refusé</h2>
          <p className="mt-2 text-sm text-slate-600">
            Un administrateur existe déjà. Vous ne pouvez pas gérer les rôles.
          </p>
        </section>
      )}

      {pageReadyForAdmin && (
        <>
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h2 className="text-xl font-semibold text-slate-900">
              Utilisateurs et rôles principaux
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Sélectionnez le rôle principal de chaque utilisateur puis enregistrez.
            </p>
          </section>

          <section className="space-y-4">
            {utilisateurs.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm text-slate-500">Aucun utilisateur à afficher.</p>
              </div>
            ) : (
              utilisateurs.map((utilisateur) => (
                <article
                  key={utilisateur.utilisateur_id}
                  className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Nom complet
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          {utilisateur.nom_complet || "Nom non renseigné"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Email de connexion
                        </p>
                        <p className="text-sm text-slate-700">
                          {utilisateur.email_connexion || "Non renseigné"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Statut compte : {utilisateur.statut_compte}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Actif : {utilisateur.utilisateur_actif ? "Oui" : "Non"}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                            utilisateur.role_code
                          )}`}
                        >
                          Rôle actuel : {utilisateur.role_libelle || utilisateur.role_code || "Aucun"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Nouveau rôle
                      </label>
                      <select
                        value={selectedRoles[utilisateur.utilisateur_id] || ""}
                        onChange={(e) =>
                          setSelectedRoles((prev) => ({
                            ...prev,
                            [utilisateur.utilisateur_id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-200"
                      >
                        <option value="">Sélectionner un rôle</option>
                        {roles.map((role) => (
                          <option key={role.role_id} value={role.role_id}>
                            {role.libelle} ({role.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {roles.find(
                          (role) => role.role_id === (selectedRoles[utilisateur.utilisateur_id] || "")
                        )?.description || "Aucune description"}
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => handleSaveRole(utilisateur.utilisateur_id)}
                        disabled={savingUtilisateurId === utilisateur.utilisateur_id}
                        className="w-full rounded-2xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                      >
                        {savingUtilisateurId === utilisateur.utilisateur_id
                          ? "Enregistrement..."
                          : "Enregistrer"}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}

