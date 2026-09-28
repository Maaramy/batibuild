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
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildProjectQuickActions } from "./projectQuickActions";

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
