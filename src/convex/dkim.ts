"use node";

// ============================================================================
// DKIM — signature des e-mails sortants (SERVEUR uniquement)
// ============================================================================
//
// La signature DKIM est produite EXCLUSIVEMENT côté serveur, dans les actions
// Node de Convex. Aucune clé, aucun secret et aucune opération de signature ne
// concernent le frontend : `SMTP_DKIM_PRIVATE_KEY` est lu dans ce seul module,
// n'est jamais journalisé, jamais renvoyé par une API et jamais envoyé au
// navigateur (voir `src/convex/emailSender.ts`, `adminCheckEmailDeliverability`
// ne renvoie que des booléens et des noms d'enregistrements DNS).
//
// Variables d'environnement (onglet Keys/API keys) :
//   SMTP_DKIM_DOMAIN      domaine signé (batibuild.app)
//   SMTP_DKIM_SELECTOR    sélecteur publié en DNS (ex. batibuild)
//   SMTP_DKIM_PRIVATE_KEY clé privée PEM fournie par l'hébergeur ; les `\n`
//                         littéraux (copier-coller) sont rétablis.
//
// Ce module sert aussi à VÉRIFIER la signature : la présence des variables ne
// suffit pas à déclarer DKIM « configuré ». On compile un message avec le même
// moteur d'envoi (nodemailer + options DKIM réelles) et on contrôle que
// l'en-tête `DKIM-Signature` est bien présent, avec le bon domaine et le bon
// sélecteur.

import crypto from "node:crypto";
import dns from "node:dns";
import nodemailer from "nodemailer";

export type DkimEnv = {
  /** Domaine signé (d=). */
  domain: string;
  /** Sélecteur publié en DNS (s=). */
  selector: string;
  /** Clé privée PEM — usage interne uniquement, jamais renvoyée/sérialisée. */
  privateKey: string;
};

/** Nom du domaine d'envoi attendu pour la plateforme (surchargeable). */
export const DEFAULT_SENDING_DOMAIN = "batibuild.app";

export function expectedSendingDomain(): string {
  return (process.env.APP_SENDING_DOMAIN || DEFAULT_SENDING_DOMAIN).trim().toLowerCase();
}

/**
 * Rétablit les sauts de ligne d'une clé collée avec des `\n` littéraux
 * (cas très fréquent quand la clé est copiée depuis un panneau d'hébergeur).
 */
