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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  PROMARKET_CATEGORIES,
  PROMARKET_REGIONS,
  PROMARKET_TRADES,
  promarketTradeLabel,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  Calendar,
  Coins,
  Eye,
  Gauge,
  Inbox,
  Loader2,
  MapPin,
  Plus,
  Save,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

// ============================================================================
// ProMarket — espace professionnel (« /promarket/pro-space »)
// ============================================================================

type TabKey =
  | "overview"
  | "requests"
  | "opportunities"
  | "quotes"
  | "reviews"
  | "profile";

export default function ProMarketProSpace() {
  useDirection();
  const { t } = useTranslation("promarket");
  usePageSEO({ title: t("proSpace.title"), description: t("proSpace.subtitle") });
  const navigate = useNavigate();

  const mine = useQuery(api.promarket.getMyProfessionalProfile, {});
  const received = useQuery(api.promarket.listProfessionalRequests, {});
  const quotes = useQuery(api.promarket.listMyQuotes, {});

  const [tab, setTab] = useState<TabKey>("overview");

  const profile = mine?.profile ?? null;
  const stats = mine?.stats ?? null;

  if (mine === undefined) {
    return (
      <ProMarketShell title={t("proSpace.title")} backTo="/promarket">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </ProMarketShell>
    );
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
        profile ? (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              profile.status === "active" &&
                "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
              profile.status === "suspended" &&
                "border-rose-500/30 text-rose-600 dark:text-rose-400",
            )}
          >
            {t(`proSpace.status.${profile.status}`)}
          </Badge>
        ) : undefined
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
      {!profile ? (
        <div className="space-y-4">
          <ProMarketEmpty
            icon={<Briefcase className="h-5 w-5" />}
            title={t("proSpace.noProfile")}
            text={t("proSpace.noProfileHint")}
          />
          <ProfileForm />
        </div>
      ) : (
        <>
          {profile.demo && (
            <p className="mb-3 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              {t("proSpace.demoNotice")}
            </p>
          )}
          {profile.status === "pending" && (
            <p className="mb-3 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-[11px] text-sky-700 dark:text-sky-400">
              {t("proSpace.statusHintPending")}
            </p>
          )}
          {profile.status === "suspended" && (
            <p className="mb-3 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-700 dark:text-rose-400">
              {t("proSpace.statusHintSuspended")}
            </p>
          )}

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

            {tab === "profile" && <ProfileForm initial={profile} />}
          </div>
        </>
      )}
    </ProMarketShell>
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
    return (
      <ProMarketEmpty icon={<Inbox className="h-5 w-5" />} title={emptyLabel} />
    );
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
            {clientSide && request.clientName && (
              <span>{request.clientName}</span>
            )}
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

