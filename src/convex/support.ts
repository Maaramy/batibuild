import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { scheduleEmailEvent, splitName } from "./emailNotifications";
import type { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// Support & Messagerie — tickets + conversations temps réel
// ============================================================================

export const TICKET_CATEGORIES = [
  "technical",
  "account",
  "billing",
  "project",
  "feature",
  "other",
] as const;

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "awaiting_user",
  "resolved",
  "closed",
] as const;

export const TICKET_CATEGORY_LABELS: Record<
  (typeof TICKET_CATEGORIES)[number],
  string
> = {
  technical: "Problème technique",
  account: "Compte utilisateur",
  billing: "Abonnement et paiement",
  project: "Projet",
  feature: "Fonctionnalité",
  other: "Autre",
};

export const TICKET_PRIORITY_LABELS: Record<
  (typeof TICKET_PRIORITIES)[number],
  string
> = {
  low: "Faible",
  normal: "Normale",
  high: "Élevée",
  urgent: "Urgente",
};

export const TICKET_STATUS_LABELS: Record<
  (typeof TICKET_STATUSES)[number],
  string
> = {
  open: "Nouveau",
  in_progress: "En cours",
  awaiting_user: "En attente utilisateur",
  resolved: "Résolu",
  closed: "Fermé",
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Utilisateur habilité à répondre aux tickets (admin, modérateur ou agent support). */
async function getSupportAgent(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user || user.status === "disabled") return null;
  return user;
}

function isSupportAgent(user: Doc<"users"> | null): boolean {
  if (!user) return false;
  return (
    user.role === "admin" ||
    user.role === "moderator" ||
    user.role === ("support_agent" as any)
  );
}

/** Insère une notification interne (best-effort, ne bloque jamais le flux). */
async function pushNotification(
  ctx: any,
  params: {
    userId: Id<"users">;
    type:
      | "support_ticket_created"
      | "support_reply"
      | "support_ticket_resolved"
      | "system";
    title: string;
    message: string;
    link?: string;
  },
) {
  try {
    await ctx.db.insert("notifications", {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      read: false,
      createdAt: Date.now(),
    });
  } catch {
    // best-effort
  }
}

// ----------------------------------------------------------------------------
// Queries — utilisateur
// ----------------------------------------------------------------------------

/** Tickets de l'utilisateur courant, triés par dernière activité. */
export const getMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    return tickets.sort(
      (a: Doc<"supportTickets">, b: Doc<"supportTickets">) =>
        b.lastActivityAt - a.lastActivityAt,
    );
  },
});

/** Nombre total de messages non lus pour l'utilisateur courant (badge du menu Support). */
export const myUnreadTotal = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const tickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    return tickets.reduce(
      (sum, t) => sum + (t.userUnreadCount ?? 0),
      0,
    );
  },
});

/** Messages d'un ticket — accessible au propriétaire et aux agents support. */
export const getTicketMessages = query({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return null;

    const isOwner = ticket.userId === user._id;
    if (!isOwner && !isSupportAgent(user)) return null;

    const msgs = await ctx.db
      .query("supportMessages")
      .withIndex("by_ticket", (q: any) => q.eq("ticketId", args.ticketId))
      .collect();

    // Résolution serveur des URL de pièces jointes (stockage Convex)
    // + nom de l'expéditeur (pour afficher l'auteur exact côté admin).
    return await Promise.all(
      msgs.map(async (m: Doc<"supportMessages">) => {
        const sender =
          m.senderRole === "support" ? await ctx.db.get(m.senderId) : null;
        return {
          ...m,
          attachmentUrl: m.attachmentStorageId
            ? ((await ctx.storage.getUrl(m.attachmentStorageId)) ?? undefined)
            : undefined,
          senderName: m.senderRole === "user" ? undefined : (sender?.name ?? "Équipe Support"),
        };
      }),
    );
  },
});

// ----------------------------------------------------------------------------
// Queries — administration
// ----------------------------------------------------------------------------

