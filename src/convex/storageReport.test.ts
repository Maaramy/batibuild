/// <reference types="vite/client" />

import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { internal } from "./_generated/api.js";
import {
  collectReferencedStorageIds,
  collectStorageRefs,
  planDuplicateRemovals,
  selectOrphans,
  splitOrphansByAge,
  summarizeStorage,
  toStorageFileInfo,
  utf8ByteLength,
  type StorageFileInfo,
} from "./storageReport.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Rapport stockage (admin) — taille de la base, du storage et orphelins
//
// NB : `_listStorageFiles` et `_deleteOrphanedStorageFiles` s'appuient sur
// `ctx.db.system`, que `convex-test` n'implémente pas encore (0.0.54) — ces
// fonctions ne sont donc pas couvertes ici ; les tests couvrent la logique de
// croisement (helpers purs), la sélection des orphelins à supprimer et la
// lecture des tables utilisateur (`_inspectTable`), qui est la partie métier.
// ============================================================================

// ── Helpers purs ────────────────────────────────────────────────────────────

describe("collectStorageRefs", () => {
  const ids = new Set(["kg2abc123", "kg2def456"]);

  it("détecte un identifiant brut et un identifiant imbriqué en tableau", () => {
    const out = new Set<string>();
    collectStorageRefs({ files: [{ storageId: "kg2abc123" }] }, ids, out);
    expect([...out]).toEqual(["kg2abc123"]);
  });

  it("extrait l'identifiant depuis une URL de fichier Convex", () => {
    const out = new Set<string>();
    collectStorageRefs(
      {
        image: "https://rightful-mouse-955.convex.cloud/api/storage/kg2def456",
        legacy: "https://app.example/files/kg2abc123",
      },
      ids,
      out,
    );
    expect(out.has("kg2def456")).toBe(true);
    expect(out.has("kg2abc123")).toBe(true);
  });

  it("ignore les chaînes qui ne sont pas des fichiers du storage", () => {
    const out = new Set<string>();
    collectStorageRefs(
      { a: "kg2zzz999", b: "https://example.com/api/storage/kg2zzz999", n: 42, nil: null },
      ids,
      out,
    );
    expect(out.size).toBe(0);
  });
});

describe("utf8ByteLength", () => {
  it("compte les octets UTF-8 (accents) et pas seulement les caractères", () => {
    expect(utf8ByteLength("abc")).toBe(3);
    expect(utf8ByteLength("é")).toBe(2);
    expect(utf8ByteLength("€")).toBe(3);
  });
});

describe("summarizeStorage", () => {
  const file = (
    storageId: string,
    size: number,
    sha256: string,
  ): StorageFileInfo => ({ storageId, size, contentType: "image/png", sha256, createdAt: 0 });

  it("distingue les fichiers référencés des orphelins", () => {
    const summary = summarizeStorage(
      [file("a", 100, "sha1"), file("b", 250, "sha2"), file("c", 50, "sha3")],
      new Set(["a"]),
    );
    expect(summary.files).toBe(3);
    expect(summary.bytes).toBe(400);
    expect(summary.referencedFiles).toBe(1);
    expect(summary.referencedBytes).toBe(100);
    expect(summary.orphanedFiles).toBe(2);
    expect(summary.orphanedBytes).toBe(300);
    // Orphelins triés du plus lourd au plus léger.
    expect(summary.orphans.map((f) => f.storageId)).toEqual(["b", "c"]);
  });

  it("regroupe les doublons par sha256 et calcule l'espace gaspillé", () => {
    const summary = summarizeStorage(
      [file("a", 1000, "same"), file("b", 1000, "same"), file("c", 1000, "same"), file("d", 5, "other")],
      new Set(),
    );
    expect(summary.duplicates).toHaveLength(1);
    expect(summary.duplicates[0]).toMatchObject({ sha256: "same", count: 3, wastedBytes: 2000 });
    expect(summary.duplicateWastedBytes).toBe(2000);
    // Un exemplaire conservé par empreinte : 2 copies supprimables.
    expect(summary.duplicateRemovals).toMatchObject({ files: 2, bytes: 2000, groups: 1 });
  });

  it("ne propose aucune suppression quand une copie dupliquée est référencée", () => {
    const summary = summarizeStorage(
      [file("a", 1000, "same"), file("b", 1000, "same")],
      new Set(["b"]),
    );
    expect(summary.duplicates).toHaveLength(1);
    expect(summary.duplicateRemovals.files).toBe(1);
    expect(summary.duplicateRemovals.bytes).toBe(1000);
  });

  it("retourne un rapport vide sans fichier", () => {
    const summary = summarizeStorage([], new Set());
    expect(summary).toMatchObject({ files: 0, bytes: 0, orphanedFiles: 0, orphanedBytes: 0 });
    expect(summary.orphans).toEqual([]);
    expect(summary.duplicates).toEqual([]);
    expect(summary.duplicateRemovals).toEqual({
      files: 0,
      bytes: 0,
      groups: 0,
      recentSkipped: 0,
    });
  });
});

