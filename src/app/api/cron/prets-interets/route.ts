import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error(
        "[CRON PRETS] CRON_SECRET absent."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Configuration CRON_SECRET manquante.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (
      authorization !==
      `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Accès refusé.",
        },
        { status: 401 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Variables Supabase manquantes."
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    const startedAt =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabaseAdmin.rpc(
      "fn_recalculer_interets_prets_actifs"
    );

    if (error) {
      throw error;
    }

    const finishedAt =
      new Date().toISOString();

    console.log(
      "[CRON PRETS] Recalcul terminé",
      {
        startedAt,
        finishedAt,
        nbPretsTraites:
          Number(data ?? 0),
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Recalcul automatique des intérêts terminé.",
      data: {
        nb_prets_traites:
          Number(data ?? 0),
        started_at: startedAt,
        finished_at: finishedAt,
      },
    });
  } catch (error: any) {
    console.error(
      "[CRON PRETS] Erreur :",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur lors du recalcul automatique des intérêts.",
      },
      { status: 500 }
    );
  }
}