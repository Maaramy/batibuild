// ============================================================================
// RAPPORT STOCKAGE (admin) — taille de la base, du storage et fichiers orphelins
//
// Convex n'expose aucune API « taille de la base » au runtime : le chiffre
// officiel est dans le dashboard (Settings → Usage). Cet écran fournit donc
// des mesures RÉELLES calculées à la demande, à partir des fonctions Convex :
//
//   • Base de données  : nombre de documents + octets sérialisés (JSON non
//     compressé) pour chaque table du schéma (`Object.keys(schema.tables)`).
//   • Storage          : table système `_storage` (`ctx.db.system.query`) →
//     nombre de fichiers, octets réels, type MIME et doublons par `sha256`.
//   • Fichiers orphelins : fichiers du storage qu'aucun document ne référence
//     (recherche par identifiant brut ET par URL `/api/storage/<id>`).
//
// Le calcul est volontairement déclenché par une action (pas une query
// réactive) : il parcourt toutes les tables, ce qui serait trop coûteux à
// recalculer à chaque écriture. Voir `src/components/admin/StorageReportAdmin.tsx`.
// ============================================================================

import { action, internalAction, internalQuery, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import schema from "./schema";

// ── Utilitaires ─────────────────────────────────────────────────────────────

type TextEncoderLike = { encode(input: string): { length: number } };
let cachedEncoder: TextEncoderLike | null | undefined;

/** Longueur en octets UTF-8 (repli sur `length` si `TextEncoder` est absent). */
export function utf8ByteLength(value: string): number {
  if (cachedEncoder === undefined) {
    const Factory = (globalThis as { TextEncoder?: new () => TextEncoderLike }).TextEncoder;
    cachedEncoder = Factory ? new Factory() : null;
  }
  return cachedEncoder ? cachedEncoder.encode(value).length : value.length;
}

/** Regex des URL de fichier Convex : `…/api/storage/<id>` et legacy `/files/<id>`. */
const STORAGE_URL_RE = /\/(?:api\/storage|files)\/([A-Za-z0-9_]+)/;

/** Profondeur maximale du parcours récursif (garde-fou sur les `v.any()`). */
const MAX_WALK_DEPTH = 25;

/**
 * Parcourt récursivement une valeur de document et ajoute à `out` tous les
 * identifiants de storage référencés : identifiant brut (`v.id("_storage")`)
 * ou identifiant extrait d'une URL stockée.
 */
export function collectStorageRefs(
  value: unknown,
  storageIds: Set<string>,
  out: Set<string>,
  depth = 0,
): void {
  if (value === null || value === undefined || depth > MAX_WALK_DEPTH) return;

  if (typeof value === "string") {
    if (storageIds.has(value)) out.add(value);
    const match = value.match(STORAGE_URL_RE);
    if (match && storageIds.has(match[1])) out.add(match[1]);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStorageRefs(item, storageIds, out, depth + 1);
    return;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStorageRefs(item, storageIds, out, depth + 1);
    }
  }
}

// ── Types du rapport ────────────────────────────────────────────────────────

export interface StorageFileInfo {
  storageId: string;
  size: number;
  contentType: string | null;
  sha256: string;
}

export interface TableStats {
  table: string;
  count: number;
  bytes: number;
}

export interface StorageSummary {
  files: number;
  bytes: number;
  referencedFiles: number;
  referencedBytes: number;
  orphanedFiles: number;
  orphanedBytes: number;
  orphans: StorageFileInfo[];
  duplicates: { sha256: string; count: number; size: number; wastedBytes: number }[];
  duplicateWastedBytes: number;
}

/** Croise les fichiers du storage avec les identifiants référencés. */
export function summarizeStorage(
  files: StorageFileInfo[],
  referencedIds: Set<string>,
): StorageSummary {
  let bytes = 0;
  let referencedFiles = 0;
  let referencedBytes = 0;
  const orphans: StorageFileInfo[] = [];
  const bySha = new Map<string, StorageFileInfo[]>();

  for (const file of files) {
    bytes += file.size;
    if (referencedIds.has(file.storageId)) {
      referencedFiles++;
      referencedBytes += file.size;
    } else {
      orphans.push(file);
    }
    const group = bySha.get(file.sha256);
    if (group) group.push(file);
    else bySha.set(file.sha256, [file]);
  }

  const duplicates: StorageSummary["duplicates"] = [];
  let duplicateWastedBytes = 0;
  for (const [sha256, group] of bySha) {
    if (group.length < 2) continue;
    const wastedBytes = group[0].size * (group.length - 1);
    duplicateWastedBytes += wastedBytes;
    duplicates.push({ sha256, count: group.length, size: group[0].size, wastedBytes });
  }
  duplicates.sort((a, b) => b.wastedBytes - a.wastedBytes);
  orphans.sort((a, b) => b.size - a.size);

  return {
    files: files.length,
    bytes,
    referencedFiles,
    referencedBytes,
    orphanedFiles: orphans.length,
    orphanedBytes: bytes - referencedBytes,
    orphans,
    duplicates,
    duplicateWastedBytes,
  };
}

