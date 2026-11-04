"use node";

// ============================================================================
// ENVOI DES NOTIFICATIONS PUSH — Firebase Cloud Messaging (HTTP v1)
// ----------------------------------------------------------------------------
// Fonction Node isolée : c'est le SEUL endroit où la clé privée du compte de
// service Firebase est utilisée. Les jetons d'accès OAuth2 sont mis en cache
// en mémoire (~50 min) pour ne pas re-signer un JWT à chaque notification.
// Chaque envoi est indépendant : un appareil invalide n'interrompt jamais le
// lot, et son token est désactivé côté base.
// ============================================================================

import { v } from "convex/values";
import { createSign } from "node:crypto";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getFirebaseServiceAccount } from "./pushConfig";

type CachedToken = { value: string; expiresAt: number; account: string };
let cached: CachedToken | null = null;

const base64url = (input: string | Buffer): string =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

async function accessToken(): Promise<{ token?: string; error?: string }> {
  const account = getFirebaseServiceAccount();
  if (!account) {
    return {
      error:
        "Firebase Cloud Messaging non configuré : définissez FIREBASE_SERVICE_ACCOUNT_JSON dans les variables d'environnement du backend.",
    };
  }

  if (cached && cached.account === account.clientEmail && cached.expiresAt > Date.now() + 60_000) {
    return { token: cached.value };
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  let assertion: string;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    const signature = signer.sign(account.privateKey, "base64url");
    assertion = `${header}.${claims}.${signature}`;
  } catch {
    return {
      error:
        "Clé privée Firebase illisible : vérifiez FIREBASE_PRIVATE_KEY (retours à la ligne \\n) ou le JSON du compte de service.",
    };
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => null)) as
      | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
      | null;

    if (!res.ok || !json?.access_token) {
      const detail = json?.error_description || json?.error || `HTTP ${res.status}`;
      return { error: `Authentification Firebase refusée (${detail}).` };
    }

    cached = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
      account: account.clientEmail,
    };
    return { token: json.access_token };
  } catch (error) {
    return {
      error: `Connexion à Google OAuth impossible (${error instanceof Error ? error.message : "réseau"}).`,
    };
  }
}

type SendArgs = {
  token: string;
  title: string;
  message: string;
  imageUrl?: string;
  destination?: string;
  campaignId?: string;
  logId?: string;
  logToken?: string;
  actionLabel?: string;
  test?: boolean;
};

async function send(args: SendArgs) {
  const account = getFirebaseServiceAccount();
  if (!account) {
    return { ok: false, error: "Firebase Cloud Messaging non configuré.", invalidToken: false };
  }

  const auth = await accessToken();
  if (!auth.token) {
    return { ok: false, error: auth.error ?? "Authentification Firebase impossible.", invalidToken: false };
  }

  const data: Record<string, string> = {
    url: args.destination || "/dashboard",
    title: args.title,
    body: args.message,
  };
  if (args.campaignId) data.campaignId = args.campaignId;
  if (args.logId) data.logId = args.logId;
  if (args.logToken) data.logToken = args.logToken;
  if (args.actionLabel) data.actionLabel = args.actionLabel;
  if (args.imageUrl) data.imageUrl = args.imageUrl;

  const body = {
    message: {
      token: args.token,
      notification: {
        title: args.title,
        body: args.message,
        ...(args.imageUrl ? { image: args.imageUrl } : {}),
      },
      android: {
        priority: "high",
        notification: {
          channel_id: "batibuild_default",
          sound: "default",
          ...(args.imageUrl ? { image: args.imageUrl } : {}),
        },
      },
      data,
    },
  };

  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      },
    );

    const json = (await res.json().catch(() => null)) as
      | {
          name?: string;
          error?: {
            status?: string;
            message?: string;
            details?: Array<{ errorCode?: string }>;
          };
        }
      | null;

    if (res.ok && json?.name) {
      return { ok: true, messageId: json.name, error: undefined, invalidToken: false };
    }

    const code =
      json?.error?.details?.find((d) => d?.errorCode)?.errorCode || json?.error?.status || "";
    const invalidToken =
      res.status === 404 ||
      code === "UNREGISTERED" ||
      code === "INVALID_ARGUMENT" ||
      code === "SENDER_ID_MISMATCH";

    return {
      ok: false,
      error: json?.error?.message || `FCM HTTP ${res.status}`,
      invalidToken,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Réseau FCM indisponible (${error instanceof Error ? error.message : "inconnu"}).`,
      invalidToken: false,
    };
  }
}

/**
 * Envoie une notification (campagne ou test administrateur) puis enregistre le
 * résultat sur le log correspondant — jamais d'échec silencieux.
 */
export const sendPushAction = internalAction({
  args: {
    token: v.string(),
    title: v.string(),
    message: v.string(),
    imageUrl: v.optional(v.string()),
    destination: v.optional(v.string()),
    campaignId: v.optional(v.id("pushCampaigns")),
    logId: v.optional(v.id("pushLogs")),
    logToken: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    test: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const result = await send(args);

    if (args.logId) {
      await ctx.runMutation(internal.push.markDeliveryResult, {
        logId: args.logId,
        ok: result.ok,
        messageId: result.messageId,
        error: result.error,
        invalidToken: result.invalidToken,
        token: args.token,
      });
    }

    return {
      ok: result.ok,
      error: result.error,
      invalidToken: result.invalidToken,
      messageId: result.messageId,
    };
  },
});
