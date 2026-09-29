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
//   • Doublons exacts : fichiers partageant la même empreinte `sha256`.
//
// Le même calcul sert à la SUPPRESSION réelle des orphelins
// (`deleteOrphanedStorageFiles`) et des copies dupliquées
// (`deleteDuplicateStorageFiles`, un exemplaire conservé par empreinte) :
// chaque lot est supprimé dans une mutation unique qui relit les références et
// supprime les fichiers dans la même transaction, afin de ne jamais toucher un
// fichier référencé.
//
// Le calcul est volontairement déclenché par une action (pas une query
// réactive) : il parcourt toutes les tables, ce qui serait trop coûteux à
// recalculer à chaque écriture. Voir `src/components/admin/StorageReportAdmin.tsx`.
// ============================================================================

import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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
 * Âge minimal d'un fichier avant suppression : un fichier vient d'être envoyé
 * au storage puis référencé par une mutation séparée, donc un fichier très
 * récent peut paraître orphelin (ou dupliqué) sans l'être encore. Une heure de
 * marge écarte ce risque d'upload en cours.
 */
const MIN_ORPHAN_AGE_MS = 60 * 60 * 1000;

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
  /** Horodatage de création du fichier (`_creationTime` de `_storage`). */
  createdAt: number;
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
  /** Copies dupliquées réellement supprimables (un exemplaire conservé par empreinte). */
  duplicateRemovals: {
    files: number;
    bytes: number;
    groups: number;
    recentSkipped: number;
  };
}

/** Métadonnées d'un fichier de la table système `_storage`. */
type SystemStorageFile = {
  _id: string;
  _creationTime: number;
  size: number;
  contentType?: string | null;
  sha256: string;
};

/** Normalise une ligne de `_storage` pour le rapport. */
export function toStorageFileInfo(file: SystemStorageFile): StorageFileInfo {
  return {
    storageId: file._id,
    size: file.size,
    contentType: file.contentType ?? null,
    sha256: file.sha256,
    createdAt: file._creationTime,
  };
}

/** Orphelins triés du plus lourd au plus léger (ordre de suppression). */
export function selectOrphans(
  files: StorageFileInfo[],
  referencedIds: Set<string>,
): StorageFileInfo[] {
  return files
    .filter((file) => !referencedIds.has(file.storageId))
    .sort((a, b) => b.size - a.size);
}

/** Deux fichiers d'une même empreinte : le plus ancien d'abord (départage stable). */
function byOldest(a: StorageFileInfo, b: StorageFileInfo): number {
  return a.createdAt - b.createdAt || a.storageId.localeCompare(b.storageId);
}

export interface DuplicateRemovalPlan {
  /** Groupes d'empreintes partagées par au moins deux fichiers. */
  groups: number;
  /** Fichiers appartenant à un groupe dupliqué. */
  groupedFiles: number;
  /** Copies supprimables, du plus lourd au plus léger. */
  removals: StorageFileInfo[];
  /** Copies ignorées car déposées depuis moins d'une heure (`MIN_ORPHAN_AGE_MS`). */
  recentSkipped: number;
  /** Groupes où un exemplaire référencé a dû être conservé. */
  groupsWithKeptReference: number;
}

/**
 * Détermine, pour chaque empreinte `sha256` partagée par plusieurs fichiers,
 * les copies à supprimer en conservant un seul exemplaire :
 *
 *   • si une copie est référencée par un document, c'est elle qui est
 *     conservée — supprimer une copie référencée casserait ce document ;
 *   • sinon, l'exemplaire le plus ancien est conservé ;
 *   • les copies déposées depuis moins d'une heure ne sont jamais supprimées.
 */
