// ============================================================================
// MOTEUR D'E-MAIL MARKETING (partagé admin ↔ serveur)
// ----------------------------------------------------------------------------
// Le MÊME code produit l'aperçu dans l'éditeur et l'e-mail réellement envoyé :
// l'aperçu est donc fidèle (mêmes variables, mêmes liens, même HTML).
// HTML de type « e-mail » : tables, styles inline, aucune dépendance JS.
// ============================================================================

export type MarketingVariableKey =
  | "prenom"
  | "nom"
  | "email"
  | "nom_entreprise"
  | "type_abonnement"
  | "lien_parrainage"
  | "lien_espace_personnel"
  | "date_expiration";

export type MarketingVariables = Partial<Record<MarketingVariableKey, string>>;

export const MARKETING_VARIABLES: { key: MarketingVariableKey; label: string }[] = [
  { key: "prenom", label: "Prénom" },
  { key: "nom", label: "Nom" },
  { key: "email", label: "E-mail" },
  { key: "nom_entreprise", label: "Nom de l'entreprise" },
  { key: "type_abonnement", label: "Type d'abonnement" },
  { key: "lien_parrainage", label: "Lien de parrainage" },
  { key: "lien_espace_personnel", label: "Lien de l'espace personnel" },
  { key: "date_expiration", label: "Date d'expiration" },
];

/** Valeurs de démonstration pour l'aperçu administrateur. */
export const SAMPLE_MARKETING_VARIABLES: MarketingVariables = {
  prenom: "Amine",
  nom: "Ben Salah",
  email: "amine@exemple.tn",
  nom_entreprise: "Bâti Pro SARL",
  type_abonnement: "Client Pro",
  lien_parrainage: "https://batibuild.app/dashboard",
  lien_espace_personnel: "https://batibuild.app/dashboard",
  date_expiration: "31/12/2026",
};

export type MarketingEmailContent = {
  subject: string;
  intro: string;
  body: string;
  bannerUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  conditions?: string;
  validUntil?: string;
  signature?: string;
  feedbackEnabled?: boolean;
  siteUrl: string;
  siteName?: string;
  logoUrl?: string;
  /** URL complète de la page d'avis (avec campagne + jeton). */
  feedbackUrl?: string;
  /** URL de désinscription (absente dans l'aperçu). */
  unsubscribeUrl?: string;
  /** Pixel d'ouverture (absent dans l'aperçu). */
  trackingPixelUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Normalise les espaces laissés par une variable vide :
 * « Bonjour {{prenom}}, » avec un prénom absent donne « Bonjour, ».
 */
function tidyWhitespace(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
}

/** Remplace {{prenom}}, {{ prenom }}… dans un texte (valeurs échappées HTML). */
export function applyMarketingVariables(
  input: string | undefined,
  vars: MarketingVariables,
  options: { escape?: boolean } = {},
): string {
  if (!input) return "";
  const escape = options.escape !== false;
  const replaced = input.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (match, rawKey: string) => {
      const key = rawKey.trim().toLowerCase() as MarketingVariableKey;
      if (!(key in SAMPLE_MARKETING_VARIABLES)) return match;
      const value = (vars[key] ?? "").trim();
      return escape ? escapeHtml(value) : value;
    },
  );
  return tidyWhitespace(replaced);
}

/** Résout une destination : chemin interne, URL absolue http(s), sinon accueil. */
export function safeMarketingUrl(url: string | undefined, siteUrl: string): string {
  const raw = (url || "").trim();
  if (!raw) return siteUrl;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${siteUrl.replace(/\/$/, "")}${raw}`;
  return siteUrl;
}

/** Texte → paragraphes et listes à puces HTML (contenu administrateur fiable). */
function renderRichText(text: string): string {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const isList = lines.length > 0 && lines.every((l) => /^[-•]\s+/.test(l));
      const isOrdered =
        lines.length > 0 && lines.every((l) => /^\d+[.)]\s+/.test(l));

      if (isList) {
        const items = lines
          .map((l) => `<li style="margin:0 0 8px;">${l.replace(/^[-•]\s+/, "")}</li>`)
          .join("");
        return `<ul style="margin:0 0 18px;padding-left:20px;color:#4b5563;font-size:15px;line-height:1.65;">${items}</ul>`;
      }
      if (isOrdered) {
        const items = lines
          .map((l) => `<li style="margin:0 0 8px;">${l.replace(/^\d+[.)]\s+/, "")}</li>`)
          .join("");
        return `<ol style="margin:0 0 18px;padding-left:20px;color:#4b5563;font-size:15px;line-height:1.65;">${items}</ol>`;
      }
      const html = lines.join("<br>");
      return `<p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.65;">${html}</p>`;
    })
    .join("");
}

