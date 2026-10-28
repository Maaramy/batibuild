/// <reference types="vite/client" />

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { DEFAULT_TEMPLATES } from "./emailTemplates.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// NOTIFICATIONS ADMINISTRATEUR — tests d'intégration Convex
// ----------------------------------------------------------------------------
// Vérifie les promesses faites à l'administrateur :
//   • une inscription, un abonnement et un projet déclenchent l'e-mail du bon
//     modèle, vers les adresses CONFIGURÉES (jamais une adresse devinée) ;
//   • un modèle ou un destinataire désactivé n'envoie rien ;
//   • aucune adresse configurée = aucun envoi (et rien d'inventé) ;
//   • chaque envoi est journalisé dans `emailHistory` (type, destinataire,
//     date, statut) ;
//   • les adresses sont administrables : ajout, modification, suppression,
//     validation du format, unicité, réservé aux administrateurs ;
//   • un modèle supprimé disparaît et plus rien n'est envoyé ; il peut être
//     ré-ajouté.
// ============================================================================

type T = ReturnType<typeof convexTest>;

const RECIPIENT = "inbox-admin@batibuild.tn";

function asUser(t: T, userId: any) {
  return t.withIdentity({ subject: userId });
}

async function createUser(
  t: T,
  overrides: {
    role?: string;
    email?: string;
    name?: string;
    userRole?: "client" | "supplier" | "expert";
    createdAt?: number;
  } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: overrides.name ?? "Utilisateur Test",
      email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@test.tn`,
      role: overrides.role ?? "user",
      status: "active",
      userRole: overrides.userRole,
      emailNotifications: true,
      createdAt: overrides.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

/** Configuration e-mail minimale : sans expéditeur, `processEmailEvent` échoue. */
async function configureEmail(t: T, adminId: any) {
  await t.run(async (ctx) =>
    ctx.db.insert("emailConfig", {
      senderName: "batibuild",
      senderEmail: "no-reply@batibuild.tn",
      autoEnabled: true,
      notifyAdminCc: false,
      updatedAt: Date.now(),
      updatedBy: adminId,
    }),
  );
}

async function addRecipient(
  t: T,
  email: string,
  topics: string[] = ["all"],
  active = true,
) {
  return t.run(async (ctx) =>
    ctx.db.insert("adminNotificationRecipients", {
      email,
      topics,
      active,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function emailRows(t: T) {
  return t.run(async (ctx) => ctx.db.query("emailHistory").collect());
}

async function rowsFor(t: T, templateKey: string) {
  return (await emailRows(t)).filter((r) => r.templateKey === templateKey);
}

function payloadOf(row: { payloadJson?: string }) {
  return JSON.parse(row.payloadJson || "{}");
}

async function disableTemplate(t: T, adminId: any, key: string) {
  const def = DEFAULT_TEMPLATES.find((d) => d.key === key)!;
  await asUser(t, adminId).mutation(api.emailTemplates.adminSaveEmailTemplate, {
    key: key as any,
    subject: def.subject,
    bodyHtml: def.bodyHtml,
    active: false,
  });
}

describe("notifications administrateur — événements déclencheurs", () => {
  let t: T;
  let adminId: any;

  const flush = () => t.finishAllScheduledFunctions(vi.runAllTimers);

  beforeEach(async () => {
    vi.useFakeTimers();
    t = convexTest(schema, modules);
    adminId = await createUser(t, {
      role: "admin",
      email: "admin@batibuild.tn",
      name: "Admin Batibuild",
    });
    await configureEmail(t, adminId);
    await addRecipient(t, RECIPIENT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("envoie la notification d'inscription avec nom, e-mail, profil et date", async () => {
    const userId = await createUser(t, {
      name: "Ahmed Ben Salah",
      email: "nouveau@test.tn",
    });

    // Fin de l'inscription : le profil choisi dans le formulaire est enregistré.
    await asUser(t, userId).mutation(api.users.setUserRole, { userRole: "expert" });
    await flush();

    const rows = await rowsFor(t, "admin_new_user");
    expect(rows).toHaveLength(1);
    expect(rows[0].to).toBe(RECIPIENT);
    expect(rows[0].subject).toContain("Ahmed");

    const vars = payloadOf(rows[0]).vars;
    expect(vars.prenom).toBe("Ahmed");
    expect(vars.nom).toBe("Ben Salah");
    expect(vars.email).toBe("nouveau@test.tn");
    expect(vars.profil).toBe("Expert");
    expect(vars.date).toBeTruthy();

    // Le compte réel est bien enregistré avec son profil.
    const stored = await t.run(async (ctx) => ctx.db.get(userId));
    expect(stored?.userRole).toBe("expert");
  });

  it("ne notifie pas pour un simple changement de profil d'un compte existant", async () => {
    const userId = await createUser(t, {
      name: "Client Existant",
      email: "existant@test.tn",
      userRole: "client",
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    });

    await asUser(t, userId).mutation(api.users.setUserRole, { userRole: "expert" });
    await flush();

    expect(await rowsFor(t, "admin_new_user")).toHaveLength(0);
  });

  it("notifie chaque nouveau projet, une fois par projet", async () => {
    const owner = await createUser(t, {
      role: "admin",
      name: "Amine Trabelsi",
      email: "projets@test.tn",
    });
    const as = asUser(t, owner);

    await as.mutation(api.projects.createProject, {
      name: "Villa Hammamet",
      category: "villa",
      region: "nabeul",
      surface: 220,
    });
    await flush();

    let rows = await rowsFor(t, "admin_new_project");
    expect(rows).toHaveLength(1);
    const vars = payloadOf(rows[0]).vars;
    expect(vars.nomProjet).toBe("Villa Hammamet");
    expect(vars.typeProjet).toBe("Villa");
    expect(vars.surfaceProjet).toBe("220 m²");
    expect(vars.email).toBe("projets@test.tn");

    await as.mutation(api.projects.createProject, {
      name: "Rénovation Sousse",
      category: "renovation_complete",
      region: "sousse",
      surface: 90,
    });
    await flush();

    rows = await rowsFor(t, "admin_new_project");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => payloadOf(r).vars.nomProjet)).toEqual(
      expect.arrayContaining(["Villa Hammamet", "Rénovation Sousse"]),
    );
  });

  it("notifie un nouvel abonnement attribué par l'administrateur", async () => {
    const userId = await createUser(t, {
      name: "Sami Khelifi",
      email: "abonne@test.tn",
      userRole: "client",
    });

    await asUser(t, adminId).mutation(api.users.adminUpdateUserPlan, {
      userId,
      plan: "pro",
    });
    await flush();

    const rows = await rowsFor(t, "admin_new_subscription");
    expect(rows).toHaveLength(1);
    const vars = payloadOf(rows[0]).vars;
    expect(vars.email).toBe("abonne@test.tn");
    expect(vars.profil).toBe("Client Pro");
    expect(vars.typeAbonnement).toBe("Client Pro");
    expect(vars.montant).toBe("80 TND");
  });

  it("notifie une souscription en attente, puis son activation", async () => {
    // Client Pro fonctionne par cotisation (crédits de projets) : le seul
    // abonnement mensuel est professionnel (Expert / Fournisseur).
    const userId = await createUser(t, {
      name: "Leïla Mansour",
      email: "souscription@test.tn",
      userRole: "expert",
    });

    const subscriptionId = await asUser(t, userId).mutation(
      api.subscriptions.createSubscription,
      { plan: "expert", paymentMethod: "d17", amount: 80, currency: "TND" },
    );
    await flush();

    let rows = await rowsFor(t, "admin_new_subscription");
    expect(rows).toHaveLength(1);
    expect(payloadOf(rows[0]).vars.statut).toMatch(/attente/i);
    // Le montant notifié est le TARIF ADMINISTRÉ du forfait (120 TND par
    // défaut), jamais le montant envoyé par l'interface (ici 80).
    expect(payloadOf(rows[0]).vars.montant).toBe("120 TND");

    await asUser(t, adminId).mutation(api.subscriptions.adminApproveSubscription, {
      subscriptionId,
    });
    await flush();

    rows = await rowsFor(t, "admin_new_subscription");
    expect(rows).toHaveLength(2);
    // Statuts distincts : demande en attente puis activation effective.
    expect(rows.map((r) => payloadOf(r).vars.statut)).toEqual([
      "En attente de validation du paiement",
      "Paiement validé — abonnement actif",
    ]);
    expect(payloadOf(rows[0]).vars.profil).toBe("Expert");
  });

  it("n'envoie rien lorsqu'aucune adresse n'est configurée", async () => {
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("adminNotificationRecipients").collect();
      for (const row of rows) await ctx.db.delete(row._id);
    });

    const userId = await createUser(t, { email: "sans-destinataire@test.tn" });
    await asUser(t, userId).mutation(api.users.setUserRole, { userRole: "client" });
    await flush();

    expect(await rowsFor(t, "admin_new_user")).toHaveLength(0);
  });

  it("n'envoie rien à un destinataire désactivé", async () => {
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("adminNotificationRecipients").collect();
      for (const row of rows) await ctx.db.patch(row._id, { active: false });
    });

    const userId = await createUser(t, { email: "inactif@test.tn" });
    await asUser(t, userId).mutation(api.users.setUserRole, { userRole: "client" });
    await flush();

    expect(await rowsFor(t, "admin_new_user")).toHaveLength(0);
  });

  it("n'envoie rien lorsque le modèle est désactivé", async () => {
    await disableTemplate(t, adminId, "admin_new_user");

    const userId = await createUser(t, { email: "modele-off@test.tn" });
    await asUser(t, userId).mutation(api.users.setUserRole, { userRole: "client" });
    await flush();

    expect(await rowsFor(t, "admin_new_user")).toHaveLength(0);
  });

  it("respecte la catégorie choisie par destinataire", async () => {
    // Le destinataire par défaut ne s'abonne qu'aux nouveaux projets.
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("adminNotificationRecipients").collect();
      for (const row of rows) await ctx.db.patch(row._id, { topics: ["admin_new_project"] });
    });

    const userId = await createUser(t, { email: "categorie@test.tn" });
    await asUser(t, userId).mutation(api.users.setUserRole, { userRole: "client" });
    await flush();

    // Inscription : non souscrite → rien.
    expect(await rowsFor(t, "admin_new_user")).toHaveLength(0);
  });
});

describe("notifications administrateur — gestion des adresses", () => {
  let t: T;
  let adminId: any;
  let userId: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin@batibuild.tn" });
    await configureEmail(t, adminId);
    userId = await createUser(t, { email: "simple@test.tn" });
  });

  it("ajoute une adresse valide et la retourne dans la liste", async () => {
    await asUser(t, adminId).mutation(
      api.adminNotificationRecipients.saveAdminNotificationRecipient,
      { email: "  Direction@Batibuild.TN ", topics: ["admin_new_project"] },
    );

    const rows = await asUser(t, adminId).query(
      api.adminNotificationRecipients.listAdminNotificationRecipients,
      {},
    );
    expect(rows).toHaveLength(1);
    // Adresse normalisée (casse et espaces).
    expect(rows[0].email).toBe("direction@batibuild.tn");
    expect(rows[0].topicLabels).toEqual(["Administrateur — nouveau projet"]);
    expect(rows[0].active).toBe(true);
  });

  it("refuse une adresse invalide", async () => {
    await expect(
      asUser(t, adminId).mutation(
        api.adminNotificationRecipients.saveAdminNotificationRecipient,
        { email: "pas-une-adresse" },
      ),
    ).rejects.toThrow(/invalide/i);
  });

  it("refuse un doublon d'adresse", async () => {
    const as = asUser(t, adminId);
    await as.mutation(api.adminNotificationRecipients.saveAdminNotificationRecipient, {
      email: "double@batibuild.tn",
    });
    await expect(
      as.mutation(api.adminNotificationRecipients.saveAdminNotificationRecipient, {
        email: "DOUBLE@batibuild.tn",
      }),
    ).rejects.toThrow(/déjà enregistrée/i);
  });

  it("modifie puis supprime une adresse", async () => {
    const as = asUser(t, adminId);
    await as.mutation(api.adminNotificationRecipients.saveAdminNotificationRecipient, {
      email: "avant@batibuild.tn",
    });
    const [row] = await as.query(
      api.adminNotificationRecipients.listAdminNotificationRecipients,
      {},
    );

    await as.mutation(api.adminNotificationRecipients.saveAdminNotificationRecipient, {
      recipientId: row._id,
      email: "apres@batibuild.tn",
      name: "Direction",
      topics: ["all"],
      active: false,
    });
    const [updated] = await as.query(
      api.adminNotificationRecipients.listAdminNotificationRecipients,
      {},
    );
    expect(updated.email).toBe("apres@batibuild.tn");
    expect(updated.active).toBe(false);

    await as.mutation(api.adminNotificationRecipients.deleteAdminNotificationRecipient, {
      recipientId: updated._id,
    });
    expect(
      await as.query(api.adminNotificationRecipients.listAdminNotificationRecipients, {}),
    ).toHaveLength(0);
  });

  it("réserve la gestion des adresses aux administrateurs (contrôle serveur)", async () => {
    await expect(
      asUser(t, userId).mutation(
        api.adminNotificationRecipients.saveAdminNotificationRecipient,
        { email: "intrus@batibuild.tn" },
      ),
    ).rejects.toThrow(/admin/i);

    expect(
      await asUser(t, userId).query(
        api.adminNotificationRecipients.listAdminNotificationRecipients,
        {},
      ),
    ).toEqual([]);
  });
});

describe("notifications administrateur — modèles", () => {
  let t: T;
  let adminId: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t, { role: "admin", email: "admin@batibuild.tn" });
  });

  it("propose les trois modèles administrateur dans la liste", async () => {
    const templates = await asUser(t, adminId).query(
      api.emailTemplates.getEmailTemplates,
      {},
    );
    const keys = templates.map((tpl) => tpl.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "admin_new_user",
        "admin_new_subscription",
        "admin_new_project",
      ]),
    );
    // Les modèles destinés aux utilisateurs restent présents.
    expect(keys).toEqual(expect.arrayContaining(["subscription_activated", "support_reply"]));
  });

  it("supprime un modèle (il disparaît et plus rien n'est envoyé) puis le ré-ajoute", async () => {
    const as = asUser(t, adminId);

    await as.mutation(api.emailTemplates.adminDeleteEmailTemplate, {
      key: "admin_new_user",
    });
    let templates = await as.query(api.emailTemplates.getEmailTemplates, {});
    expect(templates.map((tpl) => tpl.key)).not.toContain("admin_new_user");

    await as.mutation(api.emailTemplates.adminRestoreEmailTemplate, {
      key: "admin_new_user",
    });
    templates = await as.query(api.emailTemplates.getEmailTemplates, {});
    expect(templates.map((tpl) => tpl.key)).toContain("admin_new_user");
  });

  it("refuse la suppression d'un modèle par un non-administrateur", async () => {
    const simple = await createUser(t, { email: "simple@test.tn" });
    await expect(
      asUser(t, simple).mutation(api.emailTemplates.adminDeleteEmailTemplate, {
        key: "admin_new_project",
      }),
    ).rejects.toThrow(/admin/i);
  });
});
