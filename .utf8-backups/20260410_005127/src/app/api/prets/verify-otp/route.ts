import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";
import crypto from "crypto";

function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

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
### 5. Signature électronique avancée

En validant cette demande de prêt :

- je confirme être l’auteur de cette demande
- je certifie l’exactitude des informations fournies
- j’exprime mon consentement libre et éclairé
- je m’engage juridiquement à rembourser toute somme qui me sera accordée

**Signature du membre :**

Nom du signataire : **${args.nomComplet ?? "-"}**  
Date de signature : **${args.dateSignature}**  
Téléphone utilisé : **${args.telephone ?? "-"}**  
Adresse IP : **${args.ip}**

### 6. Scellement et traçabilité

Référence de la demande : **${args.referenceUnique}**  
Horodatage serveur : **${args.dateSignature}**  
Empreinte numérique (hash) : **${args.signatureHash ?? "-"}**

*Ce document constitue une demande officielle de prêt signée électroniquement. Toute modification ultérieure invalide la signature.*`;
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

    if (!context.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucune adresse email associée au membre connecté.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const otp = String(body?.otp || "").trim();

    if (!otp) {
      return NextResponse.json(
        {
          success: false,
          error: "Code OTP obligatoire.",
        },
        { status: 400 }
      );
    }

    const otpHash = hashOtp(otp);
    const nowIso = new Date().toISOString();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: rows, error: otpError } = await supabaseAdmin
      .from("prets_otp_verifications")
      .select("*")
      .eq("membre_id", context.membreId)
      .eq("email", context.email)
      .is("verified_at", null)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (otpError) {
      throw otpError;
    }

    const otpRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!otpRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun OTP actif trouvé pour cette demande.",
        },
        { status: 404 }
      );
    }

    if (new Date(String(otpRow.expires_at)).getTime() < Date.now()) {
      return NextResponse.json(
        {
          success: false,
          error: "Le code OTP a expiré.",
        },
        { status: 400 }
      );
    }

    if (String(otpRow.otp_code || "") !== otpHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Code OTP invalide.",
        },
        { status: 400 }
      );
    }

    const membre = context.member;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = (forwardedFor ? forwardedFor.split(",")[0]?.trim() : null) || realIp || "0.0.0.0";
    const timestamp = new Date().toISOString();
    const referenceUnique = `PRET-${Date.now()}`;

    const baseDocument = buildDocument({
      nomComplet: membre.nom_complet ?? null,
      numeroMembre: membre.numero_membre ?? null,
      telephone: membre.telephone ?? null,
      email: context.email ?? null,
      montant: Number(otpRow.montant_demande || 0),
      motif: String(otpRow.motif || ""),
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
      montant: Number(otpRow.montant_demande || 0),
      motif: String(otpRow.motif || ""),
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
      montant_demande: Number(otpRow.montant_demande || 0),
      motif: String(otpRow.motif || ""),
      conditions_acceptees: true,
      date_signature: timestamp,
      signature_ip: ip,
      signature_hash: signatureHash,
    };

    const { error: insertPretError } = await supabaseAdmin
      .from("demandes_prets")
      .insert({
        membre_id: context.membreId,
        montant_demande: Number(otpRow.montant_demande || 0),
        montant_accorde: null,
        motif: String(otpRow.motif || ""),
        objet_pret: String(otpRow.motif || ""),
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
      });

    if (insertPretError) {
      throw insertPretError;
    }

    const { error: updateOtpError } = await supabaseAdmin
      .from("prets_otp_verifications")
      .update({
        verified_at: nowIso,
        consumed_at: nowIso,
      })
      .eq("id", otpRow.id);

    if (updateOtpError) {
      throw updateOtpError;
    }

    return NextResponse.json({
      success: true,
      message: "OTP validé. Demande de prêt signée et transmise avec succès.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erreur lors de la validation OTP.",
      },
      { status: 500 }
    );
  }
}

