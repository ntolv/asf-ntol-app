import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    const { membreId, role, authUserId, email } = await getUserContext();

    if (!membreId) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun membre lié à l'utilisateur connecté",
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [contributionsResult, montantsResult, retardsResult] = await Promise.all([
      supabase
        .from("v_contributions")
        .select("*")
        .eq("membre_id", membreId)
        .order("periode", { ascending: false }),

      supabase
        .from("v_montants_attente")
        .select("*")
        .eq("membre_id", membreId)
        .order("date", { ascending: false }),

      supabase
        .from("v_retards")
        .select("*")
        .eq("membre_id", membreId)
        .order("periode", { ascending: false }),
    ]);

    const { data: contributionsData, error: contributionsError } = contributionsResult;
    const { data: montantsData, error: montantsError } = montantsResult;
    const { data: retardsData, error: retardsError } = retardsResult;

    if (contributionsError) {
      return NextResponse.json(
        { success: false, error: contributionsError.message },
        { status: 500 }
      );
    }

    if (montantsError) {
      return NextResponse.json(
        { success: false, error: montantsError.message },
        { status: 500 }
      );
    }

    if (retardsError) {
      return NextResponse.json(
        { success: false, error: retardsError.message },
        { status: 500 }
      );
    }

    const safeContributions = contributionsData || [];
    const safeMontants = montantsData || [];
    const safeRetards = retardsData || [];

    const totalContributions = safeContributions.reduce(
      (sum: number, c: any) => sum + Number(c?.montant_total || 0),
      0
    );

    const totalMontantsAttente = safeMontants.reduce(
      (sum: number, m: any) => sum + Number(m?.montant_restant || 0),
      0
    );

    const totalRetards = safeRetards.reduce(
      (sum: number, r: any) => sum + Number(r?.reste_a_payer || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        contributions: safeContributions,
        montantsAttente: safeMontants,
        retards: safeRetards,
        resume: {
          total_contributions: totalContributions,
          total_montants_attente: totalMontantsAttente,
          total_retards: totalRetards,
          nombre_contributions: safeContributions.length,
        },
      },
      meta: {
        authUserId,
        membreId,
        role,
        email,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Erreur serveur",
      },
      { status: 401 }
    );
  }
}
