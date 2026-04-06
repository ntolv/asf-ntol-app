"use client";

import Link from "next/link";
import MobileStatusBadge from "./MobileStatusBadge";

export type MobileCaisseSummary = {
  totalAttendu: string;
  totalVerse: string;
  resteAPayer: string;
  totalEncheres?: string;
};

export type MobileCaisseRubriqueItem = {
  id: string;
  label: string;
  attendu: string;
  verse: string;
  reste: string;
  statutLabel: string;
  statutTone?: "success" | "warning" | "danger" | "neutral";
};

export type MobileCaisseMovementItem = {
  id: string;
  title: string;
  subtitle?: string;
  amount: string;
  meta?: string;
  tone?: "success" | "warning" | "danger" | "neutral";
};

type MobileCaisseBankingProps = {
  summary: MobileCaisseSummary;
  rubriques: MobileCaisseRubriqueItem[];
  mouvements: MobileCaisseMovementItem[];
  caisseHref?: string;
  contributionsHref?: string;
  imputationsHref?: string;
  encheresHref?: string;
};

function EmptyBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="mobile-caisse-bank-empty">
      <p className="mobile-caisse-bank-empty__title">{title}</p>
      <p className="mobile-caisse-bank-empty__text">{text}</p>
    </div>
  );
}