// ── Sélection des orphelins à supprimer ─────────────────────────────────────

describe("selectOrphans", () => {
  const file = (storageId: string, size: number, createdAt = 0): StorageFileInfo => ({
    storageId,
    size,
    contentType: "image/jpeg",
    sha256: `sha-${storageId}`,
    createdAt,
  });

  it("ne retient que les fichiers non référencés, du plus lourd au plus léger", () => {
    const files = [file("a", 10), file("b", 500), file("c", 90)];
    expect(selectOrphans(files, new Set(["a"])).map((f) => f.storageId)).toEqual(["b", "c"]);
  });

  it("retourne une liste vide quand tout est référencé", () => {
    const files = [file("a", 10), file("b", 500)];
    expect(selectOrphans(files, new Set(["a", "b"]))).toEqual([]);
  });
});

describe("planDuplicateRemovals", () => {
  const HOUR = 60 * 60 * 1000;
  const now = 10_000_000_000;
  const file = (
    storageId: string,
    sha256: string,
    createdAt: number,
    size = 100,
  ): StorageFileInfo => ({ storageId, size, contentType: "image/png", sha256, createdAt });

  it("conserve un exemplaire par empreinte et supprime les copies en trop", () => {
    const plan = planDuplicateRemovals(
      [
        file("ancien", "shaA", now - 5 * HOUR),
        file("recent", "shaA", now - 2 * HOUR),
        file("unique", "shaB", now - 5 * HOUR),
      ],
      new Set(),
      now,
    );
    expect(plan.groups).toBe(1);
    expect(plan.groupedFiles).toBe(2);
    // Le plus ancien est conservé, l'autre supprimé.
    expect(plan.removals.map((f) => f.storageId)).toEqual(["recent"]);
    expect(plan.groupsWithKeptReference).toBe(0);
  });

  it("conserve toujours une copie référencée, même plus récente", () => {
    const plan = planDuplicateRemovals(
      [
        file("orpheline", "shaA", now - 5 * HOUR),
        file("referencee", "shaA", now - 2 * HOUR),
      ],
      new Set(["referencee"]),
      now,
    );
    expect(plan.removals.map((f) => f.storageId)).toEqual(["orpheline"]);
    expect(plan.groupsWithKeptReference).toBe(1);
  });

  it("ne supprime jamais deux copies référencées d'une même empreinte", () => {
    const plan = planDuplicateRemovals(
      [file("ref1", "shaA", now - 5 * HOUR), file("ref2", "shaA", now - 2 * HOUR)],
      new Set(["ref1", "ref2"]),
      now,
    );
    expect(plan.removals).toEqual([]);
    expect(plan.groupsWithKeptReference).toBe(1);
  });

  it("écarte les copies déposées depuis moins d'une heure", () => {
    const plan = planDuplicateRemovals(
      [file("ancien", "shaA", now - 5 * HOUR), file("frais", "shaA", now - 1000)],
      new Set(),
      now,
    );
    expect(plan.removals).toEqual([]);
    expect(plan.recentSkipped).toBe(1);
  });

  it("ignore les empreintes uniques et trie les suppressions par taille", () => {
    const plan = planDuplicateRemovals(
      [
        file("a1", "shaA", now - 5 * HOUR, 10),
        file("a2", "shaA", now - 4 * HOUR, 10),
        file("b1", "shaB", now - 5 * HOUR, 900),
        file("b2", "shaB", now - 4 * HOUR, 900),
        file("seul", "shaC", now - 5 * HOUR),
      ],
      new Set(),
      now,
    );
    expect(plan.groups).toBe(2);
    expect(plan.removals.map((f) => f.storageId)).toEqual(["b2", "a2"]);
  });
});

describe("splitOrphansByAge", () => {
  const file = (storageId: string, ageMs: number, now: number): StorageFileInfo => ({
    storageId,
    size: 10,
    contentType: null,
    sha256: storageId,
    createdAt: now - ageMs,
  });

  it("écarte les fichiers déposés depuis moins d'une heure", () => {
    const now = 10_000_000_000;
    const { deletable, recent } = splitOrphansByAge(
      [
        file("vieux", 2 * 60 * 60 * 1000, now),
        file("limite", 60 * 60 * 1000, now),
        file("frais", 5 * 60 * 1000, now),
      ],
      now,
    );
    expect(deletable.map((f) => f.storageId)).toEqual(["vieux", "limite"]);
    expect(recent.map((f) => f.storageId)).toEqual(["frais"]);
  });

  it("ne supprime rien quand tous les orphelins sont récents", () => {
    const now = 10_000_000_000;
    const { deletable, recent } = splitOrphansByAge([file("frais", 1000, now)], now);
    expect(deletable).toEqual([]);
    expect(recent).toHaveLength(1);
  });
});