export function normalizePrivateKey(raw: string): string {
  return raw
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

/**
 * Lit la configuration DKIM depuis l'environnement du serveur.
 * Retourne `null` si le domaine ou la clé privée est absent : dans ce cas les
 * e-mails partent sans signature (SPF/DMARC restent seuls).
 */
export function readDkimEnv(): DkimEnv | null {
  const domain = (process.env.SMTP_DKIM_DOMAIN || "").trim().toLowerCase();
  const rawKey = (process.env.SMTP_DKIM_PRIVATE_KEY || "").trim();
  if (!domain || !rawKey) return null;
  const selector = (process.env.SMTP_DKIM_SELECTOR || "default").trim() || "default";
  return { domain, selector, privateKey: normalizePrivateKey(rawKey) };
}

/** Options DKIM à passer à nodemailer (`sendMail({ dkim })`). */
export function dkimMailOption(env: DkimEnv): nodemailer.SendMailOptions["dkim"] {
  return {
    domainName: env.domain,
    keySelector: env.selector,
    privateKey: env.privateKey,
    cacheDir: false,
  };
}

/** Enregistrement TXT attendu dans le DNS : `<sélecteur>._domainkey.<domaine>`. */
export function dkimDnsName(env: DkimEnv): string {
  return `${env.selector}._domainkey.${env.domain}`;
}

/**
 * Charge la clé privée. Les hébergeurs fournissent soit un PEM complet
 * (`-----BEGIN RSA PRIVATE KEY-----`, `-----BEGIN PRIVATE KEY-----`), soit
 * seulement le corps base64 : les deux formes sont acceptées.
 */
function loadPrivateKey(privateKey: string): crypto.KeyObject | null {
  const attempts = [privateKey];
  const body = privateKey.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (body && /^[A-Za-z0-9+/=]+$/.test(body)) {
    const wrapped = (label: string) =>
      `-----BEGIN ${label}-----\n${(body.match(/.{1,64}/g) || []).join("\n")}\n-----END ${label}-----\n`;
    attempts.push(wrapped("PRIVATE KEY"), wrapped("RSA PRIVATE KEY"));
  }
  for (const candidate of attempts) {
    try {
      return crypto.createPrivateKey(candidate);
    } catch {
      // essaie la forme suivante
    }
  }
  return null;
}

/** Validité de la clé privée : exploitable pour signer, ou non (jamais le secret). */
export function dkimPrivateKeyInfo(env: DkimEnv): {
  ok: boolean;
  algorithm?: string;
  bits?: number;
  error?: string;
} {
  const key = loadPrivateKey(env.privateKey);
  if (!key) {
    return {
      ok: false,
      error:
        "SMTP_DKIM_PRIVATE_KEY n'a pas pu être lue : la clé privée DKIM doit être au format PEM/PKCS#8 fourni par l'hébergeur.",
    };
  }
  const details = key.asymmetricKeyDetails;
  const bits = typeof details?.modulusLength === "number" ? details.modulusLength : undefined;
  if (key.asymmetricKeyType && key.asymmetricKeyType !== "rsa" && key.asymmetricKeyType !== "ed25519") {
    return { ok: false, error: `Type de clé DKIM non pris en charge : ${key.asymmetricKeyType}.` };
  }
  if (bits !== undefined && bits < 1024) {
    return { ok: false, error: `Clé DKIM trop courte (${bits} bits) : 2048 bits sont recommandés.` };
  }
  return { ok: true, algorithm: key.asymmetricKeyType || "rsa", bits };
}

/**
 * Clé publique correspondant à la clé privée, encodée en base64 DER — c'est
 * exactement la valeur publiée dans `p=` de l'enregistrement DNS DKIM.
 */
export function dkimPublicKeyBase64(env: DkimEnv): { spki: string; pkcs1?: string } | null {
  const key = loadPrivateKey(env.privateKey);
  if (!key) return null;
  try {
    const spki = crypto
      .createPublicKey(key)
      .export({ type: "spki", format: "der" })
      .toString("base64");
    let pkcs1: string | undefined;
    try {
      pkcs1 = crypto
        .createPublicKey(key)
        .export({ type: "pkcs1", format: "der" })
        .toString("base64");
    } catch {
      // Les clés non RSA n'ont pas de forme PKCS#1 : seule la forme SPKI compte.
    }
    return { spki, pkcs1 };
  } catch {
    return null;
  }
}

const stripBase64 = (value: string) => value.replace(/\s+/g, "");

/**
 * Compare la clé publique publiée dans le DNS (`p=`) à la clé privée qui
 * signe réellement. C'est cette comparaison qui prouve que SPF/DKIM/DMARC
 * resteront alignés pour les destinataires.
 */
export function matchDkimDnsRecord(record: string, env: DkimEnv): "match" | "mismatch" | "unknown" {
  const published = /(?:^|;|\s)p\s*=\s*([A-Za-z0-9+/=\s]*)/i.exec(record)?.[1];
  if (published === undefined) return "unknown";
  const value = stripBase64(published);
  // `p=` vide = clé révoquée : la signature sera rejetée côté destinataire.
  if (value.length < 16) return "unknown";
  const keys = dkimPublicKeyBase64(env);
  if (!keys) return "unknown";
  const candidates = [keys.spki, keys.pkcs1].filter((k): k is string => !!k).map(stripBase64);
  return candidates.includes(value) ? "match" : "mismatch";
}

/** Enregistrements TXT d'un nom DNS (null si introuvable, jamais d'exception). */
export async function resolveTxtRecords(
  name: string,
  timeoutMs = 6000,
): Promise<string[] | null> {
  try {
    const records = await Promise.race([
      dns.promises.resolveTxt(name),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return null;
  }
}

/** Retire toute trace de la clé privée d'un message d'erreur. */
export function sanitizeDkimMessage(raw: string, env?: DkimEnv | null): string {
  let out = raw || "";
  if (env?.privateKey) {
    const body = env.privateKey.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    if (body.length > 16) out = out.split(body).join("***");
    out = out.split(env.privateKey).join("***");
  }
  return out.replace(/-----BEGIN[^-]*PRIVATE KEY-----[\s\S]*?-----END[^-]*PRIVATE KEY-----/g, "***");
}

export type DkimSignatureVerification = {
  /** Une signature a-t-elle réellement été produite sur le message compilé ? */
  signed: boolean;
  /** Domaine lu dans l'en-tête `DKIM-Signature` (d=). */
  domain?: string;
  /** Sélecteur lu dans l'en-tête (s=). */
  selector?: string;
  error?: string;
};

type RenderedMessage = { raw: string; error?: string };

/**
 * Compile et signe un message avec le VRAI moteur d'envoi (nodemailer + le
 * plugin DKIM, options incluses) sans rien expédier : le transport de flux
 * produit le message MIME final, tel qu'il partirait par SMTP.
 */
export async function renderSignedMessage(
  mailOptions: nodemailer.SendMailOptions,
): Promise<RenderedMessage> {
  const transporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: "unix",
  });
  try {
    const info = await transporter.sendMail(mailOptions);
    const message = (info as { message?: Buffer | string }).message;
    if (!message) return { raw: "", error: "Message MIME vide" };
    return { raw: Buffer.isBuffer(message) ? message.toString("utf8") : String(message) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err || "erreur inconnue");
    return {
      raw: "",
      error: sanitizeDkimMessage(message, readDkimEnv()),
    };
  }
}

/** Extrait la ligne (dépliée) de l'en-tête `DKIM-Signature` d'un message brut. */
export function findDkimSignatureHeader(raw: string): string | null {
  const match = /^DKIM-Signature:[^\n]*(?:\n[ \t][^\n]*)*/im.exec(raw);
  if (!match) return null;
  return match[0].replace(/\r?\n[ \t]+/g, " ");
}

/** Lit `d=` et `s=` dans un en-tête DKIM-Signature. */
export function parseDkimSignatureHeader(
  header: string,
): { domain: string; selector: string } | null {
  const fields = header
    .slice(header.indexOf(":") + 1)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const read = (name: string) => {
    const field = fields.find((part) => part.toLowerCase().startsWith(`${name}=`));
    return field ? field.slice(name.length + 1).trim().toLowerCase() : "";
  };
  const domain = read("d");
  const selector = read("s");
  if (!domain) return null;
  return { domain, selector: selector || "default" };
}

/**
 * Vérifie que la signature DKIM est ÉFFECTIVEMENT présente dans les e-mails
 * sortants : le message est compilé par le moteur d'envoi avec les options
 * DKIM réelles, puis l'en-tête `DKIM-Signature` est contrôlé (domaine et
 * sélecteur attendus). Ne renvoie jamais la clé privée.
 */
export async function verifyOutboundDkimSignature(
  mailOptions: nodemailer.SendMailOptions,
  env: DkimEnv | null = readDkimEnv(),
): Promise<DkimSignatureVerification> {
  if (!env) {
    return { signed: false, error: "DKIM non configuré (variables d'environnement absentes)." };
  }
  const { raw, error } = await renderSignedMessage(mailOptions);
  if (error) return { signed: false, error };
  const header = findDkimSignatureHeader(raw);
  if (!header) {
    return {
      signed: false,
      error:
        "Aucun en-tête DKIM-Signature n'a été produit : la clé privée a probablement été refusée par le moteur d'envoi.",
    };
  }
  const parsed = parseDkimSignatureHeader(header);
  const signed = parsed?.domain === env.domain && parsed?.selector === env.selector;
  return {
    signed,
    domain: parsed?.domain ?? env.domain,
    selector: parsed?.selector ?? env.selector,
    ...(signed
      ? {}
      : {
          error: `La signature produite (d=${parsed?.domain || "?"}, s=${parsed?.selector || "?"}) ne correspond pas à la configuration (d=${env.domain}, s=${env.selector}).`,
        }),
  };
}
