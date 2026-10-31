import { Component, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import {
  ArrowDownUp,
  Filter,
  Lock,
  MessageSquareHeart,
  Search,
  Star,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { KPI, KPIGrid } from "@/components/ui/kpi";
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
// Admin — « Avis et évaluations BatiBuild »
// ----------------------------------------------------------------------------
// Les données proviennent uniquement des queries serveur `adminStats` /
// `adminList`, qui refusent tout compte non administrateur. Aucune note ni
// aucun commentaire n'est exposé publiquement.
// ============================================================================

const RATING_LABELS: Record<number, string> = {
  1: "Très insatisfait",
  2: "Insatisfait",
  3: "Moyen",
  4: "Satisfait",
  5: "Excellent",
};

const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= value
              ? "fill-amber-400 text-amber-400"
              : "fill-muted/30 text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

type RatingFilter = "all" | "1" | "2" | "3" | "4" | "5";
type SortOrder = "recent" | "oldest";

/**
 * Filet de sécurité local : une erreur de cet onglet ne doit jamais faire
 * tomber tout le panneau d'administration.
 */
class ReviewsAdminBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("[batibuild] Onglet « Avis et évaluations » :", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Card className="border-border/40">
        <CardContent className="space-y-1 p-6 text-center">
          <p className="text-sm font-semibold">
            Les évaluations n'ont pas pu être chargées
          </p>
          <p className="text-xs text-muted-foreground">
            Rechargez la page pour réessayer. Les autres onglets restent
            disponibles.
          </p>
        </CardContent>
      </Card>
    );
  }
}

export default function PlatformReviewsAdmin() {
  return (
    <ReviewsAdminBoundary>
      <PlatformReviewsAdminContent />
    </ReviewsAdminBoundary>
  );
}

