"use client";

import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface MontantAttenteData {
  id: string;
  membre_id: string;
  nom_complet: string;
  montant_initial: number;
  montant_restant: number;
  statut: string;
  date: string | null;
}

interface MontantsAttenteListProps {
  montantsAttente: MontantAttenteData[];
}

export default function MontantsAttenteList({ montantsAttente }: MontantsAttenteListProps) {
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
      case "partiellement_impute":
        return "text-yellow-700 bg-yellow-50";
      case "retard":
      case "en retard":
      case "en_retard":
        return "text-red-700 bg-red-50";
      default:
        return "text-slate-700 bg-slate-100";
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
      case "partiellement_impute":
        return <Clock className="h-4 w-4" />;
      case "retard":
      case "en retard":
      case "en_retard":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (montantsAttente.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        <Clock className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        Aucun montant en attente.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {montantsAttente.map((montant) => (
        <div key={montant.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500">Montant initial</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatMontant(montant.montant_initial)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Montant restant</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatMontant(montant.montant_restant)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(
                  montant.statut
                )}`}
              >
                {getStatutIcon(montant.statut)}
                {montant.statut}
              </span>
              <span className="text-xs text-slate-500">{formatDate(montant.date)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
