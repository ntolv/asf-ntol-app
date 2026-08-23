import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ContributionLineInput = {
  rubrique_id?: string;
  montant?: number;
};

type ContributionCreateBody = {
  membre_id?: string;
  date_contribution?: string;
  lignes?: ContributionLineInput[];
  confirmer_doublon?: boolean;
};

type DoublonEncaissement = {
  rubrique_id?: string;
  rubrique_nom?: string;
  nombre_encaissements_existants?: number;
  montant_deja_encaisse?: number;
};

type ContributionCreateResult = {
  success?: boolean;
  secure?: boolean;
  confirmation_required?: boolean;
  code?: string;
  message?: string;
  contribution_id?: string;
  membre_id?: string;
  periode_reference?: string;
  montant_total?: number;
  date_contribution?: string;
  doublons?: DoublonEncaissement[];
  doublon_detecte?: boolean;
  doublon_confirme?: boolean;
  operation_id?: string;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return {
    supabaseUrl,
    anonKey,
  };
}

function getAuthCookieValue(request: NextRequest): string | null {
  const cookies = request.cookies.getAll();

  const cookieSimple = cookies.find(
    (cookie) =>
      cookie.name.startsWith("sb-") &&
      cookie.name.endsWith("-auth-token")
  );

  if (cookieSimple?.value) {
    return cookieSimple.value;
  }

  const morceaux = cookies
    .filter(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        /-auth-token\.\d+$/.test(cookie.name)
    )
    .sort((a, b) => {
      const indexA = Number(a.name.match(/\.(\d+)$/)?.[1] ?? 0);
      const indexB = Number(b.name.match(/\.(\d+)$/)?.[1] ?? 0);

      return indexA - indexB;
    });

  if (morceaux.length === 0) {
    return null;
  }

  return morceaux.map((cookie) => cookie.value).join("");
}

function decodeBase64Url(value: string): string {
  const normalise = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding =
    "=".repeat((4 - (normalise.length % 4)) % 4);

  return Buffer.from(
    normalise + padding,
    "base64"
  ).toString("utf8");
}

function extractAccessToken(
  authCookieValue: string
): string | null {
  try {
    let raw = authCookieValue;

    try {
      raw = decodeURIComponent(raw);
    } catch {
      // Cookie non URL-encodé.
    }

    let sessionText: string;

    if (raw.startsWith("base64-")) {
      sessionText = decodeBase64Url(
        raw.substring("base64-".length)
      );
    } else {
      sessionText = raw;
    }

    const session = JSON.parse(sessionText);

    if (
      session &&
      typeof session === "object" &&
      !Array.isArray(session)
    ) {
      const accessToken = session.access_token;

      if (
        typeof accessToken === "string" &&
        accessToken.trim()
      ) {
        return accessToken.trim();
      }
    }

    if (Array.isArray(session)) {
      const token = session.find(
        (value) =>
          typeof value === "string" &&
          value.split(".").length === 3
      );

      if (typeof token === "string") {
        return token;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function getAuthenticatedClient(
  request: NextRequest
) {
  const { supabaseUrl, anonKey } =
    getSupabaseConfig();

  const authCookieValue =
    getAuthCookieValue(request);

  if (!authCookieValue) {
    throw new Error(
      "Cookie d'authentification manquant"
    );
  }

  const accessToken =
    extractAccessToken(authCookieValue);

  if (!accessToken) {
    throw new Error(
      "Session d'authentification invalide"
    );
  }

  const supabase = createClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },

      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (
    userError ||
    !userData.user
  ) {
    throw new Error(
      userError?.message ||
        "Utilisateur non connecté"
    );
  }

  return {
    supabase,
    user: userData.user,
  };
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as ContributionCreateBody;

    const membreId = String(
      body?.membre_id ?? ""
    ).trim();

    const dateContribution = String(
      body?.date_contribution ?? ""
    ).trim();

    const confirmerDoublon =
      body?.confirmer_doublon === true;

    const lignes = Array.isArray(body?.lignes)
      ? body.lignes
      : [];

    if (!membreId) {
      return NextResponse.json(
        {
          success: false,
          message: "Le membre est obligatoire",
        },
        {
          status: 400,
        }
      );
    }

    const lignesPropres = lignes
      .map((ligne) => ({
        rubrique_id: String(
          ligne?.rubrique_id ?? ""
        ).trim(),

        montant: Number(
          ligne?.montant ?? 0
        ),
      }))
      .filter(
        (ligne) =>
          ligne.rubrique_id &&
          Number.isFinite(ligne.montant) &&
          ligne.montant > 0
      );

    if (lignesPropres.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune ligne de contribution valide",
        },
        {
          status: 400,
        }
      );
    }

    const { supabase } =
      await getAuthenticatedClient(request);

    const {
      data,
      error,
    } = await supabase.rpc(
      "fn_contribution_create_securisee",
      {
        p_membre_id: membreId,
        p_lignes: lignesPropres,
        p_date_contribution:
          dateContribution || null,
        p_confirmer_doublon:
          confirmerDoublon,
      }
    );

    if (error) {
      const message =
        error.message ||
        "Création de la contribution impossible";

      const messageLower =
        message.toLowerCase();

      const interdit =
        messageLower.includes(
          "n'êtes pas autorisé"
        ) ||
        messageLower.includes(
          "n’êtes pas autorisé"
        ) ||
        messageLower.includes(
          "non autorisé"
        );

      return NextResponse.json(
        {
          success: false,
          message,
        },
        {
          status: interdit ? 403 : 400,
        }
      );
    }

    const result =
      data as ContributionCreateResult | null;

    if (
      result?.confirmation_required === true
    ) {
      return NextResponse.json(
        {
          success: false,
          confirmation_required: true,

          code:
            result.code ||
            "DOUBLON_ENCAISSEMENT",

          message:
            result.message ||
            "Un encaissement existe déjà.",

          membre_id:
            result.membre_id ||
            membreId,

          periode_reference:
            result.periode_reference,

          doublons:
            result.doublons ?? [],
        },
        {
          status: 409,
        }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,

          message:
            result?.message ||
            "Création de la contribution impossible",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,

      message:
        result.message ||
        "Contribution enregistrée avec succès",

      contribution_id:
        result.contribution_id,

      membre_id:
        result.membre_id,

      montant_total:
        result.montant_total,

      date_contribution:
        result.date_contribution,

      operation_id:
        result.operation_id,

      doublon_detecte:
        result.doublon_detecte === true,

      doublon_confirme:
        result.doublon_confirme === true,
    });
  } catch (error: any) {
    const message =
      error?.message ||
      "Erreur serveur lors de la création de la contribution";

    const messageLower =
      message.toLowerCase();

    const authentification =
      messageLower.includes(
        "authentification"
      ) ||
      messageLower.includes(
        "utilisateur non connecté"
      ) ||
      messageLower.includes(
        "session"
      ) ||
      messageLower.includes(
        "cookie"
      );

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status:
          authentification
            ? 401
            : 500,
      }
    );
  }
}