export function planDuplicateRemovals(
  files: StorageFileInfo[],
  referencedIds: Set<string>,
  now: number,
): DuplicateRemovalPlan {
  const bySha = new Map<string, StorageFileInfo[]>();
  for (const file of files) {
    const group = bySha.get(file.sha256);
    if (group) group.push(file);
    else bySha.set(file.sha256, [file]);
  }

  const cutoff = now - MIN_ORPHAN_AGE_MS;
  const removals: StorageFileInfo[] = [];
  let groups = 0;
  let groupedFiles = 0;
  let recentSkipped = 0;
  let groupsWithKeptReference = 0;

  for (const group of bySha.values()) {
    if (group.length < 2) continue;
    groups++;
    groupedFiles += group.length;

    const ordered = [...group].sort(byOldest);
    const referencedInGroup = ordered.filter((file) => referencedIds.has(file.storageId));
    if (referencedInGroup.length > 0) groupsWithKeptReference++;
    const keeper = referencedInGroup[0] ?? ordered[0];

    for (const file of ordered) {
      if (file.storageId === keeper.storageId) continue;
      // Un fichier référencé n'est jamais supprimé, quelle que soit l'empreinte.
      if (referencedIds.has(file.storageId)) continue;
      if (file.createdAt > cutoff) {
        recentSkipped++;
        continue;
      }
      removals.push(file);
    }
  }

  removals.sort((a, b) => b.size - a.size);
  return { groups, groupedFiles, removals, recentSkipped, groupsWithKeptReference };
}

/**
 * Sépare les orphelins supprimables de ceux trop récents (upload peut-être
 * pas encore référencé) : voir `MIN_ORPHAN_AGE_MS`.
 */
export function splitOrphansByAge(
  orphans: StorageFileInfo[],
  now: number,
): { deletable: StorageFileInfo[]; recent: StorageFileInfo[] } {
  const cutoff = now - MIN_ORPHAN_AGE_MS;
  return {
    deletable: orphans.filter((file) => file.createdAt <= cutoff),
    recent: orphans.filter((file) => file.createdAt > cutoff),
  };
}

/** Croise les fichiers du storage avec les identifiants référencés. */
export function summarizeStorage(
  files: StorageFileInfo[],
  referencedIds: Set<string>,
  now = Date.now(),
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
  // Orphelins du plus lourd au plus léger (déjà collectés ci-dessus).
  orphans.sort((a, b) => b.size - a.size);

  const removalPlan = planDuplicateRemovals(files, referencedIds, now);

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
    duplicateRemovals: {
      files: removalPlan.removals.length,
      bytes: removalPlan.removals.reduce((sum, file) => sum + file.size, 0),
      groups: removalPlan.groups,
      recentSkipped: removalPlan.recentSkipped,
    },
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
    return { adminId: user._id, adminName: user.name ?? "" };
  },
});

/** Liste exhaustive des fichiers du storage (table système `_storage`). */
export const _listStorageFiles = internalQuery({
  args: {},
  handler: async (ctx): Promise<StorageFileInfo[]> => {
    const files = await ctx.db.system.query("_storage").collect();
    return files.map((file) => toStorageFileInfo(file as unknown as SystemStorageFile));
  },
});

/** Lecteur minimal de table, pour parcourir les tables dont le nom est dynamique. */
type TableWalkCtx = { query: DynamicTableQuery };

/**
 * Ensemble des identifiants de storage référencés par au moins un document
 * d'une table du schéma. Lecture seule : utilisable depuis une mutation
 * (snapshot transactionnel) comme depuis l'action de rapport.
 */
export async function collectReferencedStorageIds(
  ctx: TableWalkCtx,
  storageIds: string[],
): Promise<Set<string>> {
  const idSet = new Set(storageIds);
  const referenced = new Set<string>();

  for (const table of TABLE_NAMES) {
    let docs: Record<string, unknown>[];
    try {
      docs = await ctx.query(table).collect();
    } catch {
      // Table absente du déploiement (schéma local plus récent) : ignorée.
      continue;
    }
    for (const doc of docs) collectStorageRefs(doc, idSet, referenced);
  }

  return referenced;
}

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

/** Nombre de fichiers supprimés par transaction (limite de mutation Convex). */
const DELETE_BATCH_SIZE = 25;

/** Nombre maximal de lots par appel d'action (garde-fou anti-boucle). */
const MAX_DELETE_ROUNDS = 20;

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

// ── Suppression réelle de fichiers du storage (orphelins / doublons) ────────

/** Fichiers du storage + identifiants référencés, lus dans une même transaction. */
async function loadStorageState(ctx: MutationCtx) {
  const stored = await ctx.db.system.query("_storage").collect();
  const files = stored.map((file) => toStorageFileInfo(file as unknown as SystemStorageFile));
  const referenced = await collectReferencedStorageIds(
    ctx.db as unknown as TableWalkCtx,
    files.map((file) => file.storageId),
  );
  return { files, referenced };
}

