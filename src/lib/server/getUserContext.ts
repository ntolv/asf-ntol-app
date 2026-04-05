import { createClient } from "@supabase/supabase-js";

type AuthUserLike = {
  id?: string;
  email?: string | null;
};

type RequestLike = {
  headers?: {
    get?: (name: string) => string | null;
  };
  cookies?: {
    getAll?: () => Array<{ name: string; value: string }>;
  };
};

export type UserContext = {
  success: boolean;
  message: string;
  authUserId: string | null;
  email: string | null;
  membreId: string | null;
  user: AuthUserLike | null;
  utilisateur: any | null;
  member: any | null;
  role: {
    id: string | null;
    code: string | null;
    libelle: string | null;
  } | null;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variables Supabase manquantes");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Variables Supabase manquantes pour l'auth");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isJwtLike(value: string | null | undefined) {
  if (!value) return false;
  return /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(value);
}

function extractTokenFromUnknownValue(rawValue: string | null | undefined): string | null {
  if (!rawValue) return null;

  const direct = rawValue.trim();
  if (isJwtLike(direct)) return direct;

  const decoded = (() => {
    try {
      return decodeURIComponent(direct);
    } catch {
      return direct;
    }
  })();

  if (isJwtLike(decoded)) return decoded;

  const jwtMatch = decoded.match(/[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/);
  if (jwtMatch?.[0]) return jwtMatch[0];

  try {
    const parsed = JSON.parse(decoded);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (
        "access_token" in parsed &&
        typeof (parsed as { access_token?: unknown }).access_token === "string"
      ) {
        const token = (parsed as { access_token: string }).access_token;
        if (isJwtLike(token)) return token;
      }
    }

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === "string" && isJwtLike(item)) {
          return item;
        }

        if (
          item &&
          typeof item === "object" &&
          "access_token" in item &&
          typeof (item as { access_token?: unknown }).access_token === "string"
        ) {
          const token = (item as { access_token: string }).access_token;
          if (isJwtLike(token)) return token;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getCookieCandidates(request: RequestLike | null | undefined) {
  if (!request?.cookies?.getAll) return [];

  const cookies = request.cookies.getAll() || [];

  const prioritizedNames = [
    "sb-access-token",
    "supabase-access-token",
    "access-token",
    "access_token",
  ];

  const prioritized = cookies.filter((cookie) => prioritizedNames.includes(cookie.name));
  const probable = cookies.filter(
    (cookie) =>
      cookie.name.includes("auth-token") ||
      cookie.name.includes("access-token") ||
      cookie.name.includes("sb-")
  );

  return [...prioritized, ...probable];
}

async function resolveAuthUser(input: AuthUserLike | RequestLike | null | undefined): Promise<AuthUserLike | null> {
  if (input && typeof input === "object" && "id" in input && typeof input.id === "string") {
    return {
      id: input.id,
      email: input.email ?? null,
    };
  }

  const request = input as RequestLike | null | undefined;
  const authClient = getAuthClient();

  const authorizationHeader = request?.headers?.get?.("authorization");
  if (authorizationHeader?.toLowerCase().startsWith("bearer ")) {
    const bearerToken = authorizationHeader.slice(7).trim();

    if (bearerToken) {
      const { data } = await authClient.auth.getUser(bearerToken);

      if (data?.user?.id) {
        return {
          id: data.user.id,
          email: data.user.email ?? null,
        };
      }
    }
  }

  const cookieCandidates = getCookieCandidates(request);

  for (const cookie of cookieCandidates) {
    const token = extractTokenFromUnknownValue(cookie.value);

    if (!token) continue;

    const { data } = await authClient.auth.getUser(token);

    if (data?.user?.id) {
      return {
        id: data.user.id,
        email: data.user.email ?? null,
      };
    }
  }

  return null;
}

export async function getUserContext(
  input: AuthUserLike | RequestLike | null = null
): Promise<UserContext> {
  const user = await resolveAuthUser(input);

  if (!user?.id) {
    return {
      success: false,
      message: "Utilisateur non connecté",
      authUserId: null,
      email: null,
      membreId: null,
      user: null,
      utilisateur: null,
      member: null,
      role: null,
    };
  }

  const supabase = getAdminClient();

  let utilisateur: any = null;
  let utilisateurError: any = null;

  const byAuthUser = await supabase
    .from("utilisateurs")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  utilisateur = byAuthUser.data ?? null;
  utilisateurError = byAuthUser.error ?? null;

  if (!utilisateur && user.email) {
    const byEmail = await supabase
      .from("utilisateurs")
      .select("*")
      .ilike("email_connexion", user.email)
      .maybeSingle();

    utilisateur = byEmail.data ?? null;
    utilisateurError = byEmail.error ?? null;

    if (utilisateur?.id && utilisateur.auth_user_id !== user.id) {
      await supabase
        .from("utilisateurs")
        .update({
          auth_user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", utilisateur.id);

      utilisateur.auth_user_id = user.id;
    }
  }

  if (utilisateurError) {
    return {
      success: false,
      message: utilisateurError.message || "Erreur chargement utilisateur",
      authUserId: user.id,
      email: user.email ?? null,
      membreId: null,
      user,
      utilisateur: null,
      member: null,
      role: null,
    };
  }

  if (!utilisateur) {
    return {
      success: false,
      message: "Aucun utilisateur lié à l'utilisateur connecté",
      authUserId: user.id,
      email: user.email ?? null,
      membreId: null,
      user,
      utilisateur: null,
      member: null,
      role: null,
    };
  }

  if (!utilisateur.membre_id) {
    return {
      success: false,
      message: "Aucun membre lié à l'utilisateur connecté",
      authUserId: user.id,
      email: user.email ?? null,
      membreId: null,
      user,
      utilisateur,
      member: null,
      role: null,
    };
  }

  const memberResult = await supabase
    .from("membres")
    .select("*")
    .eq("id", utilisateur.membre_id)
    .maybeSingle();

  if (memberResult.error || !memberResult.data) {
    return {
      success: false,
      message: memberResult.error?.message || "Membre introuvable pour l'utilisateur connecté",
      authUserId: user.id,
      email: user.email ?? null,
      membreId: utilisateur.membre_id ?? null,
      user,
      utilisateur,
      member: null,
      role: null,
    };
  }

  const roleResult = await supabase
    .from("v_utilisateurs_roles_principaux")
    .select("*")
    .eq("utilisateur_id", utilisateur.id)
    .eq("principal", true)
    .maybeSingle();

  const role = roleResult.data
    ? {
        id: roleResult.data.role_id ?? null,
        code: roleResult.data.role_code ?? null,
        libelle: roleResult.data.role_libelle ?? null,
      }
    : null;

  const member = {
    ...memberResult.data,
    role: role?.libelle ?? null,
    role_code: role?.code ?? null,
  };

  return {
    success: true,
    message: "Contexte utilisateur chargé",
    authUserId: user.id,
    email: user.email ?? null,
    membreId: utilisateur.membre_id ?? null,
    user,
    utilisateur,
    member,
    role,
  };
}
