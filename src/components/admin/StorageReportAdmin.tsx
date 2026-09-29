import { useCallback, useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// Stockage & base de données (admin)
//
// Mesures réelles calculées à la demande côté Convex :
//   • base   → documents + octets sérialisés (JSON non compressé) par table ;
//   • storage → fichiers de `_storage`, octets réels, doublons ;
//   • orphelins → fichiers qu'aucun document ne référence.
// Les chiffres officiels de facturation restent dans le dashboard Convex
// (Settings → Usage / Files) : voir la note en bas de l'écran.
// ============================================================================

interface TableStat {
  table: string;
  count: number;
  bytes: number;
}

interface StorageFileInfo {
  storageId: string;
  size: number;
  contentType: string | null;
  sha256: string;
}

interface StorageReport {
  generatedAt: number;
  schemaTableCount: number;
  database: {
    documents: number;
    estimatedBytes: number;
    tables: TableStat[];
  };
  storage: {
    files: number;
    bytes: number;
    referencedFiles: number;
    referencedBytes: number;
    orphanedFiles: number;
    orphanedBytes: number;
    orphans: StorageFileInfo[];
    duplicates: { sha256: string; count: number; size: number; wastedBytes: number }[];
    duplicateWastedBytes: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Échec du calcul du rapport";
}

function percent(part: number, total: number): string {
  if (total <= 0) return "0 %";
  return `${Math.round((part / total) * 100)} %`;
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "medium",
});

export default function StorageReportAdmin() {
  const runReport = useAction(api.storageReport.getStorageReport);
  const [report, setReport] = useState<StorageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport((await runReport({})) as StorageReport);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [runReport]);

  // Premier calcul au montage de l'onglet — l'action est volontairement non
  // réactive (elle parcourt toutes les tables), donc on ne l'appelle qu'ici
  // et sur demande explicite.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = (await runReport({})) as StorageReport;
        if (!cancelled) setReport(result);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runReport]);

  const storage = report?.storage;
  const orphanShare = storage ? storage.orphanedFiles / Math.max(storage.files, 1) : 0;
  const topTables = report ? report.database.tables.slice(0, 12) : [];

  return (
    <div className="space-y-4">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Stockage &amp; base de données
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mesures calculées à la demande sur le déploiement courant
            {report ? ` · ${DATE_FORMAT.format(new Date(report.generatedAt))}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Actualiser
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* ── Synthèse ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Base de données
            </CardDescription>
            <CardTitle className="text-2xl">
              {report ? formatBytes(report.database.estimatedBytes) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {report ? (
              <>
                {report.database.documents.toLocaleString("fr-FR")} documents ·{" "}
                {report.schemaTableCount} tables du schéma
                <br />
                Contenu JSON non compressé (estimation)
              </>
            ) : (
              "Calcul en cours…"
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage (fichiers)
            </CardDescription>
            <CardTitle className="text-2xl">
              {storage ? formatBytes(storage.bytes) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {storage ? (
              <>
                {storage.files} fichier{storage.files > 1 ? "s" : ""} ·{" "}
                {storage.referencedFiles} référencé{storage.referencedFiles > 1 ? "s" : ""}
                <br />
                Taille réelle d&apos;après les métadonnées <code>_storage</code>
              </>
            ) : (
              "Calcul en cours…"
            )}
          </CardContent>
        </Card>

        <Card
          className={
            storage && storage.orphanedFiles > 0
              ? "border-amber-500/40 bg-amber-500/5"
              : undefined
          }
        >
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              {storage && storage.orphanedFiles > 0 ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              Fichiers orphelins
            </CardDescription>
            <CardTitle className="text-2xl">
              {storage ? storage.orphanedFiles : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {storage ? (
              <>
                {formatBytes(storage.orphanedBytes)} — {percent(storage.orphanedFiles, storage.files)}{" "}
                des fichiers
                <br />
                Aucun document ne les référence
              </>
            ) : (
              "Calcul en cours…"
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Orphelins ── */}
      {storage && storage.orphanedFiles > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Fichiers orphelins ({storage.orphanedFiles})
            </CardTitle>
            <CardDescription className="text-xs">
              Présents dans le storage mais référencés par aucun document
              {orphanShare > 0.5 ? " — l'essentiel du stockage est concerné." : "."} La purge
              existante ne les supprime pas : elle nettoie uniquement les références mortes
              côté base.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {storage.orphans.slice(0, 20).map((file) => (
              <div
                key={file.storageId}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-1.5 text-xs"
              >
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {file.storageId}
                </span>
                <span className="shrink-0 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {file.contentType ?? "inconnu"}
                  </Badge>
                  <span className="tabular-nums">{formatBytes(file.size)}</span>
                </span>
              </div>
            ))}
            {storage.orphans.length > 20 && (
              <p className="pt-1 text-[11px] text-muted-foreground">
                … et {storage.orphans.length - 20} autre
                {storage.orphans.length - 20 > 1 ? "s" : ""}.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Doublons ── */}
      {storage && storage.duplicates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Doublons exacts ({storage.duplicates.length} groupe
              {storage.duplicates.length > 1 ? "s" : ""})
            </CardTitle>
            <CardDescription className="text-xs">
              Même empreinte <code>sha256</code> — {formatBytes(storage.duplicateWastedBytes)}{" "}
              dupliqués
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {storage.duplicates.slice(0, 8).map((group) => (
              <div
                key={group.sha256}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-1.5 text-xs"
              >
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {group.sha256.slice(0, 24)}…
                </span>
                <span className="shrink-0 tabular-nums">
                  {group.count}× {formatBytes(group.size)} · {formatBytes(group.wastedBytes)} gaspillés
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Tables ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tables les plus volumineuses</CardTitle>
          <CardDescription className="text-xs">
            Octets sérialisés (JSON) et nombre de documents par table du schéma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {topTables.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {loading ? "Calcul en cours…" : "Aucune table peuplée."}
            </p>
          )}
          {topTables.map((table) => (
            <div
              key={table.table}
              className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-1.5 text-xs"
            >
              <span className="truncate font-medium">{table.table}</span>
              <span className="shrink-0 flex items-center gap-2 text-muted-foreground tabular-nums">
                <span>{table.count.toLocaleString("fr-FR")} docs</span>
                <span className="text-foreground">{formatBytes(table.bytes)}</span>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Mesures indicatives calculées par lecture du déploiement courant : la base est
        estimée en JSON non compressé et seules les tables du schéma sont parcourues
        (les tables héritées hors schéma ne sont pas comptées). Pour les chiffres
        officiels de facturation, consultez le dashboard Convex —{" "}
        <span className="font-medium">Settings → Usage</span> (base de données, I/O) et{" "}
        <span className="font-medium">Files</span> (storage).
      </p>
    </div>
  );
}
