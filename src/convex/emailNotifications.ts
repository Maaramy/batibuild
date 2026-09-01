import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { DEFAULT_TEMPLATES, EMAIL_EVENT_LABELS } from "./emailTemplates";
import { decryptPassword } from "./emailConfig";

// ============================================================================
// Automatic Email Notifications Engine
// Orchestration runs in internal mutations (config, dedup, rendering, history);
// the actual network send happens in the Node action emailSender.sendEmailAction
// (SMTP primary, VLY email fallback).
// ============================================================================

export type EmailVars = {
  nom?: string;
  prenom?: string;
  nomEntreprise?: string;
  typeAbonnement?: string;
  dateActivation?: string;
  dateExpiration?: string;
  montant?: string;
  numeroFacture?: string;
  lienConnexion?: string;
  nomPlateforme?: string;
};

export const emailEventValidator = v.union(
  v.literal("subscription_activated"),
  v.literal("subscription_renewed"),
  v.literal("subscription_expired"),
  v.literal("payment_confirmed"),
  v.literal("payment_rejected"),
  v.literal("subscription_suspended"),
  v.literal("subscription_canceled"),
);

// ----------------------------------------------------------------------------
// Shared helpers used by the trigger hooks
// ----------------------------------------------------------------------------

export function formatDateFr(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function planLabel(plan?: string): string {
  switch (plan) {
    case "pro":
      return "Client Pro";
    case "supplier":
      return "Fournisseur";
    case "expert":
      return "Expert";
    case "free":
      return "Aucun";
    case "monthly":
      return "Fournisseur";
    default:
      return plan || "—";
  }
}

export function splitName(fullName?: string): { nom: string; prenom: string } {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nom: "", prenom: "" };
  if (parts.length === 1) return { nom: parts[0], prenom: "" };
  return { nom: parts.slice(1).join(" "), prenom: parts[0] };
}

/**
 * Schedule an email notification from a mutation.
 * Hooks call this — it enqueues the orchestration as an internal mutation.
 */
export async function scheduleEmailEvent(
  ctx: any,
  params: {
    to: string;
    recipientName?: string;
    templateKey:
      | "subscription_activated"
      | "subscription_renewed"
      | "subscription_expired"
      | "payment_confirmed"
      | "payment_rejected"
      | "subscription_suspended"
      | "subscription_canceled";
    vars: EmailVars;
    dedupeKey?: string;
    sendToAdmins?: boolean;
  },
) {
  if (!params.to) return;
  try {
    await ctx.scheduler.runAfter(0, internal.emailNotifications.processEmailEvent, params);
  } catch (e) {
    // Sending is best-effort — never block the subscription flow
  }
}

// ----------------------------------------------------------------------------
// Rendering
// ----------------------------------------------------------------------------

function renderTokens(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (m, key: string) => {
    const lookup: Record<string, string> = {
      Nom: vars.nom || "",
      Prénom: vars.prenom || "",
      NomEntreprise: vars.nomEntreprise || "",
      TypeAbonnement: vars.typeAbonnement || "",
      DateActivation: vars.dateActivation || "",
      DateExpiration: vars.dateExpiration || "",
      Montant: vars.montant || "",
      NuméroFacture: vars.numeroFacture || "",
      LienConnexion: vars.lienConnexion || "#",
      NomPlateforme: vars.nomPlateforme || "batibuild App",
    };
    return lookup[key] !== undefined ? lookup[key] : m;
  });
}

function buildBrandedHtml(bodyHtml: string, opts: {
  platformName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  signature?: string;
}): string {
  const logo = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${opts.platformName}" style="max-height:44px;max-width:180px;" />`
    : `<span style="font-size:20px;font-weight:800;color:#ffffff;">${opts.platformName}</span>`;
  const signature = opts.signature
    ? `<div style="margin-top:26px;padding-top:16px;border-top:1px solid #e5e7eb;color:#374151;font-size:13px;line-height:1.7;">${opts.signature.replace(/\n/g, "<br/>")}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,${opts.primaryColor},${opts.accentColor});padding:24px 32px;display:flex;align-items:center;justify-content:space-between;">
      ${logo}
      <span style="color:rgba(255,255,255,0.85);font-size:12px;letter-spacing:1px;">NOTIFICATION</span>
    </div>
    <div style="padding:32px;">
      ${bodyHtml}
      ${signature}
    </div>
    <div style="background:#f9fafb;padding:18px 32px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #eef0f3;">
      © ${new Date().getFullYear()} ${opts.platformName} — <a href="{{LINK}}" style="color:#6b7280;">${opts.platformName}</a>
      <br/>Cet e-mail vous a été envoyé automatiquement. Merci de ne pas y répondre.
    </div>
  </div>
</body>
</html>`;
}

