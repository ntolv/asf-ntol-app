"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import ActionButton from "@/components/ui/ActionButton";

type ImportType =
  | "encaissements"
  | "membres"
  | "decaissements"
  | "prets"
  | "aides"
  | "tontine"
  | "encheres";

const importTypes: Array<{
  value: ImportType;
  label: string;
  description: string;
  disponible: boolean;
}> = [
  {
    value: "encaissements",
    label: "Encaissements",
    description:
      "Importer les contributions mensuelles des membres et leur ventilation par rubrique.",
    disponible: true,
  },
  {
    value: "membres",
    label: "Membres",
    description: "Importer ou compléter la liste des membres.",
    disponible: false,
  },
  {
    value: "decaissements",
    label: "Décaissements",
    description: "Importer les sorties de caisse.",
    disponible: false,
  },
  {
    value: "prets",
    label: "Prêts",
    description: "Importer les prêts accordés aux membres.",
    disponible: false,
  },
  {
    value: "aides",
    label: "Aides",
    description: "Importer les aides accordées.",
    disponible: false,
  },
  {
    value: "tontine",
    label: "Tontine",
    description: "Importer les données historiques de tontine.",
    disponible: false,
  },
  {
    value: "encheres",
    label: "Enchères",
    description: "Importer les résultats historiques des enchères.",
    disponible: false,
  },
];

export default function ImportExportPage() {
  const [importType, setImportType] =
    useState<ImportType>("encaissements");

  const selectedType = importTypes.find(
    (item) => item.value === importType
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export"
        subtitle="Assistant centralisé pour analyser et importer les données de l’association."
        size="lg"
      />

      <SectionCard
        title="Assistant d’import"
        subtitle="Choisissez le type de données que vous souhaitez importer."
        padding="md"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {importTypes.map((item) => {
            const selected = importType === item.value;

            return (
              <button
                key={item.value}
                type="button"
                disabled={!item.disponible}
                onClick={() => setImportType(item.value)}
                className={[
                  "rounded-[20px] border p-5 text-left transition",
                  selected
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300",
                  !item.disponible
                    ? "cursor-not-allowed opacity-50"
                    : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {item.label}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  {item.disponible ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Disponible
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      Plus tard
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={`Import : ${selectedType?.label ?? "Encaissements"}`}
        subtitle="Séquence : Fichier → Analyse → Validation → Import → Résultat"
        padding="md"
      >
        <div className="grid gap-4 md:grid-cols-5">
          {[
            "1. Fichier",
            "2. Analyse",
            "3. Validation",
            "4. Import",
            "5. Résultat",
          ].map((step, index) => (
            <div
              key={step}
              className={[
                "rounded-[16px] border px-4 py-4 text-center text-sm font-semibold",
                index === 0
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-400",
              ].join(" ")}
            >
              {step}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[20px] border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-lg font-semibold text-slate-900">
            Import des encaissements
          </p>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            La lecture du fichier Excel, la simulation et l’import sécurisé
            seront activés dans les prochaines livraisons.
          </p>

          <div className="mx-auto mt-6 max-w-xs">
            <ActionButton
              variant="outline"
              size="md"
              fullWidth
              disabled
            >
              Sélectionner un fichier Excel
            </ActionButton>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Export"
        subtitle="La fonction d’export sera développée ultérieurement."
        padding="md"
      >
        <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            Aucun export n’est encore disponible.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
