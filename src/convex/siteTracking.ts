import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { readFlag } from "./featureFlags";
import { assertPaymentMethodEnabled } from "./paymentMethodStates";
import { issueInvoice } from "./invoices";
import { resolveProfileRole } from "./profileSubscription";
import { scheduleAdminNotification, formatDateFr, splitName } from "./emailNotifications";
import { projectCategoryValidator, regionValidator } from "./schema";
import {
  analyzeSiteRisk,
  budgetSummary,
  materialLine,
  phasesForProjectType,
  schedulePhases,
  taskProgress,
  weightedProgress,
} from "../lib/siteTracking";

// ============================================================================
// GESTION & SUIVI DE CHANTIER — backend Convex
// ----------------------------------------------------------------------------
// Règles structurantes :
//   • module PAYANT : chaque écriture exige une cotisation active délivrée par
//     l'administrateur (même parcours que la cotisation Client Pro : demande →
//     justificatif → validation). Les administrateurs gardent l'accès pour
//     tester sans payer.
//   • ISOLATION : un chantier n'est lisible/modifiable que par son propriétaire
//     ou par un intervenant explicitement autorisé sur ce chantier, et jamais
//     au-delà des permissions qui lui ont été accordées.
//   • AUCUNE duplication des estimations : le chantier issu d'un projet garde
//     une RÉFÉRENCE (`projectId`) et relit les données du projet. Seuls les
//     éléments de suivi (tâches, dépenses, matériaux, photos) sont persistés.
//   • HISTORIQUE : chaque modification structurante est journalisée dans
//     `siteAuditLogs`.
// ============================================================================

const DAY = 86_400_000;
const DEFAULT_PRICE = 120;
const DEFAULT_DURATION_DAYS = 180;

/** Clés de permission d'un intervenant (le propriétaire les a toutes). */
export const SITE_PERMISSIONS = [
  "progress",
  "daily",
  "budget",
  "materials",
  "quality",
  "team",
  "reports",
] as const;

export type SitePermission = (typeof SITE_PERMISSIONS)[number];

const permissionValidator = v.union(
  ...SITE_PERMISSIONS.map((key) => v.literal(key)),
);

const siteStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived"),
);

const taskStatusValidator = v.union(
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done"),
  v.literal("blocked"),
);

const natureValidator = v.union(
  v.literal("materiaux"),
  v.literal("main_oeuvre"),
  v.literal("equipement"),
  v.literal("autre"),
);

const stakeholderRoleValidator = v.union(
  v.literal("architecte"),
  v.literal("ingenieur"),
  v.literal("entrepreneur"),
  v.literal("chef_chantier"),
  v.literal("artisan"),
  v.literal("electricien"),
  v.literal("plombier"),
  v.literal("fournisseur"),
);

const inspectionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("passed"),
  v.literal("failed"),
);

const reservationValidator = v.object({
  label: v.string(),
  severity: v.union(v.literal("mineure"), v.literal("majeure"), v.literal("critique")),
  resolved: v.boolean(),
  action: v.optional(v.string()),
  resolvedAt: v.optional(v.number()),
});

// ============================================================================
// Configuration & cotisation
// ============================================================================

function isAdminUser(user: Doc<"users"> | null): boolean {
  return !!user && (user.role === "admin" || user.role === "moderator");
}

function requireAdmin(user: Doc<"users"> | null): Doc<"users"> {
  if (!isAdminUser(user) || !user) throw new Error("Unauthorized: Admin access required");
  return user as Doc<"users">;
}

async function readConfig(ctx: QueryCtx | MutationCtx) {
  const row = await ctx.db.query("siteModuleConfig").order("desc").first();
  return {
    enabled: row?.enabled ?? true,
    price: Math.max(0, row?.price ?? DEFAULT_PRICE),
    currency: row?.currency ?? "TND",
    durationDays: Math.max(1, row?.durationDays ?? DEFAULT_DURATION_DAYS),
    updatedAt: row?.updatedAt ?? null,
  };
}

/** Cotisation de référence : la plus récente non annulée de l'utilisateur. */
async function latestCotisation(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("siteCotisations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .collect();
  return rows.find((row) => row.status !== "cancelled") ?? null;
}

interface AccessSnapshot {
  allowed: boolean;
  reason:
    | "ok"
    | "module_disabled"
    | "no_subscription"
    | "pending"
    | "expired"
    | "refused"
    | "admin";
  status: "none" | "pending" | "active" | "expired" | "refused";
  endDate: number | null;
  daysRemaining: number;
  price: number;
  currency: string;
  durationDays: number;
  moduleEnabled: boolean;
}

/** Source de vérité unique de l'accès au module. */
async function accessFor(ctx: QueryCtx | MutationCtx, user: Doc<"users"> | null): Promise<AccessSnapshot> {
  const config = await readConfig(ctx);
  const base = {
    price: config.price,
    currency: config.currency,
    durationDays: config.durationDays,
    moduleEnabled: config.enabled,
  };

  if (!user) {
    return {
      ...base,
      allowed: false,
      reason: "no_subscription",
      status: "none",
      endDate: null,
      daysRemaining: 0,
    };
  }
  if (!config.enabled) {
    return {
      ...base,
      allowed: false,
      reason: "module_disabled",
      status: "none",
      endDate: null,
      daysRemaining: 0,
    };
  }
  if (isAdminUser(user)) {
    const cotisation = await latestCotisation(ctx, user._id);
    return {
      ...base,
      allowed: true,
      reason: "admin",
      status: cotisation?.status === "active" ? "active" : "none",
      endDate: cotisation?.endDate ?? null,
      daysRemaining: 0,
    };
  }

  const cotisation = await latestCotisation(ctx, user._id);
  if (!cotisation) {
    return { ...base, allowed: false, reason: "no_subscription", status: "none", endDate: null, daysRemaining: 0 };
  }

  const now = Date.now();
  if (cotisation.status === "pending") {
    return { ...base, allowed: false, reason: "pending", status: "pending", endDate: null, daysRemaining: 0 };
  }
  if (cotisation.status === "refused") {
    return { ...base, allowed: false, reason: "refused", status: "refused", endDate: cotisation.endDate ?? null, daysRemaining: 0 };
  }
  if (cotisation.status === "expired") {
    return { ...base, allowed: false, reason: "expired", status: "expired", endDate: cotisation.endDate ?? null, daysRemaining: 0 };
  }
  if (cotisation.endDate != null && cotisation.endDate <= now) {
    return { ...base, allowed: false, reason: "expired", status: "expired", endDate: cotisation.endDate, daysRemaining: 0 };
  }
  return {
    ...base,
    allowed: true,
    reason: "ok",
    status: "active",
    endDate: cotisation.endDate ?? null,
    daysRemaining:
      cotisation.endDate != null ? Math.max(0, Math.ceil((cotisation.endDate - now) / DAY)) : 0,
  };
}

/** Lève une erreur explicite quand la cotisation manque ou a expiré. */
async function requireModuleAccess(ctx: QueryCtx | MutationCtx, user: Doc<"users"> | null) {
  if (!user) throw new Error("Non connecté");
  const access = await accessFor(ctx, user);
  if (access.allowed) return access;
  if (access.reason === "module_disabled") {
    throw new Error(
      "Le module « Gestion & Suivi de Chantier » est momentanément désactivé par l'administration.",
    );
  }
  if (access.reason === "pending") {
    throw new Error(
      "Votre cotisation « Gestion & Suivi de Chantier » est en attente de validation du paiement.",
    );
  }
  throw new Error(
    "SITE_ACCESS_REQUIRED:Une cotisation active est nécessaire pour accéder à la gestion de chantier.",
  );
}

/** Accès réactif pour l'interface (page module + carte du Dashboard). */
export const getMySiteAccess = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const access = await accessFor(ctx, user);
    const cotisation = user ? await latestCotisation(ctx, user._id) : null;
    return {
      ...access,
      isAdmin: isAdminUser(user),
      cotisation: cotisation
        ? {
            _id: cotisation._id,
            status: cotisation.status,
            amount: cotisation.amount,
            currency: cotisation.currency,
            startDate: cotisation.startDate ?? null,
            endDate: cotisation.endDate ?? null,
            paymentMethod: cotisation.paymentMethod ?? null,
            paymentProofUrl: cotisation.paymentProofUrl ?? null,
            refusalReason: cotisation.refusalReason ?? null,
          }
        : null,
      flagEnabled: await readFlag(ctx, "site_tracking"),
    };
  },
});

