import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";
import crypto from "crypto";

function isBureauRole(role: { code?: string | null; libelle?: string | null } | null | undefined) {
  const raw = `${role?.code ?? ""} ${role?.libelle ?? ""}`.toLowerCase();
  return raw.includes("admin") || raw.includes("président") || raw.includes("president") || raw.includes("trésorier") || raw.includes("tresorier");
}

function rebuildDocument(demande: any, montantAccorde: number | null) {
  const signatureDate = demande.signature_date
    ? new Date(demande.signature_date).toISOString()
    : new Date().toISOString();

  const montantDemande = Number(demande.montant_demande || 0);

  const montantAccordeLine =
    montantAccorde && montantAccorde > 0
      ? `
### Mise à jour du montant par le bureau

Montant demandé : **${montantDemande} FCFA**  
Montant accordé : **${montantAccorde} FCFA**
`
      : "";

  const baseWithoutHash = `DEMANDE DE PRÊT – ASSOCIATION FAMILLE NTOL (ASF-NTOL)

### 1. Identification du membre

Nom et prénom : **${demande.signature_nom ?? "-"}**  
Numéro de membre : **${demande.document_json?.numero_membre ?? "-"}**  
Téléphone : **${demande.signature_telephone ?? "-"}**  
Email : **${demande.document_json?.email ?? "-"}**

### 2. Objet de la demande

Je soussigné(e), **${demande.signature_nom ?? "-"}**, membre actif de l’Association Famille NTOL, sollicite l’octroi d’un prêt auprès de la caisse de l’association.

Montant demandé : **${montantDemande} FCFA**

Motif de la demande :  
**${demande.motif ?? demande.objet_pret ?? "-"}**

### 3. Engagement du membre

Je reconnais que ce prêt constitue une dette personnelle envers l’Association Famille NTOL.

À ce titre, je m’engage à :

- rembourser intégralement le montant qui me sera accordé
- respecter les modalités et délais de remboursement fixés par le bureau
- accepter les mesures internes applicables en cas de retard ou de non-remboursement

Je reconnais avoir pris connaissance et accepter sans réserve les règles de prêt en vigueur dans l’association.

### 4. Conditions d’attribution

- La demande est soumise à validation du bureau (Président, Trésorier, Administrateur)
- Le montant accordé peut être partiel ou différent du montant demandé
- Le décaissement n’intervient qu’après validation officielle
- Le prêt accordé sera enregistré dans la caisse correspondante
- Un suivi de remboursement sera mis en place jusqu’à extinction complète de la dette
${montantAccordeLine}
### 5. Signature électronique avancée

En validant cette demande de prêt :

- je confirme être l’auteur de cette demande
- je certifie l’exactitude des informations fournies
- j’exprime mon consentement libre et éclairé
- je m’engage juridiquement à rembourser toute somme qui me sera accordée

**Signature du membre :**

Nom du signataire : **${demande.signature_nom ?? "-"}**  
Date de signature : **${signatureDate}**  
Téléphone utilisé : **${demande.signature_telephone ?? "-"}**  
Adresse IP : **${demande.signature_ip ?? "-"}**

### 6. Scellement et traçabilité

Référence de la demande : **${demande.reference_unique ?? "-"}**  
Horodatage serveur : **${signatureDate}**  
Empreinte numérique (hash) : **HASH_PLACEHOLDER**

*Ce document constitue une demande officielle de prêt signée électroniquement. Toute modification ultérieure invalide la signature.*`;

  const hash = crypto
    .createHash("sha256")
    .update(baseWithoutHash.replace("HASH_PLACEHOLDER", ""))
    .digest("hex");

  return {
    text: baseWithoutHash.replace("HASH_PLACEHOLDER", hash),
    hash,
  };
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
        { success: false, message: userError?.message || "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json(
        { success: false, message: context?.message || "Contexte utilisateur introuvable." },
        { status: 401 }
      );
    }

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        { success: false, message: "Accès refusé. Action réservée au bureau." },
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
      return NextResponse.json({ success: false, message: "demande_id obligatoire." }, { status: 400 });
    }

    if (!["APPROUVEE", "REFUSEE"].includes(decision)) {
      return NextResponse.json({ success: false, message: "decision invalide." }, { status: 400 });
    }

    if (decision === "APPROUVEE") {
      if (!rubriqueId) {
        return NextResponse.json({ success: false, message: "rubrique_id obligatoire pour un prêt approuvé." }, { status: 400 });
      }
      if (montantAccorde === null || Number.isNaN(montantAccorde) || montantAccorde <= 0) {
        return NextResponse.json({ success: false, message: "montant_accorde obligatoire et valide pour un prêt approuvé." }, { status: 400 });
      }
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: demande, error: demandeError } = await supabaseAdmin
      .from("demandes_prets")
      .select("*")
      .eq("id", demandeId)
      .maybeSingle();

    if (demandeError) throw demandeError;

    if (!demande) {
      return NextResponse.json({ success: false, message: "Demande de prêt introuvable." }, { status: 404 });
    }

    if (String(demande.statut || "").toUpperCase() !== "EN_ATTENTE") {
      return NextResponse.json({ success: false, message: "Cette demande a déjà été traitée." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const montantDemande = Number(demande.montant_demande || 0);
    const montantFinal = decision === "APPROUVEE" ? montantAccorde : null;
    const rebuilt = rebuildDocument(demande, montantFinal);

    if (decision === "APPROUVEE") {
      const { data: caisse, error: caisseError } = await supabaseAdmin
        .from("caisses")
        .select("id, rubrique_id")
        .eq("rubrique_id", rubriqueId)
        .maybeSingle();

      if (caisseError) throw caisseError;

      if (!caisse?.id) {
        return NextResponse.json(
          { success: false, message: "Aucune caisse liée à la rubrique sélectionnée." },
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
          motif: `Décaissement prêt approuvé - demande ${demande.reference_unique ?? demande.id}`,
          created_by: context.authUserId,
        });

      if (decaissementError) throw decaissementError;
    }

    const { error: updateError } = await supabaseAdmin
      .from("demandes_prets")
      .update({
        statut: decision,
        montant_accorde: montantFinal,
        traite_par: context.authUserId,
        date_traitement: now,
        commentaire_decision: commentaireDecision,
        signature_hash: rebuilt.hash,
        document_texte: rebuilt.text,
      })
      .eq("id", demandeId);

    if (updateError) throw updateError;

    const message =
      decision === "APPROUVEE"
        ? `Demande de prêt acceptée. Montant demandé : ${montantDemande} FCFA. Montant accordé : ${montantFinal} FCFA. Décaissement effectué dans la caisse sélectionnée et caisse mise à jour automatiquement.`
        : "Demande de prêt refusée.";

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Erreur lors du traitement de la demande de prêt." },
      { status: 500 }
    );
  }
}

