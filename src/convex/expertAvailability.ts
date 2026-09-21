import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { getFreePlanStatus, isProfilePaymentActive } from "./access";
import { scheduleEmailEvent, splitName } from "./emailNotifications";
import type { EmailVars } from "./emailNotifications";
import {
  formatSlotLabel,
  isDecidableRequest,
  isValidTimeValue,
  startOfDay,
} from "../lib/expertAvailability";

// ============================================================================
// DEMANDES DE RENDEZ-VOUS & DEMANDES URGENTES — experts (ProMarket)
//
// Le profil expert BatiBuild est la seule source de vérité : aucune duplication
// de compte ou de profil. Les demandes sont rattachées à l'`expertProfiles._id`
// existant, et le client est l'utilisateur BatiBuild connecté.
//
// Statuts (jamais de confirmation implicite) :
//   rendez-vous : pending → approved | declined | cancelled | completed
//   urgence     : pending → accepted | declined | completed | cancelled
//
// Toute demande suit le même parcours :
//   1. enregistrement côté serveur (statut `pending`, décision explicite) ;
//   2. notification dans le centre de notifications de l'expert ;
//   3. e-mail automatique à l'administrateur (modèle personnalisable dans
//      l'espace admin : « Demande de rendez-vous expert » / « Demande urgente
//      expert »).
// ============================================================================

/** Liens des notifications : la messagerie, onglet adapté au destinataire. */
export const EXPERT_MESSAGING_LINK = "/dashboard/messages?tab=received";
// Les rendez-vous/urgences client sont désormais affichés dans l'onglet
// « Services experts » (fusion des demandes et des rendez-vous).
export const CLIENT_MESSAGING_LINK = "/dashboard/messages?tab=services";

/**
 * Lien profond vers une demande précise : depuis le centre de notifications,
 * un clic ouvre la messagerie sur l'onglet « Demandes reçues » ET met la
 * demande concernée en évidence (`?request=<id>`).
 */
export function expertMessagingLink(requestId?: string): string {
  return requestId
    ? `${EXPERT_MESSAGING_LINK}&request=${requestId}`
    : EXPERT_MESSAGING_LINK;
}

/** Notification insérée dans le système existant (table `notifications`). */
async function notify(
  ctx: any,
  args: {
    userId: Id<"users">;
    type: "expert_appointment" | "expert_urgent";
    title: string;
    message: string;
    link?: string;
  },
) {
  try {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      link: args.link,
      createdAt: Date.now(),
    });
  } catch {
    /* la notification ne doit jamais bloquer la demande */
  }
}

/**
 * E-mail automatique à l'administrateur, rendu avec le modèle personnalisable
 * de l'espace admin et toutes les variables de la demande. Tous les comptes
 * administrateurs reçoivent une copie. Best-effort : l'échec d'un envoi ne
 * bloque jamais l'enregistrement de la demande.
 */
async function emailAdminsAboutRequest(
  ctx: any,
  params: {
    templateKey: "expert_appointment_request" | "expert_urgent_request";
    dedupeKey: string;
    vars: EmailVars;
  },
) {
  try {
    const admins = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("role"), "admin"))
      .collect();
    const to = admins.map((a: any) => a.email || "").filter(Boolean)[0];
    if (!to) return;

    await scheduleEmailEvent(ctx, {
      to,
      templateKey: params.templateKey,
      vars: params.vars,
      dedupeKey: params.dedupeKey,
      sendToAdmins: true,
    });
  } catch {
    /* la notification e-mail ne doit jamais bloquer la demande */
  }
}

/** Coordonnées du client, regroupées pour les modèles d'e-mail. */
function clientContact(phone?: string, email?: string): string {
  return [phone, email].filter(Boolean).join(" · ") || "—";
}

/** Trace un contact dans les statistiques existantes de l'expert. */
async function trackContact(ctx: any, expertId: Id<"expertProfiles">, now: number) {
  try {
    await ctx.db.insert("expertAnalytics", {
      expertId,
      date: now,
      eventType: "contact",
      source: "direct",
    });
  } catch {
    /* optionnel */
  }
}

/**
 * Règle ProMarket : seuls les experts inscrits, visibles et — quand l'offre
 * gratuite est désactivée — avec un abonnement actif peuvent recevoir des
 * demandes. La vérification est faite côté serveur, jamais seulement dans l'UI.
 */
