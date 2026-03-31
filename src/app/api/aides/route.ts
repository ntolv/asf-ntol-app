import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    const userContext = await getUserContext();

    if (!userContext?.authUserId) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    if (!userContext?.membreId) {
      return NextResponse.json(
        { error: "Membre introuvable pour cet utilisateur." },
        { status: 403 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc("fn_aides_membre", {
      p_membre_id: userContext.membreId
    });

    if (error) {
      console.error("Erreur API /api/aides via fn_aides_membre:", error);

      return NextResponse.json(
        { error: error.message || "Erreur lors du chargement des aides." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      data || {
        demandesAide: [],
        aidesSolidarite: [],
        resume: {
          totalDemandesAide: 0,
          totalAidesAccordees: 0,
          montantTotalAccorde: 0
        }
      }
    );
  } catch (error: any) {
    console.error("Erreur inattendue API /api/aides:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Erreur inattendue lors du chargement des aides."
      },
      { status: 500 }
    );
  }
}
