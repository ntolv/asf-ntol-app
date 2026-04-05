import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

function isBureauRole(role: { code?: string | null; libelle?: string | null } | null | undefined) {
  const raw = `${role?.code ?? ""} ${role?.libelle ?? ""}`.toLowerCase();
  return raw.includes("admin") || raw.includes("président") || raw.includes("president") || raw.includes("trésorier") || raw.includes("tresorier");
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: userError?.message || "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json(
        { success: false, error: context?.message || "Contexte utilisateur introuvable." },
        { status: 401 }
      );
    }

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        { success: false, error: "Accès refusé. Action réservée au bureau." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const demandeId = String(body?.demande_id || "").trim();
    const decisionRaw = String(body?.decision || "").trim().toUpperCase();
    const decision = decisionRaw.startsWith("APPROUV") ? "APPROUVEE" : "REFUSEE";
    const montantAccorde = body?.montant_accorde === null || body?.montant_accorde === undefined || body?.montant_accorde === ""
      ? null
      : Number(body?.montant_accorde);
    const commentaireDecision = String(body?.commentaire_decision || "").trim() || null;
    const rubriqueId = String(body?.rubrique_id || "").trim() || null;

    if (!demandeId) {
      return NextResponse.json({ success: false, error: "demande_id obligatoire." }, { status: 400 });
    }

    if (!["APPROUVEE", "REFUSEE"].includes(decision)) {
      return NextResponse.json({ success: false, error: "decision invalide." }, { status: 400 });
    }

    if (decision === "APPROUVEE") {
      if (!rubriqueId) {
        return NextResponse.json({ success: false, error: "rubrique_id obligatoire pour une aide approuvée." }, { status: 400 });
      }
      if (montantAccorde === null || Number.isNaN(montantAccorde) || montantAccorde <= 0) {
        return NextResponse.json({ success: false, error: "montant_accorde obligatoire et valide pour une aide approuvée." }, { status: 400 });
      }
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: demande, error: demandeError } = await supabaseAdmin
      .from("demandes_aides")
      .select("*")
      .eq("id", demandeId)
      .maybeSingle();

    if (demandeError) throw demandeError;

    if (!demande) {
      return NextResponse.json({ success: false, error: "Demande d'aide introuvable." }, { status: 404 });
    }

    if (String(demande.statut || "").toUpperCase() !== "EN_ATTENTE") {
      return NextResponse.json({ success: false, error: "Cette demande a déjà été traitée." }, { status: 400 });
    }

    const montantDemande = Number(demande.montant_demande || 0);
    const montantFinal = decision === "APPROUVEE" ? montantAccorde : null;
    const now = new Date().toISOString();

    if (decision === "APPROUVEE") {
      const { data: caisse, error: caisseError } = await supabaseAdmin
        .from("caisses")
        .select("id, rubrique_id")
        .eq("rubrique_id", rubriqueId)
        .maybeSingle();

      if (caisseError) throw caisseError;

      if (!caisse?.id) {
        return NextResponse.json(
          { success: false, error: "Aucune caisse liée à la rubrique sélectionnée." },
          { status: 400 }
        );
      }

      const { error: decaissementError } = await supabaseAdmin
        .from("decaissements")
        .insert({
          caisse_id: caisse.id,
          rubrique_id: rubriqueId,
          membre_id: demande.membre_id ?? null,
          montant: montantFinal,
          motif: `Aide / secours approuvé - demande ${demande.id}`,
          created_by: context.authUserId,
        });

      if (decaissementError) throw decaissementError;
    }

    const { error: updateError } = await supabaseAdmin
      .from("demandes_aides")
      .update({
        statut: decision,
        montant_accorde: montantFinal,
        traite_par: context.authUserId,
        date_traitement: now,
        commentaire_decision: commentaireDecision,
      })
      .eq("id", demandeId);

    if (updateError) throw updateError;

    const message =
      decision === "APPROUVEE"
        ? `Demande d'aide acceptée. Montant demandé : ${montantDemande} FCFA. Montant accordé : ${montantFinal} FCFA. Décaissement effectué dans la caisse sélectionnée et caisse mise à jour automatiquement.`
        : "Demande d'aide refusée.";

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erreur lors du traitement de la demande d'aide." },
      { status: 500 }
    );
  }
}