function buildStars(feedbackUrl: string): string {
  const star = "&#9733;";
  return [1, 2, 3, 4, 5]
    .map((note) => {
      const href = `${feedbackUrl}${feedbackUrl.includes("?") ? "&" : "?"}note=${note}`;
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" style="text-decoration:none;font-size:30px;line-height:1;color:#f59e0b;padding:0 3px;" aria-label="${note} étoile${note > 1 ? "s" : ""}">${star}</a>`;
    })
    .join("");
}

/**
 * Construit l'e-mail marketing complet (objet + HTML + version texte).
 * `vars` est fourni par le serveur à l'envoi et par l'éditeur pour l'aperçu.
 */
export function buildMarketingEmail(
  content: MarketingEmailContent,
  vars: MarketingVariables,
): { subject: string; html: string; text: string } {
  const siteUrl = (content.siteUrl || "https://batibuild.app").replace(/\/$/, "");
  const siteName = content.siteName || "batibuild";
  const primary = "#0f766e";
  const accent = "#f59e0b";

  const subject = applyMarketingVariables(content.subject, vars, { escape: false });
  const intro = applyMarketingVariables(content.intro, vars);
  const body = applyMarketingVariables(content.body, vars);
  const signature = applyMarketingVariables(content.signature, vars);
  const conditions = applyMarketingVariables(content.conditions, vars);
  const validUntil = applyMarketingVariables(content.validUntil, vars);
  const ctaLabel = applyMarketingVariables(content.ctaLabel, vars, { escape: false }).trim();
  const ctaUrl = safeMarketingUrl(content.ctaUrl, siteUrl);
  const bannerUrl = content.bannerUrl ? safeMarketingUrl(content.bannerUrl, siteUrl) : "";

  const preheader = (intro.split("\n").find((l) => l.trim()) || "").slice(0, 120);

  const feedbackBlock =
    content.feedbackEnabled && content.feedbackUrl
      ? `<div style="margin:24px 0 8px;padding:18px;border:1px solid #e5e7eb;border-radius:12px;text-align:center;background:#fffbeb;">
          <p style="margin:0 0 10px;color:#374151;font-size:14px;font-weight:600;">Comment évaluez-vous votre expérience ?</p>
          <div>${buildStars(content.feedbackUrl)}</div>
          <p style="margin:10px 0 0;color:#6b7280;font-size:12px;">Cliquez sur une étoile pour donner votre avis.</p>
        </div>`
      : "";

  const ctaBlock = ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
        <tr>
          <td align="center" bgcolor="${primary}" style="border-radius:10px;">
            <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener"
               style="display:inline-block;padding:14px 26px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">
              ${ctaLabel}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const conditionsBlock = conditions || validUntil
    ? `<div style="margin:20px 0 0;padding:14px 16px;background:#f9fafb;border-left:3px solid ${accent};border-radius:8px;">
        ${conditions ? `<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">${conditions}</p>` : ""}
        ${validUntil ? `<p style="margin:${conditions ? "6px" : "0"} 0 0;color:#6b7280;font-size:12px;">Offre valable jusqu'au ${validUntil}.</p>` : ""}
      </div>`
    : "";

  const unsubscribe = content.unsubscribeUrl
    ? `<a href="${escapeHtml(content.unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;">Se désinscrire des offres</a>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:linear-gradient(135deg,${primary},#0ea5e9);padding:22px 28px;">
              ${content.logoUrl
                ? `<img src="${escapeHtml(content.logoUrl)}" alt="${escapeHtml(siteName)}" height="32" style="display:block;border:0;max-height:32px;">`
                : `<span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">${escapeHtml(siteName)}</span>`}
            </td>
          </tr>
          ${bannerUrl
            ? `<tr><td style="padding:0;"><img src="${escapeHtml(bannerUrl)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>`
            : ""}
          <tr>
            <td style="padding:28px;">
              ${intro ? renderRichText(intro) : ""}
              ${body ? renderRichText(body) : ""}
              ${feedbackBlock}
              ${ctaBlock}
              ${conditionsBlock}
              ${signature ? `<p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">${signature}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:16px 28px;border-top:1px solid #eef0f3;color:#9ca3af;font-size:11px;line-height:1.6;">
              Vous recevez cet e-mail car vous avez un compte ${escapeHtml(siteName)}.
              ${unsubscribe}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${content.trackingPixelUrl ? `<img src="${escapeHtml(content.trackingPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;">` : ""}
</body>
</html>`;

  const textParts = [
    intro,
    body,
    content.feedbackEnabled && content.feedbackUrl ? `Donnez votre avis : ${content.feedbackUrl}` : "",
    ctaLabel ? `${ctaLabel} : ${ctaUrl}` : "",
    conditions,
    validUntil ? `Offre valable jusqu'au ${validUntil}.` : "",
    signature,
    content.unsubscribeUrl ? `Se désinscrire des offres : ${content.unsubscribeUrl}` : "",
  ].filter(Boolean);

  const text = [
    subject,
    "",
    ...textParts,
    "",
    `— ${siteName}`,
  ].join("\n");

  return { subject, html, text };
}
