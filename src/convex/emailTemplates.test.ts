/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";
import { DEFAULT_TEMPLATES } from "./emailTemplates";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Modèles de notification — nettoyage des doublons
//
// Un seul modèle actif par type de demande / scénario d'envoi : les anciennes
// variantes stockées en base sont supprimées puis les modèles normalisés du
// code sont réappliqués. L'historique des envois n'est jamais touché.
// ============================================================================

async function createUser(
  t: ReturnType<typeof convexTest>,
  overrides: { email?: string; role?: string } = {},
) {
  return t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin Test",
      email: overrides.email ?? "admin@test.com",
      role: overrides.role ?? "admin",
      status: "active",
      subscriptionPlan: "free",
      phone: "+216 98 000 000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

describe("emailTemplates — nettoyage des modèles en doublon", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await createUser(t);
  });

  it("supprime les anciennes variantes et réapplique un seul modèle par événement", async () => {
    await t.run(async (ctx) => {
      // Ancienne variante (clé qui n'existe plus) : doit être supprimée.
      await ctx.db.insert("emailTemplates", {
        key: "legacy_expert_service_request" as any,
        label: "Ancienne variante",
        subject: "Ancien objet",
        bodyHtml: "Ancien contenu",
        active: true,
        updatedAt: Date.now(),
        updatedBy: adminId as any,
      });
      // Doublon sur un événement canonique : doit être réinitialisé.
      await ctx.db.insert("emailTemplates", {
        key: "quote_request_sent" as any,
        label: "Doublon",
        subject: "Objet personnalisé en doublon",
        bodyHtml: "Contenu en doublon",
        active: true,
        updatedAt: Date.now(),
        updatedBy: adminId as any,
      });
      // Historique existant : doit être conservé tel quel.
      await ctx.db.insert("emailHistory", {
        to: "client@test.com",
        templateKey: "legacy_expert_service_request",
        subject: "Ancien envoi",
        status: "sent",
        createdAt: Date.now(),
      });
    });

    const result = await t
      .withIdentity({ subject: adminId })
      .mutation(api.emailTemplates.adminCleanupEmailTemplates, {});

    expect(result.removedDuplicates).toBe(1);
    expect(result.resetToDefault).toBe(1);

    // La table ne contient plus aucun modèle stocké : les modèles normalisés du
    // code (DEFAULT_TEMPLATES) reprennent la main, sans doublon possible.
    const stored = await t.run(async (ctx) =>
      ctx.db.query("emailTemplates").collect(),
    );
    expect(stored).toHaveLength(0);

    const templates = await t
      .withIdentity({ subject: adminId })
      .query(api.emailTemplates.getEmailTemplates, {});

    const keys = templates.map((tpl: any) => tpl.key);
    expect(keys).toHaveLength(DEFAULT_TEMPLATES.length);
    expect(new Set(keys).size).toBe(keys.length);

    for (const key of [
      "quote_request_sent",
      "service_request_sent",
      "expert_quote_request",
      "expert_appointment_request",
      "expert_urgent_request",
      "quote_received",
      "service_received",
      "expert_quote_received",
      "expert_appointment_response",
      "expert_urgent_response",
    ]) {
      expect(keys.filter((k) => k === key)).toHaveLength(1);
    }

    const quoteSent = templates.find((tpl: any) => tpl.key === "quote_request_sent");
    const normalized = DEFAULT_TEMPLATES.find((tpl) => tpl.key === "quote_request_sent");
    expect(quoteSent?.subject).toBe(normalized?.subject);

    // L'historique des notifications déjà envoyées est conservé.
    const history = await t.run(async (ctx) =>
      ctx.db.query("emailHistory").collect(),
    );
    expect(history).toHaveLength(1);
    expect(history[0].templateKey).toBe("legacy_expert_service_request");
  });

  it("refuse le nettoyage à un compte non administrateur", async () => {
    const userId = await createUser(t, { email: "user@test.com", role: "user" });
    await expect(
      t
        .withIdentity({ subject: userId })
        .mutation(api.emailTemplates.adminCleanupEmailTemplates, {}),
    ).rejects.toThrow(/Admin access required/);
  });
});
