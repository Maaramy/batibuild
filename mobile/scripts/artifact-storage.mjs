#!/usr/bin/env node
/**
 * STOCKAGE DES ARTEFACTS GITHUB ACTIONS — batibuild Mobile.
 *
 * POURQUOI CE SCRIPT
 * ------------------
 * Les artefacts de workflow (APK release, AAB release — l'APK debug n'est plus
 * publié) consomment le quota de stockage du dépôt. Quand ce quota est atteint,
 * GitHub refuse TOUTE
 * nouvelle publication avec :
 *
 *   Failed to CreateArtifact: Artifact storage quota has been hit.
 *
 * Le build Android n'est alors plus téléchargeable, alors que la compilation
 * elle-même a réussi. Ce script supprime les anciennes générations d'artefacts
 * AVANT/PENDANT le workflow pour que le build courant ait toujours de la place.
 *
 * CE QUI N'EST JAMAIS SUPPRIMÉ
 * ----------------------------
 *   · les sources, le code, l'historique Git et les releases GitHub ;
 *   · les artefacts du run en cours (identifiés par GITHUB_RUN_ID) ;
 *   · le dernier build batibuild (ARTIFACT_KEEP_LATEST, 1 par défaut) :
 *     la version précédente reste téléchargeable pendant sa rétention.
 *
 * UTILISATION
 * -----------
 *   # Nettoyage (mode par défaut) — supprime les anciens artefacts temporaires
 *   GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo node scripts/artifact-storage.mjs cleanup
 *   node scripts/artifact-storage.mjs cleanup --dry-run      # simulation, rien n'est supprimé
 *
 *   # Vérification — confirme que l'artefact du run courant est bien publié
 *   GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo ARTIFACT_NAME=batibuild-... \
 *     node scripts/artifact-storage.mjs verify
 *
 *   # Contrôle hors ligne de la politique de suppression (aucun réseau)
 *   node scripts/artifact-storage.mjs --self-test
 *
 * VARIABLES D'ENVIRONNEMENT
 * -------------------------
 *   GITHUB_TOKEN / GH_TOKEN      jeton avec la permission `actions: write`
 *   GITHUB_REPOSITORY            owner/repo (fourni automatiquement par Actions)
 *   GITHUB_RUN_ID                run courant — jamais supprimé
 *   ARTIFACT_NAME                nom attendu (mode `verify`)
 *   ARTIFACT_RETENTION_DAYS      âge au-delà duquel un artefact tiers est supprimé (défaut 5)
 *   ARTIFACT_CLEANUP_SCOPE       `all` (défaut) : tout le dépôt — `workflow` : batibuild uniquement
 *   ARTIFACT_KEEP_LATEST         nombre de builds batibuild conservés (défaut 1)
 *
 * Aucune écriture locale : le script ne fait que lire l'API GitHub et supprimer
 * des artefacts de workflow.
 */
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const API = "https://api.github.com";
const API_VERSION = "2022-11-28";
/** Préfixe des artefacts produits par ce dépôt (toutes générations confondues). */
const OUR_ARTIFACTS = /^batibuild/i;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || process.env.DRY_RUN === "1";

function env(name, fallback = "") {
  const value = (process.env[name] ?? "").trim();
  return value || fallback;
}

function readNumber(name, fallback, { min, max }) {
  const raw = env(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  if (value < min || value > max) {
    console.log(
      `  ⚠️  ${name}=${raw} hors limites (${min}–${max}) → valeur utilisée : ${fallback}`,
    );
    return fallback;
  }
  return Math.trunc(value);
}

const token = env("GITHUB_TOKEN") || env("GH_TOKEN");
const repo = env("GITHUB_REPOSITORY");
const currentRunId = Number(env("GITHUB_RUN_ID", "0")) || 0;
const inCi = env("GITHUB_ACTIONS") === "true";

const retentionDays = readNumber("ARTIFACT_RETENTION_DAYS", 5, { min: 1, max: 90 });
const keepLatest = readNumber("ARTIFACT_KEEP_LATEST", 1, { min: 0, max: 20 });
const scope = env("ARTIFACT_CLEANUP_SCOPE", "all").toLowerCase() === "workflow" ? "workflow" : "all";

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let index = 0;
  let size = value;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function summary(lines) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  try {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  } catch {
    /* le résumé est un confort : jamais bloquant */
  }
}

