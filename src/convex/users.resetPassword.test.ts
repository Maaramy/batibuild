/// <reference types="vite/client" />

import { createHash } from "node:crypto";
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import schema from "./schema.js";
import { api, internal } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

/** Reproduit `sha256` de convex-auth (hex minuscule), format stocké pour les codes OTP. */
function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const EMAIL = "reset@test.tn";
const OLD_PASSWORD = "ancien-mot-de-passe";
const NEW_PASSWORD = "nouveau-mot-de-passe";

type T = ReturnType<typeof convexTest>;

/** Écrit un mot de passe réellement haché par Convex Auth (Scrypt). */
async function storePassword(t: T, providerAccountId: string, password: string) {
  await t.mutation(internal.auth.store, {
    args: {
      type: "modifyAccount",
      provider: "password",
      account: { id: providerAccountId, secret: password },
    },
  });
}

/** Vérifie un mot de passe exactement comme la connexion le fait. */
async function checkPassword(t: T, providerAccountId: string, password: string) {
  return t.mutation(internal.auth.store, {
    args: {
      type: "retrieveAccountWithCredentials",
      provider: "password",
      account: { id: providerAccountId, secret: password },
    },
  });
}

/**
 * État de la base après une inscription e-mail + mot de passe vérifiée : un
 * utilisateur, un compte `password` et un compte `email-otp` (celui qui porte
 * les codes reçus par e-mail).
 */
async function seedUser(t: T, email = EMAIL) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Test User",
      email,
      emailVerificationTime: Date.now(),
      role: "user",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const passwordAccountId = await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: email,
    });
    const otpAccountId = await ctx.db.insert("authAccounts", {
      userId,
      provider: "email-otp",
      providerAccountId: email,
    });
    return { userId, passwordAccountId, otpAccountId };
  });
}

async function seedVerificationCode(
  t: T,
  accountId: any,
  code: string,
  options: {
    provider?: string;
    expired?: boolean;
    phone?: string;
    emailVerified?: string;
  } = {},
) {
  // Comme Convex Auth, le code porte l'adresse de son compte : c'est elle qui
  // est (re)marquée vérifiée au moment de la validation.
  const account = await t.run(async (ctx) => ctx.db.get(accountId));
  const emailVerified =
    options.emailVerified ??
    (options.phone === undefined ? account?.providerAccountId : undefined);

  return t.run(async (ctx) =>
    ctx.db.insert("authVerificationCodes", {
      accountId,
      provider: options.provider ?? "email-otp",
      code: sha256(code),
      expirationTime: Date.now() + (options.expired ? -1000 : 15 * 60 * 1000),
      emailVerified,
      phoneVerified: options.phone,
    }),
  );
}

