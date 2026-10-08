// ============================================================================
// Garde-fous du BUNDLE CLIENT.
//
// Ces tests ne vérifient pas un comportement métier : ils verrouillent les
// optimisations qui empêchent le build de production (`tsc -b && vite build`)
// d'être tué par l'OOM killer de la sandbox de build à mémoire limitée
// (« Killed » après « rendering chunks »), et qui évitent les erreurs
// d'export d'icônes au runtime (`does not provide an export named 'X'`).
//
// Ils échouent dès qu'une régression réintroduit le poids supprimé, pour que
// l'optimisation ne puisse pas se perdre silencieusement.
// ============================================================================
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildProjectQuickActions } from "./projectQuickActions";
import {
  VENDOR_EXTERNAL_SPECIFIERS,
  VENDOR_FILES,
  VENDOR_MAPPINGS,
  resolvePackageFile,
  vendorExternals,
  vendorFileContent,
  vendorFileContents,
  vendorImportMap,
} from "../../scripts/vendor-externals-plugin";

const REPO_ROOT = join(__dirname, "..", "..");
const SRC = join(REPO_ROOT, "src");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

const isServerOnly = (file: string) => file.includes(`${join("src", "convex")}`);

/**
 * Toute la surface client compilée : `src` **et** la toolbar Vly à la racine
 * (`vly-toolbar-readonly.tsx`, incluse dans `tsconfig.app.json`). Cette
 * dernière importe aussi des icônes lucide : elle doit donc être couverte par
 * le garde-fou du shim, sinon une de ses icônes peut sortir du shim à
 * l'occasion d'un nettoyage et casser l'aperçu.
 */
function clientSourceFiles(): string[] {
  return [...sourceFiles(SRC), join(REPO_ROOT, "vly-toolbar-readonly.tsx")];
}

/** Tous les spécificateurs importés par un fichier (formes statique et dynamique). */
function importSpecifiers(code: string): string[] {
  const found: string[] = [];
  const re = /from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) found.push(m[1] ?? m[2]);
  return found;
}

