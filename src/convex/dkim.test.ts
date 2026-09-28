// ============================================================================
// DKIM — configuration serveur, vérification de la signature et alignement DNS
//
// Ces tests couvrent le module `src/convex/dkim.ts` : lecture des variables
// d'environnement (SMTP_DKIM_DOMAIN / SMTP_DKIM_SELECTOR / SMTP_DKIM_PRIVATE_KEY),
// validation de la clé privée, comparaison avec l'enregistrement DNS publié et
// — surtout — la vérification que la signature `DKIM-Signature` est RÉELLEMENT
// produite dans les e-mails sortants (et pas simplement que les variables
// existent). Aucun test n'accède au réseau : les clés sont générées localement.
// ============================================================================

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  dkimDnsName,
  dkimMailOption,
  dkimPrivateKeyInfo,
  dkimPublicKeyBase64,
  expectedSendingDomain,
  findDkimSignatureHeader,
  matchDkimDnsRecord,
  normalizePrivateKey,
  parseDkimSignatureHeader,
  readDkimEnv,
  sanitizeDkimMessage,
  verifyOutboundDkimSignature,
  type DkimEnv,
} from "./dkim";

const DKIM_VARS = ["SMTP_DKIM_DOMAIN", "SMTP_DKIM_SELECTOR", "SMTP_DKIM_PRIVATE_KEY", "APP_SENDING_DOMAIN"];
const saved: Record<string, string | undefined> = {};

let privateKeyPem = "";

beforeAll(() => {
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
});

