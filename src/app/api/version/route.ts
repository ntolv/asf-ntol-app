import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      app: "ASF-NTOL",
      version: packageJson.version,
      updated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}