type SupabaseAdminClient = {
  from: (table: string) => any;
  rpc: (functionName: string, parameters: Record<string, unknown>) => any;
};

type NotificationForRolesArgs = {
  supabaseAdmin: SupabaseAdminClient;
  roleCodes: string[];
  typeNotification: string;
  titre: string;
  message: string;
  urlCible: string;
  donnees?: Record<string, unknown>;
};

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function createNotificationForRoles({
  supabaseAdmin,
  roleCodes,
  typeNotification,
  titre,
  message,
  urlCible,
  donnees = {},
}: NotificationForRolesArgs) {
  const expectedRoles = roleCodes.map(normalizeRole);

  const { data: roleRows, error: rolesError } = await supabaseAdmin
    .from("v_utilisateurs_roles_principaux")
    .select("membre_id, role_code, role_libelle");

  if (rolesError) {
    throw new Error(
      `Impossible de rechercher les destinataires : ${rolesError.message}`
    );
  }

  const destinataires = Array.from(
    new Set(
      (roleRows ?? [])
        .filter((row: any) => {
          const roleText = normalizeRole(
            `${row?.role_code ?? ""} ${row?.role_libelle ?? ""}`
          );

          return expectedRoles.some((expectedRole) =>
            roleText.includes(expectedRole)
          );
        })
        .map((row: any) => String(row?.membre_id ?? "").trim())
        .filter(Boolean)
    )
  );

  if (destinataires.length === 0) {
    return {
      destinataires: 0,
      notificationsCreees: 0,
      erreurs: ["Aucun Président, Trésorier ou Administrateur trouvé."],
    };
  }

  const results = await Promise.allSettled(
    destinataires.map((membreId) =>
      supabaseAdmin.rpc("fn_notifications_creer", {
        p_membre_id: membreId,
        p_type_notification: typeNotification,
        p_titre: titre,
        p_message: message,
        p_url_cible: urlCible,
        p_donnees: donnees,
      })
    )
  );

  const erreurs: string[] = [];
  let notificationsCreees = 0;

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      erreurs.push(
        `${destinataires[index]} : ${
          result.reason?.message ?? "Erreur inconnue"
        }`
      );
      return;
    }

    if (result.value?.error) {
      erreurs.push(
        `${destinataires[index]} : ${result.value.error.message}`
      );
      return;
    }

    notificationsCreees += 1;
  });

  return {
    destinataires: destinataires.length,
    notificationsCreees,
    erreurs,
  };
}