describe("toStorageFileInfo", () => {
  it("normalise une ligne de `_storage` (contentType absent → null)", () => {
    expect(
      toStorageFileInfo({ _id: "kg1", _creationTime: 123, size: 42, sha256: "abc" }),
    ).toEqual({ storageId: "kg1", size: 42, contentType: null, sha256: "abc", createdAt: 123 });
    expect(
      toStorageFileInfo({
        _id: "kg2",
        _creationTime: 456,
        size: 7,
        contentType: "image/webp",
        sha256: "def",
      }).contentType,
    ).toBe("image/webp");
  });
});

describe("collectReferencedStorageIds", () => {
  // Lecteur de tables factice : une seule table « peuplée », les autres vides.
  const fakeCtx = (docs: Record<string, Record<string, unknown>[]>) => ({
    query: (table: string) => ({ collect: async () => docs[table] ?? [] }),
  });

  it("collecte les identifiants référencés, y compris via URL", async () => {
    const referenced = await collectReferencedStorageIds(
      fakeCtx({
        users: [{ image: "https://x.convex.cloud/api/storage/kg1" }, { name: "sans fichier" }],
        projects: [{ files: [{ storageId: "kg2" }, { storageId: "inconnu" }] }],
      }),
      ["kg1", "kg2", "kg3"],
    );
    expect([...referenced].sort()).toEqual(["kg1", "kg2"]);
  });

  it("ignore une table absente et retourne un ensemble vide sans référence", async () => {
    const referenced = await collectReferencedStorageIds(
      {
        query: (table: string) => ({
          collect: async () => {
            if (table === "projects") throw new Error("table absente");
            return [{ name: "x" }];
          },
        }),
      },
      ["kg1"],
    );
    expect(referenced.size).toBe(0);
  });
});

// ── Lecture des tables (`_inspectTable`) ────────────────────────────────────

describe("_inspectTable", () => {
  it("compte les documents, estime les octets et remonte les références storage", async () => {
    const t = convexTest(schema, modules);

    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["contenu de test"])),
    );

    // Référence par identifiant brut (annonce) + par URL (photo de profil).
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Admin Test",
        email: "admin@test.com",
        role: "admin",
        status: "active",
        subscriptionPlan: "free",
        image: `https://example.convex.cloud/api/storage/${storageId}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("announcements", {
        title: "Annonce",
        content: "Contenu",
        type: "annonce",
        priority: 1,
        imageStorageId: storageId,
        status: "published",
        isActive: true,
        targetType: "all",
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const storageIds = [storageId as string];

    const users = await t.query(internal.storageReport._inspectTable, {
      table: "users",
      storageIds,
    });
    expect(users.count).toBe(1);
    expect(users.bytes).toBeGreaterThan(0);
    expect(users.referenced).toEqual(storageIds);

    const announcements = await t.query(internal.storageReport._inspectTable, {
      table: "announcements",
      storageIds,
    });
    expect(announcements.count).toBe(1);
    expect(announcements.referenced).toEqual(storageIds);
  });

  it("ignore une table absente du déploiement au lieu d'échouer", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(internal.storageReport._inspectTable, {
      table: "table_inexistante_xyz",
      storageIds: [],
    });
    expect(result.count).toBe(0);
    expect(result.referenced).toEqual([]);
  });
});

// ── Garde admin ─────────────────────────────────────────────────────────────

describe("_requireAdmin", () => {
  it("refuse un utilisateur standard et un visiteur anonyme", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Simple",
        email: "simple@test.com",
        role: "user",
        status: "active",
        subscriptionPlan: "free",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(t.query(internal.storageReport._requireAdmin, {})).rejects.toThrow(
      /Admin access required/,
    );
    await expect(
      t.withIdentity({ subject: userId }).query(internal.storageReport._requireAdmin, {}),
    ).rejects.toThrow(/Admin access required/);
  });

  it("autorise un admin et un modérateur", async () => {
    const t = convexTest(schema, modules);

    for (const role of ["admin", "moderator"] as const) {
      const userId = await t.run(async (ctx) =>
        ctx.db.insert("users", {
          name: role,
          email: `${role}@test.com`,
          role,
          status: "active",
          subscriptionPlan: "free",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      );
      const result = await t
        .withIdentity({ subject: userId })
        .query(internal.storageReport._requireAdmin, {});
      expect(result).toMatchObject({ adminName: role, adminId: userId });
    }
  });
});
