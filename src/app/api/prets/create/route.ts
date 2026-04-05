import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Le flux prêt utilise désormais /api/prets/request-otp puis /api/prets/verify-otp.",
    },
    { status: 400 }
  );
}