/* ── API GitHub ───────────────────────────────────────────────────────────── */

class ApiError extends Error {
  constructor(status, body) {
    super(`GitHub API ${status} — ${body?.message ?? "réponse illisible"}`);
    this.status = status;
    this.body = body;
  }
}

async function api(pathname, options = {}) {
  const response = await fetch(`${API}${pathname}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "batibuild-ci",
      ...(options.headers ?? {}),
    },
  });
  let body = null;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }
  if (!response.ok) throw new ApiError(response.status, body);
  return body;
}

async function listArtifacts() {
  const all = [];
  for (let page = 1; page <= 20; page += 1) {
    const body = await api(`/repos/${repo}/actions/artifacts?per_page=100&page=${page}`);
    const items = body?.artifacts ?? [];
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
}

/* ── Politique de suppression (pure, testable hors ligne) ─────────────────── */

const byNewest = (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at);

/**
 * Décide quels artefacts peuvent être supprimés.
 * @returns {{ artifact: object, reason: string }[]}
 */
export function planCleanup(artifacts, options) {
  const {
    now = Date.now(),
    retentionDays: days = 5,
    keepLatest: keep = 1,
    scope: cleanupScope = "all",
    currentRun = 0,
  } = options ?? {};

  const cutoff = now - days * 86_400_000;
  const ours = artifacts.filter((artifact) => OUR_ARTIFACTS.test(artifact.name ?? ""));
  const protectedIds = new Set(
    ours
      .filter((artifact) => artifact.workflow_run?.id !== currentRun)
      .sort(byNewest)
      .slice(0, keep)
      .map((artifact) => artifact.id),
  );

  const plan = [];
  for (const artifact of artifacts) {
    // 1. Jamais l'artefact du run en cours.
    if (currentRun && artifact.workflow_run?.id === currentRun) continue;
    // 2. Artefacts d'autres workflows : uniquement en mode « all », et seulement
    //    au-delà de la durée de rétention.
    if (!OUR_ARTIFACTS.test(artifact.name ?? "")) {
      if (cleanupScope !== "all") continue;
      if (artifact.expired === true) {
        plan.push({ artifact, reason: "expiré" });
      } else if (Date.parse(artifact.created_at) < cutoff) {
        plan.push({ artifact, reason: `plus vieux que ${days} j` });
      }
      continue;
    }
    // 3. Nos artefacts : on conserve les `keep` plus récents, on supprime le reste
    //    (c'est exactement « ne jamais conserver inutilement les anciennes
    //    générations »).
    if (protectedIds.has(artifact.id)) continue;
    plan.push({ artifact, reason: "ancienne génération batibuild" });
  }
  return plan;
}

/* ── Mode `cleanup` ───────────────────────────────────────────────────────── */

async function runCleanup() {
  console.log("════════════════════════════════════════════════════════════");
  console.log(" NETTOYAGE DES ARTEFACTS GITHUB ACTIONS — batibuild");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`  Dépôt        : ${repo}`);
  console.log(`  Portée       : ${scope === "all" ? "tout le dépôt" : "artefacts batibuild"}`);
  console.log(`  Rétention    : ${retentionDays} jour(s)`);
  console.log(`  Builds gardés: ${keepLatest}`);
  console.log(`  Run courant  : ${currentRunId || "inconnu"} (jamais supprimé)`);
  console.log(`  Mode         : ${dryRun ? "simulation (--dry-run)" : "suppression réelle"}`);

  const before = await listArtifacts();
  const usedBefore = before.reduce((total, artifact) => total + (artifact.size_in_bytes ?? 0), 0);
  console.log(
    `\n  État actuel : ${before.length} artefact(s) — ${formatBytes(usedBefore)}`,
  );

  const plan = planCleanup(before, {
    retentionDays,
    keepLatest,
    scope,
    currentRun: currentRunId,
  });

  if (plan.length === 0) {
    console.log("\n  ✅ Aucun artefact à supprimer : le stockage est déjà propre.");
    return { deleted: 0, freed: 0, remaining: before };
  }

  console.log(`\n  ${plan.length} artefact(s) à supprimer :`);
  for (const { artifact, reason } of plan) {
    console.log(
      `    · ${artifact.name} (${formatBytes(artifact.size_in_bytes)}) — ${reason}` +
        (artifact.expired ? " [expiré]" : ""),
    );
  }

  if (dryRun) {
    const freed = plan.reduce((total, { artifact }) => total + (artifact.size_in_bytes ?? 0), 0);
    console.log(`\n  ℹ️  Simulation : ${formatBytes(freed)} seraient libérés.`);
    return { deleted: 0, freed, remaining: before, simulated: true };
  }

  let deleted = 0;
  let freed = 0;
  const failures = [];
  for (const { artifact } of plan) {
    try {
      await api(`/repos/${repo}/actions/artifacts/${artifact.id}`, { method: "DELETE" });
      deleted += 1;
      freed += artifact.size_in_bytes ?? 0;
      console.log(`    ✅ supprimé : ${artifact.name}`);
    } catch (error) {
      // 410 = déjà expiré/supprimé : objectif atteint malgré tout.
      if (error instanceof ApiError && error.status === 410) {
        console.log(`    ✅ déjà expiré : ${artifact.name}`);
        continue;
      }
      failures.push({ artifact, error });
      console.log(`    ❌ échec : ${artifact.name} — ${error.message}`);
    }
  }

  const after = await listArtifacts();
  const usedAfter = after.reduce((total, artifact) => total + (artifact.size_in_bytes ?? 0), 0);

  console.log("\n────────────────────────────────────────────────────────────");
  console.log(`  Supprimés : ${deleted} artefact(s) — ${formatBytes(freed)} libérés`);
  console.log(`  Restants  : ${after.length} artefact(s) — ${formatBytes(usedAfter)}`);
  console.log("────────────────────────────────────────────────────────────");
  for (const artifact of after.slice(0, 10)) {
    console.log(
      `    · ${artifact.name} — ${formatBytes(artifact.size_in_bytes)}` +
        ` — expire le ${new Date(artifact.expires_at).toLocaleDateString("fr-FR")}`,
    );
  }

  summary([
    "### 🧹 Nettoyage des artefacts GitHub Actions",
    "",
    `- Artefacts avant : **${before.length}** (${formatBytes(usedBefore)})`,
    `- Supprimés : **${deleted}** (${formatBytes(freed)})`,
    `- Artefacts restants : **${after.length}** (${formatBytes(usedAfter)})`,
    `- Rétention configurée pour ce build : **${retentionDays} jour(s)**`,
  ]);

  if (failures.length) {
    const first = failures[0].error;
    console.log("");
    console.log("  ⚠️  Certaines suppressions ont échoué : le stockage peut rester saturé.");
    console.log(`      Cause : ${first.message}`);
    if (first instanceof ApiError && (first.status === 403 || first.status === 401)) {
      console.log(
        "      → Le jeton n'a pas la permission `actions: write` (ou elle est bloquée\n" +
          "        par la politique du dépôt/organisation). Supprimez les anciens\n" +
          "        artefacts manuellement : Actions → run → section « Artifacts ».",
      );
    }
    console.log(
      "      → Suppression manuelle : onglet « Actions » → choisir un run →\n" +
        "        « Artifacts » → corbeille. Le quota est recalculé ensuite (6 à 12 h).",
    );
    return { deleted, freed, remaining: after, failures };
  }
  return { deleted, freed, remaining: after };
}

/* ── Mode `verify` ────────────────────────────────────────────────────────── */

async function runVerify() {
  const expected = env("ARTIFACT_NAME");
  console.log("════════════════════════════════════════════════════════════");
  console.log(" VÉRIFICATION DE LA PUBLICATION — batibuild");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`  Dépôt         : ${repo}`);
  console.log(`  Run           : ${currentRunId}`);
  console.log(`  Artefact visé : ${expected || "(non fourni)"}`);

  if (!expected || !currentRunId) {
    console.log("  ❌ ARTIFACT_NAME et GITHUB_RUN_ID sont requis pour vérifier la publication.");
    return { ok: false };
  }

  const body = await api(`/repos/${repo}/actions/runs/${currentRunId}/artifacts?per_page=100`);
  const artifacts = body?.artifacts ?? [];
  const found = artifacts.find((artifact) => artifact.name === expected);

  console.log(
    `  Artefact(s) publié(s) par ce run : ${artifacts.length ? artifacts.map((a) => a.name).join(", ") : "aucun"}`,
  );

  if (!found) {
    console.log(`  ❌ L'artefact « ${expected} » n'a pas été publié par ce run.`);
    return { ok: false };
  }
  if (!(found.size_in_bytes > 0)) {
    console.log(`  ❌ L'artefact « ${expected} » est vide (0 octet) : publication invalide.`);
    return { ok: false };
  }

  console.log("  ✅ Artefact publié et non vide");
  console.log(`     id      : ${found.id}`);
  console.log(`     taille  : ${formatBytes(found.size_in_bytes)}`);
  console.log(`     expirera: ${new Date(found.expires_at).toLocaleString("fr-FR")}`);
  console.log(`     SHA-256 : ${found.digest ?? "(non communiqué)"}`);

  const all = await listArtifacts();
  const used = all.reduce((total, artifact) => total + (artifact.size_in_bytes ?? 0), 0);
  console.log(`\n  Stockage du dépôt : ${all.length} artefact(s) — ${formatBytes(used)}`);

  summary([
    "### 📦 Artefact publié",
    "",
    `- Nom : **${found.name}**`,
    `- Taille : **${formatBytes(found.size_in_bytes)}**`,
    `- Expire le : **${new Date(found.expires_at).toLocaleDateString("fr-FR")}**`,
    `- Stockage total du dépôt : **${all.length} artefact(s) — ${formatBytes(used)}**`,
  ]);
  return { ok: true, artifact: found };
}

