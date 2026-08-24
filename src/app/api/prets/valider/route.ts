import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

const TAUX_INTERET_MENSUEL = 0.01;
const TAUX_INTERET_LIBELLE =
  "1 % par mois, capitalisé mensuellement";

type FinancementInput = {
  rubrique_id?: string;
  caisse_id?: string;
  montant?: number | string;
};

type FinancementValide = {
  rubriqueId: string;
  caisseId: string;
  montant: number;
  rubriqueNom: string;
  caisseLibelle: string;
  soldeDisponible: number;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isBureauRole(
  role:
    | {
        code?: string | null;
        libelle?: string | null;
      }
    | null
    | undefined
) {
  const raw = normalizeText(
    `${role?.code ?? ""} ${role?.libelle ?? ""}`
  );

  return (
    raw.includes("admin") ||
    raw.includes("president") ||
    raw.includes("tresorier")
  );
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function rebuildDocument(args: {
  demande: any;
  decision: "APPROUVEE" | "REFUSEE";
  montantAccorde: number | null;
  motifReduction: string | null;
  commentaireDecision: string | null;
  financements: FinancementValide[];
  dateTraitement: string;
}) {
  const {
    demande,
    decision,
    montantAccorde,
    motifReduction,
    commentaireDecision,
    financements,
    dateTraitement,
  } = args;

  const signatureDate = demande.signature_date
    ? new Date(demande.signature_date).toISOString()
    : new Date().toISOString();

  const montantDemande = Number(demande.montant_demande || 0);

  const financementLines =
    financements.length > 0
      ? financements
          .map(
            (item) =>
              `- ${item.rubriqueNom} — ${item.caisseLibelle} : **${formatMoney(
                item.montant
              )} FCFA**`
          )
          .join("\n")
      : "- Aucun décaissement : demande refusée.";

  const decisionLabel =
    decision === "APPROUVEE" ? "APPROUVÉE" : "REFUSÉE";

  const tauxLine =
    decision === "APPROUVEE"
      ? `Taux d'intérêt : **${TAUX_INTERET_LIBELLE}**`
      : "Taux d'intérêt : **Sans objet**";

  const baseWithoutHash = `DEMANDE DE PRÊT – ASSOCIATION FAMILLE NTOL (ASF-NTOL)

### 1. Identification du membre

Nom et prénom : **${demande.signature_nom ?? "-"}**
Numéro de membre : **${demande.document_json?.numero_membre ?? "-"}**
Téléphone : **${demande.signature_telephone ?? "-"}**
Email : **${demande.document_json?.email ?? "-"}**

### 2. Objet de la demande

Je soussigné(e), **${
    demande.signature_nom ?? "-"
  }**, membre actif de l’Association Famille NTOL, sollicite l’octroi d’un prêt auprès de l’association.

Montant demandé : **${formatMoney(montantDemande)} FCFA**

Motif de la demande :

**${demande.motif ?? demande.objet_pret ?? "-"}**

### 3. Engagement du membre

Je reconnais que ce prêt constitue une dette personnelle envers l’Association Famille NTOL.

À ce titre, je m’engage à :

- rembourser intégralement le montant qui me sera accordé ;
- respecter les modalités et délais de remboursement fixés par le bureau ;
- accepter les mesures internes applicables en cas de retard ou de non-remboursement.

### 4. Décision du bureau

Décision : **${decisionLabel}**

Montant demandé : **${formatMoney(montantDemande)} FCFA**

Montant accordé : **${
    montantAccorde !== null
      ? `${formatMoney(montantAccorde)} FCFA`
      : "0 FCFA"
  }**

${tauxLine}

Mode d'intérêt : **capitalisation mensuelle**

Motif de réduction :

**${motifReduction ?? "Sans objet"}**

Commentaire de décision :

**${commentaireDecision ?? "Aucun commentaire"}**

Date de traitement : **${dateTraitement}**

### 5. Répartition du financement

${financementLines}

Le capital remboursé devra être restitué dans les caisses d'origine selon cette répartition.

Les intérêts effectivement encaissés seront affectés conformément aux règles de répartition applicables aux caisses ayant financé le prêt.

### 6. Signature électronique du membre

Nom du signataire : **${demande.signature_nom ?? "-"}**
Date de signature : **${signatureDate}**
Téléphone utilisé : **${demande.signature_telephone ?? "-"}**
Adresse IP : **${demande.signature_ip ?? "-"}**

### 7. Scellement et traçabilité

Référence de la demande : **${demande.reference_unique ?? "-"}**
Horodatage de décision : **${dateTraitement}**
Empreinte numérique : **HASH_PLACEHOLDER**

*Ce document constitue la trace officielle de la demande, de la décision du bureau, du taux d'intérêt et de la répartition des caisses ayant financé le prêt.*`;

  const hash = crypto
    .createHash("sha256")
    .update(baseWithoutHash.replace("HASH_PLACEHOLDER", ""))
    .digest("hex");

  return {
    text: baseWithoutHash.replace("HASH_PLACEHOLDER", hash),
    hash,
  };
}

async function rollbackFinancialOperations(args: {
  supabaseAdmin: any;
  demandeId: string;
  pretId: string | null;
  financementIds: string[];
  decaissementIds: string[];
}) {
  const {
    supabaseAdmin,
    demandeId,
    pretId,
    financementIds,
    decaissementIds,
  } = args;

  /*
   * Le rollback est volontairement large.
   * Si une étape échoue après la création du prêt,
   * on retire aussi les données dérivées.
   */

  if (pretId) {
    await supabaseAdmin
      .from("pret_distributions_interets")
      .delete()
      .eq("pret_id", pretId);

    await supabaseAdmin
      .from("pret_interets_ventilation_caisses")
      .delete()
      .eq("pret_id", pretId);

    await supabaseAdmin
      .from("pret_restitutions_capital")
      .delete()
      .eq("pret_id", pretId);

    await supabaseAdmin
      .from("pret_immobilisations_membres")
      .delete()
      .eq("pret_id", pretId);

    await supabaseAdmin
      .from("pret_cles_repartition_interets")
      .delete()
      .eq("pret_id", pretId);

    await supabaseAdmin
      .from("prets_interets_recalculs")
      .delete()
      .eq("pret_id", pretId);

    await supabaseAdmin
      .from("prets")
      .delete()
      .eq("id", pretId);
  } else {
    await supabaseAdmin
      .from("pret_distributions_interets")
      .delete()
      .eq("demande_pret_id", demandeId);

    await supabaseAdmin
      .from("pret_restitutions_capital")
      .delete()
      .eq("demande_pret_id", demandeId);

    await supabaseAdmin
      .from("pret_immobilisations_membres")
      .delete()
      .eq("demande_pret_id", demandeId);

    await supabaseAdmin
      .from("pret_cles_repartition_interets")
      .delete()
      .eq("demande_pret_id", demandeId);
  }

  if (financementIds.length > 0) {
    await supabaseAdmin
      .from("pret_financements")
      .delete()
      .in("id", financementIds);
  }

  if (decaissementIds.length > 0) {
    await supabaseAdmin
      .from("decaissements")
      .delete()
      .in("id", decaissementIds);
  }
}

export async function POST(request: Request) {
  const createdDecaissementIds: string[] = [];
  const createdFinancementIds: string[] = [];

  let createdPretId: string | null = null;
  let supabaseAdmin: any = null;
  let demandeIdForRollback = "";

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
          message:
            userError?.message || "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success || !context.authUserId) {
      return NextResponse.json(
        {
          success: false,
          message:
            context?.message ||
            "Contexte utilisateur introuvable.",
        },
        { status: 401 }
      );
    }

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Accès refusé. Action réservée au bureau.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const demandeId = String(body?.demande_id ?? "").trim();

    demandeIdForRollback = demandeId;

    const decision = String(body?.decision ?? "")
      .trim()
      .toUpperCase();

    const commentaireDecision =
      String(body?.commentaire_decision ?? "").trim() || null;

    const motifReduction =
      String(body?.motif_reduction ?? "").trim() || null;

    const montantAccorde =
      body?.montant_accorde === null ||
      body?.montant_accorde === undefined ||
      body?.montant_accorde === ""
        ? null
        : Number(body.montant_accorde);

    const financementsInput: FinancementInput[] = Array.isArray(
      body?.financements
    )
      ? body.financements
      : [];

    if (!demandeId) {
      return NextResponse.json(
        {
          success: false,
          message: "demande_id obligatoire.",
        },
        { status: 400 }
      );
    }

    if (!["APPROUVEE", "REFUSEE"].includes(decision)) {
      return NextResponse.json(
        {
          success: false,
          message: "La décision doit être APPROUVEE ou REFUSEE.",
        },
        { status: 400 }
      );
    }

    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: demande, error: demandeError } =
      await supabaseAdmin
        .from("demandes_prets")
        .select("*")
        .eq("id", demandeId)
        .maybeSingle();

    if (demandeError) {
      throw demandeError;
    }

    if (!demande) {
      return NextResponse.json(
        {
          success: false,
          message: "Demande de prêt introuvable.",
        },
        { status: 404 }
      );
    }

    if (
      String(demande.statut ?? "").trim().toUpperCase() !==
      "EN_ATTENTE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Cette demande a déjà été traitée.",
        },
        { status: 400 }
      );
    }

    const montantDemande = Number(demande.montant_demande || 0);

    let financementsValides: FinancementValide[] = [];

    if (decision === "APPROUVEE") {
      if (
        montantAccorde === null ||
        !Number.isFinite(montantAccorde) ||
        montantAccorde <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Le montant accordé doit être supérieur à zéro.",
          },
          { status: 400 }
        );
      }

      if (montantAccorde > montantDemande) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Le montant accordé ne peut pas dépasser le montant demandé.",
          },
          { status: 400 }
        );
      }

      if (
        montantAccorde < montantDemande &&
        !motifReduction
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Le motif de réduction est obligatoire lorsque le montant accordé est inférieur au montant demandé.",
          },
          { status: 400 }
        );
      }

      if (financementsInput.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Au moins une caisse de financement est obligatoire.",
          },
          { status: 400 }
        );
      }

      const normalizedFinancements = financementsInput.map(
        (item, index) => {
          const rubriqueId = String(
            item?.rubrique_id ?? ""
          ).trim();

          const caisseId = String(
            item?.caisse_id ?? ""
          ).trim();

          const montant = toPositiveNumber(item?.montant);

          if (!rubriqueId || !caisseId || montant === null) {
            throw new Error(
              `La ligne de financement ${
                index + 1
              } est incomplète ou invalide.`
            );
          }

          return {
            rubriqueId,
            caisseId,
            montant,
          };
        }
      );

      const caisseIds = normalizedFinancements.map(
        (item) => item.caisseId
      );

      if (new Set(caisseIds).size !== caisseIds.length) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Une même caisse ne peut financer le prêt qu'une seule fois.",
          },
          { status: 400 }
        );
      }

      const totalFinance = normalizedFinancements.reduce(
        (total, item) => total + item.montant,
        0
      );

      if (Math.abs(totalFinance - montantAccorde) > 0.001) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Le total des financements (${formatMoney(
                totalFinance
              )} FCFA) doit être exactement égal au montant accordé (${formatMoney(
                montantAccorde
              )} FCFA).`,
          },
          { status: 400 }
        );
      }

      const { data: caisses, error: caissesError } =
        await supabaseAdmin
          .from("v_caisses_soldes")
          .select(
            "caisse_id, caisse_libelle, actif, rubrique_id, rubrique_nom, solde_disponible"
          )
          .in("caisse_id", caisseIds);

      if (caissesError) {
        throw caissesError;
      }

      if ((caisses ?? []).length !== caisseIds.length) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Une ou plusieurs caisses sélectionnées sont introuvables.",
          },
          { status: 400 }
        );
      }

      financementsValides = normalizedFinancements.map(
        (financement) => {
          const caisse = (caisses ?? []).find(
            (row: any) =>
              String(row.caisse_id) === financement.caisseId
          );

          if (!caisse) {
            throw new Error(
              "Une caisse sélectionnée est introuvable."
            );
          }

          if (caisse.actif !== true) {
            throw new Error(
              `La caisse ${caisse.caisse_libelle ?? ""} est inactive.`
            );
          }

          if (
            String(caisse.rubrique_id) !== financement.rubriqueId
          ) {
            throw new Error(
              `La caisse ${
                caisse.caisse_libelle ?? ""
              } ne correspond pas à la rubrique sélectionnée.`
            );
          }

          const soldeDisponible = Number(
            caisse.solde_disponible || 0
          );

          if (financement.montant > soldeDisponible) {
            throw new Error(
              `Le montant demandé dans la caisse ${
                caisse.caisse_libelle ?? caisse.rubrique_nom
              } (${formatMoney(
                financement.montant
              )} FCFA) dépasse le solde disponible (${formatMoney(
                soldeDisponible
              )} FCFA).`
            );
          }

          return {
            rubriqueId: financement.rubriqueId,
            caisseId: financement.caisseId,
            montant: financement.montant,
            rubriqueNom:
              String(caisse.rubrique_nom ?? "").trim() ||
              "Rubrique",
            caisseLibelle:
              String(caisse.caisse_libelle ?? "").trim() ||
              "Caisse",
            soldeDisponible,
          };
        }
      );
    }

    const { data: utilisateurInterne, error: utilisateurError } =
      await supabaseAdmin
        .from("utilisateurs")
        .select("id")
        .eq("auth_user_id", context.authUserId)
        .maybeSingle();

    if (utilisateurError) {
      throw utilisateurError;
    }

    const utilisateurId = utilisateurInterne?.id ?? null;

    const now = new Date().toISOString();

    /*
     * ========================================================
     * APPROBATION
     * ========================================================
     */
    if (decision === "APPROUVEE") {
      /*
       * 1. Décaissements et ventilation des caisses
       */
      for (const financement of financementsValides) {
        const { data: decaissement, error: decaissementError } =
          await supabaseAdmin
            .from("decaissements")
            .insert({
              caisse_id: financement.caisseId,
              rubrique_id: financement.rubriqueId,
              membre_id: demande.membre_id ?? null,
              montant: financement.montant,
              motif:
                `Décaissement prêt approuvé - ` +
                `demande ${
                  demande.reference_unique ?? demande.id
                } - ${financement.rubriqueNom}`,
              date_decaissement: now,
              created_by: context.authUserId,
            })
            .select("id")
            .single();

        if (decaissementError || !decaissement?.id) {
          throw new Error(
            decaissementError?.message ||
              "Échec de création d'un décaissement."
          );
        }

        createdDecaissementIds.push(decaissement.id);

        const { data: pretFinancement, error: financementError } =
          await supabaseAdmin
            .from("pret_financements")
            .insert({
              demande_pret_id: demandeId,
              rubrique_id: financement.rubriqueId,
              caisse_id: financement.caisseId,
              montant_finance: financement.montant,
              decaissement_id: decaissement.id,
              created_by: utilisateurId,
            })
            .select("id")
            .single();

        if (financementError || !pretFinancement?.id) {
          throw new Error(
            financementError?.message ||
              "Échec d'enregistrement de la ventilation du prêt."
          );
        }

        createdFinancementIds.push(pretFinancement.id);
      }

      /*
       * 2. Création du prêt réel
       *
       * 0.01 = 1 % par mois.
       */
      const { data: pretCree, error: pretError } =
        await supabaseAdmin
          .from("prets")
          .insert({
            demande_pret_id: demandeId,
            membre_id: demande.membre_id,
            date_octroi: now,
            montant_accorde: montantAccorde,
            taux_interet: TAUX_INTERET_MENSUEL,
            mode_interet: "TAUX_CAPITALISE_MENSUEL",
            capitalisation_interets: "MENSUELLE",
            solde_restant: montantAccorde,
            statut_pret: "ACTIF",
            valide_par_user_id: utilisateurId,
            commentaire: commentaireDecision,
          })
          .select("id")
          .single();

      if (pretError || !pretCree?.id) {
        throw new Error(
          pretError?.message ||
            "Échec de création du prêt actif."
        );
      }

      createdPretId = pretCree.id;

      /*
       * 2 bis. Rattachement définitif des financements au prêt.
       *
       * demande_pret_id conserve la traçabilité du workflow,
       * mais pret_id devient la référence comptable principale.
       */
      const { error: rattachementFinancementsError } =
        await supabaseAdmin
          .from("pret_financements")
          .update({
            pret_id: createdPretId,
          })
          .in("id", createdFinancementIds);

      if (rattachementFinancementsError) {
        throw new Error(
          rattachementFinancementsError.message ||
            "Échec du rattachement des financements au prêt."
        );
      }

      /*
       * Le trigger trg_initialiser_interets_pret est exécuté
       * automatiquement à l'insertion.
       *
       * Pour un nouveau prêt, aucun intérêt n'est créé avant
       * la première échéance mensuelle.
       */

      /*
       * 3. Immobilisation du patrimoine des membres
       *    pour Épargne / Investissement uniquement.
       *
       * La fonction crée également les clés de répartition
       * des intérêts par rubrique.
       */
      const { error: immobilisationError } =
        await supabaseAdmin.rpc(
          "fn_immobiliser_patrimoine_pret",
          {
            p_demande_pret_id: demandeId,
          }
        );

      if (immobilisationError) {
        throw new Error(
          immobilisationError.message ||
            "Échec de l'immobilisation du patrimoine lié au prêt."
        );
      }
    }

    /*
     * ========================================================
     * DOCUMENT OFFICIEL
     * ========================================================
     */
    const rebuilt = rebuildDocument({
      demande,
      decision: decision as "APPROUVEE" | "REFUSEE",
      montantAccorde:
        decision === "APPROUVEE" ? montantAccorde : null,
      motifReduction:
        decision === "APPROUVEE" ? motifReduction : null,
      commentaireDecision,
      financements: financementsValides,
      dateTraitement: now,
    });

    const existingDocumentJson =
      demande.document_json &&
      typeof demande.document_json === "object"
        ? demande.document_json
        : {};

    const updatedDocumentJson = {
      ...existingDocumentJson,

      decision,

      montant_demande: montantDemande,

      montant_accorde:
        decision === "APPROUVEE" ? montantAccorde : null,

      taux_interet_mensuel:
        decision === "APPROUVEE"
          ? TAUX_INTERET_MENSUEL
          : null,

      taux_interet_libelle:
        decision === "APPROUVEE"
          ? TAUX_INTERET_LIBELLE
          : null,

      mode_interet:
        decision === "APPROUVEE"
          ? "TAUX_CAPITALISE_MENSUEL"
          : null,

      capitalisation_interets:
        decision === "APPROUVEE"
          ? "MENSUELLE"
          : null,

      pret_id:
        decision === "APPROUVEE"
          ? createdPretId
          : null,

      motif_reduction:
        decision === "APPROUVEE"
          ? motifReduction
          : null,

      commentaire_decision: commentaireDecision,

      date_traitement: now,

      financements: financementsValides.map((item) => ({
        rubrique_id: item.rubriqueId,
        rubrique_nom: item.rubriqueNom,
        caisse_id: item.caisseId,
        caisse_libelle: item.caisseLibelle,
        montant_finance: item.montant,
      })),

      signature_decision_hash: rebuilt.hash,
    };

    /*
     * ========================================================
     * MISE À JOUR DE LA DEMANDE
     * ========================================================
     */
    const {
      data: demandeMaj,
      error: updateError,
    } = await supabaseAdmin
      .from("demandes_prets")
      .update({
        statut: decision,

        montant_accorde:
          decision === "APPROUVEE"
            ? montantAccorde
            : null,

        traite_par: context.authUserId,

        date_traitement: now,

        commentaire_decision:
          decision === "APPROUVEE" && motifReduction
            ? `Motif de réduction : ${motifReduction}${
                commentaireDecision
                  ? `\nCommentaire : ${commentaireDecision}`
                  : ""
              }`
            : commentaireDecision,

        signature_hash: rebuilt.hash,

        document_texte: rebuilt.text,

        document_json: updatedDocumentJson,
      })
      .eq("id", demandeId)
      .eq("statut", "EN_ATTENTE")
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    /*
     * Protection contre une demande modifiée entre
     * la lecture initiale et la validation.
     */
    if (!demandeMaj?.id) {
      throw new Error(
        "La demande n'a pas pu être finalisée. Elle a peut-être déjà été traitée."
      );
    }

    /*
     * ========================================================
     * NOTIFICATION
     * ========================================================
     */
    const notificationTitre =
      decision === "APPROUVEE"
        ? "Demande de prêt approuvée"
        : "Demande de prêt refusée";

    const notificationMessage =
      decision === "APPROUVEE"
        ? `Votre demande de prêt de ${formatMoney(
            montantDemande
          )} FCFA a été approuvée. Montant accordé : ${formatMoney(
            montantAccorde ?? 0
          )} FCFA. Taux : ${TAUX_INTERET_LIBELLE}.`
        : `Votre demande de prêt de ${formatMoney(
            montantDemande
          )} FCFA a été refusée.${
            commentaireDecision
              ? ` Motif : ${commentaireDecision}`
              : ""
          }`;

    const notificationResult = await supabaseAdmin.rpc(
      "fn_notifications_creer",
      {
        p_membre_id: demande.membre_id,

        p_type_notification:
          decision === "APPROUVEE"
            ? "DEMANDE_PRET_APPROUVEE"
            : "DEMANDE_PRET_REFUSEE",

        p_titre: notificationTitre,

        p_message: notificationMessage,

        p_url_cible: `/prets/demande/${demandeId}`,

        p_donnees: {
          demande_id: demandeId,
          pret_id:
            decision === "APPROUVEE"
              ? createdPretId
              : null,
          decision,
          montant_demande: montantDemande,
          montant_accorde:
            decision === "APPROUVEE"
              ? montantAccorde
              : null,
          taux_interet_mensuel:
            decision === "APPROUVEE"
              ? TAUX_INTERET_MENSUEL
              : null,
        },
      }
    );

    const notificationWarning = notificationResult.error
      ? notificationResult.error.message
      : null;

    /*
     * ========================================================
     * RÉPONSE
     * ========================================================
     */
    return NextResponse.json({
      success: true,

      message:
        decision === "APPROUVEE"
          ? `Demande approuvée. Prêt créé avec succès. ${financementsValides.length} décaissement(s) créé(s) pour un montant total de ${formatMoney(
              montantAccorde ?? 0
            )} FCFA.`
          : "Demande de prêt refusée.",

      data: {
        demande_id: demandeId,

        pret_id:
          decision === "APPROUVEE"
            ? createdPretId
            : null,

        decision,

        montant_demande: montantDemande,

        montant_accorde:
          decision === "APPROUVEE"
            ? montantAccorde
            : null,

        taux_interet_mensuel:
          decision === "APPROUVEE"
            ? TAUX_INTERET_MENSUEL
            : null,

        taux_interet_libelle:
          decision === "APPROUVEE"
            ? TAUX_INTERET_LIBELLE
            : null,

        financements: financementsValides,

        decaissements_crees:
          createdDecaissementIds.length,

        notification_warning:
          notificationWarning,
      },
    });
  } catch (error: any) {
    if (
      supabaseAdmin &&
      demandeIdForRollback
    ) {
      await rollbackFinancialOperations({
        supabaseAdmin,
        demandeId: demandeIdForRollback,
        pretId: createdPretId,
        financementIds: createdFinancementIds,
        decaissementIds: createdDecaissementIds,
      });
    }

    console.error(
      "Erreur traitement multi-caisses du prêt :",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur lors du traitement de la demande de prêt.",
      },
      { status: 500 }
    );
  }
}

