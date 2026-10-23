#!/usr/bin/env node
/**
 * VÉRIFICATION DE L'ARTEFACT ANDROID — batibuild Mobile.
 *
 * Exécuté APRÈS chaque génération (localement et en CI) pour garantir qu'un
 * APK/AAB réellement installable a été produit — et, surtout, pour REFUSER un
 * fichier qu'Android rejetterait avec « L'application n'a pas été installée,
 * car le package semble ne pas être valide ».
 *
 * L'ancien contrôle se contentait de CHERCHER la chaîne « APK Sig Block 42 »
 * dans les 128 derniers Ko du fichier : il pouvait donc déclarer « signé » un
 * APK qui ne l'était pas. Ici, tout est réellement lu et vérifié :
 *
 *   1. structure ZIP : EOCD, répertoire central complet, entrées requises,
 *      doublons, en-têtes locaux cohérents ;
 *   2. manifeste binaire (AXML) : package, versionCode, minSdk/targetSdk,
 *      attributs `debuggable` / `testOnly` ;
 *   3. bloc de signature APK : schémas réellement présents (v1 JAR, v2, v3),
 *      certificat du signataire, empreinte SHA-256, dates de validité ;
 *   4. intégrité du contenu : digest chunké du schéma v2 recalculé sur le
 *      fichier et comparé à celui qui a été signé — toute modification après
 *      signature (re-zip, recompression, zipalign après coup) est détectée ;
 *   5. signature cryptographique des données signées avec la clé du certificat
 *      (RSA PKCS#1, RSA-PSS, ECDSA, DSA) ;
 *   6. contraintes d'installation Android : `resources.arsc` non compressé et
 *      aligné (targetSdk ≥ 30), bibliothèques natives non compressées et
 *      alignées 4 Ko, présence d'au moins une ABI ARM.
 *
 * Utilisation :
 *   node scripts/verify-artifact.mjs build/Batibuild-release.apk
 *   node scripts/verify-artifact.mjs build/Batibuild-release.aab --kind aab
 *   node scripts/verify-artifact.mjs app.apk --expect-package com.batibuild.app \
 *        --expect-version-code 13 --require-schemes v1,v2 \
 *        --expect-cert-sha256 AB:CD:… --require-release-cert
 *
 * Code de sortie 0 si tout est conforme, 1 sinon (avec la cause exacte).
 */
import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import {
  constants as cryptoConstants,
  createHash,
  verify as cryptoVerify,
  X509Certificate,
} from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/* ── Constantes ──────────────────────────────────────────────────────────── */

/** Taille minimale plausible d'un APK/AAB complet (build interrompu en dessous). */
const MIN_BYTES = 1024 * 1024; // 1 Mo
/** Taille maximale de sécurité (garde-fou anti-copie de fichier parasite). */
const MAX_BYTES = 600 * 1024 * 1024; // 600 Mo
/** Taille des chunks du digest de contenu (schéma v2/v3). */
const CHUNK_SIZE = 1024 * 1024;

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04"
const APK_SIGNING_BLOCK_MAGIC = "APK Sig Block 42";

/** Identifiants des blocs du conteneur de signature APK. */
const SIG_BLOCK_IDS = {
  v2: 0x7109871a,
  v3: 0xf05368c0,
  v31: 0x1b93ad61,
  verityPadding: 0x42726577,
  sourceStamp: 0x6dff800d,
  dependencyInfo: 0x2146444e,
};

/**
 * Algorithmes de signature APK (identifiants AOSP).
 * `digest` = algorithme du digest de CONTENU ; `kind` = type de clé.
 */
const SIGNATURE_ALGORITHMS = {
  // Identifiants AOSP : 0x0101/0x0102 = RSASSA-PSS, 0x0103/0x0104 = PKCS#1 v1.5.
  0x0101: { name: "RSA-PSS / SHA-256", digest: "sha256", kind: "rsa", padding: "pss" },
  0x0102: { name: "RSA-PSS / SHA-512", digest: "sha512", kind: "rsa", padding: "pss" },
  0x0103: { name: "RSA PKCS#1 v1.5 / SHA-256", digest: "sha256", kind: "rsa", padding: "pkcs1" },
  0x0104: { name: "RSA PKCS#1 v1.5 / SHA-512", digest: "sha512", kind: "rsa", padding: "pkcs1" },
  0x0201: { name: "ECDSA / SHA-256", digest: "sha256", kind: "ecdsa" },
  0x0202: { name: "ECDSA / SHA-512", digest: "sha512", kind: "ecdsa" },
  0x0301: { name: "DSA / SHA-256", digest: "sha256", kind: "dsa" },
  // Variantes « verity » : digest non chunké, non recalculé par ce vérificateur.
  0x0421: {
    name: "verity RSA PKCS#1 / SHA-256",
    digest: "sha256",
    kind: "rsa",
    padding: "pkcs1",
    verity: true,
  },
  0x0423: { name: "verity ECDSA / SHA-256", digest: "sha256", kind: "ecdsa", verity: true },
};

