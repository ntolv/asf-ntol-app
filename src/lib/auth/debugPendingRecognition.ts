"use client";

import { getPendingRecognition } from "@/lib/auth/pendingRecognition";

export function debugPendingRecognition() {
  if (typeof window === "undefined") {
    return;
  }

  const data = getPendingRecognition();
  console.log("[ASF-NTOL][pendingRecognition]", data);
}