"use client";

export type PendingRecognition = {
  membreId: string;
  telephone: string | null;
  nom: string | null;
  recognisedAt: string;
};

const STORAGE_KEY = "asf_ntol_pending_recognition";

export function savePendingRecognition(data: {
  membreId: string;
  telephone?: string | null;
  nom?: string | null;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PendingRecognition = {
    membreId: data.membreId,
    telephone: data.telephone ?? null,
    nom: data.nom ?? null,
    recognisedAt: new Date().toISOString(),
  };

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getPendingRecognition(): PendingRecognition | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PendingRecognition;

    if (!parsed?.membreId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingRecognition() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function hasPendingRecognition(): boolean {
  return Boolean(getPendingRecognition()?.membreId);
}