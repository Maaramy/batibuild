import { mutation, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Shared purge logic: walks every table that can reference a stored file and
 * verifies each referenced file still exists via `ctx.storage.getMetadata()`.
 * Dead references (file no longer in storage) are cleared from the DB.
 *
 * The public Convex API cannot list every file in storage, but it CAN check
 * whether a given storage id still exists. Combined with the admin
 * "delete permanently" actions (which call `ctx.storage.delete` at the same
 * time as clearing the DB fields), this keeps storage free of unreachable files.
 */
async function runPurge(ctx: any) {
  const now = Date.now();
  let deadReferences = 0;

  // ── 1. Subscriptions — payment receipts ────────────────────────────────
  const subscriptions = await ctx.db.query("subscriptions").collect();
  for (const sub of subscriptions) {
    if (sub.paymentProofStorageId) {
      let alive = false;
      try {
        alive = !!(await ctx.storage.getMetadata(sub.paymentProofStorageId));
      } catch (e) {
        alive = false;
      }
      if (!alive) {
        await ctx.db.patch(sub._id, {
          paymentProofStorageId: undefined,
          paymentProofUrl: undefined,
          paymentProofFileName: undefined,
          paymentProofUploadedAt: undefined,
          paymentProofVerified: false,
          updatedAt: now,
        });
        deadReferences++;
      }
    }
  }

  // ── 2. Supplier profiles — payment receipts ────────────────────────────
  const suppliers = await ctx.db.query("supplierProfiles").collect();
  for (const s of suppliers) {
    if (s.paymentProofStorageId) {
      let alive = false;
      try {
        alive = !!(await ctx.storage.getMetadata(s.paymentProofStorageId));
      } catch (e) {
        alive = false;
      }
      if (!alive) {
        await ctx.db.patch(s._id, {
          paymentProofStorageId: undefined,
          paymentProofUrl: undefined,
          paymentProofFileName: undefined,
          paymentProofUploadedAt: undefined,
          paymentProofVerified: false,
          updatedAt: now,
        });
        deadReferences++;
      }
    }
  }

  // ── 3. Projects — uploaded files (plans, photos, PDFs, DWGs) ───────────
  const projects = await ctx.db.query("projects").collect();
  for (const p of projects) {
    const files = p.files ?? [];
    if (files.length === 0) continue;

    const cleaned: any[] = [];
    for (const f of files) {
      if (!f.storageId) {
        cleaned.push(f);
        continue;
      }
      let alive = false;
      try {
        alive = !!(await ctx.storage.getMetadata(f.storageId));
      } catch (e) {
        alive = false;
      }
      if (alive) {
        cleaned.push(f);
      } else {
        deadReferences++;
      }
    }

    if (cleaned.length !== files.length) {
      await ctx.db.patch(p._id, { files: cleaned, updatedAt: now });
    }
  }

  // ── 4. Reports — generated PDF/Excel/CSV files ─────────────────────────
  const reports = await ctx.db.query("reports").collect();
  for (const r of reports) {
    if (r.storageId) {
      let alive = false;
      try {
        alive = !!(await ctx.storage.getMetadata(r.storageId));
      } catch (e) {
        alive = false;
      }
      if (!alive) {
        await ctx.db.patch(r._id, {
          storageId: undefined,
          url: undefined,
          size: undefined,
        });
        deadReferences++;
      }
    }
  }

  return {
    deadReferencesCleaned: deadReferences,
    checkedSubscriptions: subscriptions.length,
    checkedSuppliers: suppliers.length,
    checkedProjects: projects.length,
    checkedReports: reports.length,
    purgedAt: now,
  };
}

/** Cron entry point (weekly) — no auth needed */
export const purgeOrphanedFiles = internalMutation({
  args: {},
  handler: async (ctx) => runPurge(ctx),
});

/** Manual purge from the admin panel — admin only */
export const runStoragePurge = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      throw new Error("Unauthorized: Admin access required");
    }
    const result = await runPurge(ctx);

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "storage_purge",
        details: `Purge du stockage manuelle — ${result.deadReferencesCleaned} référence(s) morte(s) nettoyée(s)`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return result;
  },
});
