import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";
import crypto from "crypto";
import { sendPretOtpEmail } from "@/lib/server/sendPretOtpEmail";

function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
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
    const montant = Number(body?.montant || 0);
    const motif = String(body?.motif || "").trim();
    const conditionsAcceptees = Boolean(body?.conditions_acceptees);

    if (montant <= 0) {
      return NextResponse.json(
        { success: false, error: "Montant invalide." },
        { status: 400 }
      );
    }

    if (!motif) {
      return NextResponse.json(
        { success: false, error: "Motif obligatoire." },
        { status: 400 }
      );
    }

    if (!conditionsAcceptees) {
      return NextResponse.json(
        {
          success: false,
          error: "Les conditions du prêt doivent être acceptées.",
        },
        { status: 400 }
      );
    }

    const otpCode = String(
      Math.floor(100000 + Math.random() * 900000)
    );
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    await supabaseAdmin
      .from("prets_otp_verifications")
      .update({
        consumed_at: now,
      })
      .eq("membre_id", context.membreId)
      .eq("email", context.email)
      .is("verified_at", null)
      .is("consumed_at", null);

    const { error: insertError } = await supabaseAdmin
      .from("prets_otp_verifications")
      .insert({
        membre_id: context.membreId,
        email: context.email,
        montant_demande: montant,
        motif,
        otp_code: otpHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      throw insertError;
    }

    await sendPretOtpEmail({
      to: context.email,
      code: otpCode,
      memberName: context.member.nom_complet ?? "membre",
      montant,
      motif,
    });

    return NextResponse.json({
      success: true,
      message: "Code OTP envoyé par email.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erreur lors de l'envoi du code OTP.",
      },
      { status: 500 }
    );
  }
}