/** Configuration publique du module (prix / durée affichés avant souscription). */
export const getPublicModuleConfig = query({
  args: {},
  handler: async (ctx) => readConfig(ctx),
});

/** Demande de cotisation : crée une commande en attente et sa facture. */
export const requestSiteCotisation = mutation({
  args: { paymentMethod: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const config = await readConfig(ctx);
    if (!config.enabled) {
      throw new Error("Le module « Gestion & Suivi de Chantier » est désactivé par l'administration.");
    }
    if (config.price > 0) await assertPaymentMethodEnabled(ctx, args.paymentMethod);

    const existing = await latestCotisation(ctx, user._id);
    const now = Date.now();
    if (existing?.status === "pending") {
      throw new Error(
        "Une demande de cotisation est déjà en attente. Joignez votre justificatif ou patientez.",
      );
    }
    if (existing?.status === "active" && (existing.endDate ?? 0) > now) {
      throw new Error("Votre cotisation est déjà active : le renouvellement sera possible à l'échéance.");
    }

    const orderId = await ctx.db.insert("siteCotisations", {
      userId: user._id,
      amount: config.price,
      currency: config.currency,
      durationDays: config.durationDays,
      status: "pending",
      paymentMethod: args.paymentMethod,
      createdAt: now,
      updatedAt: now,
    });

    // Facture « en attente » émise par le système de facturation existant : le
    // montant est figé à la commande, aucun second circuit de paiement.
    let invoiceId: Id<"invoices"> | null = null;
    if (config.price > 0) {
      try {
        const profileRole = await resolveProfileRole(ctx, user);
        const profileType =
          profileRole === "supplier" ? "supplier" : profileRole === "expert" ? "expert" : "client";
        const invoice = await issueInvoice(ctx, {
          userId: user._id,
          subscriptionId: `siteCotisation:${orderId}`,
          plan: "pro",
          profileType,
          amountTTC: config.price,
          currency: config.currency,
          paymentMethod: args.paymentMethod,
          status: "pending",
          billingPeriodStart: now,
          billingPeriodEnd: now + config.durationDays * DAY,
          customer: { name: user.name, email: user.email, company: user.company },
        });
        invoiceId = invoice._id;
        await ctx.db.patch(orderId, { invoiceId, updatedAt: now });
      } catch {
        // La facture est un confort : son échec ne bloque jamais la demande.
      }
    }

    try {
      await scheduleAdminNotification(ctx, {
        templateKey: "admin_new_subscription",
        entityId: `site-cotisation:${orderId}`,
        vars: {
          ...splitName(user.name),
          email: user.email || "",
          profil: "Client Pro",
          typeAbonnement: `Cotisation « Gestion & Suivi de Chantier » (${config.durationDays} jours)`,
          montant: `${config.price} ${config.currency}`,
          statut: "En attente de validation du paiement",
          date: formatDateFr(now),
        },
      });
    } catch {
      // Notification best-effort
    }

    return { orderId, amount: config.price, currency: config.currency, durationDays: config.durationDays };
  },
});

/** Justificatif de paiement (même mécanisme que la cotisation Client Pro). */
export const uploadSitePaymentProof = mutation({
  args: {
    cotisationId: v.id("siteCotisations"),
    storageId: v.id("_storage"),
    url: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const row = await ctx.db.get(args.cotisationId);
    if (!row) throw new Error("Cotisation introuvable");
    if (row.userId !== user._id) throw new Error("Cette cotisation ne vous appartient pas");
    if (row.status !== "pending") throw new Error("Cette cotisation n'est plus en attente");

    const now = Date.now();
    const resolvedUrl = (await ctx.storage.getUrl(args.storageId)) || args.url;
    await ctx.db.patch(args.cotisationId, {
      paymentProofStorageId: args.storageId,
      paymentProofUrl: resolvedUrl,
      paymentProofFileName: args.fileName || "recu_cotisation_chantier",
      paymentProofUploadedAt: now,
      updatedAt: now,
    });
    return { success: true };
  },
});

