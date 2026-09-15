import { ProMarketAssistant } from "@/components/promarket/ProMarketAssistant";
import {
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
  PROMARKET_REGIONS,
  PROMARKET_TRADES,
  promarketRegionLabel,
  promarketTradeLabel,
} from "@/lib/promarketMeta";
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// ============================================================================
// ProMarket — page d'accueil (« /promarket »)
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

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [seeding, setSeeding] = useState(false);
  const ensureDemoData = useMutation(api.promarket.ensureDemoData);

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

  const goSearch = (overrides?: {
    q?: string;
    trade?: string;
    region?: string;
  }) => {
    const params = new URLSearchParams();
    const finalQuery = overrides?.q ?? query.trim();
    const finalRegion = overrides?.region ?? region;
    if (finalQuery) params.set("q", finalQuery);
    if (finalRegion) params.set("region", finalRegion);
    if (overrides?.trade) params.set("trade", overrides.trade);
    if (geo.coords) {
      params.set("lat", String(geo.coords.lat));
      params.set("lng", String(geo.coords.lng));
    }
    navigate(`/promarket/search?${params.toString()}`);
  };

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
        <Button
          size="sm"
          variant="outline"
          className="hidden h-9 gap-1.5 text-xs sm:inline-flex"
          onClick={() => navigate("/promarket/pro-space")}
        >
          <Briefcase className="h-3.5 w-3.5" />
          {t("nav.proSpace")}
        </Button>
      }
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/[0.06] via-background to-emerald-500/[0.05] p-4 sm:p-6">
        <h2 className="text-xl font-bold leading-tight sm:text-2xl lg:text-3xl">
          {t("hero.title")}
        </h2>
        <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground sm:text-sm">
          {t("hero.subtitle")}
        </p>

        <div className="mt-4 flex flex-col gap-2 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goSearch()}
              placeholder={t("hero.searchPlaceholder")}
              aria-label={t("hero.searchPlaceholder")}
              className="h-11 ps-9 text-sm"
            />
          </div>
          <div className="relative lg:w-64">
            <MapPin className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label={t("search.region")}
              className="h-11 w-full appearance-none rounded-md border border-input bg-background ps-9 pe-8 text-sm"
            >
              <option value="">{t("hero.wherePlaceholder")}</option>
              {PROMARKET_REGIONS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-11 flex-1 gap-1.5 px-5 text-sm lg:flex-none"
              onClick={() => goSearch()}
            >
              <Search className="h-4 w-4" />
              {t("hero.searchButton")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-11 gap-1.5 text-xs"
              onClick={geo.request}
              disabled={geo.status === "loading"}
            >
              <Navigation className="h-4 w-4" />
              <span className="hidden sm:inline">
                {geo.status === "loading" ? t("hero.locating") : t("hero.useMyLocation")}
              </span>
            </Button>
          </div>
        </div>

        {geo.status === "denied" && (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            {t("hero.locationDenied")}
          </p>
        )}
        {geo.status === "ready" && (
          <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
            {t("hero.locationReady")}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
          label={t("search.allRegions")}
        />
        <StatTile
          icon={BadgeCheck}
          value={categories?.length ?? 0}
          label={t("search.allCategories")}
        />
      </section>

      {/* ── Assistant ────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <ProMarketAssistant />
      </div>

      {/* ── Catégories ───────────────────────────────────────────────────── */}
      <section className="mt-6">
        <SectionHeading
          icon={Compass}
          title={t("categories.title")}
          subtitle={t("categories.subtitle")}
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
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(categories ?? []).map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() =>
                navigate(`/promarket/search?category=${category.slug}`)
              }
              className="group flex items-start gap-3 rounded-2xl border border-border/50 bg-background/60 p-3.5 text-start transition-colors hover:border-primary/40 active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ProIcon name={category.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{category.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {category.description}
                </span>
                <span className="mt-1 block text-[11px] font-medium text-primary">
                  {category.count > 0
                    ? t("categories.professionalsOther", { count: category.count })
                    : t("assistant.noSuggestion")}
                </span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
            </button>
          ))}
        </div>
      </section>

      {/* ── Près de vous ─────────────────────────────────────────────────── */}
      {geo.coords && nearby && nearby.results.length > 0 && (
        <section className="mt-6">
          <SectionHeading
            icon={Navigation}
            title={t("hero.useMyLocation")}
            subtitle={t("search.geoHint")}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {nearby.results.map((p: any) => (
              <ProfessionalCard key={p._id} profile={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Professionnels mis en avant ──────────────────────────────────── */}
      <section className="mt-6">
        <SectionHeading
          icon={Star}
          title={t("assistant.suggestions")}
          subtitle={t("categories.subtitle")}
        />
        {featured === undefined ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <ProfessionalCardSkeleton />
            <ProfessionalCardSkeleton />
            <ProfessionalCardSkeleton />
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
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {featured.results.map((p: any) => (
                <ProfessionalCard key={p._id} profile={p} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("search.demoNotice")}
            </p>
          </>
        )}
      </section>

      {/* ── CTA espace professionnel ─────────────────────────────────────── */}
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

      {/* ── Régions couvertes ────────────────────────────────────────────── */}
      <section className="mt-6">
        <SectionHeading icon={MapPin} title={t("search.allRegions")} />
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