export default function MobileCaisseBanking({
  summary,
  rubriques,
  mouvements,
  caisseHref = "/caisse",
  contributionsHref = "/contributions",
  imputationsHref = "/imputations",
  encheresHref = "/encheres",
}: MobileCaisseBankingProps) {
  return (
    <section className="mobile-caisse-bank xl:hidden">
      <div className="mobile-caisse-bank__hero">
        <div className="mobile-caisse-bank__hero-top">
          <div>
            <p className="mobile-caisse-bank__eyebrow">Caisse</p>
            <h2 className="mobile-caisse-bank__title">Vue bancaire mobile</h2>
            <p className="mobile-caisse-bank__text">
              Lecture claire des montants, des rubriques, des mouvements et du total enchères.
            </p>
          </div>

          <Link href={caisseHref} className="mobile-caisse-bank__hero-link">
            Ouvrir
          </Link>
        </div>

        <div className="mobile-caisse-bank__totals">
          <div className="mobile-caisse-bank__total-card mobile-caisse-bank__total-card--primary">
            <span className="mobile-caisse-bank__total-label">Total attendu</span>
            <span className="mobile-caisse-bank__total-value">{summary.totalAttendu}</span>
          </div>

          <div className="mobile-caisse-bank__total-card">
            <span className="mobile-caisse-bank__total-label">Total versé</span>
            <span className="mobile-caisse-bank__total-value">{summary.totalVerse}</span>
          </div>

          <div className="mobile-caisse-bank__total-card">
            <span className="mobile-caisse-bank__total-label">Reste à payer</span>
            <span className="mobile-caisse-bank__total-value">{summary.resteAPayer}</span>
          </div>
        </div>
      </div>

      <div className="mobile-caisse-bank__actions">
        <Link href={contributionsHref} className="mobile-caisse-bank__action-card">
          <span className="mobile-caisse-bank__action-icon" aria-hidden="true">+</span>
          <span className="mobile-caisse-bank__action-body">
            <span className="mobile-caisse-bank__action-title">Contributions</span>
            <span className="mobile-caisse-bank__action-text">Versements enregistrés</span>
          </span>
        </Link>

        <Link href={imputationsHref} className="mobile-caisse-bank__action-card">
          <span className="mobile-caisse-bank__action-icon" aria-hidden="true">≡</span>
          <span className="mobile-caisse-bank__action-body">
            <span className="mobile-caisse-bank__action-title">Imputations</span>
            <span className="mobile-caisse-bank__action-text">Ventilation des montants</span>
          </span>
        </Link>

        <Link href={encheresHref} className="mobile-caisse-bank__action-card">
          <span className="mobile-caisse-bank__action-icon" aria-hidden="true">↗</span>
          <span className="mobile-caisse-bank__action-body">
            <span className="mobile-caisse-bank__action-title">Enchères</span>
            <span className="mobile-caisse-bank__action-text">Suivi lié à la caisse</span>
          </span>
        </Link>
      </div>

      <section className="mobile-caisse-bank__section">
        <div className="mobile-caisse-bank__section-head">
          <div>
            <p className="mobile-caisse-bank__section-eyebrow">Rubriques</p>
            <h3 className="mobile-caisse-bank__section-title">Situation par rubrique</h3>
          </div>
        </div>

        {rubriques.length === 0 ? (
          <EmptyBlock
            title="Aucune rubrique visible"
            text="Les rubriques de caisse s'afficheront ici dès que les données seront branchées."
          />
        ) : (
          <div className="mobile-caisse-bank__rubriques">
            {rubriques.map((item) => (
              <article key={item.id} className="mobile-caisse-bank__rubrique-card">
                <div className="mobile-caisse-bank__rubrique-top">
                  <div className="mobile-caisse-bank__rubrique-title-wrap">
                    <p className="mobile-caisse-bank__rubrique-title">{item.label}</p>
                    <MobileStatusBadge
                      label={item.statutLabel}
                      tone={item.statutTone ?? "neutral"}
                    />
                  </div>
                </div>

                <div className="mobile-caisse-bank__rubrique-grid">
                  <div>
                    <span className="mobile-caisse-bank__mini-label">Attendu</span>
                    <span className="mobile-caisse-bank__mini-value">{item.attendu}</span>
                  </div>
                  <div>
                    <span className="mobile-caisse-bank__mini-label">Versé</span>
                    <span className="mobile-caisse-bank__mini-value">{item.verse}</span>
                  </div>
                  <div>
                    <span className="mobile-caisse-bank__mini-label">Reste</span>
                    <span className="mobile-caisse-bank__mini-value">{item.reste}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mobile-caisse-bank__section">
        <div className="mobile-caisse-bank__section-head">
          <div>
            <p className="mobile-caisse-bank__section-eyebrow">Historique</p>
            <h3 className="mobile-caisse-bank__section-title">Mouvements récents</h3>
          </div>
        </div>

        {mouvements.length === 0 ? (
          <EmptyBlock
            title="Aucun mouvement récent"
            text="Les mouvements de caisse apparaîtront ici dans un style relevé bancaire."
          />
        ) : (
          <div className="mobile-caisse-bank__movements">
            {mouvements.map((item) => (
              <article key={item.id} className="mobile-caisse-bank__movement-card">
                <div className="mobile-caisse-bank__movement-left">
                  <p className="mobile-caisse-bank__movement-title">{item.title}</p>
                  {item.subtitle ? (
                    <p className="mobile-caisse-bank__movement-subtitle">{item.subtitle}</p>
                  ) : null}
                  {item.meta ? (
                    <p className="mobile-caisse-bank__movement-meta">{item.meta}</p>
                  ) : null}
                </div>

                <div className="mobile-caisse-bank__movement-right">
                  <p className="mobile-caisse-bank__movement-amount">{item.amount}</p>
                  <MobileStatusBadge
                    label={item.tone === "success" ? "Validé" : item.tone === "warning" ? "En attente" : item.tone === "danger" ? "Alerte" : "Info"}
                    tone={item.tone ?? "neutral"}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mobile-caisse-bank__section">
        <div className="mobile-caisse-bank__encheres-card">
          <div>
            <p className="mobile-caisse-bank__section-eyebrow">Enchères</p>
            <h3 className="mobile-caisse-bank__section-title">Montant total des enchères</h3>
          </div>

          <p className="mobile-caisse-bank__encheres-value">
            {summary.totalEncheres || "0 FCFA"}
          </p>

          <p className="mobile-caisse-bank__encheres-text">
            Bloc visuel dédié à la caisse, prévu pour être alimenté par le backend.
          </p>
        </div>
      </section>
    </section>
  );
}