/** Tous les tickets (admin / modérateur / agent support), avec infos utilisateur. */
export const adminGetTickets = query({
  args: {},
  handler: async (ctx) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || !isSupportAgent(agent)) return [];

    const tickets = await ctx.db.query("supportTickets").collect();
    tickets.sort(
      (a: Doc<"supportTickets">, b: Doc<"supportTickets">) =>
        b.lastActivityAt - a.lastActivityAt,
    );

    return await Promise.all(
      tickets.map(async (t: Doc<"supportTickets">) => {
        const u = await ctx.db.get(t.userId);
        const assignee = t.assignedTo ? await ctx.db.get(t.assignedTo) : null;
        const lastMessage = await ctx.db
          .query("supportMessages")
          .withIndex("by_ticket", (q: any) => q.eq("ticketId", t._id))
          .order("desc")
          .first();
        return {
          ...t,
          ticketNumber: t.ticketNumber ?? `SUP-${t._id.slice(-6)}`,
          userName: u?.name ?? null,
          userEmail: u?.email ?? null,
          userPhone: u?.phone ?? null,
          userImage: u?.image ?? null,
          userCompany: u?.company ?? null,
          assigneeName: assignee?.name ?? null,
          lastMessageBody: lastMessage?.body ?? null,
        };
      }),
    );
  },
});

/** Statistiques support (en-tête de l'onglet admin). */
export const adminGetStats = query({
  args: {},
  handler: async (ctx) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || !isSupportAgent(agent)) {
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        awaitingUser: 0,
        resolved: 0,
        closed: 0,
        urgent: 0,
      };
    }
    const tickets = await ctx.db.query("supportTickets").collect();
    return {
      total: tickets.length,
      open: tickets.filter((t: Doc<"supportTickets">) => t.status === "open").length,
      inProgress: tickets.filter(
        (t: Doc<"supportTickets">) => t.status === "in_progress",
      ).length,
      awaitingUser: tickets.filter(
        (t: Doc<"supportTickets">) => t.status === "awaiting_user",
      ).length,
      resolved: tickets.filter(
        (t: Doc<"supportTickets">) => t.status === "resolved",
      ).length,
      closed: tickets.filter((t: Doc<"supportTickets">) => t.status === "closed")
        .length,
      urgent: tickets.filter((t: Doc<"supportTickets">) => t.priority === "urgent")
        .length,
    };
  },
});

// ----------------------------------------------------------------------------
// Mutations — utilisateur
// ----------------------------------------------------------------------------

