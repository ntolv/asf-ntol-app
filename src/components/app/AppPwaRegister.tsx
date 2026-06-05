"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const standaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
  const navigatorStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return standaloneMedia || navigatorStandalone;
}

export default function AppPwaRegister() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const canShowInstallHelp = useMemo(() => {
    return !isStandalone && showBanner;
  }, [isStandalone, showBanner]);

  useEffect(() => {
    setIsIos(isIosDevice());
    setIsStandalone(isStandaloneMode());

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.update().catch(() => {});
        })
        .catch((error) => {
          console.error("Erreur service worker ASF-NTOL:", error);
        });
    }

    const installHandler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", installHandler);

    const alreadyDismissed =
      window.localStorage.getItem("asf-ntol-install-banner-dismissed") === "1";

    if (!alreadyDismissed && !isStandaloneMode()) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", installHandler);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const closeBanner = () => {
    window.localStorage.setItem("asf-ntol-install-banner-dismissed", "1");
    setShowBanner(false);
  };

  if (!canShowInstallHelp) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[9999] rounded-3xl border border-emerald-200 bg-white/95 p-4 shadow-2xl backdrop-blur md:left-auto md:right-5 md:max-w-md">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-bold text-emerald-900">
            Installer ASF-NTOL sur ce téléphone
          </p>

          {deferredPrompt ? (
            <p className="mt-1 text-sm text-slate-700">
              Ajoute l’application à ton écran d’accueil pour l’ouvrir plus vite,
              en plein écran, comme une vraie application.
            </p>
          ) : isIos ? (
            <p className="mt-1 text-sm text-slate-700">
              Sur iPhone : appuie sur le bouton Partager de Safari, puis choisis
              “Sur l’écran d’accueil”.
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-700">
              Ouvre le menu du navigateur, puis choisis “Installer l’application”
              ou “Ajouter à l’écran d’accueil”.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {deferredPrompt ? (
            <button
              type="button"
              onClick={installApp}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Installer
            </button>
          ) : null}

          <button
            type="button"
            onClick={closeBanner}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
