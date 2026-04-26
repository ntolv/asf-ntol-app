"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";

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

type ResumeData = {
  totalDocuments: number;
  totalDocumentsGeneraux: number;
  totalDocumentsMembre: number;
};

type DocumentsApiResponse = {
  documents: DocumentData[];
  resume: ResumeData;
};

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [resume, setResume] = useState<ResumeData>({
    totalDocuments: 0,
    totalDocumentsGeneraux: 0,
    totalDocumentsMembre: 0
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDocumentsData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/documents", {
          method: "GET",
          cache: "no-store"
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Erreur lors du chargement des documents");
        }

        if (!cancelled) {
          const typedPayload = payload as DocumentsApiResponse;
          setDocuments(typedPayload.documents || []);
          setResume(
            typedPayload.resume || {
              totalDocuments: 0,
              totalDocumentsGeneraux: 0,
              totalDocumentsMembre: 0
            }
          );
        }
      } catch (err: any) {
        console.error("Erreur documents:", err);

        if (!cancelled) {
          setError(err?.message || "Erreur lors du chargement des données");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDocumentsData();

    return () => {
      cancelled = true;
    };
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
      <LoadingState 
        message="Chargement des documents..." 
        size="md" 
        variant="default" 
      />
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Erreur lors du chargement des données</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const documentsGeneraux = documents.filter((doc) => doc.dossier_general);
  const documentsMembre = documents.filter((doc) => !doc.dossier_general);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Consultez les documents accessibles de l'association et vos documents personnels."
        size="lg"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total documents"
          value={resume.totalDocuments}
          icon="📄"
          size="md"
        />
        <StatCard
          label="Dossier général"
          value={resume.totalDocumentsGeneraux}
          icon="📁"
          size="md"
        />
        <StatCard
          label="Dossier membre"
          value={resume.totalDocumentsMembre}
          icon="👤"
          size="md"
        />
      </div>

        <SectionCard title="Dossier général" padding="md">
          {documentsGeneraux.length === 0 ? (
            <EmptyState
              icon="📁"
              title="Aucun document"
              description="Aucun document dans le dossier général."
              size="md"
            />
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
        </SectionCard>

        <SectionCard title="Dossier membre" padding="md">
          {documentsMembre.length === 0 ? (
            <EmptyState
              icon="👤"
              title="Aucun document"
              description="Aucun document dans votre dossier personnel."
              size="md"
            />
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
        </SectionCard>

        <SectionCard 
          title="Fonctionnalités à venir"
          subtitle="Ce module est actuellement en mode visualisation. Les fonctionnalités interactives (ouverture, téléchargement, signatures numériques, génération PDF) seront intégrées ensuite."
          variant="gradient"
          padding="md"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-[12px] bg-blue-100 p-3">
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
              <h3 className="text-lg font-semibold text-slate-900">Information</h3>
            </div>
          </div>
        </SectionCard>
    </div>
  );
}
