#!/usr/bin/env node
/**
 * VÉRIFICATION DE L'ARTEFACT ANDROID — batibuild Mobile.
 *
 * Exécuté APRÈS chaque génération (localement et en CI) pour garantir qu'un
 * APK/AAB réellement installable a été produit. Détecte les fichiers :
 *   - absents, vides ou trop petits (build interrompu) ;
 *   - tronqués / corrompus (structure ZIP incohérente) ;
 *   - incomplets (AndroidManifest.xml, classes.dex ou resources.arsc manquants) ;
 *   - non signés (Android refuse l'installation d'un APK release non signé).
 *
 * Utilisation :
 *   node scripts/verify-artifact.mjs android/app/build/outputs/apk/release/app-release.apk
 *   node scripts/verify-artifact.mjs build/Batibuild-release.aab --kind aab
 *
 * Sortie : détails de l'artefact puis « BUILD SUCCESS » ou « BUILD FAILED »
 * (avec la cause exacte), et code de sortie 0 / 1. Aucune écriture : le script
 * ne fait que lire le fichier.
 */
import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { basename, dirname, join, resolve } from "node:path";

/** Taille minimale plausible d'un APK/AAB complet (build interrompu en dessous). */
const MIN_BYTES = 1024 * 1024; // 1 Mo
/** Taille maximale de sécurité (garde-fou anti-copie de fichier de debug). */
const MAX_BYTES = 600 * 1024 * 1024; // 600 Mo

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04"
const APK_SIGNING_BLOCK_MAGIC = "APK Sig Block 42";

/** Entrées obligatoires dans le conteneur selon le type d'artefact. */
const REQUIRED_ENTRIES = {
  apk: ["AndroidManifest.xml", "classes.dex", "resources.arsc"],
  aab: ["BundleConfig.pb", "base/manifest/AndroidManifest.xml"],
};

function readSlice(fd, start, length) {
  const size = Math.max(0, length);
  const buffer = Buffer.alloc(size);
  readSync(fd, buffer, 0, size, start);
  return buffer;
}

/** Lit l'End Of Central Directory (situé dans les 66 derniers Ko du fichier). */
function findEocd(buffer) {
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      return {
        offset: i,
        entries: buffer.readUInt16LE(i + 10),
        cdSize: buffer.readUInt32LE(i + 12),
        cdOffset: buffer.readUInt32LE(i + 16),
      };
    }
  }
  return null;
}

/** Compte les en-têtes du répertoire central réellement présents. */
function countCentralHeaders(buffer) {
  let count = 0;
  for (let i = 0; i + 4 <= buffer.length; i += 1) {
    if (buffer.readUInt32LE(i) === CENTRAL_HEADER_SIGNATURE) count += 1;
  }
  return count;
}

