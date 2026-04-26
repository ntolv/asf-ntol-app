"use client";

import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import MobileCaisseBankingConnected from "@/components/mobile/MobileCaisseBankingConnected";

export default function CaissePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilotage des fonds"
        subtitle="Vue réelle des montants attendus, versés, restes à payer, rubriques, mouvements récents et total des enchères."
        size="md"
      />

      <MobileCaisseBankingConnected />
    </div>
  );
}