/** Entrées obligatoires dans le conteneur selon le type d'artefact. */
const REQUIRED_ENTRIES = {
  apk: ["AndroidManifest.xml", "classes.dex", "resources.arsc"],
  aab: ["BundleConfig.pb", "base/manifest/AndroidManifest.xml"],
};

/* ── Lecture de bas niveau ───────────────────────────────────────────────── */

function readSlice(fd, start, length) {
  const size = Math.max(0, length);
  if (size === 0) return Buffer.alloc(0);
  const buffer = Buffer.alloc(size);
  let done = 0;
  while (done < size) {
    const read = readSync(fd, buffer, done, size - done, start + done);
    if (read <= 0) break;
    done += read;
  }
  return buffer.subarray(0, done);
}

const u16 = (buffer, offset) => buffer.readUInt16LE(offset);
const u32 = (buffer, offset) => buffer.readUInt32LE(offset);

function u64(buffer, offset) {
  return Number(buffer.readBigUInt64LE(offset));
}

function align(value, boundary) {
  return value % boundary === 0;
}

function hex(value, length = 4) {
  return `0x${value.toString(16).padStart(length, "0")}`;
}

function formatFingerprint(value) {
  const cleaned = String(value || "").replace(/[^0-9a-f]/gi, "").toUpperCase();
  return cleaned.match(/.{2}/g)?.join(":") ?? "";
}

/** Lit l'End Of Central Directory (dans les 66 derniers Ko du fichier). */
function findEocd(tail, tailStart) {
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (u32(tail, i) === EOCD_SIGNATURE) {
      return {
        offset: tailStart + i,
        entries: u16(tail, i + 10),
        cdSize: u32(tail, i + 12),
        cdOffset: u32(tail, i + 16),
      };
    }
  }
  return null;
}

/** Répertoire central complet (nom, compression, offsets). */
function parseCentralDirectory(central) {
  const entries = [];
  let position = 0;
  while (position + 46 <= central.length && u32(central, position) === CENTRAL_HEADER_SIGNATURE) {
    const nameLength = u16(central, position + 28);
    const extraLength = u16(central, position + 30);
    const commentLength = u16(central, position + 32);
    entries.push({
      name: central.toString("utf8", position + 46, position + 46 + nameLength),
      method: u16(central, position + 10),
      crc: u32(central, position + 16),
      compressedSize: u32(central, position + 20),
      size: u32(central, position + 24),
      localOffset: u32(central, position + 42),
    });
    position += 46 + nameLength + extraLength + commentLength;
  }
  return { entries, consumed: position };
}

/** Offset des données d'une entrée (après en-tête local + nom + extra). */
function localDataOffset(fd, entry) {
  const header = readSlice(fd, entry.localOffset, 30);
  if (header.length < 30 || u32(header, 0) !== LOCAL_HEADER_SIGNATURE) return null;
  return entry.localOffset + 30 + u16(header, 26) + u16(header, 28);
}

/* ── Manifeste binaire Android (AXML) ────────────────────────────────────── */

function decodeStringPool(raw, chunkOffset) {
  const headerSize = u16(raw, chunkOffset + 2);
  const chunkSize = u32(raw, chunkOffset + 4);
  const count = u32(raw, chunkOffset + 8);
  const flags = u32(raw, chunkOffset + 16);
  const stringsStart = u32(raw, chunkOffset + 20);
  const utf8 = (flags & 0x100) !== 0;
  const offsetsStart = chunkOffset + headerSize;
  const dataStart = chunkOffset + stringsStart;
  const strings = [];
  for (let i = 0; i < count && offsetsStart + i * 4 + 4 <= raw.length; i += 1) {
    let position = dataStart + u32(raw, offsetsStart + i * 4);
    try {
      if (utf8) {
        position += raw[position] & 0x80 ? 2 : 1;
        let length = raw[position];
        if (length & 0x80) {
          length = ((length & 0x7f) << 8) | raw[position + 1];
          position += 2;
        } else {
          position += 1;
        }
        strings.push(raw.toString("utf8", position, position + length));
      } else {
        const length = u16(raw, position);
        position += 2;
        strings.push(raw.toString("utf16le", position, position + length * 2));
      }
    } catch {
      strings.push("");
    }
  }
  return { strings, end: chunkOffset + chunkSize };
}

