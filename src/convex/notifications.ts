import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// Queries
// ============================================================================

/** Get notifications for the current user */
export const getMyNotifications = query({
  args: { unreadOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    if (args.unreadOnly) {
      return await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) =>
          q.eq("userId", user._id).eq("read", false),
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/** Get unread notification count */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false),
      )
      .collect();

    return notifications.length;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/** Mark a notification as read */
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Not found");
    }

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

/** Mark all notifications as read */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false),
      )
      .collect();

    for (const n of notifications) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});

/** Create a notification (internal) */
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("project_completed"),
      v.literal("price_update"),
      v.literal("subscription"),
      v.literal("report_ready"),
      v.literal("system"),
      v.literal("support_ticket_created"),
      v.literal("support_reply"),
      v.literal("support_ticket_resolved"),
      v.literal("expert_appointment"),
      v.literal("expert_urgent"),
      v.literal("quote_request"),
      v.literal("quote_update"),
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      link: args.link,
      createdAt: Date.now(),
    });
  },
});