/** Création d'une demande de support (+ message initial, notif & e-mail admins). */
export const createTicket = mutation({
  args: {
    subject: v.string(),
    category: v.union(
      v.literal("technical"),
      v.literal("account"),
      v.literal("billing"),
      v.literal("project"),
      v.literal("feature"),
      v.literal("other"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    message: v.string(),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    attachmentSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Authentification requise");

    const subject = args.subject.trim();
    const body = args.message.trim();
    if (!subject) throw new Error("Le sujet est obligatoire");
    if (!body) throw new Error("Le message est obligatoire");

    const now = Date.now();

    // Numérotation séquentielle des tickets (SUP-000124, ...)
    const counter = await ctx.db
      .query("supportCounters")
      .withIndex("by_kind", (q: any) => q.eq("kind", "ticket"))
      .first();
    const nextNumber = (counter?.value ?? 0) + 1;
    if (counter) {
      await ctx.db.patch(counter._id, { value: nextNumber });
    } else {
      await ctx.db.insert("supportCounters", { kind: "ticket", value: nextNumber });
    }
    const ticketNumber = `SUP-${String(nextNumber).padStart(6, "0")}`;

    const ticketId = await ctx.db.insert("supportTickets", {
      userId: user._id,
      subject,
      category: args.category,
      priority: args.priority,
      status: "open",
      ticketNumber,
      createdAt: now,
      lastActivityAt: now,
      userUnreadCount: 0,
      adminUnreadCount: 1,
    });

    await ctx.db.insert("supportMessages", {
      ticketId,
      senderId: user._id,
      senderRole: "user",
      body,
      attachmentStorageId: args.attachmentStorageId,
      attachmentName: args.attachmentName,
      attachmentType: args.attachmentType,
      attachmentSize: args.attachmentSize,
      createdAt: now,
    });

    // Notifications admins (plateforme)
    const admins = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("role"), "admin"))
      .collect();
    for (const a of admins) {
      await pushNotification(ctx, {
        userId: a._id,
        type: args.priority === "urgent" ? "support_ticket_created" : "support_ticket_created",
        title:
          args.priority === "urgent"
            ? "🚨 Nouvelle demande de support URGENTE"
            : "Nouvelle demande de support",
        message: `${user.name || user.email} — ${subject}`,
        link: `/dashboard/admin?tab=support&ticket=${ticketId}`,
      });
    }

    // E-mail de notification à l'équipe support (système e-mail existant)
    const { nom, prenom } = splitName(user.name);
    await scheduleEmailEvent(ctx, {
      to: admins[0]?.email ?? "",
      templateKey: "support_ticket_created",
      vars: {
        nom,
        prenom,
        nomEntreprise: user.company ?? "",
        nomProjet: subject,
        detailsDemande: body.slice(0, 600),
        typeProjet: TICKET_CATEGORY_LABELS[args.category],
        message: TICKET_PRIORITY_LABELS[args.priority],
      },
      dedupeKey: `support_ticket_created:${ticketId}`,
      sendToAdmins: true,
    });

    return ticketId;
  },
});

/** Envoi d'un message par l'utilisateur propriétaire du ticket. */
export const sendUserMessage = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    body: v.string(),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    attachmentSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Authentification requise");

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Demande introuvable");
    if (ticket.userId !== user._id) throw new Error("Accès refusé");
    if (ticket.status === "closed") {
      throw new Error("Cette demande est fermée — créez une nouvelle demande");
    }

    const body = args.body.trim();
    if (!body && !args.attachmentStorageId) {
      throw new Error("Le message est vide");
    }

    const now = Date.now();
    await ctx.db.insert("supportMessages", {
      ticketId: args.ticketId,
      senderId: user._id,
      senderRole: "user",
      body,
      attachmentStorageId: args.attachmentStorageId,
      attachmentName: args.attachmentName,
      attachmentType: args.attachmentType,
      attachmentSize: args.attachmentSize,
      createdAt: now,
    });

    // L'utilisateur répond → le ticket redevient actif (réouverture implicite)
    const nextStatus =
      ticket.status === "resolved" || ticket.status === "awaiting_user"
        ? "open"
        : ticket.status;
    // Une réponse utilisateur rouvre le ticket : il n'est ni résolu ni fermé.
    await ctx.db.patch(args.ticketId, {
      lastActivityAt: now,
      status: nextStatus as any,
      adminUnreadCount: (ticket.adminUnreadCount ?? 0) + 1,
      resolvedAt: undefined,
      closedAt: undefined,
    });
  },
});

/** Marquer tous les messages du ticket comme lus pour l'utilisateur courant. */
export const markTicketRead = mutation({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Authentification requise");

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return;
    const isOwner = ticket.userId === user._id;
    if (!isOwner && !isSupportAgent(user)) return;

    if (isOwner) {
      await ctx.db.patch(args.ticketId, { userUnreadCount: 0 });
    } else {
      await ctx.db.patch(args.ticketId, { adminUnreadCount: 0 });
    }
  },
});

// ----------------------------------------------------------------------------
// Mutations — administration (admin / modérateur / agent support)
// ----------------------------------------------------------------------------

