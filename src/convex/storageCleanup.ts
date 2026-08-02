import { internalMutation } from "./_generated/server";

/**
 * Storage cleanup (cron): removes dead references to files that no longer
 * exist in Convex storage, and clears orphaned receipt fields.
 *
 * The public Convex API cannot list every file in storage, but it CAN check
 * whether a given storage id still exists via `ctx.storage.getMetadata()`.
 * This purge job walks every table that can reference a stored file and:
 *   1. Verifies each referenced file still exists.
 *   2. If not, clears the stale receipt/file fields (dead reference).
 *
 * Combined with the admin "delete permanently" actions (which call
 * `ctx.storage.delete` at the same time as clearing the DB fields), this keeps
 * storage free of unreachable files.
 */
export const purgeOrphanedFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deadReferences = 0;

    // ── 1. Subscriptions — payment receipts ────────────────────────────────
    const subscriptions = await ctx.db.query("subscriptions").collect();
    for (const sub of subscriptions) {
      if (sub.paymentProofStorageId) {
        try {
          const meta = await ctx.storage.getMetadata(sub.paymentProofStorageId);
          if (!meta) {
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
        } catch (e) {
          // File already gone or unreadable — treat as dead
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
        try {
          const meta = await ctx.storage.getMetadata(s.paymentProofStorageId);
          if (!meta) {
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
        } catch (e) {
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
          const meta = await ctx.storage.getMetadata(f.storageId);
          alive = !!meta;
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
        try {
          const meta = await ctx.storage.getMetadata(r.storageId);
          if (!meta) {
            await ctx.db.patch(r._id, {
              storageId: undefined,
              url: undefined,
              size: undefined,
            });
            deadReferences++;
          }
        } catch (e) {
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
  },
});