function PlatformReviewsAdminContent() {
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("recent");

  const stats = useQuery(api.platformReviews.adminStats, {});
  const reviews = useQuery(api.platformReviews.adminList, {
    rating:
      ratingFilter === "all"
        ? undefined
        : (Number(ratingFilter) as 1 | 2 | 3 | 4 | 5),
    search: search.trim() || undefined,
    sort,
  });

  const maxCount = useMemo(
    () => (stats ? Math.max(1, ...stats.distribution) : 1),
    [stats],
  );

  // Accès refusé côté serveur : la query renvoie null pour un non-admin.
  if (stats === null || reviews === null) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <Lock className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold">Accès réservé aux administrateurs</p>
          <p className="text-xs text-muted-foreground">
            Les notes et commentaires des utilisateurs ne sont visibles que par
            l'administration de la plateforme.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (stats === undefined || reviews === undefined) {
    return <LoadingState message="Chargement des évaluations…" />;
  }

  const averageLabel = stats.total ? stats.average.toFixed(2) : "—";

  return (
    <div className="space-y-4">
      {/* Indicateurs */}
      <KPIGrid columns={4}>
        <KPI
          label="Note moyenne"
          value={
            <span className="flex items-center gap-1.5">
              {averageLabel}
              <span className="text-xs font-normal text-muted-foreground">/ 5</span>
            </span>
          }
          hint={
            <Stars value={Math.round(stats.average)} className="align-middle" />
          }
          icon={<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          tone={stats.average >= 4 ? "success" : stats.average >= 3 ? "warning" : "default"}
        />
        <KPI
          label="Évaluations"
          value={stats.total}
          hint={`${stats.withComment} avec commentaire`}
          icon={<MessageSquareHeart className="h-3.5 w-3.5" />}
        />
        <KPI
          label="Satisfaction"
          value={`${stats.satisfaction} %`}
          hint={`${stats.satisfied} note${stats.satisfied > 1 ? "s" : ""} 4 et 5 étoiles`}
          tone={stats.satisfaction >= 70 ? "success" : stats.satisfaction >= 40 ? "warning" : "danger"}
        />
        <KPI
          label="Dernier avis"
          value={stats.lastSubmittedAt ? fmtDateTime(stats.lastSubmittedAt).slice(0, 10) : "—"}
          hint={stats.lastSubmittedAt ? fmtDateTime(stats.lastSubmittedAt) : "Aucun avis pour l'instant"}
        />
      </KPIGrid>

      {/* Répartition des notes */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            Répartition des notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.distribution[rating - 1] ?? 0;
            const percent = stats.total ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={rating} className="flex items-center gap-2">
                <span className="flex w-14 shrink-0 items-center gap-0.5 text-[11px] font-medium">
                  {rating}
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                  {count} · {percent} %
                </span>
              </div>
            );
          })}
          {stats.total === 0 && (
            <p className="pt-1 text-center text-[11px] text-muted-foreground">
              Aucune évaluation enregistrée pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filtres */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un commentaire, un nom, un e-mail…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={ratingFilter}
            onValueChange={(value) => setRatingFilter(value as RatingFilter)}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <Filter className="mr-1 h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Note" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les notes</SelectItem>
              {[5, 4, 3, 2, 1].map((rating) => (
                <SelectItem key={rating} value={String(rating)}>
                  {rating} étoile{rating > 1 ? "s" : ""} — {RATING_LABELS[rating]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as SortOrder)}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <ArrowDownUp className="mr-1 h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Tri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="oldest">Plus anciens</SelectItem>
            </SelectContent>
          </Select>
          {(ratingFilter !== "all" || search.trim().length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                setRatingFilter("all");
                setSearch("");
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Tableau détaillé */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {reviews.length} avis{reviews.length > 1 ? "" : ""}{" "}
            {ratingFilter !== "all" || search.trim() ? "correspondant aux filtres" : "au total"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {reviews.length === 0 ? (
            <EmptyState
              className="m-3 border-0"
              icon={<MessageSquareHeart className="h-5 w-5" />}
              title={
                stats.total === 0
                  ? "Aucune évaluation pour le moment"
                  : "Aucun avis ne correspond aux filtres"
              }
              description={
                stats.total === 0
                  ? "Les utilisateurs peuvent noter BatiBuild depuis le bas de leur tableau de bord."
                  : "Modifiez la note recherchée ou effacez la recherche."
              }
            />
          ) : (
            <>
              {/* Tableau (desktop) */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[240px]">Utilisateur</TableHead>
                      <TableHead className="w-[150px]">Note</TableHead>
                      <TableHead>Commentaire</TableHead>
                      <TableHead className="w-[160px] text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={review.userImage ?? undefined} />
                              <AvatarFallback className="text-[9px]">
                                {initials(review.userName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">
                                {review.userName ?? "Utilisateur"}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {review.userEmail ?? "—"}
                              </p>
                              <p className="truncate font-mono text-[9px] text-muted-foreground/60">
                                {review.userId}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Stars value={review.rating} />
                            <span className="text-[11px] font-semibold tabular-nums">
                              {review.rating}/5
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {RATING_LABELS[review.rating]}
                          </p>
                        </TableCell>
                        <TableCell>
                          {review.comment ? (
                            <p className="max-w-md whitespace-pre-wrap break-words text-xs text-muted-foreground">
                              {review.comment}
                            </p>
                          ) : (
                            <span className="text-[11px] italic text-muted-foreground/60">
                              Aucun commentaire
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-[11px] tabular-nums">
                            {fmtDateTime(review.createdAt)}
                          </p>
                          {review.updatedAt !== review.createdAt && (
                            <p className="text-[9px] text-muted-foreground">
                              modifié le {fmtDateTime(review.updatedAt)}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Cartes (mobile / tablette) */}
              <div className="divide-y divide-border/50 md:hidden">
                {reviews.map((review) => (
                  <div key={review.id} className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={review.userImage ?? undefined} />
                          <AvatarFallback className="text-[9px]">
                            {initials(review.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {review.userName ?? "Utilisateur"}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {review.userEmail ?? "—"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-0.5 border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-300"
                      >
                        {review.rating}
                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                      </Badge>
                    </div>
                    <Stars value={review.rating} />
                    {review.comment ? (
                      <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {review.comment}
                      </p>
                    ) : (
                      <p className="text-[11px] italic text-muted-foreground/60">
                        Aucun commentaire
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70">
                      {fmtDateTime(review.createdAt)}
                      {review.updatedAt !== review.createdAt
                        ? ` · modifié le ${fmtDateTime(review.updatedAt)}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground">
        Données confidentielles : visibles uniquement par les administrateurs.
        Chaque utilisateur ne peut consulter et modifier que son propre avis.
      </p>
    </div>
  );
}
