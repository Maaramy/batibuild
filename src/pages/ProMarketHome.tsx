import { ProMarketAssistant } from "@/components/promarket/ProMarketAssistant";
import {
  CardCarousel,
  CarouselItem,
  CarouselTile,
  ProfessionalCard,
  ProfessionalCardSkeleton,
  ProIcon,
  SectionHeading,
} from "@/components/promarket/bits";
import { ProMarketEmpty, ProMarketShell } from "@/components/promarket/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useProMarketGeo } from "@/hooks/use-promarket-geo";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  PROMARKET_CATEGORIES,
  PROMARKET_REGIONS,
  PROMARKET_TRADES,
  promarketRegionLabel,
  promarketTradeLabel,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  ChevronDown,
  Compass,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Star,
  Store,
  Users,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// ============================================================================
// ProMarket — page d'accueil (« /promarket »)
//
// Interface volontairement compacte :
//   • un bouton d'action unique ouvre la zone de recherche dépliable ;
//   • les catégories et les professionnels sont présentés en carrousels
//     horizontaux (swipe tactile, aucun débordement de page).
// ============================================================================

const QUICK_TRADES = [
  "plombier",
  "electricien",
  "macon",
  "peintre",
  "climaticien",
  "carreleur",
  "menuisier",
  "serrurier",
  "architecte",
  "entreprise_construction",
];

