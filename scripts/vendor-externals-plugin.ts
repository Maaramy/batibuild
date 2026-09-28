/**
 * ============================================================================
 * CHARGEMENT DES GROS VENDEURS HORS DU GRAPHE DE BUNDLING (MÉMOIRE DE BUILD)
 * ----------------------------------------------------------------------------
 * Le build de production est lancé par la plateforme avec la commande du gabarit
 * Vite : `tsc -b && vite build`. Mesuré dans la sandbox de build, le pic mémoire
 * de `vite build` est dominé par la PHASE DE TRANSFORMATION (construction du
 * graphe de modules par Rollup), pas par la minification : ~970 Mo sur les
 * 1 166 Mo de pic total. Ce coût suit les OCTETS DE SOURCE PARSÉS, et les
 * fichiers MINIFIÉS coûtent le plus cher par kilo-octet : un fichier minifié
 * contient autant de nœuds d'AST qu'un fichier lisible, mais dans beaucoup moins
 * d'octets (mesuré : ~240 Mo de pic par méga-octet de source pour `xlsx`).
 *
 * Ces deux paquets sont des FEUILLES du graphe applicatif : ils ne dépendent ni
 * de React ni d'un autre paquet de l'application, ce qui autorise un chargement
 * hors bundle sans risque de seconde instance (« Invalid hook call »).
 * Mesures sur cette machine, build réussi à chaque fois :
 *
 *   · référence (avant ce plugin) .................................. 1 166 Mo
 *   · `three` (1 409 + 635 ko : vue de plan 3D) ...................... −207 Mo
 *   · `xlsx` (875 ko : export/import Excel de l'administration) ...... (inclus)
 *   · `rollupOptions.maxParallelFileOps: 4` (vite.config.ts) .......... −30 Mo
 *   ⇒ pic final mesuré : **929 Mo** (−20 %), build en ~17 s
 *
 * Fonctionnement (en build uniquement — le serveur de développement est intact) :
 *
 *   1. les spécificateurs listés dans VENDOR_MAPPINGS sont marqués EXTERNES :
 *      Rollup conserve `import … from "three"` dans le chunk au lieu de
 *      résoudre, charger et analyser le paquet — c'est là que la mémoire est
 *      gagnée ;
 *   2. les fichiers de VENDOR_FILES sont recopiés tels quels dans `dist/vendor/`
 *      (assets non hachés, servis depuis la racine) ;
 *   3. une carte d'importation (« import map ») est injectée dans l'index.html
 *      du build : le navigateur résout ces spécificateurs vers ces fichiers au
 *      moment où les pages concernées les demandent — donc EN DIFFÉRÉ, jamais
 *      au premier affichage.
 *
 * Les versions minifiées officielles sont utilisées telles quelles
 * (`three/build/three.module.min.js` + `three.core.min.js`) : aucune
 * minification supplémentaire n'est nécessaire, donc aucun processus build tiers
 * n'est lancé (ce qui ajouterait, lui, de la mémoire).
 *
 * POURQUOI PAS D'AUTRES VENDEURS ? Parce qu'un vendeur hors bundle ne peut plus
 * compter sur Rollup pour résoudre SES propres imports : c'est le navigateur qui
 * les résout via la carte, et il exige des URL complètes (avec extension).
 * `jspdf` a été essayé (−118 Mo supplémentaires) mais sa cascade de dépendances
 * (`fflate`, `fast-png` → `iobuffer` + `pako`, plus deux helpers
 * `@babel/runtime`) utilise des imports RELATIFS SANS EXTENSION — convention de
 * bundler, invalide dans un navigateur. L'externaliser aurait donc exigé de
 * réécrire du code tiers. `recharts` et `framer-motion` dépendent de React :
 * deux instances casseraient les hooks au runtime (voir `resolve.dedupe` dans
 * vite.config.ts). Le gain restant ne justifiait pas ces risques, le build
 * disposant déjà de ~300 Mo de marge.
 *
 * GARDE-FOUS (voir `src/lib/clientBundleGuards.test.ts`) :
 *   · tout nouveau spécificateur `three*` / `xlsx` importé dans `src` et absent
 *     de la carte fait échouer les tests ;
 *   · tout import (nom de paquet OU relatif) présent dans un fichier vendeur
 *     émis doit être résolu par un autre fichier émis ou par la carte ;
 *   · aucun vendeur émis ne doit importer React ;
 *   · chaque entrée de la carte doit pointer vers un fichier réellement émis ;
 *   · si la carte ne peut pas être injectée dans l'HTML du build, le build
 *     ÉCHOUE (`this.error`) au lieu de livrer un index.html irrésoluble.
 * ============================================================================
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ResolvedConfig } from "vite";

const requireFromHere = createRequire(import.meta.url);

/** Répertoire de sortie commun à tous les vendeurs chargés hors bundle. */
export const VENDOR_ASSET_DIR = "vendor";

