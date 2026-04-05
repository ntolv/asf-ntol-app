export async function sendPretOtpEmail(args: {
  to: string;
  code: string;
  memberName: string;
  montant: number;
  motif: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PRET_OTP_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquant.");
  }

  if (!from) {
    throw new Error("PRET_OTP_FROM_EMAIL manquant.");
  }

  const subject = "ASF-NTOL - Code OTP de confirmation de demande de prêt";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>Confirmation de demande de prêt</h2>
      <p>Bonjour ${args.memberName || "membre"},</p>
      <p>Voici votre code OTP de confirmation pour finaliser votre demande de prêt :</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:6px;padding:16px 0;color:#047857">
        ${args.code}
      </div>
      <p><strong>Montant demandé :</strong> ${new Intl.NumberFormat("fr-FR").format(Number(args.montant || 0))} FCFA</p>
      <p><strong>Motif :</strong> ${args.motif}</p>
      <p>Ce code expire dans 10 minutes.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
      <p>Association Famille NTOL (ASF-NTOL)</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject,
      html,
    }),
  });

  const rawText = await response.text();
  let json: any = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(
      json?.message ||
        json?.error ||
        "Erreur lors de l'envoi du mail OTP."
    );
  }

  return json;
}
