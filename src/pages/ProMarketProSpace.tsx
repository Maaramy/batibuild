import {
  ProAvatar,
  RequestStatusBadge,
  SectionHeading,
  Stars,
  VerificationBadges,
} from "@/components/promarket/bits";
import { ProMarketEmpty, ProMarketShell } from "@/components/promarket/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  PROMARKET_CATEGORIES,
  PROMARKET_TRADES,
  promarketTradeLabel,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Navigate } from "react-router";
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  Calendar,
  Coins,
  Eye,
  Gauge,
  Inbox,
  Info,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// ============================================================================
// ProMarket — espace professionnel (« /promarket/pro-space »)
//
// RÈGLE D'ACCÈS PROFESSIONNELS : ProMarket ne possède AUCUN système
// d'inscription professionnelle. Cet espace est celui de l'Expert BatiBuild :
// il active/désactive ProMarket, choisit son métier du catalogue et suit son
// activité. La fiche publique est synchronisée depuis le profil Expert.
// ============================================================================

type TabKey =
  | "overview"
  | "requests"
  | "opportunities"
  | "quotes"
  | "reviews"
  | "profile";

interface ExpertSummary {
  _id: string;
  profession: string;
  displayName: string;
  companyName: string | null;
  description: string | null;
  specialties: string[];
  regions: string[];
  phone: string;
  isVisible: boolean;
  proMarketOptIn: boolean;
  proMarketAvailable: boolean;
  proMarketStatus: "pending" | "active" | "disabled" | null;
  proMarketPrefs: {
    trade?: string;
    kind?: "independant" | "entreprise";
    availability?: "immediate" | "week" | "busy";
    experienceYears?: number;
    priceFrom?: number;
    priceUnit?: string;
    urgent?: boolean;
    homeService?: boolean;
  } | null;
}

interface EligibilitySummary {
  eligible: boolean;
  available: boolean;
  reasons: string[];
}