const MANIFEST_ATTRIBUTES = new Set([
  "package",
  "versionCode",
  "versionName",
  "minSdkVersion",
  "targetSdkVersion",
  "debuggable",
  "testOnly",
  "compileSdkVersion",
]);

/** Extrait les attributs utiles du manifeste binaire (null si illisible). */
function parseManifest(raw) {
  if (raw.length < 8 || u32(raw, 0) !== 0x00080003) return null;
  const result = {};
  let pool = null;
  let position = 8;
  while (position + 8 <= raw.length) {
    const type = u16(raw, position);
    const size = u32(raw, position + 4);
    if (size <= 0) break;
    if (type === 0x0001) {
      pool = decodeStringPool(raw, position);
      position = pool.end;
      continue;
    }
    if (type === 0x0102 && pool) {
      const attributeStart = u16(raw, position + 24);
      const attributeSize = u16(raw, position + 26);
      const attributeCount = u16(raw, position + 28);
      let cursor = position + 16 + attributeStart;
      for (let i = 0; i < attributeCount && cursor + 20 <= raw.length; i += 1) {
        const name = pool.strings[u32(raw, cursor + 4)];
        if (name && MANIFEST_ATTRIBUTES.has(name)) {
          const dataType = raw[cursor + 15];
          const data = u32(raw, cursor + 16);
          if (dataType === 0x03) result[name] = pool.strings[data];
          else if (dataType === 0x12) result[name] = data !== 0;
          else if (dataType === 0x10) result[name] = data > 0x7fffffff ? data - 0x100000000 : data;
          else result[name] = data;
        }
        cursor += attributeSize;
      }
    }
    position += size;
  }
  return result.package ? result : null;
}

/* ── Bloc de signature APK ───────────────────────────────────────────────── */

function parseSigningBlock(fd, cdOffset) {
  if (cdOffset < 32) return null;
  const footer = readSlice(fd, cdOffset - 24, 24);
  if (footer.length < 24 || footer.toString("latin1", 8, 24) !== APK_SIGNING_BLOCK_MAGIC) {
    return null;
  }
  const size = u64(footer, 0);
  const start = cdOffset - size - 8;
  if (start < 0) return { malformed: "taille de bloc incohérente" };
  const header = readSlice(fd, start, 8);
  if (header.length < 8 || u64(header, 0) !== size) {
    return { malformed: "les deux champs de taille du bloc de signature diffèrent" };
  }
  const body = readSlice(fd, start + 8, size - 24);
  const pairs = new Map();
  let position = 0;
  while (position + 12 <= body.length) {
    const pairSize = u64(body, position);
    if (pairSize < 4 || position + 8 + pairSize > body.length) {
      return { malformed: "paire de signature tronquée" };
    }
    pairs.set(u32(body, position + 8), body.subarray(position + 12, position + 8 + pairSize));
    position += 8 + pairSize;
  }
  return { start, size, pairs };
}

