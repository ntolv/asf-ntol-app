"use client";

import { Bell, Sparkles } from "lucide-react";
import MobileLogoutButton from "./MobileLogoutButton";

type MobileHomeProHeaderProps = {
  title?: string;
  subtitle?: string;
};

export default function MobileHomeProHeader({
  title = "ASF-NTOL",
  subtitle = "Tableau de bord mobile premium",
}: MobileHomeProHeaderProps) {
  return (
    <section className="mobile-pro-home-header">
      <div className="mobile-pro-home-header__top">
        <div className="mobile-pro-home-header__intro">
          <span className="mobile-pro-home-header__eyebrow">
            <Sparkles className="mobile-pro-home-header__eyebrow-icon" />
            Application pro
          </span>

          <h1 className="mobile-pro-home-header__title">{title}</h1>
          <p className="mobile-pro-home-header__subtitle">{subtitle}</p>
        </div>

        <div className="mobile-pro-home-header__actions">
          <button
            type="button"
            className="mobile-pro-notify-btn"
            aria-label="Notifications"
          >
            <Bell className="mobile-pro-notify-btn__icon" />
          </button>

          <MobileLogoutButton />
        </div>
      </div>
    </section>
  );
}