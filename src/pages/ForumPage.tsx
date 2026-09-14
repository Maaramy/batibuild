import { api } from "@/convex/_generated/api";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ForumErrorBoundary } from "@/components/forum/ForumErrorBoundary";
import {
  ForumCardSkeleton,
  ForumPostCard,
  type ForumPostCardData,
} from "@/components/forum/bits";
import {
  CONSULTATION_SPECIALTIES,
  FORUM_AUDIENCES,
  FORUM_MATERIAL_CATEGORIES,
  FORUM_REQUEST_TYPES,
  FORUM_SORTS,
  FORUM_STATUSES,
  INTERVENTION_SPECIALTIES,
  type ForumAudience,
  type ForumRequestType,
  type ForumSortKey,
  type ForumStatusKey,
} from "@/lib/forumMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ChevronDown,
  Filter,
  FilterX,
  Loader2,
  MessageSquarePlus,
  Search,
  SearchX,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// ============================================================================
// Forum d'Assistance — page principale (« /forum »)
// ============================================================================

type DateRangeKey = "all" | "today" | "week" | "month" | "custom";

interface PageFilters {
  search?: string;
  requestType?: ForumRequestType;
  status?: ForumStatusKey;
  audience?: ForumAudience;
  specialty?: string;
  materialCategory?: string;
  dateFrom?: number;
  dateTo?: number;
  sort: ForumSortKey;
}

const PAGE_LIMIT = 9;

/** Une page de résultats = une souscription Convex (réactive). */
function ResultsPage({
  cursor,
  filters,
  onMeta,
  onLoaded,
  onOpen,
  onReport,
}: {
  cursor: string | null;
  filters: PageFilters;
  onMeta?: (nextCursor: string | null, isDone: boolean) => void;
  onLoaded?: (count: number) => void;
  onOpen: (id: string) => void;
  onReport: (post: ForumPostCardData) => void;
}) {
  const result = useQuery(api.forum.listPosts, {
    cursor: cursor ?? undefined,
    limit: PAGE_LIMIT,
    ...filters,
  });

  const nextCursor = result?.nextCursor ?? null;
  const isDone = result?.isDone ?? true;
  const count = result?.posts.length ?? 0;

  useEffect(() => {
    onMeta?.(result ? nextCursor : null, result ? isDone : false);
  }, [nextCursor, isDone, result, onMeta]);

  useEffect(() => {
    if (result) onLoaded?.(count);
  }, [count, result, onLoaded]);

  if (result === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ForumCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {result.posts.map((post) => (
        <ForumPostCard
          key={post._id}
          post={post as unknown as ForumPostCardData}
          onOpen={() => onOpen(post._id)}
          onReport={() => onReport(post as unknown as ForumPostCardData)}
        />
      ))}
    </div>
  );
}