async function assertProMarketEligible(ctx: any, expert: any) {
  if (!expert) throw new Error("Professionnel introuvable");
  if (!expert.isVisible) throw new Error("Ce professionnel n'est pas disponible");

  // Paiement obligatoire : sans offre gratuite ni abonnement actif non expiré,
  // le profil reste strictement invisible et ne peut pas recevoir de demandes.
  const free = await getFreePlanStatus(ctx);
  if (!(await isProfilePaymentActive(ctx, free.expertFree, expert, Date.now()))) {
    throw new Error("Ce professionnel n'est pas disponible");
  }
}

async function getExpertProfileOfCurrentUser(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user) return { user: null, profile: null };
  const profile = await ctx.db
    .query("expertProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .first();
  return { user, profile };
}

// ============================================================================
// Queries — côté client
// ============================================================================

/** Rendez-vous demandés par l'utilisateur connecté (les plus récents d'abord). */
export const getMyAppointments = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const rows = await ctx.db
      .query("expertAppointments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const expertIds = [...new Set(rows.map((r) => r.expertId))];
    const experts = await Promise.all(expertIds.map((id) => ctx.db.get(id)));
    const byId = new Map(expertIds.map((id, i) => [id, experts[i]]));

    return rows.map((r) => {
      const expert = byId.get(r.expertId);
      return {
        ...r,
        expertName: expert?.displayName ?? "Professionnel",
        expertCompanyName: expert?.companyName,
        expertPhone: expert?.phone,
        expertProfession: expert?.profession,
      };
    });
  },
});

/** Demandes urgentes envoyées par l'utilisateur connecté. */
export const getMyUrgentRequests = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const rows = await ctx.db
      .query("expertUrgentRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const expertIds = [...new Set(rows.map((r) => r.expertId))];
    const experts = await Promise.all(expertIds.map((id) => ctx.db.get(id)));
    const byId = new Map(expertIds.map((id, i) => [id, experts[i]]));

    return rows.map((r) => {
      const expert = byId.get(r.expertId);
      return {
        ...r,
        expertName: expert?.displayName ?? "Professionnel",
        expertCompanyName: expert?.companyName,
        expertPhone: expert?.phone,
        expertProfession: expert?.profession,
      };
    });
  },
});

// ============================================================================
// Queries — côté expert
// ============================================================================

/** Toutes les demandes de rendez-vous reçues par l'expert connecté. */
export const getExpertAppointments = query({
  handler: async (ctx) => {
    const { profile } = await getExpertProfileOfCurrentUser(ctx);
    if (!profile) return [];

    return await ctx.db
      .query("expertAppointments")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .order("desc")
      .collect();
  },
});

/** Toutes les demandes urgentes reçues par l'expert connecté. */
export const getExpertUrgentRequests = query({
  handler: async (ctx) => {
    const { profile } = await getExpertProfileOfCurrentUser(ctx);
    if (!profile) return [];

    return await ctx.db
      .query("expertUrgentRequests")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .order("desc")
      .collect();
  },
});

/** Nombre de demandes en attente de décision (badge de l'espace expert). */
export const pendingAvailabilityCount = query({
  handler: async (ctx) => {
    const { profile } = await getExpertProfileOfCurrentUser(ctx);
    if (!profile) return 0;

    const appointments = await ctx.db
      .query("expertAppointments")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();
    const urgent = await ctx.db
      .query("expertUrgentRequests")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();

    return (
      appointments.filter((r) => r.status === "pending").length +
      urgent.filter((r) => r.status === "pending").length
    );
  },
});

/**
 * Nombre de demandes reçues non encore consultées (badge de la messagerie et
 * du centre de notifications). Remis à zéro par `markAllRead`.
 */
export const receivedUnreadCount = query({
  handler: async (ctx) => {
    const { profile } = await getExpertProfileOfCurrentUser(ctx);
    if (!profile) return 0;

    const appointments = await ctx.db
      .query("expertAppointments")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();
    const urgent = await ctx.db
      .query("expertUrgentRequests")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();

    return (
      appointments.filter((r) => r.readAt === undefined).length +
      urgent.filter((r) => r.readAt === undefined).length
    );
  },
});

// ============================================================================
// Mutations — demandes (côté client)
// ============================================================================

/**
 * Demande de rendez-vous. Enregistrée avec le statut `pending` : elle n'est
 * jamais considérée comme confirmée avant l'approbation explicite de l'expert.
 */
