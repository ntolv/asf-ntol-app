import { NextResponse } from "next/server";
import { getUserContext, UserContext } from "./getUserContext";
import { unauthorizedResponse } from "./unauthorizedResponse";

/**
 * Wrapper pour API routes qui retourne une réponse 401 si non authentifié
 * @returns UserContext si authentifié, sinon lance une NextResponse 401
 */
export async function requireUserContext(): Promise<UserContext> {
  try {
    const userContext = await getUserContext();
    return userContext;
  } catch (error: any) {
    // Lance une NextResponse 401 via throw
    throw unauthorizedResponse(error?.message);
  }
}
