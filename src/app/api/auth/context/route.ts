import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    const context = await getUserContext();

    return NextResponse.json({
      success: true,
      data: {
        authUserId: context.authUserId,
        membreId: context.membreId,
        role: context.role,
        email: context.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Utilisateur non authentifié",
      },
      { status: 401 }
    );
  }
}
