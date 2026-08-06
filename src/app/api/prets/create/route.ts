import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";
import { createNotificationForRoles } from "@/lib/server/createNotificationForRoles";

function buildDocument(args: {
  nomComplet: string | null;
  numeroMembre: string | null;
  telephone: string | null;
  email: string | null;
  montant: number;
  motif: string;
  dateSignature: string;
  ip: string;
  referenceUnique: string;
  signatureHash?: string | null;
  montantAccorde?: number | null;
}) {
  const montantAccordeLine =
    args.montantAccorde && args.montantAccorde > 0
      ? `
### Mise à jour du montant par le bureau

Montant demandé : **${args.montant} FCFA**
Montant accordé : **${args.montantAccorde} FCFA**
`
      : "";

  return `DEMANDE DE PRÊT – ASSOCIATION FAMILLE NTOL (ASF-NTOL)

### 1. Identification du membre

Nom et prénom : **${args.nomComplet ?? "-"}**
Numéro de membre : **${args.numeroMembre ?? "-"}**
Téléphone : **${args.telephone ?? "-"}**
Email : **${args.email ?? "-"}**

### 2. Objet de la demande

Je soussigné(e), **${args.nomComplet ?? "-"}**, membre actif de l’Association Famille NTOL, sollicite l’octroi d’un prêt auprès de la caisse de l’association.

Montant demandé : **${args.montant} FCFA**

Motif de la demande :
**${args.motif}**

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
### 5. Validation électronique de la demande

En validant cette demande de prêt :

- je confirme être l’auteur de cette demande
- je certifie l’exactitude des informations fournies
- j’exprime mon consentement libre et éclairé
- je m’engage à rembourser toute somme qui me sera accordée

**Validation du membre :**

Nom du demandeur : **${args.nomComplet ?? "-"}**
Date de validation : **${args.dateSignature}**
Téléphone utilisé : **${args.telephone ?? "-"}**
Adresse IP : **${args.ip}**

### 6. Scellement et traçabilité

Référence de la demande : **${args.referenceUnique}**
Horodatage serveur : **${args.dateSignature}**
Empreinte numérique (hash) : **${args.signatureHash ?? "-"}**

*Ce document constitue une demande officielle de prêt validée électroniquement.*`;
}

function formatFcfa(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
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

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: userError?.message || "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success || !context.membreId || !context.member) {
      return NextResponse.json(
        {
          success: false,
          error: context?.message || "Contexte utilisateur introuvable.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const montant = Number(body?.montant ?? 0);
    const motif = String(body?.motif ?? "").trim();
    const conditionsAcceptees = body?.conditions_acceptees === true;

    if (!Number.isFinite(montant) || montant <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Le montant demandé doit être supérieur à zéro.",
        },
        { status: 400 }
      );
    }

    if (!motif) {
      return NextResponse.json(
        {
          success: false,
          error: "Le motif de la demande est obligatoire.",
        },
        { status: 400 }
      );
    }

    if (!conditionsAcceptees) {
      return NextResponse.json(
        {
          success: false,
          error: "Vous devez accepter les conditions du prêt.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const membre = context.member;

    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip =
      (forwardedFor ? forwardedFor.split(",")[0]?.trim() : null) ||
      realIp ||
      "0.0.0.0";

    const timestamp = new Date().toISOString();
    const referenceUnique = `PRET-${Date.now()}`;

    const baseDocument = buildDocument({
      nomComplet: membre.nom_complet ?? null,
      numeroMembre: membre.numero_membre ?? null,
      telephone: membre.telephone ?? null,
      email: context.email ?? null,
      montant,
      motif,
      dateSignature: timestamp,
      ip,
      referenceUnique,
      signatureHash: null,
      montantAccorde: null,
    });

    const signatureHash = crypto
      .createHash("sha256")
      .update(baseDocument)
      .digest("hex");

    const documentTexte = buildDocument({
      nomComplet: membre.nom_complet ?? null,
      numeroMembre: membre.numero_membre ?? null,
      telephone: membre.telephone ?? null,
      email: context.email ?? null,
      montant,
      motif,
      dateSignature: timestamp,
      ip,
      referenceUnique,
      signatureHash,
      montantAccorde: null,
    });

    const documentJson = {
      reference_unique: referenceUnique,
      membre_id: context.membreId,
      nom_complet: membre.nom_complet ?? null,
      numero_membre: membre.numero_membre ?? null,
      telephone: membre.telephone ?? null,
      email: context.email ?? null,
      montant_demande: montant,
      motif,
      conditions_acceptees: true,
      date_signature: timestamp,
      signature_ip: ip,
      signature_hash: signatureHash,
      mode_validation: "VALIDATION_DIRECTE",
    };

    const { data: demande, error: insertPretError } = await supabaseAdmin
      .from("demandes_prets")
      .insert({
        membre_id: context.membreId,
        montant_demande: montant,
        montant_accorde: null,
        motif,
        objet_pret: motif,
        statut: "EN_ATTENTE",
        signature_nom: membre.nom_complet ?? null,
        signature_date: timestamp,
        signature_ip: ip,
        signature_telephone: membre.telephone ?? null,
        signature_hash: signatureHash,
        conditions_acceptees: true,
        reference_unique: referenceUnique,
        document_json: documentJson,
        document_texte: documentTexte,
      })
      .select("id")
      .single();

    if (insertPretError || !demande?.id) {
      throw new Error(
        insertPretError?.message ||
          "La demande a été créée sans identifiant exploitable."
      );
    }

    const nomDemandeur =
      String(membre.nom_complet ?? "").trim() || "Un membre";

    const notificationResult = await createNotificationForRoles({
      supabaseAdmin,
      roleCodes: ["admin", "president", "tresorier"],
      typeNotification: "DEMANDE_PRET_EN_ATTENTE",
      titre: "Nouvelle demande de prêt",
      message:
        `${nomDemandeur} a déposé une demande de prêt de ` +
        `${formatFcfa(montant)} FCFA. La demande est en attente de validation.`,
      urlCible: `/prets/demande/${demande.id}`,
      donnees: {
        demande_id: demande.id,
        membre_id: context.membreId,
        montant_demande: montant,
        reference_unique: referenceUnique,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Votre demande de prêt a été transmise avec succès. " +
        "Elle est maintenant en attente de validation par le bureau de l'association.",
      data: {
        demande_id: demande.id,
        reference_unique: referenceUnique,
        notifications_creees: notificationResult.notificationsCreees,
        destinataires: notificationResult.destinataires,
        erreurs_notifications: notificationResult.erreurs,
      },
    });
  } catch (error: any) {
    console.error("Erreur création demande de prêt :", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Erreur lors de la transmission de la demande de prêt.",
      },
      { status: 500 }
    );
  }
}
