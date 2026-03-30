"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DocumentData = {
  id: string;
  titre: string;
  type_document: string;
  categorie_document: string | null;
  file_name: string;
  mime_type: string | null;
  date_creation: string;
  dossier_general: boolean;
  membre_id: string | null;
};

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);

  useEffect(() => {
    async function loadDocumentsData() {
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

        const { data: documentsData, error: documentsError } = await supabase
          .from("v_documents")
          .select("*")
          .or(`dossier_general.eq.true,membre_id.eq.${membreId}`)
          .order("date_creation", { ascending: false });

        if (documentsError) throw documentsError;

        setDocuments(documentsData || []);
      } catch (err: any) {
        console.error("Erreur documents:", JSON.stringify(err, null, 2), err);
        setError(err?.message || "Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    }

    loadDocumentsData();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const getMimeTypeIcon = (mimeType: string | null) => {
    const value = (mimeType || "").toLowerCase();

    if (value.includes("pdf")) {
      return (
        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }

    if (value.includes("image")) {
      return (
        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    if (value.includes("word") || value.includes("document")) {
      return (
        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    if (value.includes("excel") || value.includes("spreadsheet")) {
      return (
        <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }

    return (
      <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const getTypeColor = (type: string) => {
    switch ((type || "").toLowerCase()) {
      case "statut":
      case "reglement":
      case "règlement":
        return "text-blue-700 bg-blue-50";
      case "formulaire":
      case "demande":
        return "text-purple-700 bg-purple-50";
      case "attestation":
      case "certificat":
        return "text-green-700 bg-green-50";
      case "rapport":
      case "releve":
      case "relevé":
        return "text-orange-700 bg-orange-50";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Chargement des documents...
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

  const documentsGeneraux = documents.filter((doc) => doc.dossier_general);
  const documentsMembre = documents.filter((doc) => !doc.dossier_general);

  return (
    <main className="bg-green-50/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
          <p className="mt-2 text-slate-600">
            Consultez les documents accessibles de l'association et vos documents personnels.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total documents</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{documents.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Dossier général</p>
            <p className="mt-2 text-2xl font-bold text-purple-700">{documentsGeneraux.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Dossier membre</p>
            <p className="mt-2 text-2xl font-bold text-green-700">{documentsMembre.length}</p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Dossier général</h2>

          {documentsGeneraux.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucun document dans le dossier général.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Titre</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Type</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Catégorie</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Fichier</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Date création</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {documentsGeneraux.map((document) => (
                    <tr key={document.id} className="transition-colors hover:bg-slate-50">
                      <td className="py-4 text-sm font-medium text-slate-900">{document.titre}</td>
                      <td className="py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(document.type_document)}`}>
                          {document.type_document}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-slate-600">{document.categorie_document || "-"}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {getMimeTypeIcon(document.mime_type)}
                          <span className="text-sm text-slate-900">{document.file_name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-slate-600">{formatDate(document.date_creation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Dossier membre</h2>

          {documentsMembre.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucun document dans votre dossier personnel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Titre</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Type</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Catégorie</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Fichier</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Date création</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {documentsMembre.map((document) => (
                    <tr key={document.id} className="transition-colors hover:bg-slate-50">
                      <td className="py-4 text-sm font-medium text-slate-900">{document.titre}</td>
                      <td className="py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(document.type_document)}`}>
                          {document.type_document}
                        </span>
                      </td>
                      <td className="py-4 text-sm text-slate-600">{document.categorie_document || "-"}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {getMimeTypeIcon(document.mime_type)}
                          <span className="text-sm text-slate-900">{document.file_name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-slate-600">{formatDate(document.date_creation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-blue-100 p-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h1M5 12H3m0 0l6-6m0 0l6 6"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">Fonctionnalités à venir</h3>
              <p className="mt-1 text-sm text-slate-600">
                Ce module est actuellement en mode visualisation. Les fonctionnalités interactives
                (ouverture, téléchargement, signatures numériques, génération PDF)
                seront intégrées ensuite.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
