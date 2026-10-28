#!/usr/bin/env node
/**
 * CAPTURES D'ÉCRAN RÉELLES DU GUIDE D'UTILISATION
 *
 * PÉRIMÈTRE : outillage mobile uniquement — n'écrit que des images dans
 * `mobile/assets/guide/`. Aucune donnée Convex, aucun compte, aucun réglage de
 * production n'est touché : le script ouvre la plateforme dans un navigateur,
 * comme le ferait l'application, et photographie les écrans.
 *
 * ── Pourquoi ce script existe ──────────────────────────────────────────────
 * Le guide d'utilisation de l'application Android n'utilise PAS d'illustrations
 * génériques : chaque diapositive montre une véritable capture de la
 * plateforme batibuild (https://batibuild.app/) dans la WebView mobile. Quatre
 * des cinq écrans (plans IA, aide à la décision, mise en relation, exécution &
 * suivi) sont DERRIÈRE L'AUTHENTIFICATION : il faut une session réelle pour les
 * capturer. Ce script prend la session en compte, sans jamais créer de compte.
 *
 * ── Utilisation ────────────────────────────────────────────────────────────
 *   # 1. Écran public (estimation des coûts) — aucune session requise
 *   node mobile/scripts/capture-guide-screenshots.mjs
 *
 *   # 2. Les cinq écrans — avec un compte de test EXISTANT
 *   BATIBUILD_EMAIL="compte@exemple.tn" BATIBUILD_PASSWORD="…" \
 *     node mobile/scripts/capture-guide-screenshots.mjs --all
 *
 *   # 3. Un seul écran (ex. reprise après retouche d'un écran)
 *   BATIBUILD_EMAIL=… BATIBUILD_PASSWORD=… \
 *     node mobile/scripts/capture-guide-screenshots.mjs --step=3
 *
 *   # Options
 *   --base=https://batibuild.app   autre instance (préversion)
 *   --project=<id>                 id du projet à photographier (sinon le
 *                                  premier projet de « Mes projets »)
 *   --keep                         conserve le navigateur ouvert en cas d'échec
 *
 * Sortie : mobile/assets/guide/step-<n>-<slug>.jpg — JPEG qualité 82, viewport
 * 390 × 844 à 2× (soit 780 × 1688), exactement le format que la WebView
 * affiche sur un téléphone Android courant. Ce format est volontairement
 * compressé pour ne pas alourdir l'APK ni le premier lancement.
 */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = resolve(HERE, "..");
const OUT_DIR = join(MOBILE_ROOT, "assets", "guide");

/* ── Arguments ────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback = undefined) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const BASE = (opt("base", "https://batibuild.app") || "").replace(/\/+$/, "");
const ALL = flag("all");
const STEP_FILTER = opt("step") ? Number(opt("step")) : null;
const PROJECT_ID = opt("project") || null;
const KEEP = flag("keep");

const EMAIL = process.env.BATIBUILD_EMAIL || "";
const PASSWORD = process.env.BATIBUILD_PASSWORD || "";

/* ── Les cinq écrans du guide ─────────────────────────────────────────────── */

/**
 * `route(ctx)` renvoie l'URL de l'écran à photographier.
 * `public: true` = accessible sans session (capturable sans identifiants).
 */
const SHOTS = [
  {
    step: 1,
    slug: "couts-estimatifs",
    label: "Coûts estimatifs",
    public: true,
    route: (ctx) =>
      // Projet réel quand une session existe ; sinon la page PUBLIQUE de
      // démonstration de l'estimation (même interface, vrai moteur de calcul).
      ctx.projectId ? `/dashboard/project/${ctx.projectId}` : "/construction/demo",
  },
  {
    step: 2,
    slug: "plans-architecturaux-ia",
    label: "Plans architecturaux IA",
    public: false,
    route: (ctx) => (ctx.projectId ? `/dashboard/plans/${ctx.projectId}` : null),
  },
  {
    step: 3,
    slug: "aide-a-la-decision",
    label: "Aide à la décision",
    public: false,
    route: (ctx) => (ctx.projectId ? `/dashboard/decision/${ctx.projectId}` : null),
  },
  {
    step: 4,
    slug: "mise-en-relation",
    label: "Mise en relation",
    public: false,
    route: () => "/dashboard/professionals-directory",
  },
  {
    step: 5,
    slug: "execution-suivi",
    label: "Exécution & suivi",
    public: false,
    route: (ctx) => (ctx.projectId ? `/dashboard/guide/${ctx.projectId}` : null),
  },
];

/* ── Résolution du navigateur / de puppeteer (aucune nouvelle dépendance) ──── */

function loadPuppeteer() {
  const require = createRequire(join(MOBILE_ROOT, "package.json"));
  const candidates = [
    "puppeteer",
    "puppeteer-core",
  ];
  for (const id of candidates) {
    try {
      return require(id);
    } catch {
      /* suivant */
    }
  }
  return null;
}

