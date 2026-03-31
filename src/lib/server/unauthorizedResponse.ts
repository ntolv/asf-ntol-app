import { NextResponse } from "next/server";

/**
 * Crée une réponse 401 standardisée pour les API routes
 */
export function unauthorizedResponse(message?: string) {
  return NextResponse.json(
    {
      error: message || "Authentification requise",
      code: "UNAUTHORIZED"
    },
    { status: 401 }
  );
}
