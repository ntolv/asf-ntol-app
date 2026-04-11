"use client";

import { useEffect } from "react";

const VERSION_CHECK_URL = "/api/version";
const VERSION_STORAGE_KEY = "asf-ntol-app-version";

type VersionPayload = {
  version?: string;
};

export default function VersionManager() {
  useEffect(() => {
    let isMounted = true;

    // Forcé navigateur uniquement
    let intervalId: number | null = null;
    let initialTimeoutId: number | null = null;

    async function checkVersion() {
      try {
        const response = await fetch(VERSION_CHECK_URL, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as VersionPayload;
        const nextVersion = data?.version?.trim();

        if (!nextVersion) {
          return;
        }

        const currentVersion = window.localStorage.getItem(
          VERSION_STORAGE_KEY
        );

        if (!currentVersion) {
          window.localStorage.setItem(VERSION_STORAGE_KEY, nextVersion);
          return;
        }

        if (currentVersion !== nextVersion && isMounted) {
          window.localStorage.setItem(VERSION_STORAGE_KEY, nextVersion);
          window.location.reload();
        }
      } catch {
        // no-op
      }
    }

    initialTimeoutId = window.setTimeout(() => {
      void checkVersion();
    }, 3000);

    intervalId = window.setInterval(() => {
      void checkVersion();
    }, 60000);

    return () => {
      isMounted = false;

      if (initialTimeoutId !== null) {
        window.clearTimeout(initialTimeoutId);
      }

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return null;
}