/* ── Contrôle hors ligne de la politique ──────────────────────────────────── */

function selfTest() {
  const day = 86_400_000;
  const now = Date.parse("2026-09-25T12:00:00Z");
  const at = (offsetDays) => new Date(now - offsetDays * day).toISOString();

  const artifacts = [
    // Run courant : jamais supprimé, même s'il porte un nom batibuild.
    { id: 1, name: "batibuild-v1.3.2-code12-run99", size_in_bytes: 30_000_000, created_at: at(0), workflow_run: { id: 99 } },
    // Dernier build précédent : conservé (ARTIFACT_KEEP_LATEST = 1).
    { id: 2, name: "batibuild-v1.3.2-code12-run98", size_in_bytes: 30_000_000, created_at: at(1), workflow_run: { id: 98 } },
    // Générations antérieures : supprimées.
    { id: 3, name: "batibuild-v1.3.1-code11-run97", size_in_bytes: 20_000_000, created_at: at(2), workflow_run: { id: 97 } },
    { id: 4, name: "Batibuild-debug-apk", size_in_bytes: 10_000_000, created_at: at(9), workflow_run: { id: 40 } },
    { id: 5, name: "Batibuild-release-aab", size_in_bytes: 5_000_000, created_at: at(9), workflow_run: { id: 40 }, expired: true },
    // Artefact d'un autre workflow, récent : conservé en portée « all ».
    { id: 6, name: "autre-workflow-web", size_in_bytes: 1_000_000, created_at: at(1), workflow_run: { id: 96 } },
    // Artefact d'un autre workflow, plus vieux que la rétention : supprimé.
    { id: 7, name: "autre-workflow-vieux", size_in_bytes: 2_000_000, created_at: at(30), workflow_run: { id: 20 } },
  ];

  const scopeAll = planCleanup(artifacts, { now, retentionDays: 5, keepLatest: 1, scope: "all", currentRun: 99 });
  const idsAll = scopeAll.map(({ artifact }) => artifact.id).sort((a, b) => a - b);
  assert.deepEqual(idsAll, [3, 4, 5, 7], "portée « all » : anciennes générations + artefacts expirés/périmés");

  const scopeWorkflow = planCleanup(artifacts, { now, retentionDays: 5, keepLatest: 1, scope: "workflow", currentRun: 99 });
  const idsWorkflow = scopeWorkflow.map(({ artifact }) => artifact.id).sort((a, b) => a - b);
  assert.deepEqual(idsWorkflow, [3, 4, 5], "portée « workflow » : jamais les artefacts des autres workflows");

  const keepTwo = planCleanup(artifacts, { now, retentionDays: 5, keepLatest: 2, scope: "all", currentRun: 99 });
  const idsKeepTwo = keepTwo.map(({ artifact }) => artifact.id).sort((a, b) => a - b);
  assert.deepEqual(idsKeepTwo, [4, 5, 7], "keepLatest=2 : le build précédent reste téléchargeable");

  const empty = planCleanup([], { now, retentionDays: 5, keepLatest: 1, scope: "all", currentRun: 99 });
  assert.deepEqual(empty, [], "dépôt vide : rien à supprimer");

  const keepNone = planCleanup(artifacts, { now, retentionDays: 5, keepLatest: 0, scope: "all", currentRun: 99 });
  assert.deepEqual(
    keepNone.map(({ artifact }) => artifact.id).sort((a, b) => a - b),
    [2, 3, 4, 5, 7],
    "keepLatest=0 : aucune génération batibuild conservée",
  );

  console.log("✅ Politique de nettoyage vérifiée (5 cas hors ligne).");
  return { ok: true };
}