describe("users.resetPassword", () => {
  let t: T;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  // ── Cas nominal ──

  it("réinitialise le mot de passe et remplace réellement l'ancien", async () => {
    const { passwordAccountId, otpAccountId } = await seedUser(t);
    await storePassword(t, EMAIL, OLD_PASSWORD);
    await seedVerificationCode(t, otpAccountId, "123456");

    // L'ancien mot de passe fonctionne avant la réinitialisation.
    expect(await checkPassword(t, EMAIL, OLD_PASSWORD)).toMatchObject({
      account: { provider: "password" },
    });

    const result = await t.mutation(api.users.resetPassword, {
      email: EMAIL,
      code: "123456",
      newPassword: NEW_PASSWORD,
    });
    expect(result).toEqual({ success: true });

    // Le nouveau mot de passe est valide, l'ancien ne l'est plus.
    expect(await checkPassword(t, EMAIL, NEW_PASSWORD)).toMatchObject({
      account: { provider: "password" },
    });
    expect(await checkPassword(t, EMAIL, OLD_PASSWORD)).toBe("InvalidSecret");

    // Le secret stocké est un hachage, jamais le mot de passe en clair.
    const account = await t.run(async (ctx) => ctx.db.get(passwordAccountId));
    expect(account!.secret).toBeDefined();
    expect(account!.secret).not.toBe(NEW_PASSWORD);
    expect(account!.secret).not.toContain(NEW_PASSWORD);

    // La vérification ne laisse aucune session ouverte.
    const sessions = await t.run(async (ctx) => ctx.db.query("authSessions").collect());
    expect(sessions).toHaveLength(0);
  });

  it("consomme le code : il n'est pas réutilisable", async () => {
    const { otpAccountId } = await seedUser(t);
    await storePassword(t, EMAIL, OLD_PASSWORD);
    await seedVerificationCode(t, otpAccountId, "123456");

    await t.mutation(api.users.resetPassword, {
      email: EMAIL,
      code: "123456",
      newPassword: NEW_PASSWORD,
    });

    const codes = await t.run(async (ctx) =>
      ctx.db.query("authVerificationCodes").collect(),
    );
    expect(codes).toHaveLength(0);

    await expect(
      t.mutation(api.users.resetPassword, {
        email: EMAIL,
        code: "123456",
        newPassword: "troisieme-mot-de-passe",
      }),
    ).rejects.toThrow(/invalide ou expiré/);

    // Le second appel n'a rien changé.
    expect(await checkPassword(t, EMAIL, NEW_PASSWORD)).toMatchObject({
      account: { provider: "password" },
    });
  });

  // ── Cause racine reproduite : compte dupliqué pour la même adresse ──

  it("réinitialise malgré plusieurs documents users pour le même e-mail", async () => {
    // 1. Ancien compte sans `emailVerificationTime` (créé avant la vérification
    //    d'e-mail) : Convex Auth ne relie pas les comptes à un utilisateur dont
    //    l'e-mail n'est pas marqué vérifié.
    const { passwordAccountId, otpAccountId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Ancien compte",
        email: EMAIL,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return {
        passwordAccountId: await ctx.db.insert("authAccounts", {
          userId,
          provider: "password",
          providerAccountId: EMAIL,
        }),
        otpAccountId: await ctx.db.insert("authAccounts", {
          userId,
          provider: "email-otp",
          providerAccountId: EMAIL,
        }),
      };
    });
    await storePassword(t, EMAIL, OLD_PASSWORD);

    // 2. Le parcours « Mot de passe oublié » crée un SECOND document users pour
    //    la même adresse, et le code OTP est rattaché à son compte e-mail.
    const duplicateUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: EMAIL, createdAt: Date.now() }),
    );
    const duplicateOtpAccountId = await t.run(async (ctx) =>
      ctx.db.insert("authAccounts", {
        userId: duplicateUserId,
        provider: "email-otp",
        providerAccountId: EMAIL,
      }),
    );
    await seedVerificationCode(t, duplicateOtpAccountId, "123456");

    const userCount = await t.run(async (ctx) => (await ctx.db.query("users").collect()).length);
    expect(userCount).toBe(2);

    const before = await t.run(async (ctx) => ctx.db.get(passwordAccountId));

    // 3. Le code est pourtant valide : la réinitialisation doit aboutir.
    const result = await t.mutation(api.users.resetPassword, {
      email: EMAIL,
      code: "123456",
      newPassword: NEW_PASSWORD,
    });
    expect(result).toEqual({ success: true });

    // C'est bien le compte `password` historique qui a été mis à jour.
    expect(await checkPassword(t, EMAIL, NEW_PASSWORD)).toMatchObject({
      account: { provider: "password" },
    });
    expect(await checkPassword(t, EMAIL, OLD_PASSWORD)).toBe("InvalidSecret");

    const after = await t.run(async (ctx) => ctx.db.get(passwordAccountId));
    expect(after!.secret).not.toBe(before!.secret);
    expect(after!.providerAccountId).toBe(EMAIL);
    expect(otpAccountId).not.toBe(passwordAccountId);
  });

  // ── Casse et espaces ──

  it("retrouve le compte quel que soit la casse saisie", async () => {
    const { otpAccountId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Casse mixte",
        email: "Casse@test.tn",
        emailVerificationTime: Date.now(),
      });
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "password",
        providerAccountId: "Casse@test.tn",
      });
      return {
        otpAccountId: await ctx.db.insert("authAccounts", {
          userId,
          provider: "email-otp",
          providerAccountId: "casse@test.tn",
        }),
      };
    });
    await storePassword(t, "Casse@test.tn", OLD_PASSWORD);
    await seedVerificationCode(t, otpAccountId, "123456");

    await expect(
      t.mutation(api.users.resetPassword, {
        email: "casse@test.tn",
        code: "123456",
        newPassword: NEW_PASSWORD,
      }),
    ).resolves.toEqual({ success: true });

    expect(await checkPassword(t, "Casse@test.tn", NEW_PASSWORD)).toMatchObject({
      account: { provider: "password" },
    });
  });

  // ── Cas invalides : erreurs explicites, jamais « Server Error » ──

  it("renvoie une ConvexError explicite pour un e-mail inconnu", async () => {
    const error = await t
      .mutation(api.users.resetPassword, {
        email: "inconnu@test.tn",
        code: "123456",
        newPassword: NEW_PASSWORD,
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<string>).data).toBe("Aucun compte trouvé avec cet email.");
    expect((error as Error).message).not.toMatch(/Server Error/);
  });

  it("rejette un compte sans mot de passe avec un message explicite", async () => {
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "otp-only@test.tn",
        emailVerificationTime: Date.now(),
      }),
    );
    const otpAccountId = await t.run(async (ctx) =>
      ctx.db.insert("authAccounts", {
        userId,
        provider: "email-otp",
        providerAccountId: "otp-only@test.tn",
      }),
    );
    await seedVerificationCode(t, otpAccountId, "123456");

    const error = await t
      .mutation(api.users.resetPassword, {
        email: "otp-only@test.tn",
        code: "123456",
        newPassword: NEW_PASSWORD,
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<string>).data).toMatch(/n'a pas de mot de passe/);
  });

  it("rejette un code erroné", async () => {
    const { otpAccountId } = await seedUser(t);
    await storePassword(t, EMAIL, OLD_PASSWORD);
    await seedVerificationCode(t, otpAccountId, "123456");

    await expect(
      t.mutation(api.users.resetPassword, {
        email: EMAIL,
        code: "000000",
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toThrow(/invalide ou expiré/);

    // L'ancien mot de passe reste valable.
    expect(await checkPassword(t, EMAIL, OLD_PASSWORD)).toMatchObject({
      account: { provider: "password" },
    });
  });

  it("rejette un code expiré", async () => {
    const { otpAccountId } = await seedUser(t);
    await storePassword(t, EMAIL, OLD_PASSWORD);
    await seedVerificationCode(t, otpAccountId, "123456", { expired: true });

    await expect(
      t.mutation(api.users.resetPassword, {
        email: EMAIL,
        code: "123456",
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toThrow(/invalide ou expiré/);
  });

  it("rejette un code mal formé sans appeler Convex Auth", async () => {
    const { otpAccountId } = await seedUser(t);
    await seedVerificationCode(t, otpAccountId, "123456");

    await expect(
      t.mutation(api.users.resetPassword, {
        email: EMAIL,
        code: "abc",
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toThrow(/6 chiffres/);

    // Le code n'a pas été consommé : il reste utilisable.
    const codes = await t.run(async (ctx) =>
      ctx.db.query("authVerificationCodes").collect(),
    );
    expect(codes).toHaveLength(1);
  });

  it("rejette un mot de passe trop court", async () => {
    const { otpAccountId } = await seedUser(t);
    await seedVerificationCode(t, otpAccountId, "123456");

    await expect(
      t.mutation(api.users.resetPassword, {
        email: EMAIL,
        code: "123456",
        newPassword: "court",
      }),
    ).rejects.toThrow(/8 caractères/);
  });

  it("refuse un code réellement émis pour une autre adresse", async () => {
    const { otpAccountId } = await seedUser(t);
    await storePassword(t, EMAIL, OLD_PASSWORD);
    expect(otpAccountId).toBeDefined();

    // Un code émis pour une autre adresse : jamais valable ici, et surtout
    // jamais un « Server Error » (le provider refuse l'adresse différente).
    const otherUserId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "autre@test.tn",
        emailVerificationTime: Date.now(),
      }),
    );
    const otherOtpAccountId = await t.run(async (ctx) =>
      ctx.db.insert("authAccounts", {
        userId: otherUserId,
        provider: "email-otp",
        providerAccountId: "autre@test.tn",
      }),
    );
    await seedVerificationCode(t, otherOtpAccountId, "123456", {
      emailVerified: "autre@test.tn",
    });

    const error = await t
      .mutation(api.users.resetPassword, {
        email: EMAIL,
        code: "123456",
        newPassword: NEW_PASSWORD,
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConvexError);
    expect((error as Error).message).toMatch(/invalide ou expiré|échoué/);
    expect((error as Error).message).not.toMatch(/Server Error/);

    // Le mot de passe de l'adresse visée n'a pas bougé.
    expect(await checkPassword(t, EMAIL, OLD_PASSWORD)).toMatchObject({
      account: { provider: "password" },
    });
  });
});
