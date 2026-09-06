import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// ============================================================================
// Announcements — communications broadcast by administrators to users
// ============================================================================

export const ANNOUNCEMENT_TYPES = [
  "information",
  "news",
  "important",
  "urgent",
  "maintenance",
] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const ANNOUNCEMENT_STATUSES = [
  "draft",
  "scheduled",
  "published",
  "expired",
  "disabled",
] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

/** Sort weight used to order announcements (higher = displayed first). */
export const TYPE_PRIORITY: Record<AnnouncementType, number> = {
  urgent: 5,
  important: 4,
  news: 3,
  maintenance: 2,
  information: 1,
};

export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  information: "Information",
  news: "Nouveauté",
  important: "Important",
  urgent: "Urgent",
  maintenance: "Maintenance",
};

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: "Brouillon",
  scheduled: "Programmée",
  published: "Publiée",
  expired: "Expirée",
  disabled: "Désactivée",
};

const announcementTypeValidator = v.union(
  v.literal("information"),
  v.literal("news"),
  v.literal("important"),
  v.literal("urgent"),
  v.literal("maintenance"),
);

const announcementInputValidator = v.object({
  title: v.string(),
  content: v.string(),
  type: announcementTypeValidator,
  priority: v.number(),
  imageUrl: v.optional(v.string()),
  /** Storage id of a newly uploaded image/icon (resolved server-side on save). */
  imageStorageId: v.optional(v.id("_storage")),
  publishMode: v.union(
    v.literal("draft"),
    v.literal("now"),
    v.literal("scheduled"),
  ),
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  targetType: v.union(
    v.literal("all"),
    v.literal("company"),
    v.literal("role"),
    v.literal("user"),
  ),
  targetCompanyNames: v.optional(v.array(v.string())),
  targetRoles: v.optional(v.array(v.string())),
  targetUserIds: v.optional(v.array(v.id("users"))),
});

type AnnouncementInput = {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: number;
  imageUrl?: string;
  imageStorageId?: Id<"_storage">;
  publishMode: "draft" | "now" | "scheduled";
  startDate?: number;
  endDate?: number;
  targetType: "all" | "company" | "role" | "user";
  targetCompanyNames?: string[];
  targetRoles?: string[];
  targetUserIds?: Id<"users">[];
};

type AnnouncementDoc = Doc<"announcements">;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Non authentifié");
  if (user.role !== "admin") {
    throw new Error("Accès réservé aux administrateurs");
  }
  return user;
}

/**
 * Resolve the effective status of an announcement at a given time.
 * - Disabled wins over everything.
 * - Drafts never auto-publish.
 * - Past end date → expired.
 * - Future start date → scheduled.
 * - Otherwise → published.
 */
export function resolveStatus(
  status: AnnouncementStatus,
  isActive: boolean,
  startDate?: number,
  endDate?: number,
  now = Date.now(),
): AnnouncementStatus {
  if (!isActive || status === "disabled") return "disabled";
  if (status === "draft") return "draft";
  if (endDate !== undefined && now > endDate) return "expired";
  if (startDate !== undefined && now < startDate) return "scheduled";
  return "published";
}

/**
 * Resolve the image to persist.
 * - A new upload (imageStorageId) → resolve its public URL, delete any
 *   previously stored file, persist the new storage id.
 * - No image / removal (imageUrl empty, no storage id) → clear everything,
 *   deleting the previously stored file if any.
 * - Otherwise (legacy URL kept) → keep the URL and any existing storage id.
 */
async function resolveImage(
  ctx: MutationCtx,
  input: AnnouncementInput,
  existing?: AnnouncementDoc,
): Promise<{ imageUrl?: string; imageStorageId?: Id<"_storage"> }> {
  if (input.imageStorageId) {
    const url = await ctx.storage.getUrl(input.imageStorageId);
    if (existing?.imageStorageId) {
      await ctx.storage.delete(existing.imageStorageId).catch(() => undefined);
    }
    return {
      imageUrl: url ?? undefined,
      imageStorageId: input.imageStorageId,
    };
  }

  if (!input.imageUrl && existing?.imageStorageId) {
    await ctx.storage.delete(existing.imageStorageId).catch(() => undefined);
  }

  return {
    imageUrl: input.imageUrl,
    imageStorageId: input.imageUrl ? existing?.imageStorageId : undefined,
  };
}

/** Compute status / isActive / dates from the form input. */
function resolveWriteFields(
  input: AnnouncementInput,
  now: number,
): Pick<AnnouncementDoc, "status" | "isActive" | "startDate" | "endDate"> {
  let status: AnnouncementDoc["status"];
  let isActive: boolean;
  let startDate = input.startDate;

  if (input.publishMode === "now") {
    status = "published";
    isActive = true;
    if (startDate === undefined || startDate > now) startDate = now;
  } else if (input.publishMode === "scheduled") {
    status = startDate !== undefined && startDate > now ? "scheduled" : "published";
    isActive = true;
    if (startDate === undefined) startDate = now;
  } else {
    status = "draft";
    isActive = false;
  }

  let endDate = input.endDate;
  if (endDate !== undefined && endDate < (startDate ?? now)) {
    endDate = undefined;
  }

  return { status, isActive, startDate, endDate };
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Active announcements for the signed-in user (dashboard).
 * Filters: resolved status = published, isActive, dates, and targeting rules.
 * Order: manual displayOrder (if set) → priority desc → createdAt desc.
 */
export const getAnnouncementsForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const now = Date.now();
    const all = await ctx.db.query("announcements").collect();

    const visible = all.filter((a) => {
      const resolved = resolveStatus(a.status, a.isActive, a.startDate, a.endDate, now);
      if (resolved !== "published") return false;

      // Targeting
      if (a.targetType === "user") {
        return (a.targetUserIds ?? []).some((id) => id === user._id);
      }
      if (a.targetType === "company") {
        const names = (a.targetCompanyNames ?? []).map((n) => n.trim().toLowerCase());
        if (!user.company) return false;
        return names.includes(user.company.trim().toLowerCase());
      }
      if (a.targetType === "role") {
        const roles = a.targetRoles ?? [];
        if (roles.length === 0) return true;
        if (user.role && roles.includes(user.role)) return true;
        if (user.userRole && roles.includes(user.userRole)) return true;
        return false;
      }
      return true; // "all"
    });

    return visible.sort((a, b) => {
      const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
  },
});