/* ── Exécution ────────────────────────────────────────────────────────────── */

function missingCredentials(needed) {
  const missing = [];
  if (!token) missing.push("GITHUB_TOKEN");
  if (!repo) missing.push("GITHUB_REPOSITORY");
  if (!needed) return missing;
  for (const name of needed) if (!env(name)) missing.push(name);
  return missing;
}

export async function main(mode = "cleanup") {
  if (mode === "self-test") return selfTest();

  const needed = mode === "verify" ? ["ARTIFACT_NAME", "GITHUB_RUN_ID"] : [];
  const missing = missingCredentials(needed);
  if (missing.length) {
    console.log(`  ⚠️  Variables manquantes : ${missing.join(", ")}`);
    if (inCi) {
      console.log("  ❌ Exécution en CI sans identifiants : le stockage ne peut pas être géré.");
      return { ok: false };
    }
    console.log(
      "  ℹ️  Hors CI, renseignez-les pour agir sur le dépôt, par exemple :\n" +
        "      GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo node scripts/artifact-storage.mjs cleanup --dry-run",
    );
    return { ok: true, skipped: true };
  }

  try {
    if (mode === "verify") return await runVerify();
    const result = await runCleanup();
    return { ok: !result.failures?.length, ...result };
  } catch (error) {
    console.log("");
    console.log(`  ❌ ${error.message}`);
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      console.log(
        "     → Jeton sans permission `actions: write` (ou bloquée par la politique\n" +
          "       du dépôt). Supprimez les anciens artefacts depuis GitHub :\n" +
          `       ${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${repo}/actions`,
      );
    }
    if (error instanceof ApiError && error.status === 404) {
      console.log("     → Dépôt introuvable ou jeton sans accès (nom owner/repo à vérifier).");
    }
    console.log(
      "     → Le build n'est pas bloqué : après suppression des anciens artefacts\n" +
        "       (Actions → run → Artifacts), relancez le workflow. Le quota est\n" +
        "       recalculé sous 6 à 12 h si l'espace ne se libère pas immédiatement.",
    );
    return { ok: false, error };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flag = args.find((arg) => !arg.startsWith("--"));
  const mode = args.includes("--self-test") ? "self-test" : flag === "verify" ? "verify" : "cleanup";
  const result = await main(mode);
  process.exit(result.ok === false ? 1 : 0);
}