/** Réponse de l'équipe support (notifs + e-mail à l'utilisateur). */
export const adminReply = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    body: v.string(),
    attachmentStorageId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    attachmentSize: v.optional(v.number()),
    resolve: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || !isSupportAgent(agent)) {
      throw new Error("Accès réservé à l'équipe support");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Demande introuvable");

    const body = args.body.trim();
    if (!body && !args.attachmentStorageId) {
      throw new Error("Le message est vide");
    }

    const now = Date.now();
    await ctx.db.insert("supportMessages", {
      ticketId: args.ticketId,
      senderId: agent._id,
      senderRole: "support",
      body,
      attachmentStorageId: args.attachmentStorageId,
      attachmentName: args.attachmentName,
      attachmentType: args.attachmentType,
      attachmentSize: args.attachmentSize,
      createdAt: now,
    });

    const newStatus = args.resolve
      ? "resolved"
      : ticket.status === "resolved" || ticket.status === "closed"
        ? ticket.status
        : "in_progress";

    const patch: Record<string, unknown> = {
      lastActivityAt: now,
      status: newStatus as any,
      userUnreadCount: (ticket.userUnreadCount ?? 0) + 1,
    };
    if (newStatus === "resolved") patch.resolvedAt = now;
    if (newStatus !== "closed") patch.closedAt = undefined;
    await ctx.db.patch(args.ticketId, patch);

    // Notification plateforme pour l'utilisateur
    await pushNotification(ctx, {
      userId: ticket.userId,
      type: args.resolve ? "support_ticket_resolved" : "support_reply",
      title: args.resolve
        ? "✅ Votre demande de support est résolue"
        : "💬 L'équipe support a répondu à votre demande",
      message: ticket.subject,
      link: `/dashboard/support?ticket=${ticket._id}`,
    });

    // E-mail de notification à l'utilisateur (système e-mail existant)
    const owner = await ctx.db.get(ticket.userId);
    const { nom, prenom } = splitName(owner?.name);
    await scheduleEmailEvent(ctx, {
      to: owner?.email ?? "",
      recipientName: owner?.name ?? undefined,
      templateKey: "support_reply",
      vars: {
        nom,
        prenom,
        message: body.slice(0, 600),
        nomProjet: ticket.subject,
        detailsDemande: TICKET_STATUS_LABELS[newStatus as keyof typeof TICKET_STATUS_LABELS] ?? "",
      },
      dedupeKey: `support_reply:${ticket._id}:${now}`,
    });
  },
});

/** Modifier statut et/ou priorité d'un ticket. */
export const adminUpdateTicket = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("closed"),
      ),
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || !isSupportAgent(agent)) {
      throw new Error("Accès réservé à l'équipe support");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Demande introuvable");

    const now = Date.now();
    const patch: Record<string, unknown> = {};
    if (args.status && args.status !== ticket.status) {
      patch.status = args.status;
      // Horodatages métier (résolution / fermeture / réouverture)
      if (args.status === "resolved") {
        patch.resolvedAt = ticket.resolvedAt ?? now;
        patch.closedAt = undefined;
      } else if (args.status === "closed") {
        patch.closedAt = ticket.closedAt ?? now;
        if (!ticket.resolvedAt && ticket.status !== "resolved") {
          patch.resolvedAt = undefined;
        }
      } else {
        patch.resolvedAt = undefined;
        patch.closedAt = undefined;
      }
    }
    if (args.priority && args.priority !== ticket.priority) {
      patch.priority = args.priority;
    }
    if (Object.keys(patch).length === 0) return;
    patch.lastActivityAt = now;
    await ctx.db.patch(args.ticketId, patch);

    // Notifier l'utilisateur d'un changement de statut
    if (patch.status) {
      const label =
        TICKET_STATUS_LABELS[patch.status as keyof typeof TICKET_STATUS_LABELS];
      await pushNotification(ctx, {
        userId: ticket.userId,
        type: patch.status === "resolved" ? "support_ticket_resolved" : "system",
        title:
          patch.status === "resolved"
            ? "✅ Votre demande de support est résolue"
            : `Statut de votre demande : ${label}`,
        message: ticket.subject,
        link: `/dashboard/support?ticket=${ticket._id}`,
      });
    }
  },
});