/** Décode un signataire du schéma v2 (données signées, certificats, clé). */
function parseV2Signer(value) {
  // value = [u32 longueur de la séquence][u32 longueur du signataire][signataire]
  const signersLength = u32(value, 0);
  const signerLength = u32(value, 4);
  const signer = value.subarray(8, 8 + signerLength);
  if (signersLength < signerLength || signer.length !== signerLength) {
    throw new Error("signataire v2 tronqué");
  }
  const signedDataLength = u32(signer, 0);
  const signedData = signer.subarray(4, 4 + signedDataLength);

  let cursor = 4 + signedDataLength;
  const signaturesLength = u32(signer, cursor);
  const signaturesBlob = signer.subarray(cursor + 4, cursor + 4 + signaturesLength);
  cursor += 4 + signaturesLength;
  const publicKeyLength = u32(signer, cursor);
  const publicKey = signer.subarray(cursor + 4, cursor + 4 + publicKeyLength);

  // Données signées : digests, certificats, attributs additionnels.
  const digestsLength = u32(signedData, 0);
  const digestsBlob = signedData.subarray(4, 4 + digestsLength);
  const certificatesLength = u32(signedData, 4 + digestsLength);
  const certificatesBlob = signedData.subarray(8 + digestsLength, 8 + digestsLength + certificatesLength);

  const readSequence = (blob, readItem) => {
    const items = [];
    let position = 0;
    while (position + 4 <= blob.length) {
      const itemLength = u32(blob, position);
      if (position + 4 + itemLength > blob.length) break;
      items.push(readItem(blob.subarray(position + 4, position + 4 + itemLength)));
      position += 4 + itemLength;
    }
    return items;
  };

  const digests = readSequence(digestsBlob, (item) => ({
    algorithm: u32(item, 0),
    digest: item.subarray(8, 8 + u32(item, 4)),
  }));
  const certificates = readSequence(certificatesBlob, (item) => item);
  const signatures = readSequence(signaturesBlob, (item) => ({
    algorithm: u32(item, 0),
    signature: item.subarray(8, 8 + u32(item, 4)),
  }));

  return { signedData, digests, certificates, signatures, publicKey };
}

/**
 * Digest de contenu du schéma v2/v3.
 * Chaque section est découpée en chunks de 1 Mo :
 *   chunk = H(0xa5 || longueur || données)
 *   final = H(0x5a || nombre de chunks || concat(chunks))
 */
function computeContentDigest(fd, sections, hashName) {
  const chunkDigests = [];
  for (const section of sections) {
    const data =
      section.buffer ?? readSlice(fd, section.start, section.length ?? 0);
    const total = section.length ?? data.length;
    if (!section.buffer && data.length !== total) return null;
    for (let position = 0; position < total; position += CHUNK_SIZE) {
      const chunk = data.subarray(position, Math.min(position + CHUNK_SIZE, total));
      const hash = createHash(hashName);
      hash.update(Buffer.from([0xa5]));
      const lengthBytes = Buffer.alloc(4);
      lengthBytes.writeUInt32LE(chunk.length, 0);
      hash.update(lengthBytes);
      hash.update(chunk);
      chunkDigests.push(hash.digest());
    }
  }
  const top = createHash(hashName);
  top.update(Buffer.from([0x5a]));
  const count = Buffer.alloc(4);
  count.writeUInt32LE(chunkDigests.length, 0);
  top.update(count);
  top.update(Buffer.concat(chunkDigests));
  return top.digest();
}

/** Vérifie cryptographiquement la signature des données signées. */
function verifySignatureAlgorithm(publicKey, signedData, algorithm, signature) {
  const spec = SIGNATURE_ALGORITHMS[algorithm];
  if (!spec) return { supported: false };
  const options = { key: publicKey };
  if (spec.kind === "rsa") {
    options.padding =
      spec.padding === "pss"
        ? cryptoConstants.RSA_PKCS1_PSS_PADDING
        : cryptoConstants.RSA_PKCS1_PADDING;
    if (spec.padding === "pss") options.saltLength = cryptoConstants.RSA_PSS_SALTLEN_DIGEST;
  } else {
    options.dsaEncoding = "der";
  }
  return { supported: true, valid: cryptoVerify(spec.digest, signedData, options, signature) };
}

/** Décode une entrée ZIP (stored ou deflate). */
function decodeEntry(fd, entry) {
  const offset = localDataOffset(fd, entry);
  if (offset === null) return null;
  if (entry.method === 0) return readSlice(fd, offset, entry.size);
  if (entry.method !== 8) return null;
  try {
    return inflateRawSync(readSlice(fd, offset, entry.compressedSize));
  } catch {
    return null;
  }
}

/* ── Vérification principale ─────────────────────────────────────────────── */

