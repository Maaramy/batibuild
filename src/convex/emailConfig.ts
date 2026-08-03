import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// Email Configuration (SMTP server + branding) — admin only
// ============================================================================

export const DEFAULT_EMAIL_CONFIG = {
  senderName: "BudgetBati",
  senderEmail: "",
  replyTo: "",
  smtpHost: "",
  smtpPort: 587,
  smtpSecurity: "tls" as "ssl" | "tls" | "none",
  smtpUser: "",
  signature: "",
  logoUrl: "",
  primaryColor: "#7c3aed",
  accentColor: "#0ea5e9",
  autoEnabled: true,
  notifyAdminCc: true,
  loginLink: "",
};

// ----------------------------------------------------------------------------
// Password encryption (XOR + base64, keyed by an env secret at rest in DB)
// ----------------------------------------------------------------------------
const ENC_KEY = (process.env.EMAIL_ENC_KEY || "budgetbati-email-secret-2026").slice(0, 32);

export function encryptPassword(plain: string): string {
  const encoded = encodeURIComponent(plain);
  let out = "";
  for (let i = 0; i < encoded.length; i++) {
    out += String.fromCharCode(
      encoded.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length),
    );
  }
  return btoa(out);
}

export function decryptPassword(enc: string): string {
  try {
    const decoded = atob(enc);
    let out = "";
    for (let i = 0; i < decoded.length; i++) {
      out += String.fromCharCode(
        decoded.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length),
      );
    }
    return decodeURIComponent(out);
  } catch {
    return "";
  }
}

// ----------------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------------

/** Get email configuration (admin only, password decrypted for display) */
export const getEmailConfigAdmin = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") return null;

    const config = await ctx.db.query("emailConfig").order("desc").first();
    if (!config) return { ...DEFAULT_EMAIL_CONFIG, configured: false };

    return {
      senderName: config.senderName ?? DEFAULT_EMAIL_CONFIG.senderName,
      senderEmail: config.senderEmail ?? "",
      replyTo: config.replyTo ?? "",
      smtpHost: config.smtpHost ?? "",
      smtpPort: config.smtpPort ?? DEFAULT_EMAIL_CONFIG.smtpPort,
      smtpSecurity: config.smtpSecurity ?? DEFAULT_EMAIL_CONFIG.smtpSecurity,
      smtpUser: config.smtpUser ?? "",
      smtpPassword: config.smtpPasswordEnc ? decryptPassword(config.smtpPasswordEnc) : "",
      signature: config.signature ?? "",
      logoUrl: config.logoUrl ?? "",
      primaryColor: config.primaryColor ?? DEFAULT_EMAIL_CONFIG.primaryColor,
      accentColor: config.accentColor ?? DEFAULT_EMAIL_CONFIG.accentColor,
      autoEnabled: config.autoEnabled ?? true,
      notifyAdminCc: config.notifyAdminCc ?? true,
      loginLink: config.loginLink ?? "",
      configured: true,
      updatedAt: config.updatedAt,
    };
  },
});

// ----------------------------------------------------------------------------
// Mutations
// ----------------------------------------------------------------------------

/** Save email configuration (admin only). Password is encrypted at rest. */
export const adminSaveEmailConfig = mutation({
  args: {
    senderName: v.string(),
    senderEmail: v.string(),
    replyTo: v.optional(v.string()),
    smtpHost: v.optional(v.string()),
    smtpPort: v.optional(v.number()),
    smtpSecurity: v.optional(v.union(v.literal("ssl"), v.literal("tls"), v.literal("none"))),
    smtpUser: v.optional(v.string()),
    smtpPassword: v.optional(v.string()),
    signature: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    autoEnabled: v.optional(v.boolean()),
    notifyAdminCc: v.optional(v.boolean()),
    loginLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db.query("emailConfig").order("desc").first();

    const patch: Record<string, any> = {
      senderName: args.senderName || DEFAULT_EMAIL_CONFIG.senderName,
      senderEmail: args.senderEmail || "",
      replyTo: args.replyTo ?? "",
      smtpHost: args.smtpHost ?? "",
      smtpPort: args.smtpPort ?? DEFAULT_EMAIL_CONFIG.smtpPort,
      smtpSecurity: args.smtpSecurity ?? DEFAULT_EMAIL_CONFIG.smtpSecurity,
      smtpUser: args.smtpUser ?? "",
      signature: args.signature ?? "",
      logoUrl: args.logoUrl ?? "",
      primaryColor: args.primaryColor ?? DEFAULT_EMAIL_CONFIG.primaryColor,
      accentColor: args.accentColor ?? DEFAULT_EMAIL_CONFIG.accentColor,
      autoEnabled: args.autoEnabled ?? true,
      notifyAdminCc: args.notifyAdminCc ?? true,
      loginLink: args.loginLink ?? "",
      updatedAt: Date.now(),
      updatedBy: admin._id,
    };

    // Encrypt the password if a new one is provided; keep existing otherwise
    if (args.smtpPassword !== undefined && args.smtpPassword !== "") {
      patch.smtpPasswordEnc = encryptPassword(args.smtpPassword);
    } else if (!existing?.smtpPasswordEnc) {
      patch.smtpPasswordEnc = undefined;
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("emailConfig", { ...patch, updatedAt: Date.now() } as any);
    }

    // Log the modification
    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "email_config_save",
        targetUserEmail: args.senderEmail,
        details: "Configuration e-mail mise à jour (SMTP + identité)",
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});
