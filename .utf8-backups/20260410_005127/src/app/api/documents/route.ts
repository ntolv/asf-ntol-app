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

    const { data, error } = await supabase
      .from("v_documents")
      .select(`
        id,
        titre,
        type_document,
        categorie_document,
        file_name,
        mime_type,
        date_creation,
        dossier_general,
        membre_id
      `)
      .or(`dossier_general.eq.true,membre_id.eq.${userContext.membreId}`)
      .order("date_creation", { ascending: false });

    if (error) {
      console.error("Erreur API /api/documents:", error);
      return NextResponse.json(
        { error: error.message || "Erreur lors du chargement des documents." },
        { status: 500 }
      );
    }

    const documents = data || [];
    const totalDocuments = documents.length;
    const totalDocumentsGeneraux = documents.filter((doc) => doc.dossier_general).length;
    const totalDocumentsMembre = documents.filter((doc) => !doc.dossier_general).length;

    return NextResponse.json({
      documents,
      resume: {
        totalDocuments,
        totalDocumentsGeneraux,
        totalDocumentsMembre
      }
    });
  } catch (error: any) {
    console.error("Erreur inattendue API /api/documents:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Erreur inattendue lors du chargement des documents."
      },
      { status: 500 }
    );
  }
}