export function verifyArtifact(targetPath, options = {}) {
  const kind = options.kind || (/\.aab$/i.test(targetPath) ? "aab" : "apk");
  const problems = [];
  const warnings = [];
  const details = [];
  const info = { schemes: [], certificate: null, manifest: null, abis: [] };

  const path = resolve(targetPath);
  const fail = (cause) => problems.push(cause);
  const warn = (message) => warnings.push(message);
  const result = (extra = {}) => ({
    ok: problems.length === 0,
    path,
    kind,
    problems,
    warnings,
    details,
    info,
    ...extra,
  });

  if (!existsSync(path)) {
    fail(`fichier introuvable : ${path} — le build n'a produit aucun artefact`);
    return result();
  }

  const fileStat = statSync(path);
  if (!fileStat.isFile()) {
    fail(`${path} n'est pas un fichier régulier`);
    return result();
  }

  const size = fileStat.size;
  details.push(`Fichier : ${path}`);
  details.push(`Type    : ${kind.toUpperCase()}`);
  details.push(`Taille  : ${(size / (1024 * 1024)).toFixed(2)} Mo (${size} octets)`);
  if (size < MIN_BYTES) fail(`fichier vide ou incomplet : ${size} octets (< 1 Mo)`);
  if (size > MAX_BYTES) {
    fail(`fichier anormalement volumineux : ${(size / (1024 * 1024)).toFixed(0)} Mo`);
  }

  const fd = openSync(path, "r");
  try {
    const head = readSlice(fd, 0, 4);
    if (!head.equals(ZIP_MAGIC)) {
      fail(
        `en-tête invalide (${head.toString("hex")}) : ce n'est pas un conteneur ZIP/APK exploitable par Android`,
      );
      return result();
    }
    details.push("En-tête : conteneur ZIP valide");

    const tailLength = Math.min(size, 65557);
    const tailStart = size - tailLength;
    const eocd = findEocd(readSlice(fd, tailStart, tailLength), tailStart);
    if (!eocd) {
      fail("répertoire central introuvable (End Of Central Directory) — fichier tronqué ou corrompu");
      return result();
    }

    details.push(`Entrées : ${eocd.entries}`);
    if (eocd.cdOffset + eocd.cdSize > size) {
      fail(
        `structure ZIP incohérente : le répertoire central (${eocd.cdOffset + eocd.cdSize} octets) dépasse la taille du fichier (${size}) — artefact tronqué`,
      );
      return result();
    }

    const parsed = parseCentralDirectory(readSlice(fd, eocd.cdOffset, eocd.cdSize));
    const entries = parsed.entries;
    if (parsed.consumed !== eocd.cdSize) {
      fail(
        `répertoire central incomplet : ${parsed.consumed} octets lus pour ${eocd.cdSize} annoncés — artefact tronqué`,
      );
    } else if (entries.length !== eocd.entries) {
      fail(
        `structure ZIP incohérente : ${entries.length} entrées lues pour ${eocd.entries} annoncées — artefact incomplet`,
      );
    }

    const names = entries.map((entry) => entry.name);
    const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
    if (duplicates.length) {
      fail(`entrées ZIP en double : ${duplicates.slice(0, 5).join(", ")}`);
    }
    const missing = REQUIRED_ENTRIES[kind].filter((required) => !names.includes(required));
    if (missing.length) {
      fail(`entrées obligatoires manquantes : ${missing.join(", ")} — artefact incomplet`);
    } else {
      details.push(`Entrées obligatoires présentes : ${REQUIRED_ENTRIES[kind].join(", ")}`);
    }

    const brokenHeader = entries.find((entry) => localDataOffset(fd, entry) === null);
    if (brokenHeader) fail(`en-tête ZIP local illisible pour l'entrée ${brokenHeader.name}`);

    /* ── Manifeste ── */
    if (kind === "apk") {
      const manifestEntry = entries.find((entry) => entry.name === "AndroidManifest.xml");
      if (!manifestEntry) {
        fail("AndroidManifest.xml absent — paquet non installable");
      } else {
        const manifest = parseManifest(decodeEntry(fd, manifestEntry) ?? Buffer.alloc(0));
        if (!manifest) {
          fail("manifeste binaire illisible (AndroidManifest.xml) — paquet non installable");
        } else {
          info.manifest = manifest;
          details.push(`Manifeste : package ${manifest.package}`);
          details.push(
            `SDK       : minSdk ${manifest.minSdkVersion ?? "?"} / targetSdk ${manifest.targetSdkVersion ?? "?"}`,
          );
          details.push(
            `Version   : ${manifest.versionName ?? "?"} (versionCode ${manifest.versionCode ?? "?"})`,
          );
          if (manifest.debuggable === true) warn('le manifeste déclare android:debuggable="true"');
          if (manifest.testOnly === true) {
            fail('le manifeste déclare android:testOnly="true" — Android refuse l\'installation');
          }
          if (options.expectPackage && manifest.package !== options.expectPackage) {
            fail(
              `package inattendu : ${manifest.package} (attendu ${options.expectPackage}) — l'APK ne mettrait pas à jour l'application existante`,
            );
          }
          if (
            Number.isFinite(options.expectVersionCode) &&
            Number(manifest.versionCode) !== options.expectVersionCode
          ) {
            fail(
              `versionCode inattendu : ${manifest.versionCode} (attendu ${options.expectVersionCode})`,
            );
          }
        }
      }

      /* ── Signature JAR (v1) ── */
      const jarSignature = entries.find(
        (entry) => /^META-INF\//i.test(entry.name) && /\.(RSA|DSA|EC)$/i.test(entry.name),
      );
      if (jarSignature) info.schemes.push("v1");
      const jarManifest = entries.find((entry) => /^META-INF\/[^/]+\.SF$/i.test(entry.name));
      if (jarManifest && !jarSignature) {
        fail("fichier META-INF/*.SF sans signature JAR associée — signature v1 corrompue");
      }

      /* ── Contraintes d'installation ── */
      checkInstallConstraints(fd, entries, info, fail, warn);

      /* ── Bloc de signature APK (v2/v3) ── */
      const block = parseSigningBlock(fd, eocd.cdOffset);
      if (block === null) {
        if (info.schemes.includes("v1")) {
          warn("APK signé uniquement avec le schéma v1 (JAR) — v2 recommandé sur Android 7+");
        } else {
          fail(
            "APK NON SIGNÉ : aucun bloc de signature APK (v2/v3) et aucune signature JAR (v1) — Android refuse l'installation (« le package semble ne pas être valide »)",
          );
        }
      } else if (block.malformed) {
        fail(`bloc de signature APK invalide : ${block.malformed}`);
      } else {
        if (block.pairs.has(SIG_BLOCK_IDS.v2)) info.schemes.push("v2");
        if (block.pairs.has(SIG_BLOCK_IDS.v3)) info.schemes.push("v3");
        if (block.pairs.has(SIG_BLOCK_IDS.v31)) info.schemes.push("v3.1");
        details.push(
          `Bloc de signature : ${block.size} octets — schémas ${info.schemes.join(" + ") || "aucun"}`,
        );
        if (block.pairs.has(SIG_BLOCK_IDS.v2)) {
          verifyV2(fd, block, eocd, size, info, fail, warn, details);
        } else if (!info.schemes.includes("v1")) {
          fail("bloc de signature sans schéma v2 exploitable — APK non vérifiable par Android");
        }
        checkCertificate(info, options, fail, warn);
      }

      /* ── Schémas exigés ── */
      if (options.requireSchemes?.length) {
        const absent = options.requireSchemes.filter(
          (scheme) => !info.schemes.includes(scheme),
        );
        if (absent.length) {
          fail(
            `schémas de signature manquants : ${absent.join(", ")} (présents : ${info.schemes.join(", ") || "aucun"})`,
          );
        }
      }
    } else {
      const jarSignature = entries.find(
        (entry) => /^META-INF\//i.test(entry.name) && /\.(RSA|DSA|EC)$/i.test(entry.name),
      );
      details.push(
        jarSignature
          ? "Signature AAB : v1 (JAR) présente"
          : "Signature AAB : aucune signature locale (Google Play signe à l'import)",
      );
    }

    const hash = createHash("sha256");
    const chunk = Buffer.alloc(1024 * 1024);
    let position = 0;
    while (position < size) {
      const read = readSync(fd, chunk, 0, Math.min(chunk.length, size - position), position);
      if (read <= 0) break;
      hash.update(chunk.subarray(0, read));
      position += read;
    }
    details.push(`SHA-256 : ${hash.digest("hex")}`);
  } finally {
    closeSync(fd);
  }

  return result();
}

