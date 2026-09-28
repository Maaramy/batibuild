"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

import { buildInvoicePdfAttachment, type InvoicePdfAttachment } from "./invoiceAttachment";
import nodemailer from "nodemailer";
import crypto from "node:crypto";
import dns from "node:dns";
import { vly } from "./vlyIntegrations";

// ============================================================================
// Node-only email actions (SMTP via nodemailer, VLY API fallback)
// ============================================================================
//
// Objectif délivrabilité : les e-mails transactionnels doivent arriver dans la
// boîte de réception, pas dans le courrier indésirable. Tous les envois SMTP
// passent par `createDeliverableTransporter` + `buildDeliverableMail` qui
// appliquent systématiquement :
//   - Message-ID au domaine de l'expéditeur (au lieu de l'hôte du serveur)
//   - En-têtes anti-spam : Auto-Submitted, X-Auto-Response-Suppress,
//     Importance/Priority normales, X-Mailer identifiable
//   - Version texte brute (ratio texte/HTML) dérivée du HTML
//   - STARTTLS obligatoire sur 587 (requireTLS) et vérification des
//     certificats activée par défaut (SMTP_TLS_VERIFY=false pour la désactiver)
//   - Signature DKIM optionnelle via SMTP_DKIM_DOMAIN / SMTP_DKIM_SELECTOR /
//     SMTP_DKIM_PRIVATE_KEY

type SmtpSecurity = "ssl" | "tls" | "none";

type SmtpSettings = {
  host: string;
  port: number;
  security: SmtpSecurity;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
  replyTo?: string;
  source: "db" | "env";
};

type SmtpTransportOpts = {
  host: string;
  port: number;
  security: SmtpSecurity;
  user?: string;
  pass?: string;
};

// Domaines grand public : envoyer depuis un compte gratuit de ce type est un
// signal de spam quasi certain (SPF/DKIM souvent absents, réputation partagée).
const FREE_MAIL_PROVIDERS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.fr",
  "live.com",
  "live.fr",
  "msn.com",
  "yahoo.com",
  "yahoo.fr",
  "ymail.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "free.fr",
  "orange.fr",
  "wanadoo.fr",
  "laposte.net",
  "sfr.fr",
  "voila.fr",
  "gmx.com",
  "gmx.fr",
  "mail.ru",
  "yandex.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
];

function isFreeMailDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  return (
    FREE_MAIL_PROVIDERS.includes(d) ||
    FREE_MAIL_PROVIDERS.some((p) => d.endsWith("." + p))
  );
}

/**
 * Crée un transporter nodemailer optimisé pour la délivrabilité :
 *  - `secure: true` sur 465 (SSL direct), `requireTLS: true` sur 587 (STARTTLS
 *    obligatoire — ne jamais envoyer en clair, sinon les relais nous
 *    dégradent), `secure: false` sans TLS forcé sur 25/none.
 *  - Vérification des certificats TLS activée par défaut ; SMTP_TLS_VERIFY=false
 *    uniquement pour les serveurs auto-signés (usage interne).
 *  - Durcissement : pas d'accès fichier/URL via les pièces jointes.
 *  - Timeouts raisonnables pour ne pas bloquer l'action.
 */
