import {
  ProfessionalCard,
  ProfessionalCardSkeleton,
} from "@/components/promarket/bits";
import { ProMarketEmpty, ProMarketShell } from "@/components/promarket/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useProMarketGeo } from "@/hooks/use-promarket-geo";
import {
  PROMARKET_CATEGORIES,
  PROMARKET_DISTANCE_OPTIONS,
  PROMARKET_REGIONS,
  PROMARKET_SORTS,
  PROMARKET_SORT_LABELS,
  PROMARKET_TRADES,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  Filter,
  FilterX,
  Loader2,
  MapPin,
  Navigation,
  Search,
  SearchX,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

// ============================================================================
// ProMarket — recherche (« /promarket/search »)
// ============================================================================

const PAGE_SIZE = 12;

export default function ProMarketSearch() {
  useDirection();
  const { t } = useTranslation("promarket");
  usePageSEO({ title: t("search.title"), description: t("meta.description") });

  const [params] = useSearchParams();
  const geo = useProMarketGeo();

  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [trade, setTrade] = useState(params.get("trade") ?? "");
  const [region, setRegion] = useState(params.get("region") ?? "");
  const [city, setCity] = useState("");
  const [maxDistance, setMaxDistance] = useState(0);
  const [availability, setAvailability] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [kind, setKind] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [urgent, setUrgent] = useState(params.get("urgent") === "1");
  const [homeService, setHomeService] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<string>("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [pages, setPages] = useState(1);

  // Anti-rebond de la recherche texte (aucun rechargement de page).
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPages(1);
  }, [
    query,
    category,
    trade,
    region,
    city,
    maxDistance,
    availability,
    minRating,
    kind,
    verifiedOnly,
    urgent,
    homeService,
    maxPrice,
    sort,
  ]);

  const args = useMemo(() => {
    const coords =
      geo.coords ??
      (params.get("lat") && params.get("lng")
        ? { lat: Number(params.get("lat")), lng: Number(params.get("lng")) }
        : null);
    return {
      ...(query ? { q: query } : {}),
      ...(category ? { category } : {}),
      ...(trade ? { trade } : {}),
      ...(region ? { region } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(availability ? { availability: availability as any } : {}),
      ...(minRating > 0 ? { minRating } : {}),
      ...(kind ? { kind: kind as any } : {}),
      ...(verifiedOnly ? { verifiedOnly: true } : {}),
      ...(urgent ? { urgent: true } : {}),
      ...(homeService ? { homeService: true } : {}),
      ...(maxPrice && Number(maxPrice) > 0 ? { maxPrice: Number(maxPrice) } : {}),
      ...(coords ? { userLat: coords.lat, userLng: coords.lng } : {}),
      ...(maxDistance > 0 ? { maxDistanceKm: maxDistance } : {}),
      sort,
      limit: PAGE_SIZE * pages,
    };
  }, [
    query,
    category,
    trade,
    region,
    city,
    availability,
    minRating,
    kind,
    verifiedOnly,
    urgent,
    homeService,
    maxPrice,
    maxDistance,
    sort,
    pages,
    geo.coords,
    params,
  ]);

  const result = useQuery(api.promarket.searchProfessionals, args);
  const savedIds = useQuery(api.promarket.listSavedProfessionalIds, {});
  const toggleSaved = useMutation(api.promarket.toggleSavedProfessional);

  const trades = useMemo(
    () =>
      category
        ? PROMARKET_TRADES.filter((tr) => tr.category === category)
        : PROMARKET_TRADES,
    [category],
  );

  const hasActiveFilters = Boolean(
    query ||
      category ||
      trade ||
      region ||
      city ||
      availability ||
      minRating > 0 ||
      kind ||
      verifiedOnly ||
      urgent ||
      homeService ||
      maxPrice ||
      maxDistance > 0,
  );

  const reset = () => {
    setSearchInput("");
    setQuery("");
    setCategory("");
    setTrade("");
    setRegion("");
    setCity("");
    setMaxDistance(0);
    setAvailability("");
    setMinRating(0);
    setKind("");
    setVerifiedOnly(false);
    setUrgent(false);
    setHomeService(false);
    setMaxPrice("");
    setSort("relevance");
  };

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-background px-2 text-xs";

  return (
    <ProMarketShell
      title={t("search.title")}
      subtitle={t("search.subtitle")}
      badge={
        <Badge variant="outline" className="text-[10px] font-medium">
          {result
            ? t("search.resultsOther", { count: result.total })
            : t("common.loading")}
        </Badge>
      }
      action={
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 text-xs"
          onClick={geo.coords ? geo.clear : geo.request}
        >
          <Navigation className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {geo.status === "loading" ? t("hero.locating") : t("hero.useMyLocation")}
          </span>
        </Button>
      }
    >
      {/* ── Barre de recherche ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("hero.searchPlaceholder")}
            aria-label={t("search.title")}
            className="h-10 ps-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label={t("search.sortBy")}
            className={cn(selectClass, "h-10 sm:w-52")}
          >
            {PROMARKET_SORTS.map((s) => (
              <option key={s} value={s}>
                {PROMARKET_SORT_LABELS[s]}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-10 shrink-0 gap-1.5 text-xs"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <Filter className="h-3.5 w-3.5" />
            {t("search.filters")}
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", showFilters && "rotate-180")}
            />
          </Button>
        </div>
      </div>

      {/* ── Filtres rapides ─────────────────────────────────────────────── */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Chip
          active={!category}
          onClick={() => setCategory("")}
          label={t("search.allCategories")}
        />
        {PROMARKET_CATEGORIES.map((c) => (
          <Chip
            key={c.slug}
            active={category === c.slug}
            onClick={() => {
              setCategory(c.slug === category ? "" : c.slug);
              setTrade("");
            }}
            label={c.label}
          />
        ))}
      </div>

      {/* ── Filtres avancés ─────────────────────────────────────────────── */}
      {showFilters && (
        <div className="mt-3 grid gap-3 rounded-2xl border border-border/50 bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("search.trade")}>
            <select
              className={selectClass}
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
            >
              <option value="">{t("search.allTrades")}</option>
              {trades.map((tr) => (
                <option key={tr.slug} value={tr.slug}>
                  {tr.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("search.region")}>
            <select
              className={selectClass}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">{t("search.region")}</option>
              {PROMARKET_REGIONS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("search.city")}>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 text-xs"
              placeholder={t("search.allCities")}
            />
          </Field>

          <Field label={t("search.availability")}>
            <select
              className={selectClass}
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              disabled={!geo.coords && maxDistance > 0}
            >
              <option value="">{t("search.availabilityAny")}</option>
              <option value="immediate">
                {t("card.availability.immediate")}
              </option>
              <option value="week">{t("card.availability.week")}</option>
              <option value="busy">{t("card.availability.busy")}</option>
            </select>
          </Field>

          <Field label={t("search.kind")}>
            <select
              className={selectClass}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="">{t("search.kindAny")}</option>
              <option value="independant">{t("search.kindIndependant")}</option>
              <option value="entreprise">{t("search.kindEntreprise")}</option>
            </select>
          </Field>

          <Field label={t("search.minRating")}>
            <select
              className={selectClass}
              value={String(minRating)}
              onChange={(e) => setMinRating(Number(e.target.value))}
            >
              <option value="0">{t("search.anyRating")}</option>
              <option value="3">3 ★ +</option>
              <option value="4">4 ★ +</option>
              <option value="4.5">4,5 ★ +</option>
            </select>
          </Field>

          <Field label={`${t("search.distanceKm", { km: "" })}`.trim()}>
            <select
              className={selectClass}
              value={String(maxDistance)}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              disabled={!geo.coords}
            >
              {PROMARKET_DISTANCE_OPTIONS.map((d) => (
                <option key={d} value={String(d)}>
                  {d === 0 ? t("search.anyDistance") : t("search.distanceKm", { km: d })}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("search.maxPrice")}>
            <Input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 text-xs"
              placeholder="—"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
            <Checkbox
              checked={verifiedOnly}
              onChange={setVerifiedOnly}
              label={t("search.verifiedOnly")}
            />
            <Checkbox checked={urgent} onChange={setUrgent} label={t("search.urgent")} />
            <Checkbox
              checked={homeService}
              onChange={setHomeService}
              label={t("search.homeService")}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={reset}
              disabled={!hasActiveFilters}
            >
              <FilterX className="h-3.5 w-3.5" />
              {t("search.clearFilters")}
            </Button>
            {!geo.coords && (
              <span className="text-[11px] text-muted-foreground sm:ms-auto">
                {t("search.geoHint")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Résultats ───────────────────────────────────────────────────── */}
      <div className="mt-4">
        {geo.status === "denied" && (
          <p className="mb-2 text-[11px] text-amber-600 dark:text-amber-400">
            {t("hero.locationDenied")}
          </p>
        )}

        {result === undefined ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <ProfessionalCardSkeleton />
            <ProfessionalCardSkeleton />
            <ProfessionalCardSkeleton />
            <ProfessionalCardSkeleton />
          </div>
        ) : result.results.length === 0 ? (
          <ProMarketEmpty
            icon={<SearchX className="h-5 w-5" />}
            title={t("search.noResults")}
            text={t("search.noResultsHint")}
            action={
              hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 gap-1.5 text-xs"
                  onClick={reset}
                >
                  <FilterX className="h-3.5 w-3.5" />
                  {t("search.clearFilters")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {result.results.map((p: any) => (
                <ProfessionalCard
                  key={p._id}
                  profile={p}
                  saved={savedIds?.includes(p._id)}
                  onToggleSaved={async (id) => {
                    try {
                      const res = await toggleSaved({ professionalId: id as any });
                      toast.success(
                        res.saved ? t("card.saved") : t("card.save"),
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : t("common.error"),
                      );
                    }
                  }}
                />
              ))}
            </div>

            {result.hasMore && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setPages((p) => p + 1)}
                >
                  <Loader2 className="h-3.5 w-3.5" />
                  {t("search.showMore")}
                </Button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {t("search.resultsOther", { count: result.total })}
              </span>
              {result.results.some((p: any) => p.demo) && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {t("search.demoNotice")}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </ProMarketShell>
  );
}

// ----------------------------------------------------------------------------
// Sous-composants locaux
// ----------------------------------------------------------------------------

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}