export default function ForumPage() {
  useDirection();
  usePageSEO({
    title: "Forum d'Assistance - batibuild App",
    description:
      "Posez une question, demandez l'intervention d'un professionnel ou recherchez un fournisseur sur le forum d'assistance BatiBuild.",
  });

  const { t } = useTranslation("forum");
  const navigate = useNavigate();

  // ── Filtres ──────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [requestType, setRequestType] = useState<ForumRequestType | "all">("all");
  const [status, setStatus] = useState<ForumStatusKey | "all">("all");
  const [audience, setAudience] = useState<ForumAudience | "all">("all");
  const [specialty, setSpecialty] = useState("all");
  const [materialCategory, setMaterialCategory] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeKey>("all");
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [sort, setSort] = useState<ForumSortKey>("recent");
  const [showFilters, setShowFilters] = useState(false);

  // Recherche : anti-rebond de 300 ms (aucun rechargement de page).
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filters: PageFilters = useMemo(() => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    let dateFrom: number | undefined;
    let dateTo: number | undefined;
    if (dateRange === "today") dateFrom = startOfDay.getTime();
    else if (dateRange === "week") dateFrom = now - 7 * 86400000;
    else if (dateRange === "month") dateFrom = now - 30 * 86400000;
    else if (dateRange === "custom") {
      if (dateFromInput) dateFrom = new Date(`${dateFromInput}T00:00:00`).getTime();
      if (dateToInput) dateTo = new Date(`${dateToInput}T23:59:59`).getTime();
    }

    return {
      search: search || undefined,
      requestType: requestType === "all" ? undefined : requestType,
      status: status === "all" ? undefined : status,
      audience: audience === "all" ? undefined : audience,
      specialty: specialty === "all" ? undefined : specialty,
      materialCategory: materialCategory === "all" ? undefined : materialCategory,
      dateFrom,
      dateTo,
      sort,
    };
  }, [
    search,
    requestType,
    status,
    audience,
    specialty,
    materialCategory,
    dateRange,
    dateFromInput,
    dateToInput,
    sort,
  ]);

  const filtersKey = JSON.stringify(filters);

  // ── Pagination par curseur (chaque page est une souscription) ────────────
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    setCursors([null]);
    setNextCursor(null);
    setIsDone(false);
    setLoadedCount(0);
  }, [filtersKey]);

  const handleMeta = useCallback((cursor: string | null, done: boolean) => {
    setNextCursor(cursor);
    setIsDone(done);
  }, []);

  const handleLoaded = useCallback((count: number) => {
    setLoadedCount(count);
  }, []);

  const loadMore = useCallback(() => {
    setCursors((prev) =>
      nextCursor && !prev.includes(nextCursor) ? [...prev, nextCursor] : prev,
    );
  }, [nextCursor]);

  // Défilement infini : sentinelle observée sous la liste.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor || isDone) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, isDone, loadMore]);

  // ── Données & actions ────────────────────────────────────────────────────
  const total = useQuery(api.forum.getPostCount, {});
  const reportPost = useMutation(api.forum.reportPost);

  const [reportTarget, setReportTarget] = useState<ForumPostCardData | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const hasActiveFilters =
    requestType !== "all" ||
    status !== "all" ||
    audience !== "all" ||
    specialty !== "all" ||
    materialCategory !== "all" ||
    dateRange !== "all" ||
    search.length > 0;

  const resetFilters = () => {
    setRequestType("all");
    setStatus("all");
    setAudience("all");
    setSpecialty("all");
    setMaterialCategory("all");
    setDateRange("all");
    setDateFromInput("");
    setDateToInput("");
    setSort("recent");
    setSearchInput("");
    setSearch("");
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    if (reportReason.trim().length < 5) {
      toast.error(t("report.reasonPlaceholder"));
      return;
    }
    setReporting(true);
    try {
      await reportPost({
        postId: reportTarget._id as any,
        reason: reportReason.trim(),
      });
      toast.success(t("toast.reported"));
      setReportTarget(null);
      setReportReason("");
    } catch (err: any) {
      toast.error(err?.message || t("toast.error"));
    } finally {
      setReporting(false);
    }
  };

  const specialtyOptions = useMemo(
    () =>
      requestType === "consultation"
        ? CONSULTATION_SPECIALTIES
        : requestType === "intervention"
          ? INTERVENTION_SPECIALTIES
          : [...INTERVENTION_SPECIALTIES, ...CONSULTATION_SPECIALTIES],
    [requestType],
  );

  const selectClass =
    "h-9 w-full rounded-lg border border-border/50 bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        {/* ── En-tête ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              aria-label="Retour"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/60 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold sm:text-xl">{t("title")}</h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Sparkles className="h-2.5 w-2.5" />
                  {t("count", { count: total ?? 0 })}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {t("subtitle")}
              </p>
            </div>
            <Button
              size="sm"
              className="hidden h-9 shrink-0 gap-1.5 text-xs sm:inline-flex"
              onClick={() => navigate("/forum/new")}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              {t("newRequest")}
            </Button>
          </div>

          {/* Recherche */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("search.placeholder")}
                className="h-9 ps-8 text-xs"
                aria-label={t("search.placeholder")}
              />
              {searchInput ? (
                <button
                  type="button"
                  aria-label={t("search.clear")}
                  onClick={() => setSearchInput("")}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <FilterX className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 text-xs"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("filters.title")}</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  showFilters && "rotate-180",
                )}
              />
            </Button>
            <Button
              size="sm"
              className="h-9 shrink-0 gap-1.5 text-xs sm:hidden"
              onClick={() => navigate("/forum/new")}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              {t("newRequest")}
            </Button>
          </div>

          {/* Filtres rapides : type + statut */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[{ key: "all" as const, label: t("filters.allTypes") }, ...FORUM_REQUEST_TYPES.map((r) => ({ key: r, label: t(`types.${r}`) }))].map((item) => (
              <button
                key={`type-${item.key}`}
                type="button"
                onClick={() => setRequestType(item.key as any)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95",
                  requestType === item.key
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
            <span className="mx-1 hidden h-4 w-px bg-border/60 sm:block" />
            {[{ key: "all" as const, label: t("filters.allStatuses") }, ...FORUM_STATUSES.map((s) => ({ key: s, label: t(`statuses.short.${s}`) }))].map((item) => (
              <button
                key={`status-${item.key}`}
                type="button"
                onClick={() => setStatus(item.key as any)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95",
                  status === item.key
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Filtres avancés */}
          {showFilters ? (
            <Card className="rounded-xl border-border/40 bg-card/50">
              <CardContent className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("filters.audience")}
                  </span>
                  <select
                    className={selectClass}
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                  >
                    <option value="all">{t("filters.allAudiences")}</option>
                    {FORUM_AUDIENCES.map((a) => (
                      <option key={a} value={a}>
                        {t(`audiences.${a}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("filters.specialty")}
                  </span>
                  <select
                    className={selectClass}
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  >
                    <option value="all">{t("filters.allSpecialties")}</option>
                    {specialtyOptions.map((s) => (
                      <option key={s} value={s}>
                        {t(`specialties.${s}`, { defaultValue: s })}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("filters.material")}
                  </span>
                  <select
                    className={selectClass}
                    value={materialCategory}
                    onChange={(e) => setMaterialCategory(e.target.value)}
                  >
                    <option value="all">{t("filters.allMaterials")}</option>
                    {FORUM_MATERIAL_CATEGORIES.map((m) => (
                      <option key={m} value={m}>
                        {t(`materials.${m}`, { defaultValue: m })}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("filters.date")}
                  </span>
                  <select
                    className={selectClass}
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateRangeKey)}
                  >
                    <option value="all">{t("dates.all")}</option>
                    <option value="today">{t("dates.today")}</option>
                    <option value="week">{t("dates.week")}</option>
                    <option value="month">{t("dates.month")}</option>
                    <option value="custom">{t("dates.custom")}</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("filters.sort")}
                  </span>
                  <select
                    className={selectClass}
                    value={sort}
                    onChange={(e) => setSort(e.target.value as ForumSortKey)}
                  >
                    {FORUM_SORTS.map((s) => (
                      <option key={s} value={s}>
                        {t(`sorts.${s}`)}
                      </option>
                    ))}
                  </select>
                </label>

                {dateRange === "custom" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("dates.from")}
                      </span>
                      <Input
                        type="date"
                        value={dateFromInput}
                        onChange={(e) => setDateFromInput(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("dates.to")}
                      </span>
                      <Input
                        type="date"
                        value={dateToInput}
                        onChange={(e) => setDateToInput(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full gap-1.5 text-xs text-muted-foreground sm:w-auto"
                    onClick={resetFilters}
                    disabled={!hasActiveFilters && sort === "recent"}
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    {t("filters.reset")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* ── Liste ── */}
        <div className="mt-4">
          <ForumErrorBoundary
            title={t("states.errorTitle")}
            description={t("states.errorText")}
            retryLabel={t("states.retry")}
          >
            {/* Aucune publication visible et aucun filtre : forum vide. */}
            {total === 0 && !hasActiveFilters ? (
              <EmptyState
                icon={<MessageSquarePlus className="h-6 w-6 text-primary" />}
                title={t("states.emptyTitle")}
                text={t("states.emptyText")}
                action={
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => navigate("/forum/new")}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    {t("newRequest")}
                  </Button>
                }
              />
            ) : (
              <>
                {cursors.map((cursor, index) => (
                  <div
                    key={`page-${index}-${cursor ?? "first"}`}
                    className={index > 0 ? "mt-3" : ""}
                  >
                    <ResultsPage
                      cursor={cursor}
                      filters={filters}
                      onMeta={index === cursors.length - 1 ? handleMeta : undefined}
                      onLoaded={handleLoaded}
                      onOpen={(id) => navigate(`/forum/${id}`)}
                      onReport={(post) => {
                        setReportTarget(post);
                        setReportReason("");
                      }}
                    />
                  </div>
                ))}

                {/* Sentinel du défilement infini */}
                <div ref={sentinelRef} className="h-6" aria-hidden />

                {nextCursor && !isDone ? (
                  <div className="mt-3 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={loadMore}
                    >
                      <Loader2 className="h-3.5 w-3.5" />
                      {t("states.loadMore")}
                    </Button>
                  </div>
                ) : null}

                {/* Rien à afficher, mais le forum n'est pas vide : filtres trop
                    restrictifs (ou recherche sans résultat). */}
                {isDone && loadedCount === 0 && !(total === 0 && !hasActiveFilters) ? (
                  <EmptyState
                    icon={<SearchX className="h-6 w-6 text-muted-foreground" />}
                    title={t("states.noResultsTitle")}
                    text={t("states.noResultsText")}
                    action={
                      hasActiveFilters ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={resetFilters}
                        >
                          <FilterX className="h-3.5 w-3.5" />
                          {t("filters.reset")}
                        </Button>
                      ) : undefined
                    }
                  />
                ) : null}
              </>
            )}
          </ForumErrorBoundary>
        </div>
      </div>

      {/* ── Signalement ── */}
      <Dialog open={reportTarget !== null} onOpenChange={(open) => !open && setReportTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{t("report.title")}</DialogTitle>
            <DialogDescription className="text-xs">
              {reportTarget?.title}
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1.5">
            <span className="text-xs font-medium">{t("report.reason")}</span>
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={t("report.reasonPlaceholder")}
              className="min-h-24 text-xs"
            />
          </label>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setReportTarget(null)}
            >
              {t("report.cancel")}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={submitReport}
              disabled={reporting}
            >
              {reporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t("report.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-xs text-muted-foreground">{text}</p>
      </div>
      {action}
    </div>
  );
}
