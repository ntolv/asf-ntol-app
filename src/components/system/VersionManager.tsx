"use client";

import { useEffect, useRef } from "react";

type VersionPayload = {
  version?: string;
};

const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

export default function VersionManager() {
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    async function checkVersion() {
      if (!isMounted || isRefreshingRef.current) {
        return;
      }

      try {
        const response = await fetch(`/version.json?ts=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        if (!response.ok) {
          console.warn(
            "[VersionManager] Impossible de récupérer version.json :",
            response.status,
          );
          return;
        }

        const data = (await response.json()) as VersionPayload;
        const remoteVersion = data?.version?.trim();

        if (!remoteVersion) {
          console.warn("[VersionManager] version.json ne contient pas de version valide.");
          return;
        }

        if (remoteVersion !== CURRENT_VERSION) {
          console.info(
            "[VersionManager] Nouvelle version détectée.",
            {
              current: CURRENT_VERSION,
              remote: remoteVersion,
            },
          );

          isRefreshingRef.current = true;
          window.location.reload();
        }
      } catch (error) {
        console.warn("[VersionManager] Erreur lors de la vérification de version :", error);
      }
    }

    // Vérification initiale après chargement
    const initialTimeout = window.setTimeout(() => {
      void checkVersion();
    }, 3000);

    // Vérification périodique
    intervalId = window.setInterval(() => {
      void checkVersion();
    }, 30000);

    return () => {
      isMounted = false;
      window.clearTimeout(initialTimeout);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return null;
}