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
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

    for (const file of sourceFiles(SRC)) {
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

  it("le build de production plafonne le heap V8 pour survivre à la sandbox", () => {
    // Sans plafond, le pic mémoire du bundling atteint ~1,3 Go ; avec les
    // ~750 Mo déjà consommés par le serveur de dev et Convex dans le même
    // cgroup de 2 Go, l'OOM killer termine le build (« Killed » pendant
    // « rendering chunks »). Un plafond de 800 Mo fait collecter V8 plus tôt
    // et ramène le pic sous la limite sans rien changer à la sortie.
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const build = pkg.scripts.build;
    expect(build, "script « build » absent").toBeTruthy();
    expect(build).toMatch(/--max-old-space-size=\d+/);
    // Le script doit continuer à enchaîner exactement tsc puis vite build.
    expect(build).toMatch(/\btsc -b\b/);
    expect(build).toMatch(/\bvite build\b/);
  });
});