function findChromium() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const roots = [
    process.env.PUPPETEER_CACHE_DIR,
    join(process.env.HOME || "/root", ".cache", "puppeteer", "chrome-headless-shell"),
    join(process.env.HOME || "/root", ".cache", "puppeteer", "chrome"),
    "/root/.cache/puppeteer/chrome-headless-shell",
  ].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      for (const rel of [
        ["chrome-headless-shell-linux64", "chrome-headless-shell"],
        ["chrome-linux64", "chrome"],
      ]) {
        const bin = join(root, entry, ...rel);
        if (existsSync(bin)) return bin;
      }
    }
  }
  for (const bin of ["/usr/bin/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium-browser"]) {
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

/* ── Capture ──────────────────────────────────────────────────────────────── */

const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const sameOrigin = (url) => url.startsWith(BASE);

async function settle(page, ms = 2200) {
  // Laisse le temps aux requêtes Convex, polices et animations de se poser :
  // une capture prise trop tôt montrerait des squelettes de chargement.
  await page.waitForNetworkIdle({ idleTime: 700, timeout: 20000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, ms));
}

async function login(page) {
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle2", timeout: 60000 });
  const emailInput = await page.$('input[type="email"], input[name="email"], input[autocomplete="email"]');
  const passwordInput = await page.$('input[type="password"], input[name="password"]');
  if (!emailInput || !passwordInput) {
    throw new Error("formulaire de connexion introuvable sur /auth");
  }
  await emailInput.click({ clickCount: 3 });
  await emailInput.type(EMAIL, { delay: 12 });
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(PASSWORD, { delay: 12 });

  const submit = await page.$('button[type="submit"]');
  if (!submit) throw new Error("bouton « Se connecter » introuvable sur /auth");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => {}),
    submit.click(),
  ]);
  await settle(page, 3000);

  if (!sameOrigin(page.url()) || page.url().includes("/auth")) {
    throw new Error("connexion refusée (vérifiez BATIBUILD_EMAIL / BATIBUILD_PASSWORD)");
  }
}

/** Premier projet de « Mes projets » — aucune création, aucune modification. */
async function discoverProjectId(page) {
  if (PROJECT_ID) return PROJECT_ID;
  await page.goto(`${BASE}/dashboard/projects`, { waitUntil: "networkidle2", timeout: 60000 });
  await settle(page, 2500);
  const href = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/dashboard/project/"]');
    return link ? link.getAttribute("href") : null;
  });
  const match = href && href.match(/\/dashboard\/project\/([^/?#]+)/);
  return match ? match[1] : null;
}

async function capture(page, shot, ctx) {
  const path = shot.route(ctx);
  if (!path) {
    console.log(`  ⏭  ${shot.step}. ${shot.label} — projet introuvable, écran ignoré`);
    return false;
  }
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 60000 });
  await settle(page);

  if (page.url().includes("/auth")) {
    console.log(`  ⚠  ${shot.step}. ${shot.label} — session absente, écran ignoré`);
    return false;
  }

  // Laisse disparaître les overlays éventuels sans jamais masquer l'interface.
  await page.mouse.wheel({ deltaY: 0 });
  const file = join(OUT_DIR, `step-${shot.step}-${shot.slug}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 82, fullPage: false });
  console.log(`  ✅ ${shot.step}. ${shot.label} → assets/guide/${`step-${shot.step}-${shot.slug}.jpg`}`);
  return true;
}

/* ── Programme ───────────────────────────────────────────────────────────── */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const puppeteer = loadPuppeteer();
  if (!puppeteer) {
    console.error(
      "puppeteer est introuvable. Installez-le hors du projet (npm i -g puppeteer) " +
        "ou définissez PUPPETEER_EXECUTABLE_PATH puis relancez.",
    );
    process.exitCode = 1;
    return;
  }

  const executablePath = findChromium();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--font-render-hinting=none"],
  });

  let captured = 0;
  let skipped = [];
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await page.setUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Mobile Safari/537.36 batibuild-guide-capture",
    );

    console.log(`\nCaptures du guide — ${BASE}\n`);

    const canLogin = Boolean(EMAIL && PASSWORD);
    let ctx = { projectId: null };

    if (canLogin) {
      console.log("• Connexion avec le compte fourni…");
      await login(page);
      ctx.projectId = await discoverProjectId(page);
      console.log(`• Projet photographié : ${ctx.projectId ?? "(aucun)"}\n`);
    } else {
      console.log("• Aucun identifiant fourni : seul l'écran public (1/5) sera capturé.\n");
    }

    for (const shot of SHOTS) {
      if (STEP_FILTER && shot.step !== STEP_FILTER) continue;
      if (!shot.public && !canLogin) {
        skipped.push(shot);
        continue;
      }
      if (await capture(page, shot, ctx)) captured++;
      else skipped.push(shot);
    }
  } finally {
    if (!KEEP || skipped.length === 0) await browser.close();
    else console.log("\n(--keep : navigateur laissé ouvert pour inspection)");
  }

  console.log(`\n${captured} capture(s) enregistrée(s) dans assets/guide/`);
  if (skipped.length) {
    console.log(
      `\n${skipped.length} écran(s) NON capturé(s) — ils sont derrière l'authentification :\n` +
        skipped.map((s) => `  · ${s.step}/5 ${s.label}`).join("\n") +
        `\n\nRelancez avec un compte EXISTANT (jamais créé par ce script) :\n` +
        `  BATIBUILD_EMAIL="…" BATIBUILD_PASSWORD="…" node mobile/scripts/capture-guide-screenshots.mjs --all\n\n` +
        `Les écrans manquants affichent, dans le guide, l'illustration de l'étape\n` +
        `(aucune fausse capture n'est jamais utilisée).`,
    );
  }
}

main().catch((err) => {
  console.error("\nÉchec de la capture :", err.message);
  process.exitCode = 1;
});
