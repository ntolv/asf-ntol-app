"use client";

import {
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface ContributionData {
  id: string;
  periode: string;
  montant_total: number;
  mode_paiement: string | null;
  statut: string;
  date_paiement: string | null;
}

interface ContributionsTableProps {
  contributions: ContributionData[];
}

export default function ContributionsTable({ contributions }: ContributionsTableProps) {
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
      case "payé":
      case "payee":
      case "valide":
      case "validée":
        return "text-green-700 bg-green-50";
      case "en attente":
      case "en_attente":
        return "text-yellow-700 bg-yellow-50";
      case "retard":
      case "en retard":
      case "en_retard":
        return "text-red-700 bg-red-50";
      default:
        return "text-gray-700 bg-gray-50";
    }
  };

  const getStatutIcon = (statut: string) => {
    switch ((statut || "").toLowerCase()) {
      case "payé":
      case "payee":
      case "valide":
      case "validée":
        return <CheckCircle className="h-4 w-4" />;
      case "en attente":
      case "en_attente":
        return <Clock className="h-4 w-4" />;
      case "retard":
      case "en retard":
      case "en_retard":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (contributions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        <CreditCard className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        Aucune contribution enregistrée.
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
            <th className="pb-3 text-left text-sm font-medium text-slate-500">Mode de paiement</th>
            <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut</th>
            <th className="pb-3 text-left text-sm font-medium text-slate-500">Date de paiement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {contributions.map((contribution) => (
            <tr key={contribution.id} className="transition-colors hover:bg-slate-50">
              <td className="py-4 text-sm font-medium text-slate-900">{contribution.periode}</td>
              <td className="py-4 text-sm font-semibold text-slate-900">
                {formatMontant(contribution.montant_total)}
              </td>
              <td className="py-4 text-sm text-slate-600">
                {contribution.mode_paiement || "Non spécifié"}
              </td>
              <td className="py-4">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(
                    contribution.statut
                  )}`}
                >
                  {getStatutIcon(contribution.statut)}
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
  );
}
