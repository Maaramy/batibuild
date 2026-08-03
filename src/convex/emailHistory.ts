import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";

// ============================================================================
// Email History — audit trail of every notification email sent
// ============================================================================

const MAX_HISTORY_SCAN = 1000;

/** List email history with search & filters (admin only) */
export const listEmailHistory = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.union(v.literal("all"), v.literal("sent"), v.literal("failed"), v.literal("pending"))),
    templateKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") return [];

    let rows = await ctx.db.query("emailHistory").order("desc").take(args.limit ?? 300);

    if (args.status && args.status !== "all") {
      rows = rows.filter((r) => r.status === args.status);
    }
    if (args.templateKey && args.templateKey !== "all") {
      rows = rows.filter((r) => r.templateKey === args.templateKey);
    }
    if (args.search && args.search.trim()) {
      const q = args.search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.to.toLowerCase().includes(q) ||
          (r.recipientName || "").toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q),
      );
    }

    return rows.slice(0, args.limit ?? 300);
  },
});

/** Email statistics for the admin dashboard */
export const getEmailStats = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") return null;

    const rows = await ctx.db.query("emailHistory").order("desc").take(MAX_HISTORY_SCAN);

    const sent = rows.filter((r) => r.status === "sent").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const total = rows.length;

    // Per-day series (last 14 days)
    const series: { date: string; sent: number; failed: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = day.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const dayRows = rows.filter((r) => r.createdAt >= start && r.createdAt < end);
      series.push({
        date: day.toISOString().slice(0, 10),
        sent: dayRows.filter((r) => r.status === "sent").length,
        failed: dayRows.filter((r) => r.status === "failed").length,
      });
    }

    const lastSent = rows.find((r) => r.status === "sent");

    return {
      total,
      sent,
      failed,
      pending,
      successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
      lastSentAt: lastSent?.sentAt ?? null,
      lastSentTo: lastSent?.to ?? null,
      lastSentSubject: lastSent?.subject ?? null,
      series,
    };
  },
});

/** Resend an email from history (admin only) */
export const adminResendEmail = mutation({
  args: { historyId: v.id("emailHistory") },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const record = await ctx.db.get(args.historyId);
    if (!record) throw new Error("Envoi introuvable");

    if (!record.payloadJson) throw new Error("Impossible de renvoyer cet e-mail (données manquantes)");

    let payload: any;
    try {
      payload = JSON.parse(record.payloadJson);
    } catch {
      throw new Error("Données de renvoi corrompues");
    }

    // Reset the record to pending and reschedule
    await ctx.db.patch(args.historyId, {
      status: "pending",
      error: undefined,
      sentAt: undefined,
      attemptCount: (record.attemptCount ?? 0) + 1,
    });

    await ctx.scheduler.runAfter(0, internal.emailNotifications.processEmailEvent, {
      ...payload,
      force: true,
    });

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "email_resend",
        targetUserEmail: record.to,
        details: `Renvoi de l'e-mail « ${record.subject} » (${record.templateKey})`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});