export default function ProMarketHome() {
  useDirection();
  const { t } = useTranslation("promarket");
  usePageSEO({
    title: t("meta.title"),
    description: t("meta.description"),
  });
  const navigate = useNavigate();
  const geo = useProMarketGeo();

  // Recherche : la zone complète n'est montée qu'à l'ouverture du bouton.
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [trade, setTrade] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const ensureDemoData = useMutation(api.promarket.ensureDemoData);

  // Espace professionnel : réservé aux Experts BatiBuild. Le drapeau vient du
  // serveur ; aucun état local ne peut l'activer.
  const access = useQuery(api.promarket.getMyProMarketAccess, {});
  const isExpert = access?.isExpert === true;

  const categories = useQuery(api.promarket.listCategories, {});
  const featured = useQuery(api.promarket.searchProfessionals, {
    sort: "rating",
    limit: 6,
    ...(geo.coords ? { userLat: geo.coords.lat, userLng: geo.coords.lng } : {}),
  });
  const nearby = useQuery(
    api.promarket.searchProfessionals,
    geo.coords
      ? {
          userLat: geo.coords.lat,
          userLng: geo.coords.lng,
          sort: "nearest",
          limit: 3,
        }
      : "skip",
  );

  const totalProfessionals = featured?.total ?? 0;

  const trades = useMemo(
    () => (category ? PROMARKET_TRADES.filter((tr) => tr.category === category) : PROMARKET_TRADES),
    [category],
  );

  const goSearch = (overrides?: {
    q?: string;
    trade?: string;
    region?: string;
    category?: string;
    city?: string;
    urgent?: boolean;
  }) => {
    const params = new URLSearchParams();
    const finalQuery = overrides?.q ?? query.trim();
    const finalRegion = overrides?.region ?? region;
    const finalTrade = overrides?.trade ?? trade;
    const finalCategory = overrides?.category ?? category;
    const finalCity = overrides?.city ?? city.trim();
    const finalUrgent = overrides?.urgent ?? urgent;
    if (finalQuery) params.set("q", finalQuery);
    if (finalRegion) params.set("region", finalRegion);
    if (finalTrade) params.set("trade", finalTrade);
    if (finalCategory) params.set("category", finalCategory);
    if (finalCity) params.set("city", finalCity);
    if (finalUrgent) params.set("urgent", "1");
    if (geo.coords) {
      params.set("lat", String(geo.coords.lat));
      params.set("lng", String(geo.coords.lng));
    }
    navigate(`/promarket/search?${params.toString()}`);
  };

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-background px-2 text-xs";

  return (
    <ProMarketShell
      title={t("hero.badge")}
      subtitle={t("hero.subtitle")}
      badge={
        <Badge className="gap-1 bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
          <Store className="h-3 w-3" />
          {t("nav.home")}
        </Badge>
      }
      action={
        isExpert ? (
          <Button
            size="sm"
            variant="outline"
            className="hidden h-9 gap-1.5 border-border bg-transparent text-xs hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary sm:inline-flex"
            onClick={() => navigate("/promarket/pro-space")}
          >
            <Briefcase className="h-3.5 w-3.5" />
            {t("nav.proSpace")}
          </Button>
        ) : undefined
      }
    >
      {/* ── Recherche : bouton compact + zone dépliable ──────────────────── */}
      <section className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/[0.06] via-background to-emerald-500/[0.05] p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setSearchOpen((value) => !value)}
          aria-expanded={searchOpen}
          className="group flex w-full items-center gap-3 rounded-xl border border-border bg-transparent px-3.5 py-3 text-start transition-colors hover:border-primary/50 hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] sm:px-4"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Search className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-start">
            <span className="block truncate text-sm font-semibold text-foreground sm:text-base">
              {t("hero.title")}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {t("hero.searchPlaceholder")}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-primary",
              searchOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {searchOpen && (
          <div className="mt-3 max-h-[65vh] space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-border/50 bg-background/80 p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goSearch()}
                placeholder={t("hero.searchPlaceholder")}
                aria-label={t("hero.searchPlaceholder")}
                className="h-10 ps-9 text-sm"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("search.category")}
                </span>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setTrade("");
                  }}
                  className={selectClass}
                >
                  <option value="">{t("search.allCategories")}</option>
                  {PROMARKET_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("search.trade")}
                </span>
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  className={selectClass}
                >
                  <option value="">{t("search.allTrades")}</option>
                  {trades.map((tr) => (
                    <option key={tr.slug} value={tr.slug}>
                      {tr.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("search.region")}
                </span>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={selectClass}
                >
                  <option value="">{t("hero.wherePlaceholder")}</option>
                  {PROMARKET_REGIONS.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("search.city")}
                </span>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("search.allCities")}
                  className="h-9 text-xs"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={urgent}
                  onChange={(e) => setUrgent(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                {t("search.urgent")}
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setTrade("");
                  setRegion("");
                  setCity("");
                  setUrgent(false);
                }}
              >
                {t("search.clearFilters")}
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                className="h-10 flex-1 gap-1.5 text-sm"
                onClick={() => goSearch()}
              >
                <Search className="h-4 w-4" />
                {t("hero.searchButton")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-10 gap-1.5 text-xs"
                onClick={geo.request}
                disabled={geo.status === "loading"}
              >
                <Navigation className="h-4 w-4" />
                {geo.status === "loading" ? t("hero.locating") : t("hero.useMyLocation")}
              </Button>
            </div>

            {geo.status === "denied" && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                {t("hero.locationDenied")}
              </p>
            )}
            {geo.status === "ready" && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                {t("hero.locationReady")}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("hero.quickSearch")}
              </span>
              {QUICK_TRADES.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => goSearch({ trade: slug })}
                  className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary active:scale-95"
                >
                  <ProIcon name={tradeIcon(slug)} className="h-3 w-3" />
                  {promarketTradeLabel(slug)}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Indicateurs ──────────────────────────────────────────────────── */}
      <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          icon={Users}
          value={totalProfessionals}
          label={t("categories.professionalsOther", { count: totalProfessionals })}
        />
        <StatTile
          icon={Wrench}
          value={PROMARKET_TRADES.length}
          label={t("search.allTrades")}
        />
        <StatTile
          icon={MapPin}
          value={PROMARKET_REGIONS.length}
          label={t("hero.coveredRegions")}
        />
        <StatTile
          icon={BadgeCheck}
          value={categories?.length ?? 0}
          label={t("search.allCategories")}
        />
      </section>

      {/* ── Assistant « Analyser mon besoin » ────────────────────────────── */}
      <div className="mt-4">
        <ProMarketAssistant />
      </div>

      {/* ── Catégories (carrousel : icône + nom uniquement) ──────────────── */}
      <section className="mt-6">
        <SectionHeading
          icon={Compass}
          title={t("categories.title")}
          action={
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs"
              onClick={() => navigate("/promarket/search")}
            >
              {t("nav.search")}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Button>
          }
        />
        <div className="mt-3">
          <CardCarousel label={t("categories.title")}>
            {(categories ?? []).map((category) => (
              <CarouselItem key={category.slug} size="tile">
                <CarouselTile
                  icon={<ProIcon name={category.icon} className="h-4 w-4" />}
                  label={category.label}
                  onClick={() => navigate(`/promarket/search?category=${category.slug}`)}
                />
              </CarouselItem>
            ))}
          </CardCarousel>
        </div>
      </section>

      {/* ── Près de vous (carrousel) ─────────────────────────────────────── */}
      {geo.coords && nearby && nearby.results.length > 0 && (
        <section className="mt-6">
          <SectionHeading icon={Navigation} title={t("hero.useMyLocation")} />
          <div className="mt-3">
            <CardCarousel label={t("hero.useMyLocation")}>
              {nearby.results.map((p: any) => (
                <CarouselItem key={p._id}>
                  <ProfessionalCard profile={p} className="h-full" />
                </CarouselItem>
              ))}
            </CardCarousel>
          </div>
        </section>
      )}

      {/* ── Professionnels recommandés (carrousel) ───────────────────────── */}
      <section className="mt-6">
        <SectionHeading icon={Star} title={t("assistant.suggestions")} />
        {featured === undefined ? (
          <div className="mt-3">
            <CardCarousel hideDots>
              {[0, 1, 2].map((i) => (
                <CarouselItem key={i}>
                  <ProfessionalCardSkeleton />
                </CarouselItem>
              ))}
            </CardCarousel>
          </div>
        ) : featured.results.length === 0 ? (
          <div className="mt-3">
            <ProMarketEmpty
              icon={<Store className="h-5 w-5" />}
              title={t("search.noResults")}
              text={t("assistant.noSuggestion")}
              action={
                <Button
                  size="sm"
                  className="mt-1 gap-1.5 text-xs"
                  disabled={seeding}
                  onClick={async () => {
                    setSeeding(true);
                    try {
                      await ensureDemoData({});
                      toast.success(t("demo.seeded"));
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : t("common.error"),
                      );
                    } finally {
                      setSeeding(false);
                    }
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("demo.seed")}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-3">
              <CardCarousel label={t("assistant.suggestions")}>
                {featured.results.map((p: any) => (
                  <CarouselItem key={p._id}>
                    <ProfessionalCard profile={p} className="h-full" />
                  </CarouselItem>
                ))}
              </CardCarousel>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("search.demoNotice")}
            </p>
          </>
        )}
      </section>

      {/* ── CTA espace professionnel — Experts BatiBuild uniquement ──────── */}
      {isExpert && (
        <section className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-border/50 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{t("proSpace.expertOnly.title")}</p>
              <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
                {t("proSpace.expertOnly.text")}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => navigate("/promarket/pro-space")}
          >
            {t("proSpace.expertOnly.cta")}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Button>
        </section>
      )}

      {/* ── Gouvernorats couverts ────────────────────────────────────────── */}
      <section className="mt-6">
        <SectionHeading icon={MapPin} title={t("hero.coveredRegions")} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROMARKET_REGIONS.map((r) => (
            <button
              key={r.slug}
              type="button"
              onClick={() => goSearch({ region: r.slug, q: "" })}
              className="rounded-full border border-border/50 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              {promarketRegionLabel(r.slug)}
            </button>
          ))}
        </div>
      </section>
    </ProMarketShell>
  );
}

// ----------------------------------------------------------------------------
// Sous-composants & utilitaires locaux
// ----------------------------------------------------------------------------

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-lg font-bold leading-none">{value}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function tradeIcon(slug: string): string {
  return PROMARKET_TRADES.find((t) => t.slug === slug)?.icon ?? "Store";
}
