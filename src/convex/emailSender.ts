"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import nodemailer from "nodemailer";
import { vly } from "../lib/vly-integrations";

// ============================================================================
// Node-only email actions (SMTP via nodemailer, VLY API fallback)
// ============================================================================

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
  },
  handler: async (ctx, args) => {
    let ok = false;
    let error: string | undefined;

    if (args.smtpHost) {
      try {
        const transporter = nodemailer.createTransport({
          host: args.smtpHost,
          port: args.smtpPort ?? (args.smtpSecurity === "ssl" ? 465 : 587),
          secure: args.smtpSecurity === "ssl",
          auth: args.smtpUser
            ? { user: args.smtpUser, pass: args.smtpPassword || "" }
            : undefined,
          tls: args.smtpSecurity === "tls" ? { rejectUnauthorized: false } : undefined,
        });
        await transporter.sendMail({
          from: `"${args.senderName || "batibuild App"}" <${args.senderEmail}>`,
          to: args.to,
          replyTo: args.replyTo || undefined,
          cc: args.cc && args.cc.length ? args.cc : undefined,
          subject: args.subject,
          html: args.html,
        });
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

    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.security === "ssl",
      auth: settings.user
        ? { user: settings.user, pass: settings.pass }
        : undefined,
      tls: settings.security === "tls" ? { rejectUnauthorized: false } : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 25000,
    });

    const from = `"${settings.senderName}" <${settings.senderEmail}>`;
    const replyTo = settings.replyTo || settings.senderEmail;
    const subject = `Votre code de vérification — ${settings.senderName}`;

    try {
      await transporter.sendMail({
        from,
        to: args.to,
        replyTo,
        subject,
        html: buildOtpEmailHtml(settings.senderName, args.code),
        text:
          `Votre code de vérification ${settings.senderName} est : ${args.code}\n\n` +
          `Ce code expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
      });
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

/** Corps HTML de l'e-mail de code de vérification (identité batibuild). */
function buildOtpEmailHtml(senderName: string, code: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#059669,#0ea5e9);padding:28px 32px;">
      <span style="font-size:20px;font-weight:800;color:#ffffff;">${senderName}</span>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;color:#111827;font-size:18px;">Votre code de vérification</h1>
      <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.6;">
        Utilisez le code ci-dessous pour confirmer votre adresse e-mail :
      </p>
      <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:20px;text-align:center;">
        <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#059669;">${code}</span>
      </div>
      <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
        Ce code expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.
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
} | null): { settings?: SmtpSettings | null; error?: string } {
  const envHost = (process.env.SMTP_HOST || "").trim();

  if (envHost) {
    let security: SmtpSecurity = "tls";
    const envSecurity = (process.env.SMTP_SECURE || "").toLowerCase();
    if (envSecurity === "ssl" || envSecurity === "true" || envSecurity === "465") {
      security = "ssl";
    } else if (envSecurity === "none" || envSecurity === "false") {
      security = "none";
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

    return {
      settings: {
        host: envHost,
        port: envPort,
        security,
        user: (process.env.SMTP_USER || "").trim(),
        pass: process.env.SMTP_PASSWORD || "",
        senderName: (process.env.SMTP_FROM_NAME || dbConfig?.senderName || "batibuild App").trim(),
        senderEmail,
        replyTo: dbConfig?.replyTo || undefined,
        source: "env",
      },
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
      senderName: dbConfig.senderName || "batibuild App",
      senderEmail,
      replyTo: dbConfig.replyTo || undefined,
      source: "db",
    },
  };
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function buildTestEmailHtml(senderName: string) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:Arial,Helvetica,sans-serif;">
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
      const { settings, error } = resolveSmtpSettings(dbConfig);
      if (error || !settings) {
        return { success: false, code: "INCOMPLETE_CONFIG", message: error || "Configuration SMTP incomplète." };
      }

      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.security === "ssl",
        auth: settings.user
          ? { user: settings.user, pass: settings.pass }
          : undefined,
        tls: settings.security === "tls" ? { rejectUnauthorized: false } : undefined,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 25000,
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

      // 4b. Phase envoi : e-mail de test réel
      try {
        await transporter.sendMail({
          from: `"${settings.senderName}" <${settings.senderEmail}>`,
          to: testEmail,
          replyTo: settings.replyTo || undefined,
          subject: "✅ Test de configuration e-mail — batibuild App",
          html: buildTestEmailHtml(settings.senderName),
        });
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
