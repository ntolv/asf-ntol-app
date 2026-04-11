"use client";

import { useEffect, useRef, useState } from "react";

type VersionPayload = {
  version?: string;
};

const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

export default function VersionManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let initialTimeoutId: ReturnType<typeof window.setTimeout> | null = null;
    let intervalId: ReturnType<typeof window.setInterval> | null = null;

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
          return;
        }

        const data = (await response.json()) as VersionPayload;
        const remoteVersion = data.version?.trim();

        if (!remoteVersion) {
          return;
        }

        if (remoteVersion !== CURRENT_VERSION) {
          setUpdateAvailable(true);
        }
      } catch {
        // Ne jamais casser l'application si version.json ne répond pas
      }
    }

    initialTimeoutId = window.setTimeout(() => {
      void checkVersion();
    }, 3000);

    intervalId = window.setInterval(() => {
      void checkVersion();
    }, 30000);

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

  function handleRefresh() {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    window.location.reload();
  }

  function dismissUpdate() {
    setUpdateAvailable(false);
  }

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] flex justify-center px-4 pt-4">
      <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-lg">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Nouvelle version disponible</p>
          <p className="text-xs text-slate-600">
            Une mise à jour de lapplication est prête. Recharge pour appliquer la dernière
            version.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={dismissUpdate}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Plus tard
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            Recharger
          </button>
        </div>
      </div>
    </div>
  );
}