/** Supprime un lot de fichiers ; un échec isolé n'interrompt pas le reste. */
async function deleteStorageBatch(ctx: MutationCtx, batch: StorageFileInfo[]) {
  let deletedFiles = 0;
  let deletedBytes = 0;
  const failedIds: string[] = [];

  for (const file of batch) {
    try {
      await ctx.storage.delete(file.storageId as Id<"_storage">);
      deletedFiles++;
      deletedBytes += file.size;
    } catch {
      // Fichier déjà supprimé ou identifiant invalide : on continue.
      failedIds.push(file.storageId);
    }
  }

  return { deletedFiles, deletedBytes, failedIds };
}

/** Journalise une suppression dans `adminLogs` (jamais bloquant). */
async function logStorageDeletion(
  ctx: MutationCtx,
  args: {
    adminId: Id<"users">;
    adminName?: string;
    action: "storage_orphan_delete" | "storage_duplicate_delete";
    details: string;
  },
) {
  try {
    await ctx.db.insert("adminLogs", {
      adminId: args.adminId,
      adminName: args.adminName,
      action: args.action,
      details: args.details,
      createdAt: Date.now(),
    });
  } catch {
    /* journalisation optionnelle */
  }
}

/**
 * Supprime RÉELLEMENT un lot de fichiers orphelins du storage.
 *
 * Les références sont recalculées dans la même transaction que la
 * suppression : un fichier référencé au moment du commit ne peut donc pas
 * être supprimé. Chaque lot est journalisé dans `adminLogs`.
 */
export const _deleteOrphanedStorageFiles = internalMutation({
  args: {
    adminId: v.id("users"),
    adminName: v.optional(v.string()),
    maxFiles: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { files, referenced } = await loadStorageState(ctx);

    const orphans = selectOrphans(files, referenced);
    const { deletable, recent } = splitOrphansByAge(orphans, Date.now());
    const batch = deletable.slice(0, Math.max(1, args.maxFiles ?? DELETE_BATCH_SIZE));
    const { deletedFiles, deletedBytes, failedIds } = await deleteStorageBatch(ctx, batch);

    if (batch.length > 0) {
      await logStorageDeletion(ctx, {
        adminId: args.adminId,
        adminName: args.adminName,
        action: "storage_orphan_delete",
        details: `Suppression de ${deletedFiles} fichier(s) orphelin(s) du stockage — ${deletedBytes} octet(s) libéré(s)${
          failedIds.length > 0 ? ` · ${failedIds.length} échec(s)` : ""
        }`,
      });
    }

    return {
      deletedFiles,
      deletedBytes,
      failedFiles: failedIds.length,
      processedFiles: batch.length,
      recentFiles: recent.length,
      remainingFiles: Math.max(0, deletable.length - batch.length),
      totalOrphanFiles: orphans.length,
      totalOrphanBytes: orphans.reduce((sum, file) => sum + file.size, 0),
    };
  },
});

/**
 * Supprime RÉELLEMENT un lot de copies dupliquées : un seul exemplaire est
 * conservé par empreinte `sha256` (une copie référencée est toujours
 * conservée). Voir `planDuplicateRemovals`.
 */
export const _deleteDuplicateStorageFiles = internalMutation({
  args: {
    adminId: v.id("users"),
    adminName: v.optional(v.string()),
    maxFiles: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { files, referenced } = await loadStorageState(ctx);

    const plan = planDuplicateRemovals(files, referenced, Date.now());
    const batch = plan.removals.slice(0, Math.max(1, args.maxFiles ?? DELETE_BATCH_SIZE));
    const { deletedFiles, deletedBytes, failedIds } = await deleteStorageBatch(ctx, batch);

    if (batch.length > 0) {
      await logStorageDeletion(ctx, {
        adminId: args.adminId,
        adminName: args.adminName,
        action: "storage_duplicate_delete",
        details: `Suppression de ${deletedFiles} copie(s) dupliquée(s) du stockage (${plan.groups} empreinte(s) concernée(s), un exemplaire conservé) — ${deletedBytes} octet(s) libéré(s)${
          failedIds.length > 0 ? ` · ${failedIds.length} échec(s)` : ""
        }`,
      });
    }

    return {
      deletedFiles,
      deletedBytes,
      failedFiles: failedIds.length,
      processedFiles: batch.length,
      recentFiles: plan.recentSkipped,
      remainingFiles: Math.max(0, plan.removals.length - batch.length),
      duplicateGroups: plan.groups,
      groupedFiles: plan.groupedFiles,
      totalDuplicateFiles: plan.removals.length,
      totalDuplicateBytes: plan.removals.reduce((sum, file) => sum + file.size, 0),
    };
  },
});