describe("bundle client — poids du build", () => {
  it("aucun fichier client n'importe le schéma Convex (module serveur)", () => {
    // `src/convex/schema.ts` importe `@convex-dev/auth/server` : l'importer
    // depuis un composant client faisait entrer tout l'arbre serveur
    // (auth, zod, moteurs Convex) dans le graphe de build. Les constantes
    // partagées vivent désormais dans `src/lib/supplierSpecialties.ts`.
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (isServerOnly(file) || file.endsWith("clientBundleGuards.test.ts")) continue;
      for (const spec of importSpecifiers(readFileSync(file, "utf8"))) {
        if (/convex\/schema$/.test(spec)) offenders.push(`${file} → ${spec}`);
      }
    }
    expect(offenders, "imports serveur depuis le client").toEqual([]);
  });

  it("les dépendances optionnelles de jsPDF sont aliasées vers le stub explicite", () => {
    // jsPDF ne charge `html2canvas` / `canvg` / `dompurify` que depuis
    // `doc.html()`, jamais utilisé ici. Sans alias, Rollup les transforme
    // quand même (~216 modules morts, dont 206 `core-js` via `canvg`), ce qui
    // gonflait fortement le pic mémoire du build.
    const config = readFileSync(join(REPO_ROOT, "vite.config.ts"), "utf8");
    for (const dep of ["html2canvas", "canvg", "dompurify"]) {
      expect(
        new RegExp(`${dep}:\\s*path\\.resolve\\(__dirname,\\s*"\\./src/lib/pdfHtmlUnsupported\\.ts"\\)`).test(
          config,
        ),
        `l'alias « ${dep} » vers src/lib/pdfHtmlUnsupported.ts a disparu de vite.config.ts`,
      ).toBe(true);
    }
    // Le stub doit rester un échec EXPLICITE, jamais un silence.
    const stub = readFileSync(join(SRC, "lib", "pdfHtmlUnsupported.ts"), "utf8");
    expect(stub).toMatch(/throw new Error\(MESSAGE\)/);
  });

  it("le shim d'icônes couvre toutes les icônes lucide utilisées (pas d'export manquant)", () => {
    // Le build aliase « lucide-react » vers src/lib/lucide-shim.js pour éviter
    // de parser les ~1 900 modules du barrel. Une icône utilisée mais absente
    // du shim casse l'application au runtime : `does not provide an export
    // named 'Blocks'` (régression déjà observée en production).
    const shim = readFileSync(join(SRC, "lib", "lucide-shim.js"), "utf8");
    const exported = new Set(
      [...shim.matchAll(/export \{ default as (\w+) \}/g)].map((m) => m[1]),
    );
    expect(exported.size).toBeGreaterThan(0);

    const missing = new Set<string>();
    const namespaceImports: string[] = [];

    for (const file of clientSourceFiles()) {
      if (file.endsWith("lucide-shim.js") || isServerOnly(file)) continue;
      const code = readFileSync(file, "utf8");

      if (/import\s+\*\s+as\s+\w+\s+from\s+["']lucide-react["']/.test(code)) {
        namespaceImports.push(file);
      }

      const re = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']lucide-react["']/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code))) {
        const wholeImportIsTypeOnly = /import\s+type\s*\{/.test(m[0]);
        for (const raw of m[1].split(",")) {
          const entry = raw.trim();
          if (!entry) continue;
          // `import { type LucideIcon, Home }` : les spécificateurs inline
          // préfixés par `type` n'existent qu'au niveau des types (tsc utilise
          // les vrais types de lucide-react, l'alias ne s'applique qu'à Vite),
          // ils n'ont donc pas besoin d'un export runtime dans le shim.
          if (wholeImportIsTypeOnly || /^type\s/.test(entry)) continue;
          const name = entry.split(/\s+as\s+/)[0].trim();
          if (!name || name === "svgProps") continue;
          if (!exported.has(name)) missing.add(name);
        }
      }
    }

    expect(
      [...missing].sort(),
      "icônes lucide utilisées mais absentes de src/lib/lucide-shim.js",
    ).toEqual([]);
    expect(
      namespaceImports,
      "`import * as ... from \"lucide-react\"` contourne le shim (bundle complet)",
    ).toEqual([]);
  });

  it("chaque icône ré-exportée par le shim existe et fournit un export par défaut", () => {
    // Deuxième cause du runtime « The requested module
    // '/src/lib/lucide-shim.js' does not provide an export named 'X' » : le nom
    // EST déclaré dans le shim, mais la cible de son `export { default as X }
    // from "..."` n'existe plus (icône renommée/supprimée lors d'une montée de
    // version de lucide) ou ne fournit pas d'export par défaut. Le shim reste
    // alors syntaxiquement valide tout en cassant le navigateur dès qu'il est
    // chargé — donc toute l'application, y compris l'aperçu.
    // Une icône est utilisable si son module (ou la chaîne de ré-export vers
    // laquelle il pointe) fournit un export par défaut. Les icônes dépréciées
    // de lucide sont de simples alias : `export { default } from './ellipsis.js'`
    // (ex. `more-horizontal`, `loader-2`), il faut donc suivre la chaîne.
    const providesDefaultExport = (file: string, depth = 0): boolean => {
      if (depth > 5) return true;
      const code = readFileSync(file, "utf8");
      if (/as default\s*\}/.test(code) || /export default\b/.test(code)) return true;
      const reExport = code.match(/export \{ default \} from ["']([^"']+)["']/);
      if (!reExport) return false;
      const next = resolve(dirname(file), reExport[1]);
      return existsSync(next) ? providesDefaultExport(next, depth + 1) : false;
    };

    const shimPath = join(SRC, "lib", "lucide-shim.js");
    const shim = readFileSync(shimPath, "utf8");
    const re = /export \{ default as (\w+) \} from "([^"]+)";/g;
    const broken: string[] = [];
    let checked = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(shim))) {
      const [, name, specifier] = m;
      checked += 1;
      const target = resolve(dirname(shimPath), specifier);
      if (!existsSync(target)) {
        broken.push(`${name} → fichier introuvable (${specifier})`);
        continue;
      }
      if (!providesDefaultExport(target)) {
        broken.push(`${name} → la cible n'a pas d'export par défaut (${specifier})`);
      }
    }
    expect(checked, "aucune icône ré-exportée détectée dans le shim").toBeGreaterThan(0);
    expect(broken, "icônes déclarées dans le shim mais inutilisables").toEqual([]);
  });

  it("le build de production plafonne le heap V8 pour survivre à la sandbox", () => {
    // Sans plafond, le pic mémoire du build atteint la limite de 2 Go de la
    // sandbox (partagée avec le serveur de dev et `convex dev`) et l'OOM killer
    // termine le build (« Killed »). Le plafond fait collecter V8 plus tôt.
    //
    // Il est posé dans `scripts/build.sh` et non dans la ligne « build » de
    // package.json : une commande recopiée par la plateforme peut voir ses
    // préfixes d'environnement retirés (`NODE_OPTIONS=… tsc -b`), auquel cas le
    // plafond disparaît silencieusement. Un fichier exécuté par le shell, lui,
    // ne peut pas être « nettoyé ».
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const build = pkg.scripts.build;
    expect(build, "script « build » absent").toBeTruthy();
    expect(build, "le build doit passer par le script plafonné").toMatch(/scripts\/build\.sh/);

    const script = readFileSync(join(REPO_ROOT, "scripts", "build.sh"), "utf8");
    expect(script, "plafond de heap absent").toMatch(/--max-old-space-size=\$\{?\w+/);
    // Le script doit continuer à enchaîner exactement tsc puis vite build.
    expect(script).toMatch(/\btsc -b\b/);
    expect(script).toMatch(/\bvite build\b/);

    // Ce script ne suffit pas : la mise en production est lancée par la
    // plateforme avec la commande du gabarit Vite, jamais avec celle de
    // package.json. Le seul point de contact est node_modules/.bin, d'où
    // l'enveloppe posée par le `postinstall`.
    expect(
      pkg.scripts.postinstall,
      "le postinstall qui plafonne tsc/vite a disparu : le build déployé repart sans plafond",
    ).toMatch(/scripts\/harden-build-bins\.mjs/);
    const harden = readFileSync(join(REPO_ROOT, "scripts", "harden-build-bins.mjs"), "utf8");
    expect(harden, "plafond absent de l'enveloppe des binaires").toMatch(/--max-old-space-size/);
    expect(harden).toMatch(/typescript\/bin\/tsc/);
    expect(harden).toMatch(/vite\/bin\/vite\.js/);
    // `vite` ne doit être plafonné QUE pour `build` : le serveur de dev (donc
    // l'aperçu) doit garder tout son tas.
    expect(harden, "la sous-commande build doit être le seul cas plafonné").toMatch(
      /case "\$1" in/,
    );
    expect(harden).toMatch(/buildOnly/);
  });

  it("l'enveloppe postinstall plafonne tsc selon le budget mémoire et vite pour build", () => {
    // Vérifié pour de vrai sur un faux node_modules : chaque faux binaire
    // imprime la limite de tas V8 que node lui a donnée, donc le test constate
    // le plafond au lieu de paraphraser l'enveloppe. Elle doit aussi retrouver
    // sa cible depuis sa propre position (un node_modules déplacé doit
    // continuer à marcher) et rester idempotente.
    const tmp = mkdtempSync(join(tmpdir(), "budgetbati-heap-guard-"));
    const heapLimitScript = "#!/usr/bin/env node\nconsole.log(Math.round(require('v8').getHeapStatistics().heap_size_limit / 1048576));\n";
    // `env` force le budget mémoire que l'enveloppe mesure : c'est lui, et non
    // la mémoire de la machine de test, qui choisit le chemin.
    const heapLimitOf = (env: Record<string, string>, name: string, ...args: string[]) =>
      Number(
        execFileSync(join(tmp, "node_modules", ".bin", name), args, {
          cwd: tmp,
          encoding: "utf8",
          env: { ...process.env, ...env },
        }).trim(),
      );
    try {
      const bin = join(tmp, "node_modules", ".bin");
      mkdirSync(bin, { recursive: true });
      mkdirSync(join(tmp, "node_modules", "typescript", "bin"), { recursive: true });
      mkdirSync(join(tmp, "node_modules", "vite", "bin"), { recursive: true });
      writeFileSync(join(tmp, "node_modules", "typescript", "bin", "tsc"), heapLimitScript);
      writeFileSync(join(tmp, "node_modules", "vite", "bin", "vite.js"), heapLimitScript);
      symlinkSync(join("..", "typescript", "bin", "tsc"), join(bin, "tsc"));
      symlinkSync(join("..", "vite", "bin", "vite.js"), join(bin, "vite"));

      const harden = join(REPO_ROOT, "scripts", "harden-build-bins.mjs");
      execFileSync(process.execPath, [harden], { cwd: tmp });
      const tscWrapper = readFileSync(join(bin, "tsc"), "utf8");
      const viteWrapper = readFileSync(join(bin, "vite"), "utf8");

      expect(tscWrapper).toMatch(/--max-old-space-size=\d+/);
      expect(tscWrapper).toContain("../typescript/bin/tsc");
      expect(viteWrapper).toContain("../vite/bin/vite.js");
      // Un plafond trop bas ne baisse pas le pic, il CASSE le build : mesuré,
      // Vite abandonne à 620 Mo (« Ineffective mark-compacts near heap limit »,
      // jeu vivant ≈ 600 Mo) et passe à 660 Mo. Le plafond nominal doit donc
      // rester au-dessus de ce plancher mesuré.
      expect(
        Number(/--max-old-space-size=(\d+)/.exec(viteWrapper)?.[1]),
        "le plafond de vite est repassé sous son plancher mesuré (660 Mo)",
      ).toBeGreaterThanOrEqual(660);

      // `tsc -b` : plafonné, quelle que soit la sous-commande, et le chemin
      // choisi suit le budget mémoire du cgroup (mesuré avant de lancer node).
      const fastLimit = heapLimitOf({ BB_FAST_MIN_FREE_MB: "0" }, "tsc", "-b");
      const ecoLimit = heapLimitOf({ BB_FAST_MIN_FREE_MB: "999999" }, "tsc", "-b");
      expect(fastLimit).toBeLessThan(1200);
      expect(ecoLimit, "un budget serré doit partir directement en --jitless").toBeLessThan(
        fastLimit,
      );
      // `vite build` : plafonné…
      expect(heapLimitOf({}, "vite", "build")).toBeLessThan(1200);
      // …mais le serveur de développement (l'aperçu) n'est pas plafonné.
      expect(heapLimitOf({}, "vite", "--version")).toBeGreaterThan(1500);

      // Idempotence : une seconde exécution n'enveloppe pas l'enveloppe.
      execFileSync(process.execPath, [harden], { cwd: tmp });
      expect(readFileSync(join(bin, "tsc"), "utf8")).toBe(tscWrapper);
      expect(readFileSync(join(bin, "vite"), "utf8")).toBe(viteWrapper);

      // Repli : si le chemin rapide est tué par le noyau (137), l'enveloppe
      // REJOUE la même commande en mode économe. Le faux binaire meurt dès que
      // son plafond dépasse 860 Mo — un palier placé entre les plafonds réels
      // (économe 848, rapide 900) : le chemin rapide échoue, le repli passe.
      writeFileSync(
        join(tmp, "node_modules", "typescript", "bin", "tsc"),
        "#!/usr/bin/env node\nconst limit = Math.round(require('v8').getHeapStatistics().heap_size_limit / 1048576);\nconsole.log(limit);\nprocess.exit(limit > 860 ? 137 : 0);\n",
      );
      const attempts = execFileSync(join(bin, "tsc"), ["-b"], {
        cwd: tmp,
        encoding: "utf8",
        env: { ...process.env, BB_FAST_MIN_FREE_MB: "0" },
      })
        .trim()
        .split("\n");
      expect(attempts, "le repli économe doit rejouer la commande").toHaveLength(2);
      expect(Number(attempts[0])).toBeGreaterThan(Number(attempts[1]));

      // `vite build` : son repli est symétrique et inverse — un plafond trop
      // bas est un ABANDON de V8 (134), pas un pic plus bas, donc le repli doit
      // ÉLARGIR le plafond, et seulement après l'échec.
      writeFileSync(
        join(tmp, "node_modules", "vite", "bin", "vite.js"),
        "#!/usr/bin/env node\nconst limit = Math.round(require('v8').getHeapStatistics().heap_size_limit / 1048576);\nconsole.log(limit);\nprocess.exit(limit < 800 ? 134 : 0);\n",
      );
      const viteAttempts = execFileSync(join(bin, "vite"), ["build"], {
        cwd: tmp,
        encoding: "utf8",
      })
        .trim()
        .split("\n");
      expect(viteAttempts, "un abandon de V8 doit élargir le plafond").toHaveLength(2);
      expect(Number(viteAttempts[1])).toBeGreaterThan(Number(viteAttempts[0]));
      // Le serveur de développement (l'aperçu) n'est ni plafonné ni rejoué.
      expect(
        execFileSync(join(bin, "vite"), ["--version"], { cwd: tmp, encoding: "utf8" })
          .trim()
          .split("\n"),
      ).toHaveLength(1);

      // L'enveloppe lance node UNE fois par invocation, avec le plafond en
      // argument de ligne de commande (il l'emporte sur NODE_OPTIONS).
      expect(tscWrapper.match(/node --max-old-space-size=\d+ "\$target" "\$@"/g)).toHaveLength(1);
      // …et elle rapporte le code de sortie : dans le journal de déploiement,
      // « Killed » doit pouvoir être attribué à la bonne étape, et distingué
      // d'un abandon de V8 (134) ou d'un SIGKILL du noyau (137).
      expect(tscWrapper).toMatch(/134\) reason=/);
      expect(tscWrapper).toMatch(/137\) reason=/);
      expect(tscWrapper).toMatch(/\[heap-guard\] tsc/);
      // Le journal doit dire la VRAIE limite du sandbox, pas seulement le
      // plafond demandé : sans cela, « Killed » reste inexplicable.
      expect(tscWrapper).toMatch(/\/sys\/fs\/cgroup\/memory\.peak/);
      expect(tscWrapper).toMatch(/libres \$\{free\} Mo/);
      expect(tscWrapper).toMatch(/\$reason après \$\{elapsed\} s/);

      // `tsc` : si le noyau le tue ou si V8 abandonne, l'enveloppe rejoue la
      // commande en `--jitless` (mesuré : 796 Mo de RSS au lieu de 846 Mo).
      // `vite`, lui, refuse `--jitless` (échec immédiat) : il ne doit donc
      // JAMAIS le recevoir.
      expect(tscWrapper).toMatch(/--jitless --max-semi-space-size=1 --max-old-space-size=\d+/);
      expect(tscWrapper).toContain("nouvelle tentative en mode économe");
      expect(viteWrapper, "vite ne supporte pas --jitless").not.toMatch(/--jitless/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("chaque accès rapide de projet a une icône déclarée (aucun composant `undefined`)", () => {
    // Régression observée : un nouvel accès rapide sans entrée dans
    // `PROJECT_QUICK_ICONS` faisait rendre `<Icon />` avec `Icon ===
    // undefined` → « Element type is invalid … Check the render method of
    // `ProjectCard` », écran blanc sur le tableau de bord.
    // La carte projet vit désormais dans `dashboard-parts.tsx` (extraite de
    // `Dashboard.tsx`, devenu trop volumineux pour les outils d'édition).
    const parts = readFileSync(join(SRC, "pages", "dashboard-parts.tsx"), "utf8");
    const block = parts.match(/const PROJECT_QUICK_ICONS[^=]*=\s*\{([\s\S]*?)\};/);
    expect(block, "PROJECT_QUICK_ICONS introuvable dans dashboard-parts.tsx").toBeTruthy();
    const declared = new Set(
      [...(block as RegExpMatchArray)[1].matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]),
    );
    // Chaque clé effectivement produite par le module d'accès rapides.
    const used = buildProjectQuickActions({ _id: "project-id" }).map((a) => a.key);
    const missing = used.filter((key) => !declared.has(key));
    expect(missing, "accès rapides sans icône dans PROJECT_QUICK_ICONS").toEqual([]);
    expect(declared.size).toBeGreaterThanOrEqual(used.length);
  });
});