export default function ProMarketProSpace() {
  useDirection();
  const { t } = useTranslation("promarket");
  usePageSEO({ title: t("proSpace.title"), description: t("proSpace.subtitle") });
  const navigate = useNavigate();

  const mine = useQuery(api.promarket.getMyProfessionalProfile, {});
  const received = useQuery(api.promarket.listProfessionalRequests, {});
  const quotes = useQuery(api.promarket.listMyQuotes, {});

  const [tab, setTab] = useState<TabKey>("overview");

  const expert = (mine?.expert ?? null) as ExpertSummary | null;
  const eligibility = (mine?.eligibility ?? null) as EligibilitySummary | null;
  const profile = mine?.profile ?? null;
  const stats = mine?.stats ?? null;

  if (mine === undefined) {
    return (
      <ProMarketShell title={t("proSpace.title")} backTo="/promarket">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </ProMarketShell>
    );
  }

  // §1 — Espace professionnel STRICTEMENT réservé aux Experts BatiBuild :
  // un compte sans profil Expert n'y accède pas, même via une URL directe.
  // Le backend applique la même règle (aucune donnée n'est servie à ces
  // comptes et les mutations de l'espace pro les refusent).
  if (mine.access === "denied" || !expert) {
    return <Navigate to="/promarket" replace />;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: t("proSpace.tabs.overview") },
    { key: "requests", label: t("proSpace.tabs.requests") },
    { key: "opportunities", label: t("proSpace.tabs.opportunities") },
    { key: "quotes", label: t("proSpace.tabs.quotes") },
    { key: "reviews", label: t("proSpace.tabs.reviews") },
    { key: "profile", label: t("proSpace.tabs.profile") },
  ];

  return (
    <ProMarketShell
      title={t("proSpace.title")}
      subtitle={t("proSpace.subtitle")}
      backTo="/promarket"
      badge={
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            eligibility?.eligible &&
              "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
            !eligibility?.eligible &&
              expert.proMarketStatus !== "disabled" &&
              "border-sky-500/30 text-sky-600 dark:text-sky-400",
            expert.proMarketStatus === "disabled" &&
              "border-rose-500/30 text-rose-600 dark:text-rose-400",
          )}
        >
          {expert.proMarketStatus === "disabled"
            ? t("proSpace.status.suspended")
            : eligibility?.eligible
              ? t("proSpace.status.active")
              : t("proSpace.status.pending")}
        </Badge>
      }
      action={
        profile ? (
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            onClick={() => navigate(`/promarket/pro/${profile._id}`)}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("card.viewProfile")}</span>
          </Button>
        ) : undefined
      }
    >
      <ProMarketExpertStatus expert={expert} eligibility={eligibility} />

      {!profile ? (
        <div className="mt-3">
          <ProMarketPreferencesPanel expert={expert} eligibility={eligibility} />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
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

          <div className="mt-4">
            {tab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  <StatCard
                    icon={Inbox}
                    value={stats?.newRequests ?? 0}
                    label={t("proSpace.stats.newRequests")}
                  />
                  <StatCard
                    icon={Briefcase}
                    value={stats?.activeRequests ?? 0}
                    label={t("proSpace.stats.activeRequests")}
                  />
                  <StatCard
                    icon={Banknote}
                    value={stats?.quotesSent ?? 0}
                    label={t("proSpace.stats.quotesSent")}
                  />
                  <StatCard
                    icon={Target}
                    value={stats?.quotesAccepted ?? 0}
                    label={t("proSpace.stats.quotesAccepted")}
                  />
                  <StatCard
                    icon={BadgeCheck}
                    value={stats?.jobsDone ?? 0}
                    label={t("proSpace.stats.jobsDone")}
                  />
                  <StatCard
                    icon={Star}
                    value={stats?.rating ?? 0}
                    label={t("proSpace.stats.rating")}
                  />
                  <StatCard
                    icon={Eye}
                    value={stats?.views ?? 0}
                    label={t("proSpace.stats.views")}
                  />
                  <StatCard
                    icon={Users}
                    value={stats?.contacts ?? 0}
                    label={t("proSpace.stats.contacts")}
                  />
                  <StatCard
                    icon={Gauge}
                    value={
                      stats?.responseRate === null || stats?.responseRate === undefined
                        ? "—"
                        : `${stats.responseRate}%`
                    }
                    label={t("proSpace.stats.responseRate")}
                  />
                  <StatCard
                    icon={TrendingUp}
                    value={profile.ratingCount}
                    label={t("card.reviewsOther", { count: profile.ratingCount })}
                  />
                </div>

                <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <SectionHeading icon={Briefcase} title={profile.displayName} />
                  <div className="mt-2 flex items-start gap-3">
                    <ProAvatar name={profile.displayName} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {profile.tradeLabel} · {profile.city}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Stars value={profile.rating} />
                        <VerificationBadges profile={profile} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile.specialties.map((s: string) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="border-border/60 text-[10px] font-normal"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {tab === "requests" && (
              <RequestList
                items={received?.assigned ?? []}
                emptyLabel={t("proSpace.noRequests")}
                clientSide
              />
            )}

            {tab === "opportunities" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {t("proSpace.opportunitiesHint")}
                </p>
                <RequestList
                  items={received?.opportunities ?? []}
                  emptyLabel={t("proSpace.noOpportunities")}
                />
              </div>
            )}

            {tab === "quotes" && (
              <div className="space-y-2">
                {(quotes?.sent ?? []).length === 0 ? (
                  <ProMarketEmpty
                    icon={<Coins className="h-5 w-5" />}
                    title={t("proSpace.noQuotes")}
                  />
                ) : (
                  (quotes?.sent ?? []).map((quote: any) => (
                    <div
                      key={quote._id}
                      className="rounded-2xl border border-border/50 bg-background/60 p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {quote.requestTitle || quote.tradeLabel}
                        </span>
                        <RequestStatusBadge status={quote.requestStatus ?? "new"} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {quote.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="font-medium text-primary">
                          {quote.price} TND
                        </span>
                        {quote.delayDays !== undefined && (
                          <span>
                            {t("request.quoteForm.delay")} : {quote.delayDays}
                          </span>
                        )}
                        <span>
                          {quote.status === "accepted"
                            ? t("request.accepted")
                            : quote.status === "refused"
                              ? t("request.refused")
                              : t("request.quoteStatusSent")}
                        </span>
                        <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-3">
                <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
                  <SectionHeading
                    icon={Star}
                    title={t("profile.reviews")}
                    subtitle={t("card.reviewsOther", { count: profile.ratingCount })}
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-2xl font-bold">{profile.rating.toFixed(1)}</p>
                    <Stars value={profile.rating} size="md" />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("profile.noReviewsHint")}
                  </p>
                </section>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => navigate(`/promarket/pro/${profile._id}`)}
                >
                  <Star className="h-3.5 w-3.5" />
                  {t("proSpace.tabs.reviews")}
                </Button>
              </div>
            )}

            {tab === "profile" && (
              <ProMarketPreferencesPanel expert={expert} eligibility={eligibility} />
            )}
          </div>
        </>
      )}
    </ProMarketShell>
  );
}

// ----------------------------------------------------------------------------
// Statut ProMarket (éligibilité Expert + validation administrateur)
// ----------------------------------------------------------------------------

function ProMarketExpertStatus({
  expert,
  eligibility,
}: {
  expert: ExpertSummary;
  eligibility: EligibilitySummary | null;
}) {
  const { t } = useTranslation("promarket");

  const reasons = eligibility?.reasons ?? [];
  const tone = eligibility?.eligible
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : expert.proMarketStatus === "disabled"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
      : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400";

  return (
    <div className="space-y-2">
      <div className={cn("rounded-xl border px-3 py-2 text-[11px]", tone)}>
        <p className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" />
          {eligibility?.eligible
            ? t("proSpace.expertOnly.eligibleTitle")
            : t("proSpace.expertOnly.ineligibleTitle")}
        </p>
        {reasons.length > 0 && (
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {reasons.map((reason) => (
              <li key={reason}>{t(`proSpace.expertOnly.reasons.${reason}`)}</li>
            ))}
          </ul>
        )}
        {eligibility?.eligible && !eligibility.available && (
          <p className="mt-1">{t("proSpace.expertOnly.reasons.paused")}</p>
        )}
      </div>
      <p className="flex items-start gap-1.5 rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t("proSpace.expertOnly.syncNotice")}
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Activation ProMarket + préférences (écrites sur le profil Expert)
// ----------------------------------------------------------------------------

function ProMarketPreferencesPanel({
  expert,
  eligibility,
}: {
  expert: ExpertSummary;
  eligibility: EligibilitySummary | null;
}) {
  const { t } = useTranslation("promarket");
  const navigate = useNavigate();
  const persist = useMutation(api.promarket.setMyProMarketPreferences);

  const prefs = expert.proMarketPrefs ?? {};
  const [available, setAvailable] = useState(expert.proMarketAvailable);
  const [category, setCategory] = useState<string>(
    PROMARKET_TRADES.find((tr) => tr.slug === prefs.trade)?.category ??
      PROMARKET_CATEGORIES[0].slug,
  );
  const [trade, setTrade] = useState(prefs.trade ?? "");
  const [kind, setKind] = useState<"independant" | "entreprise">(
    prefs.kind ?? (expert.companyName ? "entreprise" : "independant"),
  );
  const [availability, setAvailability] = useState<"immediate" | "week" | "busy">(
    prefs.availability ?? "week",
  );
  const [experienceYears, setExperienceYears] = useState(
    String(prefs.experienceYears ?? 0),
  );
  const [priceFrom, setPriceFrom] = useState(
    prefs.priceFrom !== undefined ? String(prefs.priceFrom) : "",
  );
  const [priceUnit, setPriceUnit] = useState(prefs.priceUnit ?? "");
  const [urgent, setUrgent] = useState(Boolean(prefs.urgent));
  const [homeService, setHomeService] = useState(Boolean(prefs.homeService));
  const [saving, setSaving] = useState(false);

  const trades = PROMARKET_TRADES.filter((tr) => tr.category === category);

  const submit = async () => {
    setSaving(true);
    try {
      await persist({
        available,
        trade: trade || undefined,
        kind,
        availability,
        experienceYears: Number(experienceYears) || 0,
        priceFrom: priceFrom ? Number(priceFrom) : undefined,
        priceUnit: priceUnit.trim() || undefined,
        urgent,
        homeService,
      });
      toast.success(t("proSpace.form.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
        <SectionHeading
          icon={Briefcase}
          title={t("proSpace.expertOnly.activationTitle")}
          subtitle={t("proSpace.expertOnly.activationHint")}
        />

        <p className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t("proSpace.expertOnly.autoNotice")}
        </p>

        <div className="mt-3 space-y-2.5">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/50 bg-muted/10 p-3">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block text-xs font-semibold">
                {t("proSpace.expertOnly.available")}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {t("proSpace.expertOnly.availableHint")}
              </span>
            </span>
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={t("search.category")}>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setTrade("");
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              {PROMARKET_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("proSpace.form.trade")}>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">{t("search.allTrades")}</option>
              {trades.map((tr) => (
                <option key={tr.slug} value={tr.slug}>
                  {tr.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("proSpace.form.kind")}>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "independant" | "entreprise")}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="independant">{t("search.kindIndependant")}</option>
              <option value="entreprise">{t("search.kindEntreprise")}</option>
            </select>
          </Field>
          <Field label={t("proSpace.form.availability")}>
            <select
              value={availability}
              onChange={(e) =>
                setAvailability(e.target.value as "immediate" | "week" | "busy")
              }
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="immediate">{t("card.availability.immediate")}</option>
              <option value="week">{t("card.availability.week")}</option>
              <option value="busy">{t("card.availability.busy")}</option>
            </select>
          </Field>
          <Field label={t("proSpace.form.experienceYears")}>
            <Input
              type="number"
              min={0}
              max={70}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
          <Field label={`${t("proSpace.form.priceFrom")} (${t("common.optional")})`}>
            <Input
              type="number"
              min={0}
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
          <Field label={`${t("proSpace.form.priceUnit")} (${t("common.optional")})`}>
            <Input
              value={priceUnit}
              onChange={(e) => setPriceUnit(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t("proSpace.form.urgent")}
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={homeService}
              onChange={(e) => setHomeService(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t("proSpace.form.homeService")}
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            disabled={saving}
            onClick={submit}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? t("proSpace.form.saving") : t("proSpace.form.save")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => navigate("/dashboard/expert")}
          >
            <UserRound className="h-3.5 w-3.5" />
            {t("proSpace.expertOnly.editExpert")}
          </Button>
          {trade && (
            <span className="text-[11px] text-muted-foreground">
              {promarketTradeLabel(trade)}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
        <SectionHeading
          icon={ShieldCheck}
          title={t("proSpace.expertOnly.syncedTitle")}
          subtitle={t("proSpace.expertOnly.syncedHint")}
        />
        <dl className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
          <SyncedRow label={t("proSpace.form.displayName")} value={expert.displayName} />
          <SyncedRow
            label={t("proSpace.form.companyName")}
            value={expert.companyName ?? "—"}
          />
          <SyncedRow label={t("proSpace.form.phone")} value={expert.phone} />
          <SyncedRow
            label={t("proSpace.form.specialties")}
            value={expert.specialties.join(", ") || "—"}
          />
          <SyncedRow
            label={t("proSpace.form.region")}
            value={expert.regions.join(", ") || "—"}
          />
          <SyncedRow
            label={t("proSpace.form.description")}
            value={expert.description || "—"}
          />
        </dl>
      </section>
    </div>
  );
}

function SyncedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 line-clamp-2 text-foreground">{value}</dd>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sous-composants
// ----------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Inbox;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-base font-bold leading-none">{value}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function RequestList({
  items,
  emptyLabel,
  clientSide,
}: {
  items: any[];
  emptyLabel: string;
  clientSide?: boolean;
}) {
  const { t } = useTranslation("promarket");
  const navigate = useNavigate();

  if (items.length === 0) {
    return <ProMarketEmpty icon={<Inbox className="h-5 w-5" />} title={emptyLabel} />;
  }

  return (
    <ul className="space-y-2">
      {items.map((request) => (
        <li
          key={request._id}
          className="rounded-2xl border border-border/50 bg-background/60 p-3.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{request.title}</span>
            <RequestStatusBadge status={request.status} />
            {request.unreadCount > 0 && (
              <Badge className="bg-primary text-[10px] text-primary-foreground">
                {t("request.unread", { count: request.unreadCount })}
              </Badge>
            )}
            {request.urgent && (
              <Badge
                variant="outline"
                className="border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-600 dark:text-rose-400"
              >
                {t("request.urgent")}
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {request.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {request.regionLabel}
              {request.city ? ` · ${request.city}` : ""}
            </span>
            {clientSide && request.clientName && <span>{request.clientName}</span>}
            {request.budget !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Coins className="h-3 w-3" />
                {request.budget} TND
              </span>
            )}
            {request.deadline && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {request.deadline}
              </span>
            )}
            {request.myQuote && (
              <span className="font-medium text-primary">
                {request.myQuote.price} TND
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 gap-1.5 text-xs"
            onClick={() => navigate(`/promarket/request/${request._id}`)}
          >
            <Coins className="h-3.5 w-3.5" />
            {request.myQuote ? t("request.detailTitle") : t("proSpace.quoteNow")}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