/** Contraintes exigées par Android pour installer l'APK. */
function checkInstallConstraints(fd, entries, info, fail, warn) {
  const targetSdk = Number(info.manifest?.targetSdkVersion ?? 0);
  const resources = entries.find((entry) => entry.name === "resources.arsc");
  if (resources) {
    if (resources.method !== 0) {
      if (targetSdk >= 30) {
        fail(
          "resources.arsc compressé : Android exige une table de ressources non compressée (targetSdk ≥ 30)",
        );
      } else {
        warn("resources.arsc compressé (accepté sous targetSdk 30)");
      }
    } else {
      const offset = localDataOffset(fd, resources);
      if (offset !== null && !align(offset, 4)) {
        fail(`resources.arsc mal aligné (offset ${offset}) — Android exige un alignement 4 octets`);
      }
    }
  }

  const natives = entries.filter((entry) => /^lib\/[^/]+\/.+\.so$/.test(entry.name));
  if (!natives.length) {
    fail("aucune bibliothèque native (lib/<abi>/*.so) — l'application ne peut pas démarrer");
    return;
  }
  const abis = [...new Set(natives.map((entry) => entry.name.split("/")[1]))];
  info.abis = abis;
  if (!abis.some((abi) => abi === "arm64-v8a" || abi === "armeabi-v7a")) {
    fail(`aucune ABI ARM dans l'APK (${abis.join(", ")}) — incompatible avec les téléphones Android`);
  }
  const compressed = natives.filter((entry) => entry.method !== 0);
  if (compressed.length) {
    warn(
      `${compressed.length} bibliothèque(s) native(s) compressée(s) — installable, mais extraction plus lente`,
    );
  }
  const misaligned = natives
    .filter((entry) => entry.method === 0)
    .map((entry) => ({ name: entry.name, offset: localDataOffset(fd, entry) }))
    .filter((native) => native.offset !== null && !align(native.offset, 4096));
  if (misaligned.length) {
    fail(
      `bibliothèques natives non alignées 4 Ko : ${misaligned
        .slice(0, 3)
        .map((native) => `${native.name} (offset ${native.offset})`)
        .join(", ")} — Android refuse l'installation (extractNativeLibs=false)`,
    );
  }
}