/**
 * All currently active announcements, no user targeting (used for admin
 * preview and generic displays).
 */
export const getActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("announcements").collect();
    return all
      .filter((a) => resolveStatus(a.status, a.isActive, a.startDate, a.endDate, now) === "published")
      .sort((a, b) => {
        const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        if (b.priority !== a.priority) return b.priority - a.priority;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
  },
});

/** All announcements with resolved status (admin only). */
export const getAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const all = await ctx.db.query("announcements").collect();
    return all
      .map((a) => ({
        ...a,
        resolvedStatus: resolveStatus(a.status, a.isActive, a.startDate, a.endDate, now),
      }))
      .sort((a, b) => {
        const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
        const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
  },
});

/** Single announcement (admin only). */
export const getAnnouncementById = query({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return null;
    return {
      ...doc,
      resolvedStatus: resolveStatus(doc.status, doc.isActive, doc.startDate, doc.endDate),
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const createAnnouncement = mutation({
  args: { input: announcementInputValidator },
  handler: async (ctx, { input }) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    const fields = resolveWriteFields(input, now);
    const image = await resolveImage(ctx, input);

    return await ctx.db.insert("announcements", {
      title: input.title,
      content: input.content,
      type: input.type,
      priority: input.priority,
      imageUrl: image.imageUrl,
      imageStorageId: image.imageStorageId,
      status: fields.status,
      isActive: fields.isActive,
      startDate: fields.startDate,
      endDate: fields.endDate,
      targetType: input.targetType,
      targetCompanyNames: input.targetCompanyNames,
      targetRoles: input.targetRoles,
      targetUserIds: input.targetUserIds,
      createdBy: admin._id,
      authorName: admin.name ?? "Équipe batibuild",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAnnouncement = mutation({
  args: { id: v.id("announcements"), input: announcementInputValidator },
  handler: async (ctx, { id, input }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Annonce introuvable");

    const now = Date.now();
    const fields = resolveWriteFields(input, now);
    const image = await resolveImage(ctx, input, existing);

    await ctx.db.patch(id, {
      title: input.title,
      content: input.content,
      type: input.type,
      priority: input.priority,
      imageUrl: image.imageUrl,
      imageStorageId: image.imageStorageId,
      status: fields.status,
      isActive: fields.isActive,
      startDate: fields.startDate,
      endDate: fields.endDate,
      targetType: input.targetType,
      targetCompanyNames: input.targetCompanyNames,
      targetRoles: input.targetRoles,
      targetUserIds: input.targetUserIds,
      updatedAt: now,
    });
  },
});

export const deleteAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Annonce introuvable");
    if (existing.imageStorageId) {
      await ctx.storage.delete(existing.imageStorageId).catch(() => undefined);
    }
    await ctx.db.delete(id);
  },
});

export const activateAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Annonce introuvable");
    const now = Date.now();
    const status = resolveStatus("published", true, existing.startDate, existing.endDate, now);
    await ctx.db.patch(id, { isActive: true, status, updatedAt: now });
  },
});

export const deactivateAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Annonce introuvable");
    await ctx.db.patch(id, { isActive: false, status: "disabled", updatedAt: Date.now() });
  },
});

export const duplicateAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Annonce introuvable");
    const now = Date.now();
    return await ctx.db.insert("announcements", {
      title: `${existing.title} (copie)`,
      content: existing.content,
      type: existing.type,
      priority: existing.priority,
      imageUrl: existing.imageUrl,
      status: "draft",
      isActive: false,
      startDate: existing.startDate,
      endDate: existing.endDate,
      targetType: existing.targetType,
      targetCompanyNames: existing.targetCompanyNames,
      targetRoles: existing.targetRoles,
      targetUserIds: existing.targetUserIds,
      displayOrder: (existing.displayOrder ?? 0) + 1,
      createdBy: existing.createdBy,
      authorName: existing.authorName,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Reorder announcements manually (drag & drop): orderedIds becomes the new display order. */
export const updateAnnouncementOrder = mutation({
  args: { orderedIds: v.array(v.id("announcements")) },
  handler: async (ctx, { orderedIds }) => {
    await requireAdmin(ctx);
    const now = Date.now();
    // Range 10, 20, 30… laisse de la place entre deux éléments.
    await Promise.all(
      orderedIds.map((id, index) =>
        ctx.db.patch(id, { displayOrder: (index + 1) * 10, updatedAt: now }),
      ),
    );
  },
});