// ── Fonctions internes ──────────────────────────────────────────────────────

/** Toutes les tables du schéma (auth incluse) triées par nom. */
const TABLE_NAMES: string[] = Object.keys(schema.tables).sort();

/** Repli minimal pour interroger une table dont le nom n'est connu qu'au runtime. */
type DynamicTableQuery = (name: string) => {
  collect: () => Promise<Record<string, unknown>[]>;
};

/** Garde admin (action → identity propagée via `runQuery`). */
export const _requireAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || (user.role !== "admin" && user.role !== "moderator")) {
      throw new Error("Unauthorized: Admin access required");
    }
    return { adminName: user.name ?? "" };
  },
});

/** Liste exhaustive des fichiers du storage (table système `_storage`). */
export const _listStorageFiles = internalQuery({
  args: {},
  handler: async (ctx): Promise<StorageFileInfo[]> => {
    const files = await ctx.db.system.query("_storage").collect();
    return files.map((file) => ({
      storageId: file._id as string,
      size: file.size,
      contentType: file.contentType ?? null,
      sha256: file.sha256,
    }));
  },
});

/**
 * Mesure une table : nombre de documents, octets sérialisés (JSON) et
 * identifiants de storage référencés par au moins un document.
 */
export const _inspectTable = internalQuery({
  args: { table: v.string(), storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    let docs: Record<string, unknown>[];
    try {
      docs = await (ctx.db.query as unknown as DynamicTableQuery)(args.table).collect();
    } catch {
      // Table absente du déploiement (schéma local plus récent) : ignorée.
      return { table: args.table, count: 0, bytes: 0, referenced: [], missing: true };
    }

    const storageIds = new Set(args.storageIds);
    const referenced = new Set<string>();
    let bytes = 0;

    for (const doc of docs) {
      bytes += utf8ByteLength(JSON.stringify(doc));
      collectStorageRefs(doc, storageIds, referenced);
    }

    return {
      table: args.table,
      count: docs.length,
      bytes,
      referenced: Array.from(referenced),
      missing: false,
    };
  },
});

// ── Actions (publique admin + interne) ──────────────────────────────────────

const MAX_ORPHAN_ITEMS = 100;

/**
 * Rapport complet : taille estimée de la base (documents + octets JSON),
 * fichiers réellement présents dans le storage et fichiers orphelins.
 */
async function buildStorageReport(ctx: ActionCtx) {
  const files = await ctx.runQuery(internal.storageReport._listStorageFiles, {});
  const storageIds = files.map((file) => file.storageId);

  const tables: TableStats[] = [];
  const referenced = new Set<string>();
  let documents = 0;
  let estimatedBytes = 0;

  for (const table of TABLE_NAMES) {
    const result = await ctx.runQuery(internal.storageReport._inspectTable, {
      table,
      storageIds,
    });
    documents += result.count;
    estimatedBytes += result.bytes;
    for (const id of result.referenced) referenced.add(id);
    if (result.count > 0) tables.push({ table, count: result.count, bytes: result.bytes });
  }

  tables.sort((a, b) => b.bytes - a.bytes);

  const storage = summarizeStorage(files, referenced);

  return {
    generatedAt: Date.now(),
    schemaTableCount: TABLE_NAMES.length,
    database: {
      documents,
      estimatedBytes,
      tables,
    },
    storage: {
      ...storage,
      orphans: storage.orphans.slice(0, MAX_ORPHAN_ITEMS),
    },
  };
}

/** Version interne (CLI / dashboard), sans garde d'identité — usage opérateur. */
export const _getStorageReport = internalAction({
  args: {},
  handler: async (ctx) => buildStorageReport(ctx),
});

/** Version publique exposée à l'écran admin (admin / modérateur uniquement). */
export const getStorageReport = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runQuery(internal.storageReport._requireAdmin, {});
    return buildStorageReport(ctx);
  },
});