function ProfileForm({ initial }: { initial?: any }) {
  const { t } = useTranslation("promarket");
  const upsert = useMutation(api.promarket.upsertMyProfile);

  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [category, setCategory] = useState(
    initial?.category ?? PROMARKET_CATEGORIES[0].slug,
  );
  const [trade, setTrade] = useState(initial?.trade ?? "");
  const [kind, setKind] = useState<"independant" | "entreprise">(
    initial?.kind ?? "independant",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [specialties, setSpecialties] = useState(
    (initial?.specialties ?? []).join(", "),
  );
  const [services, setServices] = useState<
    { name: string; priceFrom?: number; unit?: string }[]
  >(initial?.services?.length ? initial.services : [{ name: "" }]);
  const [region, setRegion] = useState(initial?.region ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [zones, setZones] = useState((initial?.zones ?? []).join(", "));
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [certifications, setCertifications] = useState(
    (initial?.certifications ?? []).join(", "),
  );
  const [experienceYears, setExperienceYears] = useState(
    String(initial?.experienceYears ?? 1),
  );
  const [availability, setAvailability] = useState<"immediate" | "week" | "busy">(
    initial?.availability ?? "week",
  );
  const [urgent, setUrgent] = useState(Boolean(initial?.urgent));
  const [homeService, setHomeService] = useState(Boolean(initial?.homeService));
  const [priceFrom, setPriceFrom] = useState(
    initial?.priceFrom !== undefined ? String(initial.priceFrom) : "",
  );
  const [priceUnit, setPriceUnit] = useState(initial?.priceUnit ?? "");
  const [saving, setSaving] = useState(false);

  // Pré-remplit la catégorie quand le métier change.
  useEffect(() => {
    const found = PROMARKET_TRADES.find((tr) => tr.slug === trade);
    if (found) setCategory(found.category);
  }, [trade]);

  const trades = PROMARKET_TRADES.filter((tr) => tr.category === category);

  const save = async () => {
    setSaving(true);
    try {
      await upsert({
        displayName: displayName.trim(),
        companyName: companyName.trim() || undefined,
        trade,
        kind,
        description: description.trim() || undefined,
        specialties: specialties
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        services: services
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            priceFrom: s.priceFrom,
            unit: s.unit,
          })),
        region,
        city: city.trim(),
        zones: zones
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        certifications: certifications
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        experienceYears: Number(experienceYears) || 0,
        availability,
        urgent,
        homeService,
        priceFrom: priceFrom ? Number(priceFrom) : undefined,
        priceUnit: priceUnit.trim() || undefined,
      });
      toast.success(t("proSpace.form.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
      <SectionHeading
        icon={Briefcase}
        title={initial ? t("proSpace.editProfile") : t("proSpace.createProfile")}
        subtitle={t("proSpace.subtitle")}
      />

      <div className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("proSpace.form.displayName")}>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
          <Field label={`${t("proSpace.form.companyName")} (${t("common.optional")})`}>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("proSpace.form.kind")}>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="independant">{t("search.kindIndependant")}</option>
              <option value="entreprise">{t("search.kindEntreprise")}</option>
            </select>
          </Field>
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
        </div>

        <Field label={`${t("proSpace.form.description")} (${t("common.optional")})`}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-20 text-xs"
          />
        </Field>

        <Field label={t("proSpace.form.specialties")}>
          <Input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            className="h-9 text-xs"
          />
        </Field>

        {/* ── Services ──────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("proSpace.form.services")}
          </span>
          {services.map((service, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Input
                value={service.name}
                onChange={(e) =>
                  setServices((prev) =>
                    prev.map((s, i) =>
                      i === index ? { ...s, name: e.target.value } : s,
                    ),
                  )
                }
                placeholder={t("proSpace.form.serviceName")}
                className="h-9 min-w-[10rem] flex-1 text-xs"
              />
              <Input
                type="number"
                min={0}
                value={service.priceFrom ?? ""}
                onChange={(e) =>
                  setServices((prev) =>
                    prev.map((s, i) =>
                      i === index
                        ? {
                            ...s,
                            priceFrom: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }
                        : s,
                    ),
                  )
                }
                placeholder={t("proSpace.form.servicePrice")}
                className="h-9 w-36 text-xs"
              />
              <Input
                value={service.unit ?? ""}
                onChange={(e) =>
                  setServices((prev) =>
                    prev.map((s, i) =>
                      i === index ? { ...s, unit: e.target.value } : s,
                    ),
                  )
                }
                placeholder={t("proSpace.form.serviceUnit")}
                className="h-9 w-32 text-xs"
              />
              {services.length > 1 && (
                <button
                  type="button"
                  aria-label={t("common.close")}
                  onClick={() =>
                    setServices((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setServices((prev) => [...prev, { name: "" }])}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("proSpace.form.addService")}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("proSpace.form.region")}>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">{t("search.allRegions")}</option>
              {PROMARKET_REGIONS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("proSpace.form.city")}>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
        </div>

        <Field label={t("proSpace.form.zones")}>
          <Input
            value={zones}
            onChange={(e) => setZones(e.target.value)}
            className="h-9 text-xs"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("proSpace.form.phone")}>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
          <Field label={`${t("proSpace.form.whatsapp")} (${t("common.optional")})`}>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
          <Field label={`${t("proSpace.form.email")} (${t("common.optional")})`}>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
          <Field label={`${t("proSpace.form.website")} (${t("common.optional")})`}>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
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
          <Field label={t("proSpace.form.availability")}>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="immediate">{t("card.availability.immediate")}</option>
              <option value="week">{t("card.availability.week")}</option>
              <option value="busy">{t("card.availability.busy")}</option>
            </select>
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
        </div>

        <Field label={`${t("proSpace.form.priceUnit")} (${t("common.optional")})`}>
          <Input
            value={priceUnit}
            onChange={(e) => setPriceUnit(e.target.value)}
            className="h-9 text-xs"
          />
        </Field>

        <Field label={`${t("proSpace.form.certifications")} (${t("common.optional")})`}>
          <Input
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
            className="h-9 text-xs"
          />
        </Field>

        <div className="flex flex-wrap gap-4">
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

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            disabled={saving}
            onClick={save}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? t("proSpace.form.saving") : t("proSpace.form.save")}
          </Button>
          {trade && (
            <span className="text-[11px] text-muted-foreground">
              {promarketTradeLabel(trade)}
            </span>
          )}
        </div>
      </div>
    </section>
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
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