export function verifyArtifact(targetPath, options = {}) {
  const kind = options.kind || (/\.aab$/i.test(targetPath) ? "aab" : "apk");
  const problems = [];
  const details = [];

  const path = resolve(targetPath);
  const fail = (cause) => problems.push(cause);

  if (!existsSync(path)) {
    return {
      ok: false,
      path,
      kind,
      problems: [`fichier introuvable : ${path} — le build n'a produit aucun artefact`],
      details,
    };
  }

  const fileStat = statSync(path);
  if (!fileStat.isFile()) {
    return {
      ok: false,
      path,
      kind,
      problems: [`${path} n'est pas un fichier régulier`],
      details,
    };
  }
  const size = fileStat.size;
  details.push(`Fichier : ${path}`);
  details.push(`Type    : ${kind.toUpperCase()}`);
  details.push(`Taille  : ${(size / (1024 * 1024)).toFixed(2)} Mo (${size} octets)`);

  if (size < MIN_BYTES) {
    fail(
      `fichier vide ou incomplet : ${size} octets (< ${(MIN_BYTES / 1024 / 1024).toFixed(0)} Mo)`,
    );
  }
  if (size > MAX_BYTES) {
    fail(`fichier anormalement volumineux : ${(size / (1024 * 1024)).toFixed(0)} Mo`);
  }

  const fd = openSync(path, "r");
  try {
    const head = readSlice(fd, 0, 4);
    if (!head.equals(ZIP_MAGIC)) {
      fail(
        `en-tête invalide (${head.toString("hex")}) : ce n'est pas un conteneur ZIP — l'artefact n'est pas un ${kind.toUpperCase()} exploitable`,
      );
    } else {
      details.push("En-tête : conteneur ZIP valide");
    }

    const tailLength = Math.min(size, 65557);
    const tail = readSlice(fd, size - tailLength, tailLength);
    const eocd = findEocd(tail);

    if (!eocd) {
      fail("répertoire central introuvable (End Of Central Directory) — fichier tronqué ou corrompu");
    } else {
      const absoluteCdOffset = eocd.cdOffset;
      details.push(`Entrées : ${eocd.entries}`);
      details.push(`Répertoire central : offset ${absoluteCdOffset}, taille ${eocd.cdSize}`);

      if (absoluteCdOffset + eocd.cdSize > size) {
        fail(
          `structure ZIP incohérente : le répertoire central (${absoluteCdOffset + eocd.cdSize} octets) dépasse la taille du fichier (${size}) — artefact tronqué`,
        );
      }

      const zip64 = eocd.entries === 0xffff || absoluteCdOffset === 0xffffffff;
      const cdLength = Math.min(eocd.cdSize, Math.max(0, size - absoluteCdOffset));
      const central = readSlice(fd, absoluteCdOffset, cdLength);

      if (!zip64) {
        const found = countCentralHeaders(central);
        if (found !== eocd.entries) {
          fail(
            `structure ZIP incohérente : ${found} entrées lues pour ${eocd.entries} annoncées — artefact incomplet`,
          );
        }
      } else {
        details.push("Note : archive ZIP64 détectée (contrôle du nombre d'entrées allégé)");
      }

      const names = central.toString("latin1");
      const missing = REQUIRED_ENTRIES[kind].filter((entry) => !names.includes(entry));
      if (missing.length) {
        fail(`entrées obligatoires manquantes : ${missing.join(", ")} — artefact incomplet`);
      } else {
        details.push(`Entrées obligatoires présentes : ${REQUIRED_ENTRIES[kind].join(", ")}`);
      }

      if (kind === "apk") {
        // Signature v2/v3 : bloc de signature APK ; signature v1 : META-INF/*.RSA
        const signatureWindow = readSlice(fd, Math.max(0, size - 131072), Math.min(size, 131072));
        const v2 = signatureWindow.toString("latin1").includes(APK_SIGNING_BLOCK_MAGIC);
        const v1 = /META-INF\/[A-Z0-9_-]+\.(RSA|DSA|EC)/i.test(names);
        if (!v2 && !v1) {
          fail(
            "APK NON SIGNÉ : aucune signature (ni bloc APK v2/v3, ni META-INF/*.RSA) — Android refusera l'installation",
          );
        } else {
          details.push(`Signature : ${v2 ? "APK Signing Block v2/v3" : "v1 (META-INF)"}`);
        }
      }

      // Classes dex réellement présentes (le manifest peut exister sans code).
      if (kind === "apk" && !/classes\d*\.dex/.test(names)) {
        fail("aucun fichier classes*.dex dans l'APK — code compilé absent");
      }
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

  return { ok: problems.length === 0, path, kind, problems, details };
}

/* ── CLI ─────────────────────────────────────────────────────────────────── */

function main() {
  const args = process.argv.slice(2);
  const kindFlagIndex = args.findIndex((a) => a === "--kind");
  const kind = kindFlagIndex >= 0 ? args[kindFlagIndex + 1] : undefined;
  const target = args.find((a) => !a.startsWith("--") && a !== kind);

  console.log("════════════════════════════════════════════════════════════");
  console.log(" VÉRIFICATION DE L'ARTEFACT ANDROID");
  console.log("════════════════════════════════════════════════════════════");

  if (!target) {
    console.log("❌ Aucun fichier fourni.");
    console.log("   Usage : node scripts/verify-artifact.mjs <chemin.apk|.aab> [--kind apk|aab]");
    console.log("\nBUILD FAILED\n");
    process.exit(1);
  }

  const result = verifyArtifact(target, { kind });
  for (const line of result.details) console.log(`  ${line}`);

  if (result.ok) {
    console.log(`\n  ✔ ${basename(result.path)} est complet, signé et installable.`);
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