/** Marqueur du `plugin` (identifiable dans les journaux de build). */
export const VENDOR_PLUGIN_NAME = "budgetbati-vendor-externals";

/** Fichier vendeur recopié tel quel dans `dist/vendor/…`. */
export type VendorFile = {
  /** Chemin d'émission dans `dist`. */
  out: string;
  /** Fichier source dans le paquet npm. */
  package: string;
  file: string;
};

/** Entrée de la carte d'importation : spécificateur → fichier émis. */
export type VendorMapping = {
  /** Spécificateur exact tel qu'écrit dans le code (`import … from "<id>"`). */
  id: string;
  /** Chemin, dans `dist`, du fichier émis qui répond à ce spécificateur. */
  to: string;
};

/**
 * Fichiers vendeurs recopiés dans `dist`.
 *
 * ATTENTION : n'ajouter ici que des paquets FEUILLES, SANS API CJS et SANS
 * dépendance à React ni à un autre paquet de l'application — voir l'en-tête.
 */
export const VENDOR_FILES: VendorFile[] = [
  // ---- three : vue de plan 3D, chargée au clic sur « 3D » ------------------
  {
    out: `${VENDOR_ASSET_DIR}/three/three.module.min.js`,
    package: "three",
    file: "build/three.module.min.js",
  },
  {
    // Importé en relatif par three.module.min.js : les deux fichiers doivent
    // rester côte à côte dans dist.
    out: `${VENDOR_ASSET_DIR}/three/three.core.min.js`,
    package: "three",
    file: "build/three.core.min.js",
  },
  {
    out: `${VENDOR_ASSET_DIR}/three/OrbitControls.js`,
    package: "three",
    file: "examples/jsm/controls/OrbitControls.js",
  },
  {
    out: `${VENDOR_ASSET_DIR}/three/BufferGeometryUtils.js`,
    package: "three",
    file: "examples/jsm/utils/BufferGeometryUtils.js",
  },
  // ---- xlsx : export / import Excel de l'administration -------------------
  {
    out: `${VENDOR_ASSET_DIR}/xlsx/xlsx.mjs`,
    package: "xlsx",
    file: "xlsx.mjs",
  },
];

/**
 * Carte d'importation. Les cibles doivent être des fichiers RÉELLEMENT émis (le
 * test « chaque entrée de la carte pointe vers un fichier réellement émis » le
 * vérifie), et les imports relatifs internes d'un vendeur doivent trouver leurs
 * voisins dans `dist`.
 */
export const VENDOR_MAPPINGS: VendorMapping[] = [
  { id: "three", to: `${VENDOR_ASSET_DIR}/three/three.module.min.js` },
  {
    id: "three/examples/jsm/controls/OrbitControls.js",
    to: `${VENDOR_ASSET_DIR}/three/OrbitControls.js`,
  },
  {
    id: "three/examples/jsm/utils/BufferGeometryUtils.js",
    to: `${VENDOR_ASSET_DIR}/three/BufferGeometryUtils.js`,
  },
  { id: "xlsx", to: `${VENDOR_ASSET_DIR}/xlsx/xlsx.mjs` },
];

/** Spécificateurs que le plugin marque EXTERNES (donc sortis du graphe). */
export const VENDOR_EXTERNAL_SPECIFIERS: string[] = VENDOR_MAPPINGS.map(
  (mapping) => mapping.id,
);

/**
 * Points de départ pour retrouver un paquet installé :
 *   · le répertoire de son point d'entrée résolu (`three` →
 *     `node_modules/three/build`), quand le paquet est résoluble ;
 *   · chaque `node_modules` en remontant depuis CE fichier — nécessaire pour les
 *     paquets dont la carte `exports` n'expose pas `.` (ex. `@babel/runtime`
 *     répond ERR_PACKAGE_PATH_NOT_EXPORTED), et robuste si Vite évalue la
 *     configuration depuis un fichier temporaire.
 * Le nombre de remontées est volontairement borné pour ne jamais aller chercher
 * un homonyme hors du paquet.
 */
function packageSearchStarts(packageName: string): string[] {
  const starts: string[] = [];
  try {
    starts.push(path.dirname(requireFromHere.resolve(packageName)));
  } catch {
    /* carte `exports` sans « . » : on passe par node_modules */
  }
  let directory = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    starts.push(path.join(directory, "node_modules", packageName));
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return starts;
}

/**
 * Résout un chemin placé dans un paquet npm installé, en remontant depuis chaque
 * point de départ (voir `packageSearchStarts`).
 */
