import { DemoBadge, RequestStatusBadge } from "@/components/promarket/bits";
import { ProMarketEmpty } from "@/components/promarket/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import {
  PROMARKET_CATEGORY_LABELS,
  PROMARKET_REGION_LABELS,
  promarketTradeLabel,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Briefcase,
  Check,
  Coins,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Star,
  Store,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// ============================================================================
// ProMarket — administration (onglet « ProMarket » du panneau Admin)
//
// Toutes les actions passent par `api.promarketAdmin.*`, gardé côté serveur
// (admin / modérateur). Les badges de vérification ne peuvent être attribués
// que depuis cet écran.
// ============================================================================

type AdminTab =
  | "overview"
  | "professionals"
  | "requests"
  | "reviews"
  | "reports"
  | "categories";

export function ProMarketAdmin() {
  const { t } = useTranslation("promarket");
  const [tab, setTab] = useState<AdminTab>("overview");

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "overview", label: t("admin.tabs.overview") },
    { key: "professionals", label: t("admin.tabs.professionals") },
    { key: "requests", label: t("admin.tabs.requests") },
    { key: "reviews", label: t("admin.tabs.reviews") },
    { key: "reports", label: t("admin.tabs.reports") },
    { key: "categories", label: t("admin.tabs.categories") },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
          <Store className="h-4 w-4 text-primary" />
          {t("admin.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
              tab === item.key
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <StatsTab />}
      {tab === "professionals" && <ProfessionalsTab />}
      {tab === "requests" && <RequestsTab />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "categories" && <CategoriesTab />}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Statistiques
// ----------------------------------------------------------------------------

function StatsTab() {
  const { t } = useTranslation("promarket");
  const stats = useQuery(api.promarketAdmin.adminStats, {});

  if (stats === undefined) {
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const tiles = [
    { icon: Users, value: stats.professionals, label: t("admin.stats.professionals") },
    { icon: BadgeCheck, value: stats.activeProfessionals, label: t("admin.stats.activeProfessionals") },
    { icon: AlertTriangle, value: stats.pendingProfessionals, label: t("admin.stats.pendingProfessionals") },
    { icon: ShieldCheck, value: stats.verifiedProfessionals, label: t("admin.stats.verifiedProfessionals") },
    { icon: Briefcase, value: stats.requests, label: t("admin.stats.requests") },
    { icon: Coins, value: stats.quotes, label: t("admin.stats.quotes") },
    { icon: Check, value: stats.doneRequests, label: t("admin.stats.doneRequests") },
    { icon: Star, value: stats.averageRating, label: t("admin.stats.averageRating") },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile, index) => (
          <Card key={index} className="border border-border/40">
            <CardContent className="flex items-center gap-3 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <tile.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none">{tile.value}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {tile.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <BreakdownList
          title={t("admin.stats.topCategories")}
          rows={stats.byCategory.map((r) => ({
            label: PROMARKET_CATEGORY_LABELS[r.key] ?? r.key,
            value: r.value,
          }))}
        />
        <BreakdownList
          title={t("admin.stats.topRegions")}
          rows={stats.byRegion.map((r) => ({
            label: PROMARKET_REGION_LABELS[r.key] ?? r.key,
            value: r.value,
          }))}
        />
        <BreakdownList
          title={t("admin.stats.topTrades")}
          rows={stats.byTrade.map((r) => ({
            label: promarketTradeLabel(r.key),
            value: r.value,
          }))}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <SmallStat label={t("admin.stats.conversion")} value={`${stats.conversionRate}%`} />
        <SmallStat label={t("admin.stats.pendingReviews")} value={stats.pendingReviews} />
        <SmallStat label={t("admin.stats.pendingReports")} value={stats.pendingReports} />
        <SmallStat label={t("admin.demoOnly")} value={stats.demoProfessionals} />
        <SmallStat label={t("admin.stats.openRequests")} value={stats.openRequests} />
        <SmallStat label={t("admin.stats.acceptedQuotes")} value={stats.acceptedQuotes} />
      </div>
    </div>
  );
}

function BreakdownList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="border border-border/40">
      <CardContent className="p-3">
        <p className="text-xs font-semibold">{title}</p>
        {rows.length === 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">—</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {rows.map((row) => (
              <li key={row.label} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate">{row.label}</span>
                  <span className="font-medium text-muted-foreground">{row.value}</span>
                </div>
                <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.round((row.value / max) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SmallStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
      <p className="text-sm font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Professionnels
// ----------------------------------------------------------------------------

function ProfessionalsTab() {
  const { t } = useTranslation("promarket");
  const [status, setStatus] = useState<string>("");
  const [demoOnly, setDemoOnly] = useState(false);
  const [search, setSearch] = useState("");

  const professionals = useQuery(api.promarketAdmin.adminListProfessionals, {
    ...(status ? { status: status as any } : {}),
    ...(demoOnly ? { demoOnly: true } : {}),
    ...(search.trim() ? { q: search.trim() } : {}),
  });
  const setProfessionalStatus = useMutation(
    api.promarketAdmin.adminSetProfessionalStatus,
  );
  const setBadges = useMutation(api.promarketAdmin.adminSetBadges);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.search")}
          className="h-9 max-w-xs text-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">{t("admin.filterAll")}</option>
          <option value="pending">{t("admin.pending")}</option>
          <option value="active">{t("admin.active")}</option>
          <option value="suspended">{t("admin.suspended")}</option>
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={demoOnly}
            onChange={(e) => setDemoOnly(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {t("admin.demoOnly")}
        </label>
      </div>

      {professionals === undefined ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : professionals.length === 0 ? (
        <ProMarketEmpty title={t("admin.noProfessionals")} />
      ) : (
        <ul className="space-y-2">
          {professionals.map((profile: any) => (
            <li
              key={profile._id}
              className="rounded-2xl border border-border/50 bg-background/60 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {profile.companyName || profile.displayName}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        profile.status === "active" &&
                          "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                        profile.status === "pending" &&
                          "border-amber-500/30 text-amber-600 dark:text-amber-400",
                        profile.status === "suspended" &&
                          "border-rose-500/30 text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {t(`admin.${profile.status}`)}
                    </Badge>
                    {profile.demo && <DemoBadge />}
                    {!profile.hasAccount && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {t("admin.demoOnly")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {profile.tradeLabel} · {profile.city}, {profile.regionLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {profile.phone} {profile.email ? `· ${profile.email}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {profile.rating.toFixed(1)} ({profile.ratingCount})
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.city}
                    </span>
                    <span>{profile.views} · vues</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {profile.status !== "active" && (
                    <Button
                      size="sm"
                      className="h-8 gap-1 text-[11px]"
                      onClick={async () => {
                        try {
                          await setProfessionalStatus({
                            professionalId: profile._id,
                            status: "active",
                          });
                          toast.success(t("admin.approve"));
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : t("common.error"),
                          );
                        }
                      }}
                    >
                      <Check className="h-3 w-3" />
                      {t("admin.approve")}
                    </Button>
                  )}
                  {profile.status !== "suspended" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-[11px]"
                      onClick={async () => {
                        try {
                          await setProfessionalStatus({
                            professionalId: profile._id,
                            status: "suspended",
                          });
                          toast.success(t("admin.suspend"));
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : t("common.error"),
                          );
                        }
                      }}
                    >
                      <Ban className="h-3 w-3" />
                      {t("admin.suspend")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Badges de vérification (attribution admin uniquement) */}
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("admin.badges")}
                </span>
                {(
                  [
                    ["verifiedIdentity", "badgeIdentity"],
                    ["verifiedPro", "badgePro"],
                    ["verifiedDocs", "badgeDocs"],
                    ["recommended", "badgeRecommended"],
                  ] as const
                ).map(([key, labelKey]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={async () => {
                      try {
                        await setBadges({
                          professionalId: profile._id,
                          [key]: !profile[key],
                        } as any);
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : t("common.error"),
                        );
                      }
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                      profile[key]
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`admin.${labelKey}`)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Demandes
// ----------------------------------------------------------------------------

function RequestsTab() {
  const { t } = useTranslation("promarket");
  const [status, setStatus] = useState("");
  const requests = useQuery(
    api.promarketAdmin.adminListRequests,
    status ? { status: status as any } : {},
  );

  return (
    <div className="space-y-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="">{t("admin.filterAll")}</option>
        {[
          "new",
          "contact",
          "quote_requested",
          "quote_received",
          "discussing",
          "accepted",
          "in_progress",
          "done",
          "canceled",
        ].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {requests === undefined ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : requests.length === 0 ? (
        <ProMarketEmpty title={t("admin.noRequests")} />
      ) : (
        <ul className="space-y-2">
          {requests.map((request: any) => (
            <li
              key={request._id}
              className="rounded-2xl border border-border/50 bg-background/60 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{request.title}</span>
                <RequestStatusBadge status={request.status} />
                {request.urgent && (
                  <Badge
                    variant="outline"
                    className="border-rose-500/30 text-[10px] text-rose-600 dark:text-rose-400"
                  >
                    {t("request.urgent")}
                  </Badge>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {request.description}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{request.tradeLabel}</span>
                <span>{request.regionLabel}</span>
                <span>{request.clientName}</span>
                {request.professionalName && <span>→ {request.professionalName}</span>}
                <span>{new Date(request.createdAt).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Avis
// ----------------------------------------------------------------------------

function ReviewsTab() {
  const { t } = useTranslation("promarket");
  const [status, setStatus] = useState("pending");
  const reviews = useQuery(
    api.promarketAdmin.adminListReviews,
    status ? { status: status as any } : {},
  );
  const moderate = useMutation(api.promarketAdmin.adminModerateReview);
  const remove = useMutation(api.promarketAdmin.adminDeleteReview);

  return (
    <div className="space-y-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="pending">{t("admin.pending")}</option>
        <option value="approved">{t("admin.reviewApprove")}</option>
        <option value="hidden">{t("admin.reviewHide")}</option>
        <option value="">{t("admin.filterAll")}</option>
      </select>

      {reviews === undefined ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : reviews.length === 0 ? (
        <ProMarketEmpty title={t("admin.noReviews")} />
      ) : (
        <ul className="space-y-2">
          {reviews.map((review: any) => (
            <li
              key={review._id}
              className="rounded-2xl border border-border/50 bg-background/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {review.professionalName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {review.professionalTrade}
                    </span>
                    {review.demo && <DemoBadge />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {review.authorName} ·{" "}
                    {new Date(review.createdAt).toLocaleDateString()} · {review.rating}/5
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {review.status !== "approved" && (
                    <Button
                      size="sm"
                      className="h-8 gap-1 text-[11px]"
                      onClick={async () => {
                        try {
                          await moderate({ reviewId: review._id, status: "approved" });
                          toast.success(t("admin.reviewApprove"));
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : t("common.error"),
                          );
                        }
                      }}
                    >
                      <Check className="h-3 w-3" />
                      {t("admin.reviewApprove")}
                    </Button>
                  )}
                  {review.status !== "hidden" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-[11px]"
                      onClick={async () => {
                        try {
                          await moderate({ reviewId: review._id, status: "hidden" });
                          toast.success(t("admin.reviewHide"));
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : t("common.error"),
                          );
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                      {t("admin.reviewHide")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-[11px] text-muted-foreground"
                    onClick={async () => {
                      try {
                        await remove({ reviewId: review._id });
                        toast.success(t("admin.reviewDelete"));
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : t("common.error"),
                        );
                      }
                    }}
                  >
                    {t("admin.reviewDelete")}
                  </Button>
                </div>
              </div>
              {review.comment && (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {review.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Signalements
// ----------------------------------------------------------------------------

function ReportsTab() {
  const { t } = useTranslation("promarket");
  const [status, setStatus] = useState("pending");
  const reports = useQuery(
    api.promarketAdmin.adminListReports,
    status ? { status: status as any } : {},
  );
  const resolve = useMutation(api.promarketAdmin.adminResolveReport);

  return (
    <div className="space-y-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="pending">{t("admin.pending")}</option>
        <option value="reviewed">{t("admin.reportResolve")}</option>
        <option value="dismissed">{t("admin.reportDismiss")}</option>
        <option value="">{t("admin.filterAll")}</option>
      </select>

      {reports === undefined ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : reports.length === 0 ? (
        <ProMarketEmpty title={t("admin.noReports")} />
      ) : (
        <ul className="space-y-2">
          {reports.map((report: any) => (
            <li
              key={report._id}
              className="rounded-2xl border border-border/50 bg-background/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {report.targetLabel ?? report.targetType}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {t("admin.reportTarget")} : {report.targetType}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t("admin.reporter")} : {report.reporterName} ·{" "}
                    {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    className="h-8 gap-1 text-[11px]"
                    onClick={async () => {
                      try {
                        await resolve({ reportId: report._id, status: "reviewed" });
                        toast.success(t("admin.reportResolve"));
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : t("common.error"),
                        );
                      }
                    }}
                  >
                    <Check className="h-3 w-3" />
                    {t("admin.reportResolve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-[11px]"
                    onClick={async () => {
                      try {
                        await resolve({ reportId: report._id, status: "dismissed" });
                        toast.success(t("admin.reportDismiss"));
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : t("common.error"),
                        );
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                    {t("admin.reportDismiss")}
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{report.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Catégories (CRUD complet)
// ----------------------------------------------------------------------------

function CategoriesTab() {
  const { t } = useTranslation("promarket");
  const categories = useQuery(api.promarketAdmin.adminListCategories, {});
  const upsert = useMutation(api.promarketAdmin.adminUpsertCategory);
  const remove = useMutation(api.promarketAdmin.adminDeleteCategory);

  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("Store");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="border border-border/40">
        <CardContent className="space-y-3 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5 text-primary" />
            {t("admin.newCategory")}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("admin.categoriesHint")}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("admin.categorySlug")}
              className="h-9 text-xs"
            />
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("admin.categoryLabel")}
              className="h-9 text-xs"
            />
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder={t("admin.categoryIcon")}
              className="h-9 text-xs"
            />
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            disabled={busy || slug.trim().length < 2 || label.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              try {
                await upsert({ slug: slug.trim(), label: label.trim(), icon });
                toast.success(t("admin.save"));
                setSlug("");
                setLabel("");
                setIcon("Store");
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : t("common.error"),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {t("admin.save")}
          </Button>
        </CardContent>
      </Card>

      {categories === undefined ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : categories.length === 0 ? (
        <ProMarketEmpty title={t("admin.noProfessionals")} />
      ) : (
        <ul className="space-y-2">
          {categories.map((category: any) => (
            <li
              key={category._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/50 bg-background/60 p-3"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{category.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {category.slug} · {category.icon} · {t("admin.categoryOrder")} :{" "}
                    {category.order}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-[11px]"
                  onClick={async () => {
                    try {
                      await upsert({
                        slug: category.slug,
                        label: category.label,
                        icon: category.icon,
                        active: !category.active,
                      });
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : t("common.error"),
                      );
                    }
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                  {category.active ? t("admin.active") : t("admin.suspended")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[11px] text-muted-foreground"
                  onClick={async () => {
                    try {
                      await remove({ slug: category.slug });
                      toast.success(t("admin.delete"));
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : t("common.error"),
                      );
                    }
                  }}
                >
                  {t("admin.delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