/** Annulation d'une demande encore en attente (aucun droit accordé). */
export const cancelSiteCotisation = mutation({
  args: { cotisationId: v.id("siteCotisations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const row = await ctx.db.get(args.cotisationId);
    if (!row) throw new Error("Cotisation introuvable");
    if (row.userId !== user._id) throw new Error("Cette cotisation ne vous appartient pas");
    if (row.status !== "pending") return { success: true, alreadyProcessed: true };

    const now = Date.now();
    await ctx.db.patch(args.cotisationId, { status: "cancelled", updatedAt: now });
    if (row.invoiceId) {
      const invoice = await ctx.db.get(row.invoiceId);
      if (invoice && invoice.status === "pending") {
        await ctx.db.patch(invoice._id, { status: "cancelled", updatedAt: now });
      }
    }
    return { success: true };
  },
});

// ============================================================================
// Accès à un chantier (isolation par utilisateur ET par chantier)
// ============================================================================

interface SiteContext {
  site: Doc<"siteProjects">;
  isOwner: boolean;
  permissions: SitePermission[];
}

async function loadSite(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users"> | null,
  siteId: Id<"siteProjects">,
): Promise<SiteContext> {
  if (!user) throw new Error("Non connecté");
  const site = await ctx.db.get(siteId);
  if (!site) throw new Error("Chantier introuvable");

  if (site.userId === user._id || isAdminUser(user)) {
    return { site, isOwner: site.userId === user._id, permissions: [...SITE_PERMISSIONS] };
  }

  const stakeholders = await ctx.db
    .query("siteStakeholders")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  const mine = stakeholders.find(
    (row) => row.userId === user._id || (!!user.email && row.email === user.email),
  );
  if (!mine) throw new Error("Vous n'avez pas accès à ce chantier.");
  return {
    site,
    isOwner: false,
    permissions: mine.permissions.filter((p): p is SitePermission =>
      (SITE_PERMISSIONS as readonly string[]).includes(p),
    ),
  };
}

async function requireSitePermission(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users"> | null,
  siteId: Id<"siteProjects">,
  permission: SitePermission,
): Promise<SiteContext> {
  const context = await loadSite(ctx, user, siteId);
  // La cotisation est portée par le RESPONSABLE du chantier : ses intervenants
  // accèdent à ce qui leur a été explicitement accordé, sans payer eux-mêmes.
  if (context.isOwner) await requireModuleAccess(ctx, user);
  if (context.isOwner || context.permissions.includes(permission)) return context;
  throw new Error(
    "PERMISSION_DENIED:Vous n'êtes pas autorisé à effectuer cette action sur ce chantier.",
  );
}

async function requireSiteOwner(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users"> | null,
  siteId: Id<"siteProjects">,
): Promise<SiteContext> {
  const context = await loadSite(ctx, user, siteId);
  if (context.isOwner) await requireModuleAccess(ctx, user);
  if (!context.isOwner) {
    throw new Error("PERMISSION_DENIED:Seul le responsable du chantier peut effectuer cette action.");
  }
  return context;
}

async function logAction(
  ctx: MutationCtx,
  siteId: Id<"siteProjects">,
  userId: Id<"users">,
  action: string,
  details: string,
) {
  try {
    await ctx.db.insert("siteAuditLogs", { siteId, userId, action, details, createdAt: Date.now() });
  } catch {
    // Le journal ne doit jamais bloquer une écriture métier.
  }
}

// ============================================================================
// Progression & consolidation
// ============================================================================

async function tasksOf(ctx: QueryCtx | MutationCtx, siteId: Id<"siteProjects">) {
  return await ctx.db
    .query("siteTasks")
    .withIndex("by_site_order", (q) => q.eq("siteId", siteId))
    .collect();
}

function summarizeBudget(
  site: Doc<"siteProjects">,
  expenses: Doc<"siteExpenses">[],
  materials: Doc<"siteMaterials">[],
) {
  return budgetSummary({
    budgetInitial: site.budgetInitial,
    budgetRevised: site.budgetRevised,
    expenses: expenses.map((expense) => ({
      amount: expense.amount,
      category: expense.category,
      nature: expense.nature,
      date: expense.date,
    })),
    materials: materials.map((material) => ({
      plannedQty: material.plannedQty,
      deliveredQty: material.deliveredQty,
      unitPrice: material.unitPrice,
    })),
  });
}

// ============================================================================
// Création — mode A (estimation existante) et mode B (chantier autonome)
// ============================================================================

/** Budget prévisionnel issu de l'estimation, sans jamais la modifier. */
function budgetFromProject(project: Doc<"projects">): number {
  const estimate: any = project.costEstimate ?? null;
  if (!estimate) return 0;
  const factor =
    typeof estimate.contingencyPercentage === "number" && estimate.contingencyPercentage > 0
      ? 1 / (1 + estimate.contingencyPercentage / 100)
      : 1;
  const scenarios = estimate.budgetScenarios ?? null;
  const preferred = project.selectedScenario ?? "standard";
  const order = [preferred, "standard", "economique", "premium"];
  for (const key of order) {
    const total = scenarios?.[key]?.totalCost;
    if (typeof total === "number" && total > 0) return Math.round(total * factor);
  }
  return typeof estimate.totalCost === "number" ? Math.round(estimate.totalCost * factor) : 0;
}

/** Matériaux prévisionnels lus dans le quantitatif de l'estimation (DQE). */
function materialsFromProject(project: Doc<"projects">) {
  const estimate: any = project.costEstimate ?? null;
  const breakdown: any[] = Array.isArray(estimate?.breakdown) ? estimate.breakdown : [];
  const lines: {
    name: string;
    unit: string;
    category: string;
    plannedQty: number;
    unitPrice: number;
  }[] = [];
  for (const category of breakdown) {
    const items: any[] = Array.isArray(category?.items) ? category.items : [];
    for (const item of items) {
      const name = String(item?.name ?? "").trim();
      const quantity = Number(item?.quantity);
      if (!name || !Number.isFinite(quantity) || quantity <= 0) continue;
      lines.push({
        name,
        unit: String(item?.unit ?? "u"),
        category: String(category?.label ?? category?.category ?? "materiaux"),
        plannedQty: Math.round(quantity * 100) / 100,
        unitPrice: Number(item?.unitPrice) || 0,
      });
    }
  }
  return lines;
}

const siteInputValidator = {
  name: v.string(),
  category: projectCategoryValidator,
  region: v.optional(regionValidator),
  address: v.optional(v.string()),
  surface: v.optional(v.number()),
  clientName: v.optional(v.string()),
  managerName: v.optional(v.string()),
  budgetInitial: v.number(),
  startDate: v.number(),
  expectedEndDate: v.number(),
  description: v.optional(v.string()),
  characteristics: v.optional(v.string()),
};

function validPeriod(startDate: number, expectedEndDate: number) {
  if (!Number.isFinite(startDate) || !Number.isFinite(expectedEndDate)) {
    throw new Error("Dates invalides.");
  }
  if (expectedEndDate <= startDate) {
    throw new Error("La date de livraison prévisionnelle doit être postérieure au démarrage.");
  }
}

/** Crée le planning initial du chantier à partir du type de projet. */
async function seedPlanning(
  ctx: MutationCtx,
  siteId: Id<"siteProjects">,
  category: string,
  startDate: number,
  endDate: number,
) {
  const phases = phasesForProjectType(category);
  const planned = schedulePhases(phases, startDate, endDate);
  const now = Date.now();
  for (let index = 0; index < planned.length; index++) {
    const phase = planned[index];
    await ctx.db.insert("siteTasks", {
      siteId,
      phaseKey: phase.phaseKey,
      name: phase.name,
      order: index,
      weight: phase.weight,
      startDate: phase.startDate,
      endDate: phase.endDate,
      progress: 0,
      status: "todo",
      dependsOn: phase.dependsOn ?? undefined,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/** MODE A — chantier créé depuis un projet estimé existant. */
export const createSiteFromProject = mutation({
  args: {
    projectId: v.id("projects"),
    startDate: v.optional(v.number()),
    expectedEndDate: v.optional(v.number()),
    managerName: v.optional(v.string()),
    clientName: v.optional(v.string()),
    name: v.optional(v.string()),
    importMaterials: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireModuleAccess(ctx, user);
    if (!user) throw new Error("Non connecté");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Projet introuvable");
    if (project.userId !== user._id && !isAdminUser(user)) {
      throw new Error("Ce projet ne vous appartient pas.");
    }

    const startDate = args.startDate ?? Date.now();
    const budget = budgetFromProject(project);
    const expectedEndDate =
      args.expectedEndDate ??
      startDate + Math.max(30, Math.round(6 * 30)) * DAY; // 6 mois par défaut
    validPeriod(startDate, expectedEndDate);

    const now = Date.now();
    const siteId = await ctx.db.insert("siteProjects", {
      userId: user._id,
      name: (args.name ?? project.name ?? "Chantier").trim() || "Chantier",
      source: "estimation",
      projectId: project._id,
      category: project.category,
      region: project.region,
      surface: project.surface,
      clientName: args.clientName,
      managerName: args.managerName,
      budgetInitial: budget,
      startDate,
      expectedEndDate,
      description: project.description,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await seedPlanning(ctx, siteId, project.category, startDate, expectedEndDate);

    if (args.importMaterials !== false) {
      for (const line of materialsFromProject(project)) {
        await ctx.db.insert("siteMaterials", {
          siteId,
          name: line.name,
          unit: line.unit,
          category: line.category,
          plannedQty: line.plannedQty,
          orderedQty: 0,
          deliveredQty: 0,
          consumedQty: 0,
          unitPrice: line.unitPrice,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await logAction(
      ctx,
      siteId,
      user._id,
      "site_created",
      `Chantier créé depuis l'estimation « ${project.name} » (budget ${budget} TND)`,
    );

    return { siteId, budgetInitial: budget };
  },
});

/** MODE B — chantier créé sans estimation préalable. */
export const createSite = mutation({
  args: siteInputValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireModuleAccess(ctx, user);
    if (!user) throw new Error("Non connecté");

    validPeriod(args.startDate, args.expectedEndDate);
    const name = args.name.trim();
    if (!name) throw new Error("Le nom du chantier est obligatoire.");
    if (!Number.isFinite(args.budgetInitial) || args.budgetInitial < 0) {
      throw new Error("Le budget prévisionnel doit être un montant positif.");
    }
    if (args.surface != null && (!Number.isFinite(args.surface) || args.surface <= 0)) {
      throw new Error("La superficie doit être un nombre positif.");
    }

    const now = Date.now();
    const siteId = await ctx.db.insert("siteProjects", {
      userId: user._id,
      name,
      source: "standalone",
      category: args.category,
      region: args.region,
      address: args.address?.trim() || undefined,
      surface: args.surface,
      clientName: args.clientName?.trim() || undefined,
      managerName: args.managerName?.trim() || undefined,
      budgetInitial: Math.round(args.budgetInitial),
      startDate: args.startDate,
      expectedEndDate: args.expectedEndDate,
      description: args.description?.trim() || undefined,
      characteristics: args.characteristics?.trim() || undefined,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await seedPlanning(ctx, siteId, args.category, args.startDate, args.expectedEndDate);
    await logAction(ctx, siteId, user._id, "site_created", `Chantier autonome « ${name} » créé`);

    return { siteId };
  },
});

// ============================================================================
// Lecture
// ============================================================================

/**
 * Chantiers visibles par l'utilisateur (les siens + ceux où il est intervenant),
 * avec un résumé d'avancement. Une cotisation active est requise.
 */
export const listSites = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { allowed: false, sites: [] as any[] };
    const access = await accessFor(ctx, user);

    const own = await ctx.db
      .query("siteProjects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Intervenant : uniquement les chantiers où l'accès est explicitement ouvert.
    const links = await ctx.db
      .query("siteStakeholders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const sharedIds = new Set(links.map((link) => link.siteId));
    const shared: Doc<"siteProjects">[] = [];
    for (const siteId of sharedIds) {
      const site = await ctx.db.get(siteId);
      if (site && site.userId !== user._id) shared.push(site);
    }

    // Sans cotisation, seuls les chantiers partagés par un client restent
    // consultables : le propriétaire doit payer, ses intervenants non.
    if (!access.allowed && shared.length === 0) return { allowed: false, sites: [] as any[] };

    const all = [...own, ...shared].filter(
      (site) => args.includeArchived || site.status !== "archived",
    );

    const rows = [];
    for (const site of all) {
      const tasks = await tasksOf(ctx, site._id);
      const expenses = await ctx.db
        .query("siteExpenses")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      const materials = await ctx.db
        .query("siteMaterials")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      rows.push({
        ...site,
        isOwner: site.userId === user._id,
        progress: weightedProgress(tasks),
        taskCount: tasks.length,
        budget: summarizeBudget(site, expenses, materials),
      });
    }
    rows.sort((a, b) => b.createdAt - a.createdAt);
    return { allowed: true, sites: rows };
  },
});

/**
 * Chantier complet : planning, dépenses, matériaux, intervenants, contrôles,
 * journal quotidien, audit et prévisions. Chaque bloc est filtré par la
 * permission de l'intervenant — un artisan sans droit budget ne reçoit jamais
 * les montants.
 */
export const getSite = query({
  args: { siteId: v.id("siteProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");
    const access = await accessFor(ctx, user);
    const context = await loadSite(ctx, user, args.siteId);
    if (!access.allowed && context.site.userId === user._id) {
      throw new Error("SITE_ACCESS_REQUIRED:Cotisation requise.");
    }

    const { site, isOwner, permissions } = context;
    const can = (permission: SitePermission) => isOwner || permissions.includes(permission);

    const [tasks, expenses, materials, stakeholders, inspections, logs, audit] = await Promise.all([
      tasksOf(ctx, site._id),
      ctx.db.query("siteExpenses").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
      ctx.db.query("siteMaterials").withIndex("by_site", (q) => q.eq("siteId", site._id)).collect(),
      ctx.db
        .query("siteStakeholders")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect(),
      ctx.db
        .query("siteInspections")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect(),
      ctx.db
        .query("siteDailyLogs")
        .withIndex("by_site_date", (q) => q.eq("siteId", site._id))
        .order("desc")
        .collect(),
      ctx.db
        .query("siteAuditLogs")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .order("desc")
        .collect(),
    ]);

    const showBudget = can("budget");
    const showMaterials = can("materials");
    const showQuality = can("quality");
    const showTeam = can("team");

    const budget = summarizeBudget(site, expenses, materials);
    const risk = analyzeSiteRisk({
      today: Date.now(),
      startDate: site.startDate,
      expectedEndDate: site.expectedEndDate,
      tasks: tasks.map((task) => ({
        name: task.name,
        phaseKey: task.phaseKey,
        weight: task.weight,
        progress: task.progress,
        status: task.status,
        startDate: task.startDate,
        endDate: task.endDate,
      })),
      budgetInitial: site.budgetInitial,
      budgetRevised: site.budgetRevised,
      expenses: expenses.map((expense) => ({
        amount: expense.amount,
        category: expense.category,
        nature: expense.nature,
        date: expense.date,
      })),
      materials: materials.map((material) => ({
        name: material.name,
        unit: material.unit,
        plannedQty: material.plannedQty,
        orderedQty: material.orderedQty,
        deliveredQty: material.deliveredQty,
        consumedQty: material.consumedQty,
        unitPrice: material.unitPrice,
      })),
    });

    const progress = weightedProgress(tasks);
    const now = Date.now();
    const lateCount = tasks.filter(
      (task) => task.endDate < now && taskProgress(task) < 100,
    ).length;

    // Alerte métier : accumulation de signaux réels (dépenses, ruptures,
    // réserves non levées, tâches en retard).
    const openReservations = inspections.flatMap((inspection) =>
      inspection.reservations.filter((reservation) => !reservation.resolved),
    );
    const materialAlerts = materials
      .map((material) => materialLine(material))
      .filter((line) => line.alert === "rupture");
    const alerts: { level: "info" | "warning" | "danger"; label: string }[] = [];
    if (lateCount > 0) {
      alerts.push({ level: "warning", label: `${lateCount} tâche(s) en retard sur le planning.` });
    }
    if (showBudget && budget.variance < 0) {
      alerts.push({ level: "danger", label: "Les dépenses dépassent le budget révisé." });
    }
    if (showMaterials && materialAlerts.length > 0) {
      alerts.push({
        level: "danger",
        label: `${materialAlerts.length} matériau(x) en rupture d'approvisionnement.`,
      });
    }
    if (openReservations.length > 0) {
      alerts.push({
        level: "warning",
        label: `${openReservations.length} réserve(s) qualité non levée(s).`,
      });
    }
    if (site.expectedEndDate < now && progress < 100) {
      alerts.push({ level: "danger", label: "La date de livraison prévisionnelle est dépassée." });
    }

    return {
      site,
      isOwner,
      permissions,
      tasks,
      dailyLogs: can("daily") || can("progress") ? logs : logs.filter((log) => log.createdBy === user._id),
      expenses: showBudget ? expenses : [],
      materials: showMaterials ? materials : [],
      stakeholders: showTeam ? stakeholders : [],
      inspections: showQuality ? inspections : [],
      auditLogs: isOwner ? audit.slice(0, 60) : [],
      budget: showBudget ? budget : null,
      progress,
      lateCount,
      alerts,
      risk,
      moduleAccess: access,
    };
  },
});

/** Projet source d'un chantier (lecture seule, jamais modifié). */
export const getLinkedProject = query({
  args: { siteId: v.id("siteProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { site, isOwner, permissions } = await loadSite(ctx, user, args.siteId);
    if (!site.projectId) return null;
    if (!isOwner && !permissions.includes("progress")) return null;
    const project = await ctx.db.get(site.projectId);
    if (!project) return null;
    return {
      _id: project._id,
      name: project.name,
      category: project.category,
      surface: project.surface ?? null,
      region: project.region ?? null,
      costEstimate: project.costEstimate
        ? {
            totalCost: project.costEstimate.totalCost,
            budgetScenarios: project.costEstimate.budgetScenarios ?? null,
          }
        : null,
    };
  },
});

// ============================================================================
// Mise à jour du chantier
// ============================================================================

export const updateSite = mutation({
  args: {
    siteId: v.id("siteProjects"),
    name: v.optional(v.string()),
    region: v.optional(regionValidator),
    address: v.optional(v.string()),
    surface: v.optional(v.number()),
    clientName: v.optional(v.string()),
    managerName: v.optional(v.string()),
    budgetInitial: v.optional(v.number()),
    budgetRevised: v.optional(v.number()),
    startDate: v.optional(v.number()),
    expectedEndDate: v.optional(v.number()),
    description: v.optional(v.string()),
    characteristics: v.optional(v.string()),
    status: v.optional(siteStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { site } = await requireSiteOwner(ctx, user, args.siteId);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Le nom du chantier est obligatoire.");
      patch.name = name;
    }
    if (args.budgetInitial !== undefined) {
      if (!Number.isFinite(args.budgetInitial) || args.budgetInitial < 0) {
        throw new Error("Budget initial invalide.");
      }
      patch.budgetInitial = Math.round(args.budgetInitial);
    }
    if (args.budgetRevised !== undefined) {
      if (!Number.isFinite(args.budgetRevised) || args.budgetRevised < 0) {
        throw new Error("Budget révisé invalide.");
      }
      patch.budgetRevised = Math.round(args.budgetRevised);
    }
    const startDate = args.startDate ?? site.startDate;
    const expectedEndDate = args.expectedEndDate ?? site.expectedEndDate;
    if (args.startDate !== undefined || args.expectedEndDate !== undefined) {
      validPeriod(startDate, expectedEndDate);
      patch.startDate = startDate;
      patch.expectedEndDate = expectedEndDate;
    }
    if (args.region !== undefined) patch.region = args.region;
    if (args.address !== undefined) patch.address = args.address.trim() || undefined;
    if (args.surface !== undefined) patch.surface = args.surface;
    if (args.clientName !== undefined) patch.clientName = args.clientName.trim() || undefined;
    if (args.managerName !== undefined) patch.managerName = args.managerName.trim() || undefined;
    if (args.description !== undefined) patch.description = args.description.trim() || undefined;
    if (args.characteristics !== undefined) {
      patch.characteristics = args.characteristics.trim() || undefined;
    }
    if (args.status !== undefined) {
      patch.status = args.status;
      if (args.status === "completed") patch.completedAt = Date.now();
      if (args.status === "archived") patch.archivedAt = Date.now();
    }

    await ctx.db.patch(args.siteId, patch);
    await logAction(ctx, args.siteId, user!._id, "site_updated", "Informations du chantier mises à jour");
    return { success: true };
  },
});

/** Suppression définitive d'un chantier et de toutes ses données de suivi. */
export const deleteSite = mutation({
  args: { siteId: v.id("siteProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireSiteOwner(ctx, user, args.siteId);

    for (const table of [
      "siteTasks",
      "siteExpenses",
      "siteMaterials",
      "siteStakeholders",
      "siteInspections",
      "siteDailyLogs",
      "siteAuditLogs",
    ] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    await ctx.db.delete(args.siteId);
    return { success: true };
  },
});

// ============================================================================
// Planning
// ============================================================================

export const updateTask = mutation({
  args: {
    taskId: v.id("siteTasks"),
    name: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    responsible: v.optional(v.string()),
    progress: v.optional(v.number()),
    status: v.optional(taskStatusValidator),
    dependsOn: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Tâche introuvable");
    await requireSitePermission(ctx, user, task.siteId, "progress");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Le nom de la tâche est obligatoire.");
      patch.name = name;
    }
    if (args.startDate !== undefined) patch.startDate = args.startDate;
    if (args.endDate !== undefined) patch.endDate = args.endDate;
    const startDate = (patch.startDate as number | undefined) ?? task.startDate;
    const endDate = (patch.endDate as number | undefined) ?? task.endDate;
    if (endDate < startDate) throw new Error("La fin d'une tâche ne peut pas précéder son début.");
    if (args.responsible !== undefined) patch.responsible = args.responsible.trim() || undefined;
    if (args.dependsOn !== undefined) patch.dependsOn = args.dependsOn.trim() || undefined;
    if (args.notes !== undefined) patch.notes = args.notes.trim() || undefined;

    let progress = task.progress;
    if (args.progress !== undefined) {
      if (!Number.isFinite(args.progress) || args.progress < 0 || args.progress > 100) {
        throw new Error("L'avancement doit être compris entre 0 et 100 %.");
      }
      progress = Math.round(args.progress);
      patch.progress = progress;
      if (args.status === undefined) {
        patch.status = progress >= 100 ? "done" : progress > 0 ? "in_progress" : "todo";
      }
    }
    if (args.status !== undefined) {
      patch.status = args.status;
      if (args.progress === undefined) {
        progress = args.status === "done" ? 100 : progress;
        patch.progress = progress;
      }
    }

    if (args.dependsOn !== undefined && args.dependsOn.trim()) {
      const dependency = await ctx.db
        .query("siteTasks")
        .withIndex("by_site", (q) => q.eq("siteId", task.siteId))
        .collect();
      const parent = dependency.find((row) => row.phaseKey === args.dependsOn!.trim());
      if (!parent) throw new Error("La tâche dont dépend cette étape est introuvable.");
      if (parent.endDate > startDate) {
        throw new Error(
          "Cette tâche ne peut pas démarrer avant la fin de l'étape dont elle dépend.",
        );
      }
    }

    await ctx.db.patch(args.taskId, patch);
    await logAction(
      ctx,
      task.siteId,
      user!._id,
      "task_updated",
      `Tâche « ${(patch.name as string | undefined) ?? task.name} » mise à jour`,
    );
    return { success: true };
  },
});

export const addTask = mutation({
  args: {
    siteId: v.id("siteProjects"),
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    weight: v.optional(v.number()),
    responsible: v.optional(v.string()),
    dependsOn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireSitePermission(ctx, user, args.siteId, "progress");

    const name = args.name.trim();
    if (!name) throw new Error("Le nom de la tâche est obligatoire.");
    if (args.endDate < args.startDate) throw new Error("Dates de tâche invalides.");

    const tasks = await tasksOf(ctx, args.siteId);
    const now = Date.now();
    const taskId = await ctx.db.insert("siteTasks", {
      siteId: args.siteId,
      phaseKey: `custom_${now}`,
      name,
      order: tasks.length,
      weight: Math.max(0.1, args.weight ?? 2),
      startDate: args.startDate,
      endDate: args.endDate,
      responsible: args.responsible?.trim() || undefined,
      progress: 0,
      status: "todo",
      dependsOn: args.dependsOn?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, args.siteId, user!._id, "task_added", `Tâche « ${name} » ajoutée`);
    return { taskId };
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("siteTasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Tâche introuvable");
    await requireSiteOwner(ctx, user, task.siteId);
    await ctx.db.delete(args.taskId);
    await logAction(ctx, task.siteId, user!._id, "task_deleted", `Tâche « ${task.name} » supprimée`);
    return { success: true };
  },
});

// ============================================================================
// Suivi quotidien
// ============================================================================

export const addDailyLog = mutation({
  args: {
    siteId: v.id("siteProjects"),
    date: v.number(),
    activities: v.string(),
    workers: v.array(v.object({ role: v.string(), count: v.number() })),
    hoursWorked: v.number(),
    observations: v.optional(v.string()),
    issues: v.optional(v.string()),
    photoStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireSitePermission(ctx, user, args.siteId, "daily");

    const activities = args.activities.trim();
    if (!activities) throw new Error("Décrivez les travaux réalisés.");
    if (!Number.isFinite(args.hoursWorked) || args.hoursWorked < 0) {
      throw new Error("Heures de travail invalides.");
    }
    const workers = args.workers
      .map((worker) => ({ role: worker.role.trim(), count: Math.max(0, Math.round(worker.count)) }))
      .filter((worker) => worker.role && worker.count > 0);

    const now = Date.now();
    const logId = await ctx.db.insert("siteDailyLogs", {
      siteId: args.siteId,
      date: args.date,
      activities,
      workers,
      hoursWorked: Math.round(args.hoursWorked * 10) / 10,
      observations: args.observations?.trim() || undefined,
      issues: args.issues?.trim() || undefined,
      photoStorageIds: args.photoStorageIds?.slice(0, 12),
      createdBy: user!._id,
      createdAt: now,
    });
    await logAction(ctx, args.siteId, user!._id, "daily_log_added", "Suivi quotidien enregistré");
    return { logId };
  },
});

export const deleteDailyLog = mutation({
  args: { logId: v.id("siteDailyLogs") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Suivi introuvable");
    const context = await loadSite(ctx, user, log.siteId);
    if (!context.isOwner && log.createdBy !== user!._id) {
      throw new Error("Seul l'auteur du suivi ou le responsable du chantier peut le supprimer.");
    }
    await ctx.db.delete(args.logId);
    await logAction(ctx, log.siteId, user!._id, "daily_log_deleted", "Suivi quotidien supprimé");
    return { success: true };
  },
});

// ============================================================================
// Dépenses
// ============================================================================

export const addExpense = mutation({
  args: {
    siteId: v.id("siteProjects"),
    label: v.string(),
    category: v.string(),
    nature: natureValidator,
    amount: v.number(),
    date: v.number(),
    supplier: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireSitePermission(ctx, user, args.siteId, "budget");

    const label = args.label.trim();
    if (!label) throw new Error("Le libellé de la dépense est obligatoire.");
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error("Le montant de la dépense doit être positif.");
    }

    const now = Date.now();
    const expenseId = await ctx.db.insert("siteExpenses", {
      siteId: args.siteId,
      label,
      category: args.category,
      nature: args.nature,
      amount: Math.round(args.amount),
      date: args.date,
      supplier: args.supplier?.trim() || undefined,
      reference: args.reference?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      createdBy: user!._id,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, args.siteId, user!._id, "expense_added", `Dépense « ${label} » enregistrée`);
    return { expenseId };
  },
});

export const updateExpense = mutation({
  args: {
    expenseId: v.id("siteExpenses"),
    label: v.optional(v.string()),
    category: v.optional(v.string()),
    nature: v.optional(natureValidator),
    amount: v.optional(v.number()),
    date: v.optional(v.number()),
    supplier: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) throw new Error("Dépense introuvable");
    await requireSitePermission(ctx, user, expense.siteId, "budget");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.label !== undefined) {
      const label = args.label.trim();
      if (!label) throw new Error("Le libellé de la dépense est obligatoire.");
      patch.label = label;
    }
    if (args.amount !== undefined) {
      if (!Number.isFinite(args.amount) || args.amount <= 0) {
        throw new Error("Le montant de la dépense doit être positif.");
      }
      patch.amount = Math.round(args.amount);
    }
    if (args.category !== undefined) patch.category = args.category;
    if (args.nature !== undefined) patch.nature = args.nature;
    if (args.date !== undefined) patch.date = args.date;
    if (args.supplier !== undefined) patch.supplier = args.supplier.trim() || undefined;
    if (args.reference !== undefined) patch.reference = args.reference.trim() || undefined;
    if (args.notes !== undefined) patch.notes = args.notes.trim() || undefined;

    await ctx.db.patch(args.expenseId, patch);
    await logAction(ctx, expense.siteId, user!._id, "expense_updated", "Dépense modifiée");
    return { success: true };
  },
});

export const deleteExpense = mutation({
  args: { expenseId: v.id("siteExpenses") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) throw new Error("Dépense introuvable");
    await requireSitePermission(ctx, user, expense.siteId, "budget");
    await ctx.db.delete(args.expenseId);
    await logAction(ctx, expense.siteId, user!._id, "expense_deleted", "Dépense supprimée");
    return { success: true };
  },
});

// ============================================================================
// Matériaux
// ============================================================================

export const addMaterial = mutation({
  args: {
    siteId: v.id("siteProjects"),
    name: v.string(),
    unit: v.string(),
    category: v.optional(v.string()),
    plannedQty: v.number(),
    unitPrice: v.number(),
    supplier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireSitePermission(ctx, user, args.siteId, "materials");

    const name = args.name.trim();
    if (!name) throw new Error("Le nom du matériau est obligatoire.");
    if (!Number.isFinite(args.plannedQty) || args.plannedQty < 0) {
      throw new Error("Quantité prévue invalide.");
    }
    const now = Date.now();
    const materialId = await ctx.db.insert("siteMaterials", {
      siteId: args.siteId,
      name,
      unit: args.unit.trim() || "u",
      category: args.category?.trim() || undefined,
      plannedQty: args.plannedQty,
      orderedQty: 0,
      deliveredQty: 0,
      consumedQty: 0,
      unitPrice: Math.max(0, args.unitPrice || 0),
      supplier: args.supplier?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, args.siteId, user!._id, "material_added", `Matériau « ${name} » ajouté`);
    return { materialId };
  },
});

export const updateMaterial = mutation({
  args: {
    materialId: v.id("siteMaterials"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    plannedQty: v.optional(v.number()),
    orderedQty: v.optional(v.number()),
    deliveredQty: v.optional(v.number()),
    consumedQty: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    supplier: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const material = await ctx.db.get(args.materialId);
    if (!material) throw new Error("Matériau introuvable");
    await requireSitePermission(ctx, user, material.siteId, "materials");

    const quantities: Record<string, number> = {
      plannedQty: material.plannedQty,
      orderedQty: material.orderedQty,
      deliveredQty: material.deliveredQty,
      consumedQty: material.consumedQty,
    };
    const requested: Record<string, number | undefined> = {
      plannedQty: args.plannedQty,
      orderedQty: args.orderedQty,
      deliveredQty: args.deliveredQty,
      consumedQty: args.consumedQty,
    };
    for (const key of Object.keys(quantities)) {
      const value = requested[key];
      if (value === undefined) continue;
      if (!Number.isFinite(value) || value < 0) throw new Error("Quantité invalide.");
      quantities[key] = value;
    }
    if (quantities.consumedQty > quantities.deliveredQty) {
      throw new Error("Les quantités consommées ne peuvent pas dépasser les quantités livrées.");
    }
    if (quantities.deliveredQty > quantities.orderedQty) {
      throw new Error("Les quantités livrées ne peuvent pas dépasser les quantités commandées.");
    }

    const patch: Record<string, unknown> = { ...quantities, updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Le nom du matériau est obligatoire.");
      patch.name = name;
    }
    if (args.unit !== undefined) patch.unit = args.unit.trim() || "u";
    if (args.unitPrice !== undefined) {
      if (!Number.isFinite(args.unitPrice) || args.unitPrice < 0) {
        throw new Error("Prix unitaire invalide.");
      }
      patch.unitPrice = args.unitPrice;
    }
    if (args.supplier !== undefined) patch.supplier = args.supplier.trim() || undefined;
    if (args.notes !== undefined) patch.notes = args.notes.trim() || undefined;

    await ctx.db.patch(args.materialId, patch);
    await logAction(ctx, material.siteId, user!._id, "material_updated", "Suivi matériau mis à jour");
    return { success: true };
  },
});

export const deleteMaterial = mutation({
  args: { materialId: v.id("siteMaterials") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const material = await ctx.db.get(args.materialId);
    if (!material) throw new Error("Matériau introuvable");
    await requireSitePermission(ctx, user, material.siteId, "materials");
    await ctx.db.delete(args.materialId);
    await logAction(ctx, material.siteId, user!._id, "material_deleted", "Matériau supprimé");
    return { success: true };
  },
});

/** Importe (une seule fois, à la demande) le quantitatif d'une estimation liée. */
export const importMaterialsFromLinkedProject = mutation({
  args: { siteId: v.id("siteProjects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { site } = await requireSitePermission(ctx, user, args.siteId, "materials");
    if (!site.projectId) throw new Error("Ce chantier n'est lié à aucune estimation.");
    const project = await ctx.db.get(site.projectId);
    if (!project) throw new Error("Projet source introuvable");

    const existing = await ctx.db
      .query("siteMaterials")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    const known = new Set(existing.map((row) => `${row.name}|${row.unit}`));
    let imported = 0;
    const now = Date.now();
    for (const line of materialsFromProject(project)) {
      const key = `${line.name}|${line.unit}`;
      if (known.has(key)) continue;
      await ctx.db.insert("siteMaterials", {
        siteId: args.siteId,
        name: line.name,
        unit: line.unit,
        category: line.category,
        plannedQty: line.plannedQty,
        orderedQty: 0,
        deliveredQty: 0,
        consumedQty: 0,
        unitPrice: line.unitPrice,
        createdAt: now,
        updatedAt: now,
      });
      known.add(key);
      imported++;
    }
    await logAction(
      ctx,
      args.siteId,
      user!._id,
      "materials_imported",
      `${imported} ligne(s) importée(s) depuis l'estimation`,
    );
    return { imported };
  },
});

// ============================================================================
// Intervenants & permissions
// ============================================================================

export const addStakeholder = mutation({
  args: {
    siteId: v.id("siteProjects"),
    name: v.string(),
    role: stakeholderRoleValidator,
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    permissions: v.array(permissionValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireSiteOwner(ctx, user, args.siteId);

    const name = args.name.trim();
    if (!name) throw new Error("Le nom de l'intervenant est obligatoire.");
    const email = args.email?.trim().toLowerCase() || undefined;
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Adresse e-mail invalide.");
    }

    // Compte déjà existant ? L'intervenant entre avec son propre compte, avec
    // exactement les permissions accordées ici.
    let userId: Id<"users"> | undefined;
    if (email) {
      const account = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      if (account) userId = account._id;
    }

    const now = Date.now();
    const stakeholderId = await ctx.db.insert("siteStakeholders", {
      siteId: args.siteId,
      name,
      role: args.role,
      company: args.company?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      email,
      userId,
      permissions: [...new Set(args.permissions)],
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, args.siteId, user!._id, "stakeholder_added", `Intervenant « ${name} » ajouté`);
    return { stakeholderId, linkedToAccount: !!userId };
  },
});

export const updateStakeholder = mutation({
  args: {
    stakeholderId: v.id("siteStakeholders"),
    name: v.optional(v.string()),
    role: v.optional(stakeholderRoleValidator),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    permissions: v.optional(v.array(permissionValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const stakeholder = await ctx.db.get(args.stakeholderId);
    if (!stakeholder) throw new Error("Intervenant introuvable");
    await requireSiteOwner(ctx, user, stakeholder.siteId);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Le nom de l'intervenant est obligatoire.");
      patch.name = name;
    }
    if (args.role !== undefined) patch.role = args.role;
    if (args.company !== undefined) patch.company = args.company.trim() || undefined;
    if (args.phone !== undefined) patch.phone = args.phone.trim() || undefined;
    if (args.email !== undefined) {
      const email = args.email.trim().toLowerCase() || undefined;
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error("Adresse e-mail invalide.");
      }
      patch.email = email;
      if (email) {
        const account = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .first();
        patch.userId = account?._id;
      } else {
        patch.userId = undefined;
      }
    }
    if (args.permissions !== undefined) patch.permissions = [...new Set(args.permissions)];

    await ctx.db.patch(args.stakeholderId, patch);
    await logAction(
      ctx,
      stakeholder.siteId,
      user!._id,
      "stakeholder_updated",
      `Intervenant « ${(patch.name as string | undefined) ?? stakeholder.name} » mis à jour`,
    );
    return { success: true };
  },
});

export const removeStakeholder = mutation({
  args: { stakeholderId: v.id("siteStakeholders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const stakeholder = await ctx.db.get(args.stakeholderId);
    if (!stakeholder) throw new Error("Intervenant introuvable");
    await requireSiteOwner(ctx, user, stakeholder.siteId);
    await ctx.db.delete(args.stakeholderId);
    await logAction(
      ctx,
      stakeholder.siteId,
      user!._id,
      "stakeholder_removed",
      `Intervenant « ${stakeholder.name} » retiré`,
    );
    return { success: true };
  },
});

// ============================================================================
// Contrôle qualité
// ============================================================================

export const addInspection = mutation({
  args: {
    siteId: v.id("siteProjects"),
    phaseKey: v.string(),
    title: v.string(),
    date: v.number(),
    inspector: v.string(),
    findings: v.optional(v.string()),
    status: inspectionStatusValidator,
    reservations: v.optional(v.array(reservationValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireSitePermission(ctx, user, args.siteId, "quality");

    const title = args.title.trim();
    if (!title) throw new Error("Le titre de l'inspection est obligatoire.");
    if (!args.inspector.trim()) throw new Error("Le nom de l'inspecteur est obligatoire.");

    const now = Date.now();
    const inspectionId = await ctx.db.insert("siteInspections", {
      siteId: args.siteId,
      phaseKey: args.phaseKey,
      title,
      date: args.date,
      inspector: args.inspector.trim(),
      findings: args.findings?.trim() || undefined,
      status: args.status,
      reservations: (args.reservations ?? []).map((reservation) => ({
        label: reservation.label.trim(),
        severity: reservation.severity,
        resolved: reservation.resolved,
        action: reservation.action?.trim() || undefined,
        resolvedAt: reservation.resolved ? now : undefined,
      })),
      createdBy: user!._id,
      createdAt: now,
      updatedAt: now,
    });
    await logAction(ctx, args.siteId, user!._id, "inspection_added", `Inspection « ${title} » enregistrée`);
    return { inspectionId };
  },
});

export const updateInspection = mutation({
  args: {
    inspectionId: v.id("siteInspections"),
    title: v.optional(v.string()),
    findings: v.optional(v.string()),
    status: v.optional(inspectionStatusValidator),
    reservations: v.optional(v.array(reservationValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new Error("Inspection introuvable");
    await requireSitePermission(ctx, user, inspection.siteId, "quality");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title) throw new Error("Le titre de l'inspection est obligatoire.");
      patch.title = title;
    }
    if (args.findings !== undefined) patch.findings = args.findings.trim() || undefined;
    if (args.status !== undefined) patch.status = args.status;
    if (args.reservations !== undefined) {
      const now = Date.now();
      patch.reservations = args.reservations.map((reservation) => ({
        label: reservation.label.trim(),
        severity: reservation.severity,
        resolved: reservation.resolved,
        action: reservation.action?.trim() || undefined,
        resolvedAt: reservation.resolved ? (reservation.resolvedAt ?? now) : undefined,
      }));
    }

    await ctx.db.patch(args.inspectionId, patch);
    await logAction(ctx, inspection.siteId, user!._id, "inspection_updated", "Inspection mise à jour");
    return { success: true };
  },
});

export const deleteInspection = mutation({
  args: { inspectionId: v.id("siteInspections") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) throw new Error("Inspection introuvable");
    await requireSiteOwner(ctx, user, inspection.siteId);
    await ctx.db.delete(args.inspectionId);
    await logAction(ctx, inspection.siteId, user!._id, "inspection_deleted", "Inspection supprimée");
    return { success: true };
  },
});

// ============================================================================
// Administration — configuration, cotisations, statistiques
// ============================================================================

export const adminGetSiteModule = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!isAdminUser(admin)) return null;

    const config = await readConfig(ctx);
    const cotisations = await ctx.db.query("siteCotisations").order("desc").collect();
    const users = new Map<string, Doc<"users">>();
    for (const cotisation of cotisations) {
      if (users.has(cotisation.userId)) continue;
      const user = await ctx.db.get(cotisation.userId);
      if (user) users.set(cotisation.userId, user);
    }
    const sites = await ctx.db.query("siteProjects").collect();
    const now = Date.now();

    const rows = cotisations.map((cotisation) => {
      const user = users.get(cotisation.userId);
      return {
        ...cotisation,
        effectiveStatus:
          cotisation.status === "active" && (cotisation.endDate ?? 0) <= now
            ? "expired"
            : cotisation.status,
        user: user
          ? {
              _id: user._id,
              name: user.name ?? null,
              email: user.email ?? null,
              company: user.company ?? null,
            }
          : null,
      };
    });

    const paid = rows.filter((row) => row.status === "active" || row.effectiveStatus === "active");
    const revenue = rows
      .filter((row) => row.status === "active" || row.status === "expired")
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      config,
      cotisations: rows,
      stats: {
        totalSites: sites.length,
        activeSites: sites.filter((site) => site.status === "active").length,
        subscribersActive: paid.length,
        subscribersTotal: new Set(rows.map((row) => row.userId)).size,
        pending: rows.filter((row) => row.status === "pending").length,
        revenue,
        currency: config.currency,
      },
    };
  },
});

export const adminSetModuleConfig = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    price: v.optional(v.number()),
    durationDays: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getCurrentUser(ctx));
    if (args.price !== undefined && (!Number.isFinite(args.price) || args.price < 0)) {
      throw new Error("Prix de cotisation invalide.");
    }
    if (
      args.durationDays !== undefined &&
      (!Number.isFinite(args.durationDays) || args.durationDays < 1)
    ) {
      throw new Error("Durée de cotisation invalide.");
    }

    const existing = await ctx.db.query("siteModuleConfig").order("desc").first();
    const now = Date.now();
    const next = {
      enabled: args.enabled ?? existing?.enabled ?? true,
      price: Math.round(args.price ?? existing?.price ?? DEFAULT_PRICE),
      currency: (args.currency ?? existing?.currency ?? "TND").trim() || "TND",
      durationDays: Math.round(args.durationDays ?? existing?.durationDays ?? DEFAULT_DURATION_DAYS),
      updatedAt: now,
      updatedBy: admin._id,
    };
    if (existing) {
      await ctx.db.patch(existing._id, next);
    } else {
      await ctx.db.insert("siteModuleConfig", next);
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "site_module_config_updated",
        details: `Module chantier : ${next.enabled ? "activé" : "désactivé"}, ${next.price} ${next.currency} / ${next.durationDays} jours`,
        createdAt: now,
      });
    } catch {
      // Journalisation optionnelle
    }
    return next;
  },
});

export const adminApproveSiteCotisation = mutation({
  args: { cotisationId: v.id("siteCotisations") },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getCurrentUser(ctx));
    const row = await ctx.db.get(args.cotisationId);
    if (!row) throw new Error("Cotisation introuvable");
    if (row.status === "active") return { success: true, alreadyActive: true };
    if (row.status !== "pending") {
      throw new Error("Cette cotisation n'est pas en attente de validation.");
    }

    const now = Date.now();
    const start = now;
    const end = now + row.durationDays * DAY;
    await ctx.db.patch(args.cotisationId, {
      status: "active",
      startDate: start,
      endDate: end,
      validatedAt: now,
      validatedBy: admin._id,
      updatedAt: now,
    });

    if (row.invoiceId) {
      const invoice = await ctx.db.get(row.invoiceId);
      if (invoice) {
        await ctx.db.patch(invoice._id, { status: "paid", paymentDate: now, updatedAt: now });
      }
    }

    try {
      await ctx.db.insert("notifications", {
        userId: row.userId,
        type: "subscription",
        title: "Cotisation « Gestion & Suivi de Chantier » activée",
        message: `Votre accès au module est ouvert jusqu'au ${formatDateFr(end)}. Aucun renouvellement automatique.`,
        read: false,
        link: "/dashboard/chantiers",
        createdAt: now,
      });
    } catch {
      // Optionnel
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "approve_site_cotisation",
        targetUserId: row.userId,
        details: `Cotisation chantier confirmée — ${row.amount} ${row.currency} / ${row.durationDays} jours`,
        createdAt: now,
      });
    } catch {
      // Optionnel
    }

    return { success: true, endDate: end };
  },
});

export const adminRefuseSiteCotisation = mutation({
  args: { cotisationId: v.id("siteCotisations"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = requireAdmin(await getCurrentUser(ctx));
    const row = await ctx.db.get(args.cotisationId);
    if (!row) throw new Error("Cotisation introuvable");
    if (row.status !== "pending") return { success: true, alreadyProcessed: true };

    const now = Date.now();
    await ctx.db.patch(args.cotisationId, {
      status: "refused",
      refusedAt: now,
      refusalReason: args.reason?.trim() || undefined,
      updatedAt: now,
    });
    if (row.invoiceId) {
      const invoice = await ctx.db.get(row.invoiceId);
      if (invoice && invoice.status === "pending") {
        await ctx.db.patch(invoice._id, { status: "cancelled", updatedAt: now });
      }
    }
    try {
      await ctx.db.insert("notifications", {
        userId: row.userId,
        type: "subscription",
        title: "Cotisation chantier refusée",
        message:
          args.reason?.trim() ||
          "Votre demande n'a pas été validée. Aucun accès n'a été ouvert. Contactez le support pour plus d'informations.",
        read: false,
        link: "/dashboard/chantiers",
        createdAt: now,
      });
    } catch {
      // Optionnel
    }
    return { success: true };
  },
});
