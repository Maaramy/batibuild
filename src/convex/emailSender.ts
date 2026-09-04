"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import nodemailer from "nodemailer";
import { vly } from "../lib/vly-integrations";

// ============================================================================
// Node-only email actions (SMTP via nodemailer, VLY API fallback)
// ============================================================================

/** Perform the actual network send (SMTP or VLY), then record the result */
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
        error = `SMTP : ${err?.message || "erreur inconnue"}`;
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

/** Test the SMTP configuration by sending a real test email (admin only) */
export const adminTestSmtp = action({
  args: {
    senderName: v.string(),
    senderEmail: v.string(),
    replyTo: v.optional(v.string()),
    smtpHost: v.optional(v.string()),
    smtpPort: v.optional(v.number()),
    smtpSecurity: v.optional(v.union(v.literal("ssl"), v.literal("tls"), v.literal("none"))),
    smtpUser: v.optional(v.string()),
    smtpPassword: v.optional(v.string()),
    testEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user || user.role !== "admin") {
      return { success: false, message: "Accès administrateur requis" };
    }

    const host = args.smtpHost?.trim();
    if (!host || !args.senderEmail) {
      return {
        success: false,
        message: "Renseignez au minimum le serveur SMTP et l'adresse de l'expéditeur.",
      };
    }

    const port = args.smtpPort || (args.smtpSecurity === "ssl" ? 465 : 587);
    const secure = args.smtpSecurity === "ssl";

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: args.smtpUser
          ? { user: args.smtpUser, pass: args.smtpPassword || "" }
          : undefined,
        tls: args.smtpSecurity === "tls" ? { rejectUnauthorized: false } : undefined,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });

      await transporter.sendMail({
        from: `"${args.senderName || "batibuild App"}" <${args.senderEmail}>`,
        to: args.testEmail,
        replyTo: args.replyTo || undefined,
        subject: "✅ Test de configuration e-mail — batibuild App",
        html: buildTestEmailHtml(args.senderName || "batibuild App"),
      });

      return {
        success: true,
        message: `Connexion SMTP réussie (${host}:${port}). Un e-mail de test a été envoyé à ${args.testEmail}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Échec de la connexion SMTP : ${err?.message || "erreur inconnue"}`,
      };
    }
  },
});

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
