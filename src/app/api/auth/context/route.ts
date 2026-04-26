import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

export async function GET() {
  try {
    const cookieStore = await cookies();

    // Lire dynamiquement le cookie Supabase auth-token
    const authCookie = cookieStore
      .getAll()
      .find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
    
    const authTokenCookie = authCookie?.value;
    
    if (!authTokenCookie) {
      return NextResponse.json(
        {
          success: false,
          message: "Cookie d'authentification manquant",
          authUserId: null,
          membreId: null,
          email: null,
          telephone: null,
          nom: null,
          role: null,
          roleCode: null,
          user: null,
          utilisateur: null,
          member: null,
        },
        { status: 200 }
      );
    }

    // Décoder le cookie pour extraire l'access_token
    let accessToken = null;
    try {
      let session;
      if (authTokenCookie.startsWith('base64-')) {
        // Retirer le préfixe "base64-" et décoder correctement
        const encoded = authTokenCookie.replace(/^base64-/, '');
        session = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
      } else {
        // Ancien format si nécessaire
        session = JSON.parse(atob(authTokenCookie));
      }
      accessToken = session.access_token;
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Cookie d'authentification invalide",
          authUserId: null,
          membreId: null,
          email: null,
          telephone: null,
          nom: null,
          role: null,
          roleCode: null,
          user: null,
          utilisateur: null,
          member: null,
        },
        { status: 200 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Access token manquant dans le cookie",
          authUserId: null,
          membreId: null,
          email: null,
          telephone: null,
          nom: null,
          role: null,
          roleCode: null,
          user: null,
          utilisateur: null,
          member: null,
        },
        { status: 200 }
      );
    }

    // Utiliser l'access_token directement avec Supabase
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data, error } = await supabaseAuth.auth.getUser(accessToken);

    if (error || !data.user) {
      return NextResponse.json(
        {
          success: false,
          message: error?.message || "Utilisateur non connecté",
          authUserId: null,
          membreId: null,
          email: null,
          telephone: null,
          nom: null,
          role: null,
          roleCode: null,
          user: null,
          utilisateur: null,
          member: null,
        },
        { status: 200 }
      );
    }

    // Utiliser getUserContext avec l'utilisateur authentifié
    const context = await getUserContext(data.user);

    if (!context.success) {
      return NextResponse.json(
        {
          success: false,
          message: context.message || "Contexte utilisateur indisponible",
          authUserId: context.authUserId ?? null,
          membreId: context.membreId ?? null,
          email: context.email ?? null,
          telephone: context.member?.telephone ?? null,
          nom: context.member?.nom_complet ?? context.member?.nom ?? null,
          role: context.role?.libelle ?? context.member?.role ?? null,
          roleCode: context.role?.code ?? context.member?.role_code ?? null,
          user: context.user ?? null,
          utilisateur: context.utilisateur ?? null,
          member: context.member ?? null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: context.message || "Contexte utilisateur OK",
      authUserId: context.authUserId ?? null,
      membreId: context.membreId ?? null,
      email: context.email ?? null,
      telephone: context.member?.telephone ?? null,
      nom: context.member?.nom_complet ?? context.member?.nom ?? null,
      role: context.role?.libelle ?? context.member?.role ?? null,
      roleCode: context.role?.code ?? context.member?.role_code ?? null,
      user: context.user ?? null,
      utilisateur: context.utilisateur ?? null,
      member: context.member ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur contexte utilisateur",
        authUserId: null,
        membreId: null,
        email: null,
        telephone: null,
        nom: null,
        role: null,
        roleCode: null,
        user: null,
        utilisateur: null,
        member: null,
      },
      { status: 500 }
    );
  }
}