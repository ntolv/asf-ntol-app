import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;

  const deploymentVersion = commitSha
    ? `${packageJson.version}-${commitSha}`
    : packageJson.version;

  return NextResponse.json(
    {
      app: "ASF-NTOL",
      version: deploymentVersion,
      package_version: packageJson.version,
      commit: commitSha,
      updated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}