// ----------------------------------------------------------------------------
// Orchestration (internal mutation)
// ----------------------------------------------------------------------------

export const processEmailEvent = internalMutation({
  args: {
    to: v.string(),
    recipientName: v.optional(v.string()),
    templateKey: emailEventValidator,
    vars: v.optional(
      v.object({
        nom: v.optional(v.string()),
        prenom: v.optional(v.string()),
        nomEntreprise: v.optional(v.string()),
        typeAbonnement: v.optional(v.string()),
        dateActivation: v.optional(v.string()),
        dateExpiration: v.optional(v.string()),
        montant: v.optional(v.string()),
        numeroFacture: v.optional(v.string()),
        lienConnexion: v.optional(v.string()),
        nomPlateforme: v.optional(v.string()),
      }),
    ),
    dedupeKey: v.optional(v.string()),
    sendToAdmins: v.optional(v.boolean()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const vars = (args.vars || {}) as EmailVars;
    const now = Date.now();
    const dedupeKey = args.dedupeKey;

    const recordFailed = async (error: string, subject: string) => {
      const payloadJson = JSON.stringify({
        to: args.to,
        recipientName: args.recipientName,
        templateKey: args.templateKey,
        vars: args.vars,
        dedupeKey: args.dedupeKey,
        sendToAdmins: args.sendToAdmins,
      });
      await ctx.db.insert("emailHistory", {
        to: args.to,
        recipientName: args.recipientName,
        templateKey: args.templateKey,
        subject,
        status: "failed",
        error,
        createdAt: now,
        attemptCount: 1,
        dedupeKey,
        payloadJson,
        sentToAdmins: !!args.sendToAdmins,
      });
    };

    // 1. Load configuration
    const config = await ctx.db.query("emailConfig").order("desc").first();
    if (!config || !config.senderEmail) {
      await recordFailed(
        "Configuration e-mail manquante — définissez l'expéditeur dans Configuration E-mail",
        EMAIL_EVENT_LABELS[args.templateKey],
      );
      return { success: false, status: "failed" };
    }
    if (config.autoEnabled === false) {
      await recordFailed(
        "Notifications e-mail désactivées dans la configuration",
        EMAIL_EVENT_LABELS[args.templateKey],
      );
      return { success: false, status: "failed" };
    }

    // 2. Deduplication — skip if the same event was already sent successfully < 24h
    if (dedupeKey && !args.force) {
      const dupes = await ctx.db
        .query("emailHistory")
        .withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
        .take(10);
      const recentSent = dupes.find(
        (d) => d.status === "sent" && d.createdAt > now - 24 * 60 * 60 * 1000,
      );
      if (recentSent) {
        return { success: true, skipped: true, status: "sent" };
      }
    }

    // 3. Load template (DB override or default)
    const storedTemplate = await ctx.db
      .query("emailTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.templateKey))
      .first();
    const template =
      storedTemplate ||
      DEFAULT_TEMPLATES.find((t) => t.key === args.templateKey);
    if (!template || template.active === false) {
      await recordFailed(
        "Modèle de notification désactivé ou introuvable",
        EMAIL_EVENT_LABELS[args.templateKey],
      );
      return { success: false, status: "failed" };
    }

    // 4. Resolve vars
    const seo = await ctx.db.query("seoConfig").order("desc").first();
    const platformName = vars.nomPlateforme || seo?.siteName || config.senderName || "batibuild App";
    const loginLink = vars.lienConnexion || config.loginLink || seo?.canonicalUrl || "https://batibuild.app";

    const resolvedVars: Record<string, string> = {
      nom: vars.nom || "",
      prenom: vars.prenom || "",
      nomEntreprise: vars.nomEntreprise || "",
      typeAbonnement: vars.typeAbonnement || "",
      dateActivation: vars.dateActivation || "",
      dateExpiration: vars.dateExpiration || "",
      montant: vars.montant || "",
      numeroFacture: vars.numeroFacture || "",
      lienConnexion: loginLink,
      nomPlateforme: platformName,
    };

    const subject = renderTokens(template.subject, resolvedVars);
    const bodyHtml = buildBrandedHtml(renderTokens(template.bodyHtml, resolvedVars), {
      platformName,
      logoUrl: config.logoUrl || undefined,
      primaryColor: config.primaryColor || "#7c3aed",
      accentColor: config.accentColor || "#0ea5e9",
      signature: config.signature || undefined,
    }).replace("{{LINK}}", loginLink);

    // 5. Admin copy
    let adminCc: string[] = [];
    if (args.sendToAdmins && config.notifyAdminCc) {
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();
      adminCc = admins.map((a) => a.email || "").filter(Boolean);
    }

    // 6. Insert history record (pending) and schedule the Node send action
    const payloadJson = JSON.stringify({
      to: args.to,
      recipientName: args.recipientName,
      templateKey: args.templateKey,
      vars: args.vars,
      dedupeKey: args.dedupeKey,
      sendToAdmins: args.sendToAdmins,
    });

    const historyId = await ctx.db.insert("emailHistory", {
      to: args.to,
      recipientName: args.recipientName,
      templateKey: args.templateKey,
      subject,
      status: "pending",
      createdAt: now,
      attemptCount: 1,
      dedupeKey,
      payloadJson,
      sentToAdmins: !!args.sendToAdmins,
    });

    await ctx.scheduler.runAfter(0, internal.emailSender.sendEmailAction, {
      historyId,
      to: args.to,
      subject,
      html: bodyHtml,
      senderName: config.senderName || "batibuild App",
      senderEmail: config.senderEmail,
      replyTo: config.replyTo || undefined,
      cc: adminCc,
      smtpHost: config.smtpHost || undefined,
      smtpPort: config.smtpPort ?? undefined,
      smtpSecurity: config.smtpSecurity ?? undefined,
      smtpUser: config.smtpUser || undefined,
      smtpPassword: config.smtpPasswordEnc
        ? decryptPassword(config.smtpPasswordEnc)
        : undefined,
    });

    return { success: true, status: "pending", historyId };
  },
});

/** Record the outcome of a send (called by the Node action) */
export const updateEmailStatus = internalMutation({
  args: {
    historyId: v.id("emailHistory"),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.historyId, {
      status: args.ok ? "sent" : "failed",
      error: args.ok ? undefined : args.error,
      sentAt: args.ok ? Date.now() : undefined,
    });
    return { success: true };
  },
});

// ----------------------------------------------------------------------------
// Expiry check (internal, called by daily cron)
// ----------------------------------------------------------------------------

/** Mark expired subscriptions (members + suppliers) and notify by email */
export const checkExpiredSubscriptions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Member subscriptions
    const activeSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let expiredCount = 0;

    for (const sub of activeSubs) {
      if (sub.endDate && sub.endDate < now) {
        expiredCount++;
        await ctx.db.patch(sub._id, {
          status: "expired",
          updatedAt: now,
        });

        // Reset user plan to free (subscription expired)
        const user = await ctx.db.get(sub.userId);
        if (user && user.subscriptionPlan !== "free") {
          await ctx.db.patch(user._id, {
            subscriptionPlan: "free",
            subscriptionEndDate: undefined,
          });
        }

        if (user?.email && user.emailNotifications !== false) {
          await ctx.scheduler.runAfter(
            0,
            internal.emailNotifications.processEmailEvent,
            {
              to: user.email,
              recipientName: user.name || undefined,
              templateKey: "subscription_expired",
              vars: {
                ...splitName(user.name),
                typeAbonnement: planLabel(sub.plan),
                dateExpiration: formatDateFr(sub.endDate),
                dateActivation: formatDateFr(sub.startDate),
              },
              dedupeKey: `subscription_expired:${user.email}:${sub._id}`,
              sendToAdmins: true,
            },
          );
        }
      }
    }

    // Supplier profiles
    const activeSuppliers = await ctx.db
      .query("supplierProfiles")
      .withIndex("by_subscription", (q) => q.eq("subscriptionStatus", "active"))
      .collect();

    for (const profile of activeSuppliers) {
      if (profile.subscriptionEndDate && profile.subscriptionEndDate < now) {
        expiredCount++;
        await ctx.db.patch(profile._id, {
          subscriptionStatus: "inactive",
          isVisible: false,
          updatedAt: now,
        });

        const user = await ctx.db.get(profile.userId);
        const to = profile.email || user?.email;
        if (to) {
          await ctx.scheduler.runAfter(
            0,
            internal.emailNotifications.processEmailEvent,
            {
              to,
              recipientName: profile.companyName,
              templateKey: "subscription_expired",
              vars: {
                nomEntreprise: profile.companyName,
                typeAbonnement: "Fournisseur",
                dateExpiration: formatDateFr(profile.subscriptionEndDate),
                dateActivation: formatDateFr(profile.subscriptionStartDate),
              },
              dedupeKey: `supplier_expired:${to}:${profile._id}`,
              sendToAdmins: true,
            },
          );
        }
      }
    }

    return { expiredCount };
  },
});