afterEach(() => {
  for (const key of DKIM_VARS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function env(overrides: Partial<DkimEnv> = {}): DkimEnv {
  return {
    domain: "batibuild.app",
    selector: "batibuild",
    privateKey: privateKeyPem,
    ...overrides,
  };
}

describe("readDkimEnv", () => {
  it("retourne null tant que les variables DKIM sont absentes", () => {
    setEnv({
      SMTP_DKIM_DOMAIN: undefined,
      SMTP_DKIM_SELECTOR: undefined,
      SMTP_DKIM_PRIVATE_KEY: undefined,
    });
    expect(readDkimEnv()).toBeNull();
  });

  it("retourne null si la clé privée manque (domaine seul insuffisant)", () => {
    setEnv({ SMTP_DKIM_DOMAIN: "batibuild.app", SMTP_DKIM_PRIVATE_KEY: undefined });
    expect(readDkimEnv()).toBeNull();
  });

  it("lit le domaine, le sélecteur (défaut « default ») et rétablit les \\n littéraux", () => {
    setEnv({
      SMTP_DKIM_DOMAIN: "  BATIBUILD.app ",
      SMTP_DKIM_SELECTOR: "  ",
      SMTP_DKIM_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
    });
    const envRead = readDkimEnv();
    expect(envRead?.domain).toBe("batibuild.app");
    expect(envRead?.selector).toBe("default");
    expect(envRead?.privateKey).toBe("-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----");
  });

  it("construit le nom DNS du sélecteur et l'option nodemailer", () => {
    expect(dkimDnsName(env())).toBe("batibuild._domainkey.batibuild.app");
    const option = dkimMailOption(env());
    expect(option).toMatchObject({ domainName: "batibuild.app", keySelector: "batibuild" });
  });

  it("normalise les clés collées avec des \\r\\n littéraux", () => {
    expect(normalizePrivateKey("a\\r\\nb")).toBe("a\nb");
  });

  it("utilise batibuild.app comme domaine d'envoi attendu", () => {
    setEnv({ APP_SENDING_DOMAIN: undefined });
    expect(expectedSendingDomain()).toBe("batibuild.app");
    setEnv({ APP_SENDING_DOMAIN: "Autre.Example" });
    expect(expectedSendingDomain()).toBe("autre.example");
  });
});

describe("dkimPrivateKeyInfo", () => {
  it("accepte une clé RSA 2048 fournie en PEM", () => {
    const info = dkimPrivateKeyInfo(env());
    expect(info.ok).toBe(true);
    expect(info.algorithm).toBe("rsa");
    expect(info.bits).toBe(2048);
  });

  it("accepte une clé fournie sans en-têtes PEM (corps base64 seul)", () => {
    const body = privateKeyPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    expect(dkimPrivateKeyInfo(env({ privateKey: body })).ok).toBe(true);
  });

  it("refuse une clé illisible et ne divulgue jamais la valeur fournie", () => {
    const info = dkimPrivateKeyInfo(env({ privateKey: "pas-une-cle-privee" }));
    expect(info.ok).toBe(false);
    expect(info.error).toBeTruthy();
    expect(info.error).not.toContain("pas-une-cle-privee");
  });
});

describe("matchDkimDnsRecord", () => {
  it("reconnaît la clé publique (p=) correspondant à la clé privée de signature", () => {
    const keys = dkimPublicKeyBase64(env());
    const record = `v=DKIM1; k=rsa; p=${keys?.spki}`;
    expect(matchDkimDnsRecord(record, env())).toBe("match");
  });

  it("détecte une clé publique différente (signature non vérifiable)", () => {
    const { publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const other = publicKey.export({ type: "spki", format: "der" }).toString("base64");
    expect(matchDkimDnsRecord(`v=DKIM1; k=rsa; p=${other}`, env())).toBe("mismatch");
  });

  it("reste prudent sans clé publiée (p= absent ou révoqué)", () => {
    expect(matchDkimDnsRecord("v=DKIM1; k=rsa", env())).toBe("unknown");
    expect(matchDkimDnsRecord("v=DKIM1; k=rsa; p=", env())).toBe("unknown");
  });
});

describe("vérification de la signature dans les e-mails sortants", () => {
  const mail = (dkim: ReturnType<typeof dkimMailOption>) => ({
    from: '"batibuild" <contact@batibuild.app>',
    to: "destinataire@example.tn",
    subject: "Test DKIM",
    html: "<p>Bonjour</p>",
    ...(dkim ? { dkim } : {}),
  });

  it("signe réellement le message (en-tête DKIM-Signature présent, d=/s= attendus)", async () => {
    const result = await verifyOutboundDkimSignature(mail(dkimMailOption(env())), env());
    expect(result.signed).toBe(true);
    expect(result.domain).toBe("batibuild.app");
    expect(result.selector).toBe("batibuild");
  });

  it("ne déclare PAS DKIM vérifié sans variable (jamais l'inverse)", async () => {
    const result = await verifyOutboundDkimSignature(mail(undefined), null);
    expect(result.signed).toBe(false);
    expect(result.error).toContain("non configuré");
  });

  it("ne déclare PAS DKIM vérifié quand la clé privée est refusée", async () => {
    const broken = env({ privateKey: "cle-invalide" });
    const result = await verifyOutboundDkimSignature(mail(dkimMailOption(broken)), broken);
    expect(result.signed).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("cle-invalide");
  });

  it("lit et analyse l'en-tête DKIM-Signature d'un message brut", () => {
    const raw =
      "DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;\r\n" +
      " d=batibuild.app; q=dns/txt; s=batibuild; bh=abc;\r\n" +
      " b=signature\r\nFrom: contact@batibuild.app\r\n\r\nCorps";
    const header = findDkimSignatureHeader(raw);
    expect(header).toBeTruthy();
    expect(parseDkimSignatureHeader(header!)).toEqual({
      domain: "batibuild.app",
      selector: "batibuild",
    });
    expect(findDkimSignatureHeader("From: a@b.tn\r\n\r\nCorps")).toBeNull();
  });
});

describe("garantie : tous les envois SMTP passent par la signature DKIM", () => {
  const source = readFileSync(join(__dirname, "emailSender.ts"), "utf8");

  it("aucun chemin d'envoi ne contourne buildDeliverableMail (qui injecte les options DKIM)", () => {
    const sends = source.split("transporter.sendMail(").length - 1;
    const wrapped = source.split(/transporter\.sendMail\(\s*buildDeliverableMail\(/).length - 1;
    expect(sends).toBeGreaterThan(0);
    expect(wrapped).toBe(sends);
  });

  it("buildDeliverableMail applique les options DKIM au message", () => {
    expect(source).toMatch(/\.\.\.\(dkim \? \{ dkim \} : \{\}\)/);
    expect(source).toMatch(/function dkimConfigFor\(\)/);
  });

  it("le secret DKIM n'est lu que par le module serveur dkim.ts", () => {
    const convexFiles = readdirSync(__dirname).filter(
      (file) => file.endsWith(".ts") && file !== "dkim.ts" && !file.endsWith(".test.ts"),
    );
    const readers = convexFiles.filter((file) =>
      /process\.env\.SMTP_DKIM_PRIVATE_KEY/.test(readFileSync(join(__dirname, file), "utf8")),
    );
    expect(readers).toEqual([]);
  });

  it("aucun accès aux variables DKIM depuis le code client (navigateur)", () => {
    const clientRoot = join(__dirname, "..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "convex" && dir === clientRoot) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && /process\.env\.SMTP_DKIM/.test(readFileSync(full, "utf8"))) {
          offenders.push(full);
        }
      }
    };
    walk(clientRoot);
    expect(offenders).toEqual([]);
  });
});

describe("sanitizeDkimMessage", () => {
  it("retire toute trace de la clé privée d'un message d'erreur", () => {
    const pem = env();
    const body = pem.privateKey.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const message = sanitizeDkimMessage(
      `Erreur: ${body}\n${pem.privateKey}`,
      pem,
    );
    expect(message).not.toContain(body);
    expect(message).not.toContain("PRIVATE KEY-----\n");
    expect(message).toContain("***");
  });
});