export const requestAppointment = mutation({
  args: {
    expertId: v.id("expertProfiles"),
    preferredDate: v.number(),
    preferredTime: v.string(),
    reason: v.string(),
    message: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    projectName: v.optional(v.string()),
    userPhone: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const expert = await ctx.db.get(args.expertId);
    await assertProMarketEligible(ctx, expert);
    if (!expert) throw new Error("Professionnel introuvable");

    const now = Date.now();
    if (startOfDay(args.preferredDate) < startOfDay(now)) {
      throw new Error("La date souhaitée doit être aujourd'hui ou ultérieure");
    }
    if (!isValidTimeValue(args.preferredTime)) {
      throw new Error("Heure souhaitée invalide");
    }
    if (!args.reason.trim()) {
      throw new Error("Indiquez le motif de la demande");
    }

    // Idempotence : une même demande en attente (même expert, même créneau)
    // n'est jamais dupliquée par un double clic ou un rafraîchissement.
    const existing = await ctx.db
      .query("expertAppointments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const duplicate = existing.find(
      (r) =>
        r.expertId === args.expertId &&
        r.status === "pending" &&
        r.preferredDate === args.preferredDate &&
        r.preferredTime === args.preferredTime,
    );
    if (duplicate) {
      return { success: true, appointmentId: duplicate._id, alreadyExists: true };
    }

    const appointmentId = await ctx.db.insert("expertAppointments", {
      userId: user._id,
      expertId: args.expertId,
      projectId: args.projectId,
      projectName: args.projectName,
      preferredDate: args.preferredDate,
      preferredTime: args.preferredTime,
      reason: args.reason.trim(),
      message: args.message?.trim() || undefined,
      userPhone: args.userPhone || user.phone || undefined,
      userEmail: args.userEmail || user.email || undefined,
      userName: args.userName || user.name || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const slot = formatSlotLabel(args.preferredDate, args.preferredTime);
    const clientName = args.userName || user.name;

    await notify(ctx, {
      userId: expert.userId,
      type: "expert_appointment",
      title: "Nouvelle demande de rendez-vous",
      message: `Nouvelle demande de rendez-vous pour le ${slot}.`,
      link: expertMessagingLink(appointmentId),
    });

    // E-mail automatique à l'administrateur (modèle personnalisable).
    const { nom, prenom } = splitName(clientName);
    await emailAdminsAboutRequest(ctx, {
      templateKey: "expert_appointment_request",
      dedupeKey: `expert_appointment_request:${appointmentId}`,
      vars: {
        nom,
        prenom,
        nomEntreprise: expert.companyName || expert.displayName,
        entreprise: expert.displayName,
        nomProjet: args.projectName || "—",
        creneau: slot,
        motif: args.reason.trim(),
        detailsDemande: clientContact(
          args.userPhone || user.phone,
          args.userEmail || user.email,
        ),
        message: args.message?.trim() || "—",
      },
    });

    await trackContact(ctx, args.expertId, now);

    return { success: true, appointmentId };
  },
});

/** Annulation d'un rendez-vous par le client (ou par l'expert, même API). */
export const cancelAppointment = mutation({
  args: {
    appointmentId: v.id("expertAppointments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Demande introuvable");

    const expert = await ctx.db.get(appointment.expertId);
    const isOwner = appointment.userId === user._id;
    const isExpert = expert?.userId === user._id;
    if (!isOwner && !isExpert) throw new Error("Non autorisé");
    if (appointment.status === "cancelled" || appointment.status === "completed") {
      return { success: true, alreadyClosed: true };
    }

    const now = Date.now();
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      decisionMessage: args.reason,
      decidedAt: now,
      updatedAt: now,
    });

    const slot = formatSlotLabel(appointment.preferredDate, appointment.preferredTime);
    if (isOwner && expert) {
      await notify(ctx, {
        userId: expert.userId,
        type: "expert_appointment",
        title: "Annulation d'un rendez-vous",
        message: `Le client a annulé le rendez-vous prévu le ${slot}.`,
        link: EXPERT_MESSAGING_LINK,
      });
    } else {
      await notify(ctx, {
        userId: appointment.userId,
        type: "expert_appointment",
        title: "Rendez-vous annulé",
        message: `Votre rendez-vous du ${slot} a été annulé.`,
        link: CLIENT_MESSAGING_LINK,
      });
    }

    return { success: true };
  },
});