function createDeliverableTransporter(opts: SmtpTransportOpts) {
  const secure = opts.security === "ssl";
  const verifyTls = (process.env.SMTP_TLS_VERIFY || "").toLowerCase() !== "false";
  const tls: Record<string, unknown> = {
    rejectUnauthorized: verifyTls,
    minVersion: "TLSv1.2",
  };
  return nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure,
    requireTLS: opts.security === "tls",
    auth: opts.user
      ? { user: opts.user, pass: opts.pass || "" }
      : undefined,
    tls,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    // Durcissement : interdit au serveur SMTP de nous faire lire/envoyer des
    // fichiers locaux ou des URL internes via des pièces jointes malveillantes.
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

function senderDomainOf(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Message-ID au domaine de l'expéditeur (réputation + cohérence DMARC). */
function makeMessageId(senderEmail: string): string {
  const domain = senderDomainOf(senderEmail) || "batibuild.app";
  return `<${crypto.randomUUID()}@${domain}>`;
}

/** Version texte brute d'un HTML simple (ratio texte/HTML pour les filtres). */
function htmlToText(html: string): string {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Récupère la signature DKIM optionnelle depuis les variables
 * d'environnement (SMTP_DKIM_DOMAIN, SMTP_DKIM_SELECTOR, SMTP_DKIM_PRIVATE_KEY).
 * Retourne null si non configurée (l'envoi reste valide, mais la délivrabilité
 * sera meilleure avec DKIM — voir adminCheckEmailDeliverability).
 */
function dkimConfigFor(senderEmail: string): nodemailer.SendMailOptions["dkim"] | null {
  const domain = (process.env.SMTP_DKIM_DOMAIN || "").trim();
  const privateKey = (process.env.SMTP_DKIM_PRIVATE_KEY || "").trim();
  if (!domain || !privateKey) return null;
  const selector = (process.env.SMTP_DKIM_SELECTOR || "default").trim();
  // Normalise la clé si elle a été collée avec des \n littéraux.
  const key = privateKey.replace(/\\n/g, "\n");
  return {
    domainName: domain,
    keySelector: selector,
    privateKey: key,
    cacheDir: false,
  };
}

type DeliverableMailInput = {
  to: string;
  subject: string;
  html: string;
  from: string;
  replyTo?: string;
  cc?: string[];
  text?: string;
  kind: "auth" | "notification" | "test";
  /** Pièces jointes (facture PDF des e-mails d'abonnement). */
  attachments?: { filename: string; content: Buffer }[];
};

/**
 * Construit les options sendMail avec tous les en-têtes de délivrabilité :
 * Message-ID au domaine de l'expéditeur, Auto-Submitted (transactionnel),
 * suppression des réponses automatiques, priorité normale (jamais urgente),
 * X-Mailer identifiable, version texte de secours et signature DKIM.
 */
function buildDeliverableMail(input: DeliverableMailInput) {
  const senderEmail = /<([^>]+)>$/.exec(input.from)?.[1] || input.from;
  const text = input.text || htmlToText(input.html);
  const headers: Record<string, string | string[]> = {
    // Transactionnel = généré par un système, pas par une personne.
    "Auto-Submitted": "auto-generated",
    // Désactive les réponses automatiques (absence, vacances) sur ces messages.
    "X-Auto-Response-Suppress": "All",
    // Jamais de priorité haute : c'est un signal de spam récurrent.
    "Priority": "normal",
    "Importance": "normal",
    "X-Mailer": "batibuild-app/2.0 (SMTP)",
    "X-Entity-Ref-ID": crypto.randomUUID(),
  };
  const dkim = dkimConfigFor(senderEmail);
  return {
    from: input.from,
    to: input.to,
    replyTo: input.replyTo,
    cc: input.cc && input.cc.length ? input.cc : undefined,
    subject: input.subject,
    html: input.html,
    text,
    messageId: makeMessageId(senderEmail),
    headers,
    attachments:
      input.attachments && input.attachments.length
        ? input.attachments.map((file) => ({
            filename: file.filename,
            content: file.content,
            contentType: "application/pdf",
          }))
        : undefined,
    ...(dkim ? { dkim } : {}),
  };
}

/**
 * Construit la pièce jointe PDF d'une facture pour un envoi d'e-mail.
 * Best-effort assumé : si le document ne peut pas être produit, l'e-mail part
 * SANS pièce jointe (le client garde l'accès à sa facture dans la plateforme)
 * plutôt que d'échouer — un e-mail d'activation ne doit jamais être perdu.
 */
async function invoiceAttachmentFor(
  ctx: ActionCtx,
  invoiceId: Id<"invoices"> | undefined,
): Promise<{ attachment?: InvoicePdfAttachment; warning?: string }> {
  if (!invoiceId) return {};

  try {
    const invoice = await ctx.runQuery(internal.invoices.getInvoicePdfData, { invoiceId });
    if (!invoice) return { warning: "Facture introuvable" };

    const attachment = buildInvoicePdfAttachment(invoice);

    // Copie archivée dans l'espace de stockage Convex (facultative : une copie
    // existante n'est jamais remplacée, et un échec ne bloque pas l'envoi).
    try {
      const storageId = await ctx.storage.store(
        new Blob([new Uint8Array(attachment.content)], { type: "application/pdf" }),
      );
      await ctx.runMutation(internal.invoices.saveInvoicePdf, { invoiceId, storageId });
    } catch (err: any) {
      console.warn(
        `[emailSender] copie PDF non archivée pour ${invoice.invoiceNumber} : ${err?.message || err}`,
      );
    }

    return { attachment };
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error(`[emailSender] facture PDF non jointe : ${message}`);
    return { warning: message };
  }
}

/**
 * Perform the actual network send (SMTP or VLY), then record the result.
 * (Used by the automatic notification pipeline.)
 */
export const sendEmailAction = internalAction({
  args: {
    historyId: v.id("emailHistory"),
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    senderName: v.string(),
    senderEmail: v.string(),
    replyTo: v.optional(v.string()),
    cc: v.optional(v.array(v.string())),
    smtpHost: v.optional(v.string()),
    smtpPort: v.optional(v.number()),
    smtpSecurity: v.optional(v.union(v.literal("ssl"), v.literal("tls"), v.literal("none"))),
    smtpUser: v.optional(v.string()),
    smtpPassword: v.optional(v.string()),
    /** Facture dont le PDF doit être joint (activation / paiement confirmé). */
    invoiceId: v.optional(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    let ok = false;
    let error: string | undefined;

    // Facture en pièce jointe (best-effort : jamais bloquant pour l'envoi).
    const { attachment, warning } = await invoiceAttachmentFor(ctx, args.invoiceId);
    if (warning) {
      console.warn(`[emailSender] pièce jointe indisponible : ${warning}`);
    }

    if (args.smtpHost) {
      try {
        const transporter = createDeliverableTransporter({
          host: args.smtpHost,
          port: args.smtpPort ?? (args.smtpSecurity === "ssl" ? 465 : 587),
          security: args.smtpSecurity ?? "tls",
          user: args.smtpUser || undefined,
          pass: args.smtpPassword || undefined,
        });
        await transporter.sendMail(
          buildDeliverableMail({
            to: args.to,
            subject: args.subject,
            html: args.html,
            from: `"${args.senderName || "batibuild"}" <${args.senderEmail}>`,
            replyTo: args.replyTo || undefined,
            cc: args.cc,
            kind: "notification",
            attachments: attachment ? [{ filename: attachment.filename, content: attachment.content }] : undefined,
          }),
        );
        ok = true;
      } catch (err: any) {
        error = classifySmtpError(err, {
          host: args.smtpHost,
          port: args.smtpPort ?? (args.smtpSecurity === "ssl" ? 465 : 587),
          user: args.smtpUser || "",
          pass: args.smtpPassword || "",
        }).message;
      }
    } else {
      try {
        const res = await vly.email.send({
          to: args.to,
          from: args.senderEmail,
          replyTo: args.replyTo || undefined,
          cc: args.cc && args.cc.length ? args.cc : undefined,
          subject: args.subject,
          html: args.html,
          // Repli VLY : l'API n'accepte que du texte, le PDF part en base64.
          attachments: attachment
            ? [{ filename: attachment.filename, content: attachment.base64, encoding: "base64" }]
            : undefined,
        });
        if (res.success && res.data?.status !== "failed") {
          ok = true;
        } else {
          error = `VLY : ${res.data?.error || res.error || "échec d'envoi"}`;
        }
      } catch (err: any) {
        error = `VLY : ${err?.message || "erreur inconnue"}`;
      }
    }

    await ctx.runMutation(internal.emailNotifications.updateEmailStatus, {
      historyId: args.historyId,
      ok,
      error,
    });

    return { ok, error };
  },
});

/**
 * Envoi du code de vérification e-mail (OTP) — SMTP administrateur UNIQUEMENT.
 *
 * Utilisé par le provider email-otp (auth) pour l'inscription, la vérification
 * d'adresse e-mail, la connexion par code et le mot de passe oublié.
 *
 * Règles :
 *  - La configuration est lue exclusivement depuis les variables
 *    d'environnement Convex SMTP_* (SMTP_HOST, SMTP_PORT, SMTP_USER,
 *    SMTP_PASSWORD, SMTP_FROM, SMTP_FROM_NAME, SMTP_SECURE). Aucun recours au
 *    service d'e-mail Freebuff ni à un autre transport : si SMTP n'est pas
 *    configuré, l'envoi échoue proprement avec un message explicite.
 *  - From et Reply-To = l'adresse administrateur SMTP (SMTP_FROM).
 *  - To = l'adresse e-mail de l'utilisateur (jamais exposée côté client ici).
 *  - Le mot de passe SMTP ne figure jamais dans les erreurs ni les logs
 *    (sanitisation systématique).
 *  - Délivrabilité : en-têtes transactionnels, Message-ID au domaine de
 *    l'expéditeur, version texte, DKIM si configuré.
 */
export const sendOtpEmail = internalAction({
  args: {
    to: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, args) => {
    const envHost = (process.env.SMTP_HOST || "").trim();
    if (!envHost) {
      return {
        ok: false,
        code: "SMTP_NOT_CONFIGURED",
        message:
          "L'envoi du code de vérification nécessite une configuration SMTP administrateur. Ajoutez les variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_FROM_NAME et SMTP_SECURE dans les secrets du projet, puis réessayez.",
      };
    }

    // Réutilise la résolution existante (variables SMTP_* uniquement — la
    // configuration en base est réservée aux administrateurs et indisponible
    // avant authentification).
    const { settings, error } = resolveSmtpSettings(null);
    if (error || !settings) {
      return {
        ok: false,
        code: "SMTP_CONFIG_INVALID",
        message:
          error ||
          "Configuration SMTP incomplète. Vérifiez les variables d'environnement SMTP_* du projet.",
      };
    }

    const transporter = createDeliverableTransporter({
      host: settings.host,
      port: settings.port,
      security: settings.security,
      user: settings.user,
      pass: settings.pass,
    });

    const from = `"${settings.senderName}" <${settings.senderEmail}>`;
    const replyTo = settings.replyTo || settings.senderEmail;
    const subject = `Votre code de vérification — ${settings.senderName}`;

    try {
      await transporter.sendMail(
        buildDeliverableMail({
          to: args.to,
          subject,
          html: buildOtpEmailHtml(settings.senderName, args.code),
          text:
            `Votre code de vérification ${settings.senderName} est : ${args.code}\n\n` +
            `Ce code expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
          from,
          replyTo,
          kind: "auth",
        }),
      );
      return { ok: true, code: "SENT" };
    } catch (err: any) {
      const { code, message } = classifySmtpError(err, {
        host: settings.host,
        port: settings.port,
        user: settings.user,
        pass: settings.pass,
        senderEmail: settings.senderEmail,
      });
      return { ok: false, code, message };
    }
  },
});

/**
 * Corps HTML de l'e-mail de code de vérification (identité batibuild).
 * HTML simple, inline, sans JavaScript, sans image externe : les filtres
 * anti-spam apprécient le ratio texte/HTML et l'absence de tracking.
 */
function buildOtpEmailHtml(senderName: string, code: string): string {
  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>Votre code de vérification</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;">
  <!-- Pré-en-tête invisible : améliore le rendu et le score spam -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Utilisez le code ci-dessous pour confirmer votre adresse e-mail sur ${senderName}. Ce code expire dans 15 minutes.
  </div>
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#059669,#0ea5e9);padding:28px 32px;">
      <span style="font-size:20px;font-weight:800;color:#ffffff;">${senderName}</span>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">Votre code de vérification</h1>
      <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.6;">
        Bonjour,<br><br>
        Utilisez le code ci-dessous pour confirmer votre adresse e-mail :
      </p>
      <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:22px 16px;text-align:center;">
        <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#059669;font-variant-numeric:tabular-nums;">${code}</span>
      </div>
      <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
        Ce code expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
      </p>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
        Besoin d'aide ? Répondez simplement à cet e-mail : notre équipe vous répondra.
      </p>
    </div>
    <div style="background:#f9fafb;padding:18px 32px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #eef0f3;">
      © ${new Date().getFullYear()} ${senderName} — Cet e-mail vous a été envoyé automatiquement.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Résout les réglages SMTP effectifs :
 *   1. Variables d'environnement Convex (SMTP_HOST, SMTP_PORT, SMTP_USER,
 *      SMTP_PASSWORD, SMTP_FROM, SMTP_SECURE) si SMTP_HOST est définie.
 *   2. Sinon la configuration e-mail enregistrée en base (lue côté serveur,
 *      mot de passe déchiffré dans l'action — jamais sur le client).
 *
 * `warnings` (optionnel) liste les points de délivrabilité à corriger
 * (domaine d'expéditeur = domaine du compte, pas d'adresse gratuite…).
 */
function resolveSmtpSettings(dbConfig: {
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: SmtpSecurity;
  smtpUser?: string;
  smtpPassword?: string;
} | null): { settings?: SmtpSettings | null; error?: string; warnings?: string[] } {
  const envHost = (process.env.SMTP_HOST || "").trim();

  if (envHost) {
    let security: SmtpSecurity = "tls";
    const envSecurity = (process.env.SMTP_SECURE || "").toLowerCase();
    if (envSecurity === "ssl" || envSecurity === "true" || envSecurity === "465") {
      security = "ssl";
    } else if (
      envSecurity === "none" ||
      envSecurity === "false" ||
      envSecurity === "25" ||
      envSecurity === "starttls"
    ) {
      // "starttls" reste du TLS opportuniste via requireTLS ci-dessous ;
      // "none"/"false"/"25" = pas de TLS forcé.
      security = envSecurity === "starttls" ? "tls" : "none";
    }
    const envPortRaw = (process.env.SMTP_PORT || "").trim();
    const envPort = envPortRaw ? Number(envPortRaw) : security === "ssl" ? 465 : 587;
    const senderEmail = (process.env.SMTP_FROM || dbConfig?.senderEmail || "").trim();

    if (!senderEmail) {
      return {
        error:
          "Configuration SMTP incomplète : SMTP_FROM (adresse de l'expéditeur) est manquante.",
      };
    }
    if (!Number.isInteger(envPort) || envPort <= 0 || envPort > 65535) {
      return {
        error: `Configuration SMTP incomplète : SMTP_PORT « ${envPortRaw || envPort} » est invalide (attendu : 25, 465, 587, 2525…).`,
      };
    }

    const warnings = collectDeliverabilityWarnings(
      senderEmail,
      (process.env.SMTP_USER || dbConfig?.smtpUser || "").trim(),
    );

    return {
      settings: {
        host: envHost,
        port: envPort,
        security,
        user: (process.env.SMTP_USER || "").trim(),
        pass: process.env.SMTP_PASSWORD || "",
        senderName: (process.env.SMTP_FROM_NAME || dbConfig?.senderName || "batibuild").trim(),
        senderEmail,
        replyTo: dbConfig?.replyTo || undefined,
        source: "env",
      },
      warnings,
    };
  }

  if (!dbConfig) {
    return { error: "Aucune configuration SMTP enregistrée. Définissez-la ci-dessus puis enregistrez." };
  }

  const host = (dbConfig.smtpHost || "").trim();
  const senderEmail = (dbConfig.senderEmail || "").trim();
  const user = (dbConfig.smtpUser || "").trim();
  const pass = dbConfig.smtpPassword || "";
  const security: SmtpSecurity = dbConfig.smtpSecurity || "tls";
  const port = dbConfig.smtpPort && dbConfig.smtpPort > 0
    ? dbConfig.smtpPort
    : security === "ssl" ? 465 : 587;

  if (!host) {
    return { error: "Configuration SMTP incomplète : SMTP_HOST est manquant." };
  }
  if (!senderEmail) {
    return {
      error: "Configuration SMTP incomplète : adresse de l'expéditeur (SMTP_FROM) manquante.",
    };
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return { error: `Configuration SMTP incomplète : SMTP_PORT « ${port} » est invalide.` };
  }
  if (user && !pass) {
    return {
      error: `Configuration SMTP incomplète : SMTP_PASSWORD manquant pour l'utilisateur « ${user} ».`,
    };
  }

  return {
    settings: {
      host,
      port,
      security,
      user,
      pass,
      senderName: dbConfig.senderName || "batibuild",
      senderEmail,
      replyTo: dbConfig.replyTo || undefined,
      source: "db",
    },
    warnings: collectDeliverabilityWarnings(senderEmail, user),
  };
}

/**
 * Alerte sur les causes classiques de passage en spam liées à la configuration :
 *  - adresse d'expéditeur sur un domaine de messagerie gratuite ;
 *  - domaine du compte SMTP différent du domaine de l'expéditeur (l'alignement
 *    SPF/DMARC échoue, le serveur reçoit risque d'être traité comme spoofing).
 */
function collectDeliverabilityWarnings(senderEmail: string, smtpUser: string): string[] {
  const warnings: string[] = [];
  const fromDomain = senderDomainOf(senderEmail);
  if (fromDomain && isFreeMailDomain(fromDomain)) {
    warnings.push(
      `L'adresse de l'expéditeur « ${senderEmail} » utilise un service de messagerie grand public (${fromDomain}). ` +
        "Ces domaines sont massivement utilisés par le spam : utilisez une adresse sur le domaine de votre entreprise " +
        "(ex. contact@votredomaine.tn) avec les enregistrements DNS SPF/DKIM/DMARC.",
    );
  }
  const userDomain = smtpUser ? senderDomainOf(smtpUser) : "";
  if (fromDomain && userDomain && fromDomain !== userDomain) {
    warnings.push(
      `Le domaine du compte SMTP (${userDomain}) diffère du domaine de l'expéditeur (${fromDomain}). ` +
        "L'alignement SPF/DMARC échouera : utilisez une adresse SMTP_FROM sur le même domaine que SMTP_USER, " +
        "ou ajoutez le domaine de l'expéditeur aux enregistrements SPF autorisés par votre hébergeur.",
    );
  }
  return warnings;
}

/**
 * Transforme une erreur nodemailer/réseau en message français exploitable.
 * Ne contient jamais le mot de passe SMTP.
 */
export function classifySmtpError(
  err: any,
  cfg: { host: string; port: number; user?: string; pass?: string; senderEmail?: string },
): { code: string; message: string } {
  const raw = (err?.message || err?.code || String(err || "")).toString();
  const msg = sanitizeSmtpMessage(raw, cfg.user || "", cfg.pass || "");
  const lower = msg.toLowerCase();

  const has = (...needles: string[]) => needles.some((n) => lower.includes(n));

  let code = "SMTP_ERROR";
  let message: string;

  if (has("enotfound", "eai_again", "getaddrinfo", "dns", "n'est pas résolu", "resolve")) {
    code = "DNS_FAILURE";
    message = `Impossible de résoudre le serveur SMTP « ${cfg.host} » (erreur DNS). Vérifiez le nom d'hôte.`;
  } else if (has("econnrefused", "refus")) {
    code = "CONNECTION_REFUSED";
    message = `Le serveur SMTP a refusé la connexion sur ${cfg.host}:${cfg.port}. Vérifiez l'adresse et le port (SSL : 465, TLS/STARTTLS : 587).`;
  } else if (has("etimedout", "timeout", "délai", "timed out", "esockettimedout")) {
    code = "TIMEOUT";
    message = `Délai dépassé lors de la connexion à ${cfg.host}:${cfg.port}. Le serveur ne répond pas (réseau ou pare-feu).`;
  } else if (has("ehostunreach", "enetunreach", "network is unreachable", "unreachable")) {
    code = "HOST_UNREACHABLE";
    message = `Le serveur SMTP ${cfg.host} est injoignable depuis le serveur. Vérifiez le réseau, le pare-feu et le nom d'hôte.`;
  } else if (has("econnreset", "epipe", "socket hang up", "connexion a été réinitialisée", "closed")) {
    code = "CONNECTION_RESET";
    message = `La connexion SMTP vers ${cfg.host}:${cfg.port} a été interrompue par le serveur. Réessayez ou changez le type de sécurité.`;
  } else if (
    has("invalid login", "535", "534", "authentication", "authentification", "5.7.8", "5.7.14", "bad credentials")
  ) {
    code = "AUTH_FAILED";
    message = "Authentification SMTP échouée. Vérifiez le nom d'utilisateur (SMTP_USER) et le mot de passe (SMTP_PASSWORD).";
  } else if (
    has("self signed", "certificate", "ssl routines", "wrong version number", "tls", "ssl", "sockettarget", "unable to verify")
  ) {
    code = "TLS_FAILURE";
    message = `Échec de la liaison TLS/SSL avec ${cfg.host}:${cfg.port}. Vérifiez le type de sécurité (SSL 465, TLS/STARTTLS 587) et les certificats du serveur.`;
  } else if (has("550", "553", "554", "sender", "expéditeur", "not allowed", "spam", "relay")) {
    code = "SENDER_REJECTED";
    message = `Le serveur SMTP a refusé l'expéditeur. Vérifiez que « ${cfg.senderEmail || cfg.host} » est un domaine autorisé sur ce serveur (anti-spam / relay).`;
  } else if (has("message failed", "recipient", "destinataire", "user unknown", "mailbox")) {
    code = "RECIPIENT_REJECTED";
    message = "Le serveur SMTP a refusé le destinataire de l'e-mail de test. Vérifiez l'adresse saisie.";
  } else {
    message = `Échec de la connexion SMTP sur ${cfg.host}:${cfg.port} — ${msg || "erreur inconnue"}`;
  }

  // Journal serveur détaillé (sans secret)
  console.error(
    `[emailSender] ${code} sur ${cfg.host}:${cfg.port} — ${msg}`,
  );
  return { code, message };
}

/** Retire toute trace du mot de passe / utilisateur d'un message d'erreur */
function sanitizeSmtpMessage(raw: string, user: string, pass: string): string {
  let out = raw;
  if (user) out = out.split(user).join("***");
  if (pass && pass.length >= 4) out = out.split(pass).join("***");
  return out;
}

function buildTestEmailHtml(senderName: string) {
  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8">
  <title>Test SMTP</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#7c3aed,#0ea5e9);padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;">${senderName} — Test SMTP</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.6;">
        <strong>Félicitations !</strong> Votre serveur SMTP est correctement configuré et opérationnel.
      </p>
      <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.6;">
        Les notifications automatiques d'abonnement (activation, renouvellement, expiration, paiements…)
        seront désormais envoyées depuis cette adresse.
      </p>
      <p style="margin:0;color:#9ca3af;font-size:12px;">Ce message a été envoyé automatiquement depuis le panneau d'administration.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Test de la configuration SMTP (administrateur uniquement).
 *
 * Design :
 *  - Le client n'envoie QUE l'adresse de test : aucun secret SMTP ne transite
 *    par le navigateur ni par les arguments de l'action.
 *  - La configuration est relue côté serveur (base de données ou variables
 *    d'environnement Convex SMTP_*).
 *  - La connexion est vérifiée (transporter.verify) AVANT l'envoi, puis
 *    l'e-mail de test est réellement envoyé.
 *  - Tout le handler est protégé : une erreur ne peut jamais remonter brute
 *    au client (« Server Error ») — elle est toujours convertie en un message
 *    structuré et exploitable.
 */
export const adminTestSmtp = action({
  args: {
    testEmail: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Vérification admin + lecture de la config SMTP enregistrée
      let dbConfig: DbConfigResult | null = null;
      try {
        dbConfig = await ctx.runQuery(internal.emailConfig.getSmtpConfigInternal);
      } catch (e: any) {
        console.error(
          "[adminTestSmtp] Impossible de lire la configuration e-mail :",
          sanitizeSmtpMessage(e?.message || String(e), "", ""),
        );
        return {
          success: false,
          code: "CONFIG_READ_ERROR",
          message:
            "Impossible de lire la configuration e-mail enregistrée. Vérifiez vos droits administrateur, puis réessayez.",
        };
      }

      if (!dbConfig) {
        return {
          success: false,
          code: "UNAUTHORIZED",
          message: "Accès administrateur requis pour tester la configuration SMTP.",
        };
      }

      // 2. Adresse de test valide
      const testEmail = (args.testEmail || "").trim();
      if (!testEmail) {
        return {
          success: false,
          code: "MISSING_TEST_EMAIL",
          message: "Indiquez l'adresse e-mail qui doit recevoir l'e-mail de test.",
        };
      }
      if (!isValidEmail(testEmail)) {
        return {
          success: false,
          code: "INVALID_TEST_EMAIL",
          message: `L'adresse de test « ${testEmail} » est invalide.`,
        };
      }

      // 3. Résolution + validation complète de la config (env Convex ou base)
      const { settings, error, warnings } = resolveSmtpSettings(dbConfig);
      if (error || !settings) {
        return { success: false, code: "INCOMPLETE_CONFIG", message: error || "Configuration SMTP incomplète." };
      }

      const transporter = createDeliverableTransporter({
        host: settings.host,
        port: settings.port,
        security: settings.security,
        user: settings.user,
        pass: settings.pass,
      });

      // 4a. Phase connexion : vérifie DNS + TCP + TLS + authentification
      try {
        await transporter.verify();
      } catch (err: any) {
        const { code, message } = classifySmtpError(err, {
          host: settings.host,
          port: settings.port,
          user: settings.user,
          pass: settings.pass,
        });
        return { success: false, code, message };
      }

      // 4b. Phase envoi : e-mail de test réel (sans emoji dans l'objet :
      // certains filtres spam pénalisent les caractères spéciaux).
      try {
        await transporter.sendMail(
          buildDeliverableMail({
            to: testEmail,
            subject: `Test de configuration e-mail — ${settings.senderName}`,
            html: buildTestEmailHtml(settings.senderName),
            from: `"${settings.senderName}" <${settings.senderEmail}>`,
            replyTo: settings.replyTo || undefined,
            kind: "test",
          }),
        );
      } catch (err: any) {
        const { code, message } = classifySmtpError(err, {
          host: settings.host,
          port: settings.port,
          user: settings.user,
          pass: settings.pass,
        });
        return { success: false, code, message };
      }

      return {
        success: true,
        code: "SENT",
        message: "E-mail de test envoyé avec succès.",
        detail: `Connexion SMTP réussie sur ${settings.host}:${settings.port}. L'e-mail de test a été envoyé depuis ${settings.senderEmail} vers ${testEmail}.`,
        warnings: warnings?.length ? warnings : undefined,
      };
    } catch (err: any) {
      // Filet de sécurité : ne JAMAIS laisser une erreur brute remonter au client
      console.error(
        "[adminTestSmtp] Erreur inattendue :",
        sanitizeSmtpMessage(err?.message || String(err || "erreur inconnue"), "", ""),
      );
      return {
        success: false,
        code: "UNEXPECTED",
        message:
          "Le test SMTP n'a pas pu aboutir en raison d'une erreur interne. Réessayez ; si le problème persiste, vérifiez les logs serveur.",
      };
    }
  },
});

// ============================================================================
// Audit de délivrabilité (DNS : MX / SPF / DKIM / DMARC)
// ============================================================================

type CheckStatus = "ok" | "warn" | "fail" | "na";

async function resolveTxt(domain: string, timeoutMs = 6000): Promise<string[] | null> {
  try {
    const records = await Promise.race([
      dns.promises.resolveTxt(domain),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), timeoutMs),
      ),
    ]);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return null;
  }
}

async function resolveMx(domain: string, timeoutMs = 6000): Promise<string[] | null> {
  try {
    const records = await Promise.race([
      dns.promises.resolveMx(domain),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), timeoutMs),
      ),
    ]);
    return records.map((r) => `${r.exchange} (prio ${r.priority})`);
  } catch {
    return null;
  }
}

/**
 * Audit de délivrabilité (administrateur uniquement).
 *
 * Vérifie pour le domaine de l'expéditeur :
 *   - MX : le domaine peut-il recevoir du courrier (indispensable pour une
 *     adresse d'expéditeur crédible) ;
 *   - SPF : enregistrement TXT « v=spf1 … » (autorise le serveur d'envoi) ;
 *   - DKIM : signature présente si SMTP_DKIM_* sont configurés, sinon rappel
 *     qu'il s'agit du levier n°1 contre le spam ;
 *   - DMARC : enregistrement TXT « v=DMARC1 … » sur _dmarc.<domaine> ;
 *   - Alignement : domaine du compte SMTP vs domaine de l'expéditeur.
 *
 * Renvoie un rapport structuré avec des instructions DNS prêtes à copier.
 * Ne lève jamais d'exception : chaque contrôle est indépendant.
 */
export const adminCheckEmailDeliverability = action({
  args: {},
  handler: async (ctx) => {
    try {
      let dbConfig: DbConfigResult | null = null;
      try {
        dbConfig = await ctx.runQuery(internal.emailConfig.getSmtpConfigInternal);
      } catch {
        // silencieux : traité plus bas
      }
      if (!dbConfig) {
        return {
          success: false,
          code: "UNAUTHORIZED",
          message: "Accès administrateur requis pour vérifier la délivrabilité.",
        };
      }

      const { settings, error, warnings } = resolveSmtpSettings(dbConfig);
      if (error || !settings) {
        return { success: false, code: "INCOMPLETE_CONFIG", message: error || "Configuration SMTP incomplète." };
      }

      const domain = senderDomainOf(settings.senderEmail);
      if (!domain) {
        return {
          success: false,
          code: "INVALID_SENDER",
          message: `L'adresse de l'expéditeur « ${settings.senderEmail} » est invalide.`,
        };
      }

      const checks: {
        mx: { status: CheckStatus; detail: string };
        spf: { status: CheckStatus; detail: string };
        dkim: { status: CheckStatus; detail: string; selector?: string };
        dmarc: { status: CheckStatus; detail: string };
        alignment: { status: CheckStatus; detail: string };
      } = {
        mx: { status: "na", detail: "" },
        spf: { status: "na", detail: "" },
        dkim: { status: "na", detail: "" },
        dmarc: { status: "na", detail: "" },
        alignment: { status: "na", detail: "" },
      };

      // MX
      const mx = await resolveMx(domain);
      if (mx === null) {
        checks.mx = {
          status: "fail",
          detail: `Aucun enregistrement MX trouvé pour ${domain}. Un domaine sans MX ne peut pas recevoir d'e-mails : les filtres le considèrent comme non légitime.`,
        };
      } else if (mx.length === 0) {
        checks.mx = {
          status: "fail",
          detail: `Aucun serveur de messagerie (MX) déclaré pour ${domain}.`,
        };
      } else {
        checks.mx = {
          status: "ok",
          detail: `MX présents : ${mx.slice(0, 3).join(", ")}.`,
        };
      }

      // SPF
      const txt = await resolveTxt(domain);
      const spf = txt?.find((r) => /^v=spf1/i.test(r.trim())) || null;
      if (!spf) {
        checks.spf = {
          status: "fail",
          detail:
            `Aucun enregistrement SPF pour ${domain}. Le serveur de réception ne peut pas vérifier que votre serveur SMTP est autorisé à envoyer pour ce domaine — risque de spam élevé.`,
        };
      } else if (/\s\+all\s*$/.test(spf)) {
        checks.spf = {
          status: "warn",
          detail: `SPF présent mais se termine par « +all » : il autorise n'importe quel serveur à envoyer pour ${domain}. Remplacez par « ~all » au minimum.`,
        };
      } else {
        checks.spf = {
          status: "ok",
          detail: `SPF présent : ${spf.slice(0, 140)}${spf.length > 140 ? "…" : ""}.`,
        };
      }

      // DKIM
      const dkimDomain = (process.env.SMTP_DKIM_DOMAIN || "").trim();
      const dkimSelector = (process.env.SMTP_DKIM_SELECTOR || "default").trim();
      if (dkimDomain) {
        const dkimTxt = await resolveTxt(`${dkimSelector}._domainkey.${dkimDomain}`);
        if (dkimTxt && dkimTxt.length > 0) {
          checks.dkim = {
            status: "ok",
            selector: dkimSelector,
            detail: `Signature DKIM configurée et enregistrement DNS trouvé : ${dkimSelector}._domainkey.${dkimDomain}.`,
          };
        } else {
          checks.dkim = {
            status: "fail",
            selector: dkimSelector,
            detail: `DKIM configuré dans le code (sélecteur « ${dkimSelector} ») mais aucun enregistrement DNS trouvé sur ${dkimSelector}._domainkey.${dkimDomain}. Publiez la clé publique fournie par votre hébergeur.`,
          };
        }
      } else {
        checks.dkim = {
          status: "na",
          detail:
            "DKIM non configuré. C'est LE levier le plus efficace contre le spam : ajoutez les variables SMTP_DKIM_DOMAIN, SMTP_DKIM_SELECTOR et SMTP_DKIM_PRIVATE_KEY (clé privée fournie par votre hébergeur), puis publiez la clé publique dans vos DNS.",
        };
      }

      // DMARC
      const dmarcTxt = await resolveTxt(`_dmarc.${domain}`);
      const dmarc = dmarcTxt?.find((r) => /^v=DMARC1/i.test(r.trim())) || null;
      if (!dmarc) {
        checks.dmarc = {
          status: "fail",
          detail:
            `Aucun enregistrement DMARC pour ${domain}. Sans DMARC, les boîtes Gmail/Outlook ne savent pas quoi faire des e-mails non authentifiés et les classent souvent en spam.`,
        };
      } else {
        const policy = /p=(none|quarantine|reject)/i.exec(dmarc)?.[1] || "";
        checks.dmarc = {
          status: policy === "none" ? "warn" : "ok",
          detail: `DMARC présent (politique ${policy ? policy.toUpperCase() : "inconnue"}) : ${dmarc.slice(0, 120)}${dmarc.length > 120 ? "…" : ""}.`,
        };
      }

      // Alignement SPF (compte SMTP vs expéditeur)
      const userDomain = settings.user ? senderDomainOf(settings.user) : "";
      if (userDomain && userDomain !== domain) {
        checks.alignment = {
          status: "warn",
          detail: `Le domaine du compte SMTP (${userDomain}) diffère du domaine de l'expéditeur (${domain}). L'alignement SPF/DMARC échoue : utilisez SMTP_FROM sur le même domaine que SMTP_USER, ou ajoutez le domaine de l'expéditeur au SPF de votre hébergeur.`,
        };
      } else {
        checks.alignment = {
          status: "ok",
          detail: "Le domaine du compte SMTP correspond au domaine de l'expéditeur : alignement SPF/DMARC cohérent.",
        };
      }

      const allOk = Object.values(checks).every((c) => c.status === "ok");

      return {
        success: true,
        domain,
        senderEmail: settings.senderEmail,
        allOk,
        checks,
        warnings: warnings?.length ? warnings : [],
        recommendations: buildDnsRecommendations(domain, checks, dkimDomain),
      };
    } catch (err: any) {
      console.error(
        "[adminCheckEmailDeliverability] Erreur inattendue :",
        sanitizeSmtpMessage(err?.message || String(err || "erreur inconnue"), "", ""),
      );
      return {
        success: false,
        code: "UNEXPECTED",
        message:
          "L'audit de délivrabilité n'a pas pu aboutir en raison d'une erreur interne. Réessayez dans quelques instants.",
      };
    }
  },
});

function buildDnsRecommendations(
  domain: string,
  checks: {
    mx: { status: CheckStatus; detail: string };
    spf: { status: CheckStatus; detail: string };
    dkim: { status: CheckStatus; detail: string; selector?: string };
    dmarc: { status: CheckStatus; detail: string };
    alignment: { status: CheckStatus; detail: string };
  },
  dkimDomain: string,
): string[] {
  const recs: string[] = [];

  if (checks.spf.status !== "ok") {
    recs.push(
      `Ajoutez un enregistrement TXT SPF sur ${domain} (le plus restrictif possible) :\n` +
        `  Type : TXT · Nom : @ · Valeur : v=spf1 include:VOTRE_HEBERGEUR ~all\n` +
        `Remplacez VOTRE_HEBERGEUR par la valeur fournie par votre serveur SMTP (ex. spf.ovh.net, spf.mailjet.com…).`,
    );
  }

  if (checks.dkim.status !== "ok") {
    recs.push(
      "Activez la signature DKIM chez votre hébergeur, puis ajoutez dans les variables d'environnement :\n" +
        "  SMTP_DKIM_DOMAIN=<votre domaine>\n" +
        "  SMTP_DKIM_SELECTOR=<sélecteur fourni par l'hébergeur>\n" +
        "  SMTP_DKIM_PRIVATE_KEY=<clé privée fournie par l'hébergeur>\n" +
        "Le code signera automatiquement chaque e-mail envoyé.",
    );
  }

  if (checks.dmarc.status !== "ok") {
    recs.push(
      `Ajoutez un enregistrement TXT DMARC sur _dmarc.${domain} :\n` +
        `  Type : TXT · Nom : _dmarc · Valeur : v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; ruf=mailto:dmarc@${domain}\n` +
        `Après quelques semaines sans faux positifs, passez la politique à p=reject.`,
    );
  }

  if (checks.mx.status !== "ok") {
    recs.push(
      "Un domaine d'expéditeur doit posséder des enregistrements MX. Si vous n'utilisez pas de boîte mail sur ce domaine, ajoutez au minimum un MX pointant vers votre hébergeur e-mail.",
    );
  }

  if (checks.alignment.status === "warn") {
    recs.push(
      "Utilisez une adresse SMTP_FROM appartenant au même domaine que SMTP_USER, ou ajoutez le domaine de l'expéditeur dans le SPF de votre serveur SMTP.",
    );
  }

  if (recs.length === 0) {
    recs.push(
      "Configuration DNS exemplaire : SPF, DMARC (et DKIM si configuré) sont en place. Pour maintenir une bonne réputation, gardez des volumes d'envoi réguliers et surveillez les plaintes spam.",
    );
  }
  return recs;
}

// Type de la config renvoyée par la query interne (évite d'importer
// emailConfig dans ce module Node).
type DbConfigResult = {
  senderName?: string;
  senderEmail?: string;
  replyTo?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: SmtpSecurity;
  smtpUser?: string;
  smtpPassword?: string;
};