/** Vérifie les digests de contenu et la signature cryptographique du schéma v2. */
function verifyV2(fd, block, eocd, size, info, fail, warn, details) {
  let signer;
  try {
    signer = parseV2Signer(block.pairs.get(SIG_BLOCK_IDS.v2));
  } catch (error) {
    fail(`données de signature v2 illisibles : ${error.message}`);
    return;
  }

  if (!signer.certificates.length) {
    fail("signature v2 sans certificat — Android refuse l'installation");
    return;
  }

  details.push(
    `Algorithmes v2 : ${signer.digests.map((digest) => hex(digest.algorithm)).join(", ") || "aucun"}`,
  );

  // Sections couvertes : contenu des entrées, répertoire central, EOCD dont
  // l'offset du répertoire central est remplacé par celui du bloc de signature.
  const eocdBytes = Buffer.from(readSlice(fd, eocd.offset, size - eocd.offset));
  eocdBytes.writeUInt32LE(block.start, 16);
  const sections = [
    { start: 0, length: block.start },
    { start: eocd.cdOffset, length: eocd.cdSize },
    { buffer: eocdBytes, length: eocdBytes.length },
  ];

  let digestChecked = false;
  for (const { algorithm, digest } of signer.digests) {
    const spec = SIGNATURE_ALGORITHMS[algorithm];
    if (!spec) {
      warn(`algorithme de signature ${hex(algorithm)} non pris en charge par ce vérificateur`);
      continue;
    }
    if (spec.verity) {
      warn(`digest « verity » (${hex(algorithm)}) non recalculé — digest chunké vérifié séparément`);
      continue;
    }
    const computed = computeContentDigest(fd, sections, spec.digest);
    if (computed === null) {
      fail("lecture incomplète de l'APK pendant le calcul du digest de contenu");
      return;
    }
    if (!computed.equals(digest)) {
      fail(
        `signature INVALIDE : le contenu de l'APK ne correspond plus au digest signé (${spec.name}) — le fichier a été modifié après signature (re-zip, recompression, zipalign)`,
      );
      return;
    }
    digestChecked = true;
    details.push(`Intégrité : digest ${spec.digest.toUpperCase()} conforme au contenu`);
    break;
  }

  let x509;
  try {
    x509 = new X509Certificate(signer.certificates[0]);
  } catch {
    fail("certificat de signature illisible (X.509)");
    return;
  }

  let spki = null;
  try {
    spki = x509.publicKey.export({ type: "spki", format: "der" });
  } catch {
    spki = null;
  }
  if (spki && signer.publicKey.length && !spki.equals(signer.publicKey)) {
    fail("la clé publique du signataire ne correspond pas à son certificat — signature incohérente");
    return;
  }

  let signatureChecked = false;
  for (const { algorithm, signature } of signer.signatures) {
    const verification = verifySignatureAlgorithm(
      x509.publicKey,
      signer.signedData,
      algorithm,
      signature,
    );
    if (!verification.supported) continue;
    if (!verification.valid) {
      fail(
        `signature cryptographique invalide (${SIGNATURE_ALGORITHMS[algorithm].name}) — APK corrompu`,
      );
      return;
    }
    signatureChecked = true;
  }
  if (!signatureChecked) {
    warn("aucune signature v2 vérifiée cryptographiquement (algorithme non pris en charge)");
  }
  if (!digestChecked) {
    warn("aucun digest de contenu v2 recalculé (algorithme « verity » uniquement)");
  }

  info.certificate = {
    subject: String(x509.subject).replace(/\n/g, ", "),
    issuer: String(x509.issuer).replace(/\n/g, ", "),
    fingerprint256: formatFingerprint(x509.fingerprint256),
    validFrom: x509.validFrom,
    validTo: x509.validTo,
    isDebug: /Android Debug/i.test(String(x509.subject)),
  };
  details.push(`Certificat : ${info.certificate.subject}`);
  details.push(`Empreinte  : ${info.certificate.fingerprint256}`);
  details.push(
    `Signature  : ${signatureChecked ? "vérifiée cryptographiquement" : "non vérifiée"} / ${
      digestChecked ? "contenu conforme" : "contenu non comparé"
    }`,
  );
  if (new Date(x509.validTo).getTime() < Date.now()) {
    fail(`certificat expiré (${x509.validTo}) — Android refuse l'installation`);
  }
}