/** Marque le rendez-vous comme honoré (client ou expert). */
export const completeAppointment = mutation({
  args: { appointmentId: v.id("expertAppointments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Demande introuvable");
    const expert = await ctx.db.get(appointment.expertId);
    if (appointment.userId !== user._id && expert?.userId !== user._id) {
      throw new Error("Non autorisé");
    }
    if (appointment.status !== "approved") {
      throw new Error("Seul un rendez-vous confirmé peut être marqué comme terminé");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "completed",
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// ============================================================================
// Mutations — décision de l'expert
// ============================================================================

/** Approuve ou décline une demande de rendez-vous. Le client est notifié. */
export const respondAppointment = mutation({
  args: {
    appointmentId: v.id("expertAppointments"),
    approve: v.boolean(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, profile } = await getExpertProfileOfCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");
    if (!profile) throw new Error("Profil expert introuvable");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Demande introuvable");
    if (appointment.expertId !== profile._id) throw new Error("Non autorisé");
    if (!isDecidableRequest(appointment.status)) {
      return { success: true, alreadyDecided: true };
    }

    const now = Date.now();
    const slot = formatSlotLabel(appointment.preferredDate, appointment.preferredTime);

    await ctx.db.patch(args.appointmentId, {
      status: args.approve ? "approved" : "declined",
      decisionMessage: args.message?.trim() || undefined,
      decidedAt: now,
      updatedAt: now,
    });

    await notify(ctx, {
      userId: appointment.userId,
      type: "expert_appointment",
      title: args.approve ? "Rendez-vous confirmé" : "Demande déclinée",
      message: args.approve
        ? `Votre rendez-vous avec ${profile.displayName} est confirmé pour le ${slot}.`
        : "Le professionnel n'est pas disponible pour cette date.",
      link: CLIENT_MESSAGING_LINK,
    });

    return { success: true, status: args.approve ? "approved" : "declined" };
  },
});

// ============================================================================
// Mutations — demandes urgentes
// ============================================================================

/** Demande d'intervention urgente (disponible seulement si l'expert l'accepte). */
export const requestUrgent = mutation({
  args: {
    expertId: v.id("expertProfiles"),
    description: v.string(),
    region: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    projectName: v.optional(v.string()),
    userPhone: v.string(),
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const expert = await ctx.db.get(args.expertId);
    await assertProMarketEligible(ctx, expert);
    if (!expert) throw new Error("Professionnel introuvable");
    if (expert.acceptsUrgent !== true) {
      throw new Error("Ce professionnel n'accepte pas les demandes urgentes");
    }
    if (!args.description.trim()) throw new Error("Décrivez votre besoin urgent");

    const now = Date.now();

    const existing = await ctx.db
      .query("expertUrgentRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const duplicate = existing.find(
      (r) => r.expertId === args.expertId && r.status === "pending",
    );
    if (duplicate) {
      return { success: true, urgentId: duplicate._id, alreadyExists: true };
    }

    const urgentId = await ctx.db.insert("expertUrgentRequests", {
      userId: user._id,
      expertId: args.expertId,
      projectId: args.projectId,
      projectName: args.projectName,
      description: args.description.trim(),
      region: args.region,
      userPhone: args.userPhone,
      userEmail: args.userEmail || user.email || undefined,
      userName: args.userName || user.name || undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Notification prioritaire : le préfixe ⚡ et le type dédié la distinguent
    // des demandes de devis classiques.
    await notify(ctx, {
      userId: expert.userId,
      type: "expert_urgent",
      title: "⚡ Nouvelle demande urgente",
      message: `${args.userName || user.name || "Un client"} demande une intervention rapide${
        args.region ? ` — ${args.region}` : ""
      } : ${args.description.trim().slice(0, 120)}`,
      link: expertMessagingLink(urgentId),
    });

    // E-mail automatique à l'administrateur (modèle personnalisable).
    const { nom, prenom } = splitName(args.userName || user.name);
    await emailAdminsAboutRequest(ctx, {
      templateKey: "expert_urgent_request",
      dedupeKey: `expert_urgent_request:${urgentId}`,
      vars: {
        nom,
        prenom,
        nomEntreprise: expert.companyName || expert.displayName,
        entreprise: expert.displayName,
        nomProjet: args.projectName || "—",
        motif: args.description.trim(),
        region: args.region || "—",
        detailsDemande: clientContact(args.userPhone, args.userEmail || user.email),
        message: "—",
      },
    });

    await trackContact(ctx, args.expertId, now);

    return { success: true, urgentId };
  },
});

/** Accepte ou refuse une demande urgente. La décision est immédiate pour le client. */
export const respondUrgent = mutation({
  args: {
    urgentId: v.id("expertUrgentRequests"),
    accept: v.boolean(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, profile } = await getExpertProfileOfCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");
    if (!profile) throw new Error("Profil expert introuvable");

    const urgent = await ctx.db.get(args.urgentId);
    if (!urgent) throw new Error("Demande introuvable");
    if (urgent.expertId !== profile._id) throw new Error("Non autorisé");
    if (!isDecidableRequest(urgent.status)) {
      return { success: true, alreadyDecided: true };
    }

    const now = Date.now();
    await ctx.db.patch(args.urgentId, {
      status: args.accept ? "accepted" : "declined",
      decisionMessage: args.message?.trim() || undefined,
      decidedAt: now,
      updatedAt: now,
    });

    await notify(ctx, {
      userId: urgent.userId,
      type: "expert_urgent",
      title: args.accept ? "Demande urgente acceptée" : "Demande urgente refusée",
      message: args.accept
        ? `${profile.displayName} accepte votre demande urgente et vous contactera rapidement.`
        : `${profile.displayName} ne peut pas prendre en charge votre demande urgente.`,
      link: CLIENT_MESSAGING_LINK,
    });

    return { success: true, status: args.accept ? "accepted" : "declined" };
  },
});

/** Annulation d'une demande urgente par le client. */
export const cancelUrgent = mutation({
  args: { urgentId: v.id("expertUrgentRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non authentifié");

    const urgent = await ctx.db.get(args.urgentId);
    if (!urgent) throw new Error("Demande introuvable");
    if (urgent.userId !== user._id) throw new Error("Non autorisé");
    if (urgent.status === "completed" || urgent.status === "cancelled") {
      return { success: true, alreadyClosed: true };
    }

    const now = Date.now();
    await ctx.db.patch(args.urgentId, {
      status: "cancelled",
      decidedAt: now,
      updatedAt: now,
    });

    const expert = await ctx.db.get(urgent.expertId);
    if (expert) {
      await notify(ctx, {
        userId: expert.userId,
        type: "expert_urgent",
        title: "Demande urgente annulée",
        message: "Le client a annulé sa demande urgente.",
        link: EXPERT_MESSAGING_LINK,
      });
    }

    return { success: true };
  },
});

// ============================================================================
// Badges « lu » (les listes se vident comme les autres demandes de l'app)
// ============================================================================

export const markAllRead = mutation({
  handler: async (ctx) => {
    const { user, profile } = await getExpertProfileOfCurrentUser(ctx);
    if (!user || !profile) return;

    const now = Date.now();
    const appointments = await ctx.db
      .query("expertAppointments")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();
    for (const a of appointments) {
      if (a.readAt === undefined) await ctx.db.patch(a._id, { readAt: now });
    }
    const urgent = await ctx.db
      .query("expertUrgentRequests")
      .withIndex("by_expert", (q) => q.eq("expertId", profile._id))
      .collect();
    for (const u of urgent) {
      if (u.readAt === undefined) await ctx.db.patch(u._id, { readAt: now });
    }

    // Consulter les demandes dans la messagerie vide aussi le centre de
    // notifications : une seule action de lecture pour l'utilisateur, les deux
    // indicateurs restent donc cohérents.
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();
    for (const n of unread) {
      if (n.type === "expert_appointment" || n.type === "expert_urgent") {
        await ctx.db.patch(n._id, { read: true });
      }
    }
  },
});

// ============================================================================
// Rappels automatiques — « Rendez-vous à venir » (cron quotidien)
// ============================================================================

/**
 * Envoie un rappel 24 h avant un rendez-vous confirmé, une seule fois
 * (`reminderSentAt` garantit l'idempotence du cron).
 */
export const sendAppointmentReminders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;

    const approved = await ctx.db
      .query("expertAppointments")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    let sent = 0;
    for (const appointment of approved) {
      if (appointment.reminderSentAt !== undefined) continue;
      if (appointment.preferredDate < startOfDay(now)) continue;
      if (appointment.preferredDate > horizon) continue;

      const slot = formatSlotLabel(appointment.preferredDate, appointment.preferredTime);
      const expert = await ctx.db.get(appointment.expertId);

      await ctx.db.patch(appointment._id, {
        reminderSentAt: now,
        updatedAt: now,
      });

      await notify(ctx, {
        userId: appointment.userId,
        type: "expert_appointment",
        title: "Rappel de rendez-vous",
        message: `Rappel : votre rendez-vous${
          expert ? ` avec ${expert.displayName}` : ""
        } est prévu le ${slot}.`,
        link: CLIENT_MESSAGING_LINK,
      });

      if (expert) {
        await notify(ctx, {
          userId: expert.userId,
          type: "expert_appointment",
          title: "Rendez-vous à venir",
          message: `Vous avez un rendez-vous prévu le ${slot}${
            appointment.userName ? ` avec ${appointment.userName}` : ""
          }.`,
          link: EXPERT_MESSAGING_LINK,
        });
      }

      sent += 1;
    }

    return { sent };
  },
});