export function resolvePackageFile(packageName: string, file: string): string {
  for (const start of packageSearchStarts(packageName)) {
    let directory = start;
    for (let depth = 0; depth < 3; depth += 1) {
      const candidate = path.join(directory, file);
      if (existsSync(candidate)) return candidate;
      directory = path.dirname(directory);
    }
  }
  throw new Error(
    `[${VENDOR_PLUGIN_NAME}] fichier introuvable dans le paquet ${packageName} : ${file}`,
  );
}

/** Tous les fichiers vendeurs émis, en mémoire (contenu inclus). */
export function vendorFileContents(): { out: string; content: string }[] {
  return VENDOR_FILES.map((file) => ({
    out: file.out,
    content: readFileSync(resolvePackageFile(file.package, file.file), "utf8"),
  }));
}

/**
 * Contenu d'un fichier vendeur émis, pour les tests de cohérence (résolution des
 * imports). Renvoie `undefined` si le fichier n'est pas émis.
 */
export function vendorFileContent(out: string): string | undefined {
  return vendorFileContents().find((file) => file.out === out)?.content;
}

/** URL absolue d'un fichier émis, pour la `base` configurée (`/` par défaut). */
export function vendorAssetUrl(base: string, out: string): string {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${out.replace(/^\/+/, "")}`;
}

/** Carte d'importation injectée dans l'index.html du build. */
export function vendorImportMap(base: string): Record<string, string> {
  const imports: Record<string, string> = {};
  for (const mapping of VENDOR_MAPPINGS) {
    imports[mapping.id] = vendorAssetUrl(base, mapping.to);
  }
  return imports;
}

/**
 * Balise `importmap` finale. JSON compact : la carte reste courte pour ne pas
 * repousser la déclaration `charset` au-delà des 1 024 premiers octets du
 * document (règle du parseur HTML).
 */
export function vendorImportMapTag(base: string): string {
  const payload = JSON.stringify({ imports: vendorImportMap(base) });
  return `<script type="importmap">${payload}</script>`;
}

/**
 * Plugin 1/2 — marque les vendeurs comme EXTERNES et émet leurs fichiers.
 *
 * `enforce: "pre"` est INDISPENSABLE : sans lui, `vite:resolve` (groupe normal)
 * résout `three` vers son fichier réel avant ce plugin, et `resolveId` n'est
 * alors jamais appelé pour ce spécificateur — le paquet réintègre le graphe et
 * la mémoire gagnée est nulle (constaté pendant la mesure).
 */
export function vendorExternals(): Plugin {
  return {
    name: VENDOR_PLUGIN_NAME,
    apply: "build",
    enforce: "pre",

    resolveId(source) {
      if (VENDOR_EXTERNAL_SPECIFIERS.includes(source)) {
        return { id: source, external: true };
      }
      return null;
    },

    buildStart() {
      // Émis AVANT le bundle : ces assets ne passent jamais par l'analyse de
      // Rollup (c'est tout l'intérêt), ils sont simplement copiés dans dist.
      for (const file of vendorFileContents()) {
        this.emitFile({ type: "asset", fileName: file.out, source: file.content });
      }
    },
  };
}

/**
 * Plugin 2/2 — injecte la carte d'importation dans l'index.html du build.
 *
 * `enforce: "post"` : la réécriture doit passer APRÈS celle des autres plugins
 * (dont celui de la plateforme) et placer la carte juste après `<head>`, donc
 * avant tout script `type="module"` — une carte d'importation déclarée après un
 * script de module est ignorée par le navigateur.
 */
export function vendorImportMapInjector(): Plugin {
  let config: ResolvedConfig | null = null;

  return {
    name: `${VENDOR_PLUGIN_NAME}-import-map`,
    apply: "build",
    enforce: "post",

    configResolved(resolved) {
      config = resolved;
    },

    generateBundle(_options, bundle) {
      const base = config?.base ?? "/";
      const html = Object.values(bundle).find(
        (output) => output.type === "asset" && output.fileName.endsWith("index.html"),
      );
      if (!html || html.type !== "asset") {
        this.error(
          `[${VENDOR_PLUGIN_NAME}] index.html introuvable dans le bundle : carte d'importation non injectée.`,
        );
        return;
      }
      const source = typeof html.source === "string" ? html.source : html.source.toString();
      if (!/<head[^>]*>/i.test(source)) {
        this.error(
          `[${VENDOR_PLUGIN_NAME}] balise <head> introuvable dans index.html : impossible d'injecter la carte d'importation avant les scripts de module.`,
        );
        return;
      }
      if (source.includes('type="importmap"')) return; // déjà injectée
      html.source = source.replace(
        /<head([^>]*)>/i,
        (match) => `${match}\n${vendorImportMapTag(base)}`,
      );
    },
  };
}
