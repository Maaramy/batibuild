import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Star, Trash2, Search, Loader2, MessageSquareText, TrendingUp, Inbox } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ============================================================================
// « Avis et évaluations BatiBuild » — rubrique d'administration
// ============================================================================
//
// Accès : strictement réservé aux administrateurs (vérifié côté serveur par
// `requireAdmin` dans `src/convex/platformReviews.ts`). Ce panneau est le
// SEUL endroit où notes et commentaires sont affichés.

const FILTER_ALL = "all";

const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Petite jauge horizontale pour la répartition des notes. */
function DistributionBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-amber-400/80 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

export function PlatformReviewsAdmin() {
  const stats = useQuery(api.platformReviews.getReviewStats, {});
  const reviews = useQuery(api.platformReviews.listReviews, {
    rating: undefined,
    search: undefined,
  });
  const deleteReview = useMutation(api.platformReviews.deleteReview);

  const [ratingFilter, setRatingFilter] = useState<string>(FILTER_ALL);
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loading = stats === undefined || reviews === undefined;

  // Filtre / recherche / tri côté client : la liste admin est complète et
  // réactive, aucune requête supplémentaire n'est nécessaire.
  const filtered = useMemo(() => {
    let list = reviews ?? [];
    if (ratingFilter !== FILTER_ALL) {
      const wanted = Number(ratingFilter);
      list = list.filter((r) => r.rating === wanted);
    }
    const needle = search.trim().toLowerCase();
    if (needle) {
      list = list.filter((r) =>
        `${r.userName} ${r.userEmail} ${r.comment}`.toLowerCase().includes(needle),
      );
    }
    return [...list].sort((a, b) => (sortDesc ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
  }, [reviews, ratingFilter, search, sortDesc]);

  const handleDelete = async (reviewId: string) => {
    setDeletingId(reviewId);
    try {
      await deleteReview({ reviewId: reviewId as Id<"platformReviews"> });
      toast.success("Avis supprimé.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* ═══ A. Statistiques générales ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Moyenne générale</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums">
                {stats ? stats.average.toFixed(2) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">/ 5</span>
            </div>
            <div className="mt-1 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((v) => (
                <Star
                  key={v}
                  className={cn(
                    "h-3.5 w-3.5",
                    stats && v <= Math.round(stats.average)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted/30 text-muted-foreground/40",
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total d'évaluations</p>
            <div className="mt-1 text-2xl font-bold tabular-nums">{stats ? stats.total : "—"}</div>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquareText className="h-3.5 w-3.5" />
              avis uniques enregistrés
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Satisfaction</p>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {stats ? `${stats.satisfactionPct}%` : "—"}
            </div>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              notes de 4 et 5 étoiles
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Répartition 1 → 5 */}
        <Card className="border-border/40">
          <CardContent className="p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Répartition des notes
            </p>
            {[5, 4, 3, 2, 1].map((v) => (
              <div key={v} className="flex items-center gap-2">
                <span className="flex w-14 shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground">
                  {v}
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </span>
                <DistributionBar count={stats?.distribution?.[String(v)] ?? 0} total={stats?.total ?? 0} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Évolution dans le temps */}
        <Card className="border-border/40">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Évolution des évaluations
            </p>
            {stats && stats.trend.length > 0 ? (
              <ul className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {stats.trend.map((t) => (
                  <li key={t.day} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{t.day}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-muted-foreground">{t.count} avis</span>
                      <span className="font-medium tabular-nums">moy. {t.average.toFixed(2)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">Aucune évaluation pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ B. Liste des commentaires ═══ */}
      <Card className="border-border/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un avis (nom, e-mail, commentaire)…"
                className="pl-8 text-xs"
                aria-label="Rechercher une évaluation"
              />
            </div>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[130px] text-xs" aria-label="Filtrer par note">
                <SelectValue placeholder="Note" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FILTER_ALL}>Toutes les notes</SelectItem>
                {[5, 4, 3, 2, 1].map((v) => (
                  <SelectItem key={v} value={String(v)}>
                    {v} étoile{v > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSortDesc((d) => !d)}
            >
              Date : {sortDesc ? "récent → ancien" : "ancien → récent"}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des avis…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                Aucun avis ne correspond à ces critères.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Note</TableHead>
                    <TableHead className="text-[11px]">Commentaire</TableHead>
                    <TableHead className="text-[11px]">Utilisateur</TableHead>
                    <TableHead className="text-[11px]">Soumis le</TableHead>
                    <TableHead className="text-right text-[11px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>
                        <span className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((v) => (
                            <Star
                              key={v}
                              className={cn(
                                "h-3 w-3",
                                v <= r.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-muted/30 text-muted-foreground/40",
                              )}
                            />
                          ))}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[280px] text-[11px] whitespace-pre-wrap break-words">
                        {r.comment || <span className="text-muted-foreground/60">—</span>}
                      </TableCell>
                      <TableCell className="text-[11px]">
                        <span className="block font-medium">{r.userName}</span>
                        <span className="block text-muted-foreground/70">{r.userEmail || "—"}</span>
                      </TableCell>
                      <TableCell className="text-[11px] tabular-nums text-muted-foreground">
                        {fmtDateTime(r.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(r._id)}
                          disabled={deletingId === r._id}
                          aria-label={`Supprimer l'avis de ${r.userName}`}
                        >
                          {deletingId === r._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px]">
              {filtered.length} avis affiché{filtered.length > 1 ? "s" : ""}
            </Badge>
            {stats && (
              <span className="text-[10px] text-muted-foreground">
                Moyenne recalculée automatiquement : {stats.average.toFixed(2)} / 5 sur {stats.total} avis
              </span>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default PlatformReviewsAdmin;
