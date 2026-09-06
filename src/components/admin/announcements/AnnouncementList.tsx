import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Eye,
  Pencil,
  Copy,
  Power,
  PowerOff,
  Trash2,
  GripVertical,
  Megaphone,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnnouncementBadge } from "../../announcements/AnnouncementBadge";
import { AnnouncementModal } from "../../announcements/AnnouncementModal";
import { AnnouncementEmptyState } from "../../announcements/AnnouncementEmptyState";
import { AnnouncementStatusBadge } from "./AnnouncementStatusBadge";
import { AnnouncementFilters, type AnnouncementFiltersState } from "./AnnouncementFilters";
import { AnnouncementEditor, type EditorMode } from "./AnnouncementEditor";
import {
  formatAnnouncementDate,
  type AnnouncementLike,
} from "../../announcements/meta";

function PriorityBadge({ priority }: { priority: number }) {
  const styles: Record<number, string> = {
    5: "bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400",
    4: "bg-orange-500/10 text-orange-600 border-orange-500/25 dark:text-orange-400",
    3: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
    2: "bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400",
    1: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        styles[priority] ?? styles[1],
      )}
    >
      P{priority}
    </span>
  );
}

const DEFAULT_FILTERS: AnnouncementFiltersState = {
  search: "",
  type: "all",
  status: "all",
};

/**
 * Gestion des annonces — list + filters + drag & drop + row actions.
 */
export function AnnouncementList() {
  const announcements = useQuery(api.announcements.getAnnouncements) || [];
  const [filters, setFilters] = useState<AnnouncementFiltersState>(DEFAULT_FILTERS);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editing, setEditing] = useState<AnnouncementLike | null>(null);
  const [viewing, setViewing] = useState<AnnouncementLike | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const deleteAnnouncement = useMutation(api.announcements.deleteAnnouncement);
  const activateAnnouncement = useMutation(api.announcements.activateAnnouncement);
  const deactivateAnnouncement = useMutation(api.announcements.deactivateAnnouncement);
  const duplicateAnnouncement = useMutation(api.announcements.duplicateAnnouncement);
  const updateAnnouncementOrder = useMutation(api.announcements.updateAnnouncementOrder);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return announcements.filter((a) => {
      if (filters.type !== "all" && a.type !== filters.type) return false;
      if (filters.status !== "all" && a.resolvedStatus !== filters.status) return false;
      if (q) {
        const hay = `${a.title} ${a.content} ${a.authorName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [announcements, filters]);

  const openEditor = (mode: EditorMode, announcement: AnnouncementLike | null = null) => {
    setEditorMode(mode);
    setEditing(announcement);
    setEditorOpen(true);
  };

  const handleToggleActive = async (a: AnnouncementLike) => {
    setBusyId(a._id);
    try {
      if (a.resolvedStatus === "disabled" || !a.isActive) {
        await activateAnnouncement({ id: a._id as any });
        toast.success("Annonce activée");
      } else {
        await deactivateAnnouncement({ id: a._id as any });
        toast.success("Annonce désactivée");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (a: AnnouncementLike) => {
    setBusyId(a._id);
    try {
      await duplicateAnnouncement({ id: a._id as any });
      toast.success("Annonce dupliquée (brouillon)");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (a: AnnouncementLike) => {
    try {
      await deleteAnnouncement({ id: a._id as any });
      toast.success("Annonce supprimée");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  // ── Drag & drop ordering ──
  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const ids: string[] = filtered.map((a) => a._id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) {
      setDraggingId(null);
      return;
    }
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    setDraggingId(null);
    updateAnnouncementOrder({ orderedIds: ids as any })
      .then(() => toast.success("Ordre d'affichage mis à jour"))
      .catch((err: any) => toast.error(err.message || "Erreur lors du réordonnancement"));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Gestion des annonces</h2>
            <p className="text-xs text-muted-foreground">
              {announcements.length} annonce(s) · {announcements.filter((a) => a.resolvedStatus === "published").length} visible(s)
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-9 gap-1.5 text-xs shadow-sm"
          onClick={() => openEditor("create")}
        >
          <Plus className="h-3.5 w-3.5" />
          Créer une annonce
        </Button>
      </div>

      {/* Filters */}
      <AnnouncementFilters value={filters} onChange={setFilters} />

      {/* Table */}
      {filtered.length === 0 ? (
        <AnnouncementEmptyState
          title={
            announcements.length === 0
              ? "Aucune annonce"
              : "Aucune annonce ne correspond aux filtres"
          }
          description={
            announcements.length === 0
              ? "Créez votre première annonce pour communiquer avec vos utilisateurs."
              : "Modifiez la recherche ou les filtres pour afficher d'autres annonces."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                <th className="w-8 py-3 px-2" />
                <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs min-w-[220px]">Titre</th>
                <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs">Type</th>
                <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Priorité</th>
                <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Statut</th>
                <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Publication</th>
                <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Expiration</th>
                <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Auteur</th>
                <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a._id}
                  draggable
                  onDragStart={() => setDraggingId(a._id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(a._id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={cn(
                    "border-b border-border/10 transition-colors duration-150",
                    draggingId === a._id
                      ? "bg-primary/5 opacity-60"
                      : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent",
                  )}
                >
                  <td className="py-2.5 px-2 cursor-grab active:cursor-grabbing" title="Glisser pour réordonner">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="min-w-0">
                      <p className="font-medium text-xs truncate max-w-[240px]">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground/70 truncate max-w-[240px]">
                        {a.targetType === "all"
                          ? "Tous les utilisateurs"
                          : a.targetType === "role"
                            ? `Rôles : ${(a.targetRoles ?? []).join(", ")}`
                            : a.targetType === "company"
                              ? `Sociétés : ${(a.targetCompanyNames ?? []).slice(0, 2).join(", ")}${(a.targetCompanyNames ?? []).length > 2 ? "…" : ""}`
                              : `Utilisateurs : ${(a.targetUserIds ?? []).length}`}
                      </p>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <AnnouncementBadge type={a.type} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <PriorityBadge priority={a.priority} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <AnnouncementStatusBadge status={a.status} resolvedStatus={a.resolvedStatus} />
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatAnnouncementDate(a.startDate ?? a.createdAt)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 hidden lg:table-cell">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {a.endDate ? formatAnnouncementDate(a.endDate) : "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 hidden lg:table-cell">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px] block">
                      {a.authorName || "Équipe batibuild"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Voir" onClick={() => setViewing(a)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Modifier" onClick={() => openEditor("edit", a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Dupliquer" disabled={busyId === a._id} onClick={() => handleDuplicate(a)}>
                        {busyId === a._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-7 w-7", a.resolvedStatus !== "disabled" && "text-emerald-600")}
                        title={a.resolvedStatus === "disabled" || !a.isActive ? "Activer" : "Désactiver"}
                        disabled={busyId === a._id}
                        onClick={() => handleToggleActive(a)}
                      >
                        {busyId === a._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : a.resolvedStatus === "disabled" || !a.isActive ? (
                          <Power className="h-3.5 w-3.5" />
                        ) : (
                          <PowerOff className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Supprimer">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              « {a.title} » sera définitivement supprimée. Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground"
                              onClick={() => handleDelete(a)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
        <GripVertical className="h-3 w-3" />
        Astuce : glissez-déposez les lignes pour modifier l'ordre d'affichage (le statut est recalculé automatiquement selon les dates).
      </p>

      {/* Editor */}
      <AnnouncementEditor
        open={editorOpen}
        mode={editorMode}
        announcement={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {}}
      />

      {/* View modal */}
      <AnnouncementModal announcement={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}