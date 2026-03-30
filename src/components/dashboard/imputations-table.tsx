"use client";

import { FileText, Calendar, DollarSign, Tag } from "lucide-react";

interface ImputationData {
  id: string;
  membre_id: string;
  nom_complet: string;
  rubrique: string;
  periode: string;
  montant: number;
  date: string;
}

interface ImputationsTableProps {
  imputations: ImputationData[];
}

export default function ImputationsTable({ imputations }: ImputationsTableProps) {
  const formatMontant = (montant: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
    }).format(montant);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("fr-FR");

  if (imputations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        Aucune imputation réalisée.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="pb-3 text-left text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Rubrique
              </div>
            </th>
            <th className="pb-3 text-left text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Période
              </div>
            </th>
            <th className="pb-3 text-left text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Montant
              </div>
            </th>
            <th className="pb-3 text-left text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {imputations.map((imputation) => (
            <tr key={imputation.id} className="transition-colors hover:bg-slate-50">
              <td className="py-4 text-sm font-medium text-slate-900">{imputation.rubrique}</td>
              <td className="py-4 text-sm text-slate-900">{imputation.periode}</td>
              <td className="py-4 text-sm font-semibold text-slate-900">
                {formatMontant(imputation.montant)}
              </td>
              <td className="py-4 text-sm text-slate-600">{formatDate(imputation.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