/**
 * Action admin : supprime tous les fichiers orphelins du storage, lot par lot,
 * puis renvoie le bilan. Réservée aux administrateurs et modérateurs ; chaque
 * lot est journalisé dans `adminLogs`.
 */
export const deleteOrphanedStorageFiles = action({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.runQuery(internal.storageReport._requireAdmin, {});

    let deletedFiles = 0;
    let deletedBytes = 0;
    let failedFiles = 0;
    let remainingFiles = 0;
    let totalOrphanFiles = 0;
    let totalOrphanBytes = 0;
    let recentFiles = 0;
    let rounds = 0;

    for (let i = 0; i < MAX_DELETE_ROUNDS; i++) {
      const result = await ctx.runMutation(internal.storageReport._deleteOrphanedStorageFiles, {
        adminId: admin.adminId,
        adminName: admin.adminName || undefined,
        maxFiles: DELETE_BATCH_SIZE,
      });
      rounds++;
      deletedFiles += result.deletedFiles;
      deletedBytes += result.deletedBytes;
      failedFiles += result.failedFiles;
      remainingFiles = result.remainingFiles;
      totalOrphanFiles = result.totalOrphanFiles;
      totalOrphanBytes = result.totalOrphanBytes;
      recentFiles = result.recentFiles;

      // Plus rien à supprimer, ou lot entier en échec (on évite la boucle infinie).
      if (result.remainingFiles === 0 || result.deletedFiles === 0) break;
    }

    return {
      deletedFiles,
      deletedBytes,
      failedFiles,
      remainingFiles,
      recentFiles,
      totalOrphanFiles,
      totalOrphanBytes,
      rounds,
      deletedAt: Date.now(),
    };
  },
});

/**
 * Action admin : supprime les copies dupliquées en conservant un exemplaire par
 * empreinte `sha256`, lot par lot, puis renvoie le bilan. Réservée aux
 * administrateurs et modérateurs ; chaque lot est journalisé dans `adminLogs`.
 */
export const deleteDuplicateStorageFiles = action({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.runQuery(internal.storageReport._requireAdmin, {});

    let deletedFiles = 0;
    let deletedBytes = 0;
    let failedFiles = 0;
    let remainingFiles = 0;
    let recentFiles = 0;
    let duplicateGroups = 0;
    let groupedFiles = 0;
    let totalDuplicateFiles = 0;
    let totalDuplicateBytes = 0;
    let rounds = 0;

    for (let i = 0; i < MAX_DELETE_ROUNDS; i++) {
      const result = await ctx.runMutation(internal.storageReport._deleteDuplicateStorageFiles, {
        adminId: admin.adminId,
        adminName: admin.adminName || undefined,
        maxFiles: DELETE_BATCH_SIZE,
      });
      rounds++;
      deletedFiles += result.deletedFiles;
      deletedBytes += result.deletedBytes;
      failedFiles += result.failedFiles;
      remainingFiles = result.remainingFiles;
      recentFiles = result.recentFiles;
      duplicateGroups = result.duplicateGroups;
      groupedFiles = result.groupedFiles;
      totalDuplicateFiles = result.totalDuplicateFiles;
      totalDuplicateBytes = result.totalDuplicateBytes;

      // Plus rien à supprimer, ou lot entier en échec (on évite la boucle infinie).
      if (result.remainingFiles === 0 || result.deletedFiles === 0) break;
    }

    return {
      deletedFiles,
      deletedBytes,
      failedFiles,
      remainingFiles,
      recentFiles,
      duplicateGroups,
      groupedFiles,
      totalDuplicateFiles,
      totalDuplicateBytes,
      rounds,
      deletedAt: Date.now(),
    };
  },
});