/** Contrôles sur le certificat : empreinte attendue, clé de production. */
function checkCertificate(info, options, fail, warn) {
  const certificate = info.certificate;
  if (!certificate) return;
  if (certificate.isDebug) {
    const message =
      "APK signé avec la clé DEBUG Android (CN=Android Debug) : installable sur un téléphone vierge, mais il ne peut PAS remplacer une application Batibuild signée avec une autre clé (Android affiche alors « le package semble ne pas être valide ») et Google Play le refuse.";
    if (options.requireReleaseCertificate) fail(message);
    else warn(message);
  }
  if (options.expectCertSha256) {
    const expected = formatFingerprint(options.expectCertSha256);
    if (expected && expected !== certificate.fingerprint256) {
      fail(
        `certificat inattendu : ${certificate.fingerprint256} (attendu ${expected}) — les mises à jour de l'application installée seraient refusées`,
      );
    }
  }
}

/* ── CLI ─────────────────────────────────────────────────────────────────── */

/** Options prenant une valeur (pour distinguer le fichier cible des drapeaux). */
const VALUE_FLAGS = new Set([
  "--kind",
  "--expect-package",
  "--expect-version-code",
  "--expect-cert-sha256",
  "--require-schemes",
]);

function parseArgs(argv) {
  const flags = new Map();
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (VALUE_FLAGS.has(argument)) {
      flags.set(argument, argv[i + 1]);
      i += 1;
    } else if (argument.startsWith("--")) {
      flags.set(argument, true);
    } else {
      positional.push(argument);
    }
  }
  return { flags, positional };
}

function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));

  console.log("════════════════════════════════════════════════════════════");
  console.log(" VÉRIFICATION DE L'ARTEFACT ANDROID");
  console.log("════════════════════════════════════════════════════════════");

  const target = positional[0];
  if (!target) {
    console.log("❌ Aucun fichier fourni.");
    console.log("   Usage : node scripts/verify-artifact.mjs <chemin.apk|.aab> [--kind apk|aab]");
    console.log("\nBUILD FAILED\n");
    process.exit(1);
  }

  const versionCode = flags.get("--expect-version-code");
  const schemes = flags.get("--require-schemes");
  const result = verifyArtifact(target, {
    kind: flags.get("--kind"),
    expectPackage: flags.get("--expect-package"),
    expectVersionCode: versionCode === undefined ? undefined : Number(versionCode),
    expectCertSha256: flags.get("--expect-cert-sha256") || undefined,
    requireSchemes:
      typeof schemes === "string" ? schemes.split(",").map((scheme) => scheme.trim()) : undefined,
    requireReleaseCertificate: flags.has("--require-release-cert"),
  });

  for (const line of result.details) console.log(`  ${line}`);
  for (const message of result.warnings) console.log(`  ⚠️  ${message}`);

  if (result.ok) {
    console.log(`\n  ✔ ${basename(result.path)} est complet, signé, aligné et installable.`);
    console.log("\nBUILD SUCCESS\n");
    process.exit(0);
  }

  console.log("\n  Causes exactes :");
  for (const problem of result.problems) console.log(`   ❌ ${problem}`);
  console.log("\nBUILD FAILED\n");
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