describe("bundle client — vendeurs chargés hors bundle", () => {
  /** Retire commentaires de bloc et de ligne (les fichiers vendeurs sont minifiés). */
  function withoutComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  }

  /**
   * Spécificateurs importés par du code (imports statiques ET dynamiques).
   *
   * Les fichiers vendeurs sont minifiés : un test ligne à ligne est impossible,
   * et le motif exige le mot-clé `import` pour ne pas confondre une chaîne de
   * caractères avec un import. Les commentaires sont retirés : le JSDoc
   * d'`OrbitControls.js` contient `from 'three/addons/…'`, qui n'est PAS un
   * import exécuté.
   */
  function importedSpecifiers(code: string): string[] {
    const found = new Set<string>();
    const re = /\bimport\s*(?:\(\s*)?(?:[^;"'`]*?\bfrom\s*)?["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(withoutComments(code)))) found.add(m[1]);
    return [...found];
  }

  /** Paquet auquel appartient un spécificateur (`three/addons/x` → `three`). */
  function packageRoot(specifier: string): string {
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  }

  /** Spécificateurs de NOM DE PAQUET (ceux que la carte d'importation doit résoudre). */
  function bareSpecifiersIn(code: string): string[] {
    return importedSpecifiers(code).filter(
      // Relatif, absolu, `node:` ou URL : jamais résolus par la carte du navigateur.
      (specifier) => !/^[./]/.test(specifier) && !/^[a-z][a-z\d+.-]*:/i.test(specifier),
    );
  }

  it("les vendeurs lourds sont marqués externes par le plugin Vite", () => {
    // Sans ces plugins, `three`, `xlsx`, `jspdf` et `jspdf-autotable` sont
    // parsés par Rollup : mesuré, cela coûte ~325 Mo de pic mémoire au build
    // (1 166 Mo → 843 Mo). Le marquage doit rester associé à la carte
    // d'importation, sinon le navigateur ne pourrait plus résoudre les
    // spécificateurs laissés dans les chunks.
    const config = readFileSync(join(REPO_ROOT, "vite.config.ts"), "utf8");
    expect(config, "plugin d'externalisation absent de vite.config.ts").toMatch(
      /vendorExternals\(\)/,
    );
    expect(config, "injection de la carte d'importation absente").toMatch(
      /vendorImportMapInjector\(\)/,
    );
    // Les entrées de manualChunks devenues sans objet ne doivent pas revenir :
    // un vendeur externalisé n'est plus un module du graphe.
    expect(config, "manualChunks citant un vendeur externalisé").not.toMatch(
      /'(three|xlsx|jspdf)': \['/,
    );

    const resolveId = vendorExternals().resolveId as unknown as (
      source: string,
    ) => { id?: string; external?: boolean } | null;
    for (const specifier of VENDOR_EXTERNAL_SPECIFIERS) {
      expect(resolveId(specifier), specifier).toMatchObject({ id: specifier, external: true });
    }
    expect(resolveId("react")).toBeNull();
    expect(resolveId("three-fake")).toBeNull();
  });

  it("chaque spécificateur d'un paquet externalisé importé par src est déclaré", () => {
    // Garde-fou principal : dès qu'un paquet est sorti du graphe, TOUS ses
    // spécificateurs utilisés dans `src` doivent être marqués externes ET avoir
    // leur entrée dans la carte. Un nouveau spécificateur (ex.
    // `three/addons/…`) laissé dans le graphe serait sinon ré-analysé par
    // Rollup (mémoire perdue) ou laissé tel quel dans le chunk (runtime cassé :
    // « Failed to resolve module specifier »).
    //
    // Les paquets surveillés sont DÉDUITS de la table de correspondance : ce
    // test continue donc de fonctionner quand on ajoute ou retire un vendeur.
    const packages = new Set(VENDOR_MAPPINGS.map((mapping) => packageRoot(mapping.id)));
    const covered = new Set(VENDOR_EXTERNAL_SPECIFIERS);
    const offenders: string[] = [];
    for (const file of clientSourceFiles()) {
      // Ce fichier-ci cite forcément des spécificateurs dans ses commentaires.
      if (isServerOnly(file) || file.endsWith("clientBundleGuards.test.ts")) continue;
      for (const specifier of importSpecifiers(readFileSync(file, "utf8"))) {
        if (!packages.has(packageRoot(specifier))) continue;
        if (!covered.has(specifier)) offenders.push(`${file} → ${specifier}`);
      }
    }
    expect(
      offenders,
      "spécificateurs à ajouter à VENDOR_FILES / VENDOR_MAPPINGS (scripts/vendor-externals-plugin.ts)",
    ).toEqual([]);
  });

  it("chaque import d'un vendeur émis est résolu par un fichier émis ou par la carte", () => {
    // LE test central : hors bundle, plus aucun outil ne résout les imports d'un
    // vendeur — c'est le navigateur qui le fait. Un import relatif sans fichier
    // émis (404) ou un nom de paquet absent de la carte (« Failed to resolve
    // module specifier ») casserait une fonctionnalité en production.
    // C'est ce test qui a révélé la cascade réelle `jspdf` → `fflate` /
    // `fast-png` → `iobuffer` / `pako` + helpers `@babel/runtime`, au lieu de la
    // supposer absente.
    const emitted = new Set(vendorFileContents().map((file) => file.out));
    const map = vendorImportMap("/");
    const unresolved: string[] = [];
    for (const file of vendorFileContents()) {
      for (const specifier of importedSpecifiers(file.content)) {
        if (/^[a-z][a-z\d+.-]*:/i.test(specifier)) continue; // URL (`data:`…)
        if (!specifier.startsWith(".")) {
          if (!(specifier in map)) unresolved.push(`${file.out} → ${specifier} (absent de la carte)`);
          continue;
        }
        // `join` (et non `resolve`) : les chemins émis sont relatifs à `dist`.
        const target = join(dirname(file.out), specifier).split("\\").join("/");
        if (!emitted.has(target)) unresolved.push(`${file.out} → ${specifier} (fichier non émis)`);
      }
    }
    expect(unresolved, "imports de vendeurs non résolus").toEqual([]);
  });

  it("chaque entrée de la carte pointe vers un fichier réellement émis", () => {
    const emitted = new Set(vendorFileContents().map((file) => file.out));
    const map = vendorImportMap("/");
    for (const mapping of VENDOR_MAPPINGS) {
      expect(map[mapping.id], mapping.id).toBeTruthy();
      expect(emitted.has(mapping.to), `${mapping.id} → ${mapping.to} n'est pas émis`).toBe(true);
    }
    for (const specifier of VENDOR_EXTERNAL_SPECIFIERS) {
      expect(specifier in map, specifier).toBe(true);
    }
  });

  it("aucun vendeur émis ne dépend de React (pas de seconde instance)", () => {
    // C'est la condition qui rend l'externalisation sûre : deux instances de
    // React (ou d'un module partagé) provoquent « Invalid hook call » au
    // runtime, exactement ce que `resolve.dedupe` empêche dans le bundle.
    // Un vendeur qui importe React doit donc rester DANS le graphe.
    const reactLike = (specifier: string) =>
      specifier === "react" ||
      specifier === "react-dom" ||
      specifier.startsWith("react/") ||
      specifier.startsWith("react-dom/");
    const offenders: string[] = [];
    for (const file of vendorFileContents()) {
      for (const specifier of bareSpecifiersIn(file.content)) {
        if (reactLike(specifier)) offenders.push(`${file.out} → ${specifier}`);
      }
    }
    expect(offenders, "vendeur externalisé dépendant de React").toEqual([]);
  });

  it("chaque fichier vendeur déclaré existe et three garde sa structure relative", () => {
    for (const asset of VENDOR_FILES) {
      const file = resolvePackageFile(asset.package, asset.file);
      expect(existsSync(file), `${asset.package}/${asset.file}`).toBe(true);
      expect(statSync(file).size, asset.out).toBeGreaterThan(0);
    }
    // `three.module.min.js` importe `./three.core.min.js` en relatif : les deux
    // fichiers doivent être émis côte à côte, sous peine d'un 404 au runtime.
    const three = vendorFileContent("vendor/three/three.module.min.js");
    expect(three, "three.module.min.js non émis").toBeTruthy();
    expect(three).toMatch(/from["']\.\/three\.core\.min\.js["']/);
    expect(vendorFileContent("vendor/three/three.core.min.js")).toBeTruthy();
  });

});
