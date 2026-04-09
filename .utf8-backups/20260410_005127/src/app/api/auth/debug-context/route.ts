import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    const ctx = await getUserContext();

    return NextResponse.json({
      success: true,
      data: ctx,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Erreur debug auth",
      },
      { status: 500 }
    );
  }
}