/** Assigner un ticket à un membre de l'équipe support (admin / modérateur / agent). */
export const assignSupportTicket = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || !isSupportAgent(agent)) {
      throw new Error("Accès réservé à l'équipe support");
    }
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Demande introuvable");
    await ctx.db.patch(args.ticketId, {
      assignedTo: args.assignedTo,
      lastActivityAt: Date.now(),
    });
  },
});

/** Liste des membres de l'équipe support (pour le sélecteur d'assignation). */
export const adminGetSupportAgents = query({
  args: {},
  handler: async (ctx) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || !isSupportAgent(agent)) return [];
    const users = await ctx.db.query("users").collect();
    return users
      .filter(
        (u: Doc<"users">) =>
          u.status !== "disabled" &&
          (u.role === "admin" ||
            u.role === "moderator" ||
            u.role === ("support_agent" as any)),
      )
      .map((u: Doc<"users">) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
      }));
  },
});

/** Ajouter une note interne (jamais visible par l'utilisateur). */
export const addInternalSupportNote = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || !isSupportAgent(agent)) {
      throw new Error("Accès réservé à l'équipe support");
    }
    const body = args.body.trim();
    if (!body) throw new Error("La note est vide");
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Demande introuvable");
    await ctx.db.insert("supportNotes", {
      ticketId: args.ticketId,
      authorId: agent._id,
      authorName: agent.name,
      body,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.ticketId, { lastActivityAt: Date.now() });
  },
});

/** Notes internes d'un ticket — équipe support uniquement. */
export const getInternalSupportNotes = query({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || !isSupportAgent(agent)) return null;
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return null;
    return ctx.db
      .query("supportNotes")
      .withIndex("by_ticket", (q: any) => q.eq("ticketId", args.ticketId))
      .order("asc")
      .collect();
  },
});

/** Supprimer un ticket et tous ses messages (admin uniquement). */
export const adminDeleteTicket = mutation({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || agent.role !== "admin") {
      throw new Error("Accès réservé aux administrateurs");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Demande introuvable");

    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_ticket", (q: any) => q.eq("ticketId", args.ticketId))
      .collect();

    // Nettoyage des notes internes associées
    const notes = await ctx.db
      .query("supportNotes")
      .withIndex("by_ticket", (q: any) => q.eq("ticketId", args.ticketId))
      .collect();
    for (const n of notes) {
      await ctx.db.delete(n._id);
    }

    // Nettoyage des pièces jointes stockées
    for (const m of messages) {
      if (m.attachmentStorageId) {
        try {
          await ctx.storage.delete(m.attachmentStorageId);
        } catch {
          // fichier déjà supprimé
        }
      }
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.ticketId);
  },
});

// ----------------------------------------------------------------------------
// Compteur temps réel (badge menu / onglet admin)
// ----------------------------------------------------------------------------

export const adminUnreadTotal = query({
  args: {},
  handler: async (ctx) => {
    const agent = await getSupportAgent(ctx);
    if (!agent || !isSupportAgent(agent)) return 0;
    const tickets = await ctx.db.query("supportTickets").collect();
    // Compteur temps réel : messages non lus sur tous les tickets non fermés
    return tickets
      .filter((t: Doc<"supportTickets">) => t.status !== "closed")
      .reduce(
        (s: number, t: Doc<"supportTickets">) => s + (t.adminUnreadCount ?? 0),
        0,
      );
  },
});

// ----------------------------------------------------------------------------
// Notification interne (utilisée par d'autres modules si besoin)
// ----------------------------------------------------------------------------

export const internalPushNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("support_ticket_created"),
      v.literal("support_reply"),
      v.literal("support_ticket_resolved"),
      v.literal("system"),
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await pushNotification(ctx, args);
  },
});
