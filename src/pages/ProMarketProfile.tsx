import { AttachmentPicker } from "@/components/promarket/AttachmentPicker";
import {
  ProAvatar,
  DemoBadge,
  MetaChip,
  RatingInline,
  RequestStatusBadge,
  SectionHeading,
  Stars,
  VerificationBadges,
} from "@/components/promarket/bits";
import { ProMarketEmpty, ProMarketShell } from "@/components/promarket/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import type { ForumAttachmentInput } from "@/lib/forumUpload";
import {
  PROMARKET_AVAILABILITY_LABELS,
  PROMARKET_REVIEW_CRITERIA,
  PROMARKET_REVIEW_CRITERIA_LABELS,
  promarketRegion,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  Heart,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Star,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

// ============================================================================
// ProMarket — profil professionnel (« /promarket/pro/:professionalId »)
// ============================================================================

export default function ProMarketProfile() {
  useDirection();
  const { t } = useTranslation("promarket");
  const navigate = useNavigate();
  const { professionalId } = useParams<{ professionalId: string }>();

  const detail = useQuery(
    api.promarket.getProfessional,
    professionalId ? { professionalId: professionalId as any } : "skip",
  );
  const myRequests = useQuery(api.promarket.listMyRequests, {});
  const registerView = useMutation(api.promarket.registerView);
  const registerContact = useMutation(api.promarket.registerContact);
  const toggleSaved = useMutation(api.promarket.toggleSavedProfessional);
  const createRequest = useMutation(api.promarket.createRequest);
  const createReview = useMutation(api.promarket.createReview);
  const reportTarget = useMutation(api.promarket.reportTarget);

  const profile = detail?.profile;

  usePageSEO({
    title: profile
      ? `${profile.companyName || profile.displayName} — ${profile.tradeLabel} · ProMarket`
      : t("search.title"),
    description: profile?.description ?? t("meta.description"),
  });

  // Compteur de vues : une seule fois par fiche affichée.
  useEffect(() => {
    if (!professionalId) return;
    registerView({ professionalId: professionalId as any }).catch(() => {});
  }, [professionalId, registerView]);

  // Demande éligible à un avis (intervention acceptée / terminée).
  const eligibleRequest = useMemo(() => {
    if (!myRequests || !professionalId) return undefined;
    return myRequests.find(
      (r: any) =>
        r.professional?._id === professionalId &&
        ["accepted", "in_progress", "done"].includes(r.status),
    );
  }, [myRequests, professionalId]);

  const [requestDialog, setRequestDialog] = useState<null | "quote" | "service">(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  if (detail === undefined) {
    return (
      <ProMarketShell title={t("common.loading")}>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </ProMarketShell>
    );
  }

  if (!profile) {
    return (
      <ProMarketShell title={t("profile.notFound")}>
        <ProMarketEmpty
          title={t("profile.notFound")}
          text={t("search.noResultsHint")}
          action={
            <Button size="sm" className="mt-1 text-xs" onClick={() => navigate("/promarket/search")}>
              {t("nav.search")}
            </Button>
          }
        />
      </ProMarketShell>
    );
  }

  const region = promarketRegion(profile.region);
  const ratingBreakdown = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: detail.reviews.filter((r: any) => Math.round(r.rating) === score).length,
  }));
  const totalReviews = detail.reviews.length || 1;

  return (
    <ProMarketShell
      title={profile.companyName || profile.displayName}
      subtitle={`${profile.tradeLabel} · ${profile.city}${
        region ? `, ${region.label}` : ""
      }`}
      badge={<VerificationBadges profile={profile} />}
      backTo="/promarket"
    >
      {/* ── Carte d'en-tête ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ProAvatar name={profile.displayName} className="h-16 w-16 rounded-2xl text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold sm:text-lg">
                {profile.companyName || profile.displayName}
              </h2>
              {profile.recommended && (
                <Badge className="gap-1 bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                  <BadgeCheck className="h-3 w-3" />
                  {t("card.recommended")}
                </Badge>
              )}
              {profile.demo && <DemoBadge />}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {profile.companyName ? `${profile.displayName} · ` : ""}
              {profile.tradeLabel}
              {profile.kind === "entreprise" ? ` · ${t("search.kindEntreprise")}` : ""}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <RatingInline rating={profile.rating} count={profile.ratingCount} />
              <MetaChip icon={MapPin}>
                {profile.city}
                {region ? ` · ${region.label}` : ""}
              </MetaChip>
              {profile.distanceKm !== undefined && (
                <MetaChip icon={MapPin}>
                  {t("card.distance", { km: profile.distanceKm })}
                </MetaChip>
              )}
              <MetaChip icon={Wrench}>
                {t("card.experience", { count: profile.experienceYears })}
              </MetaChip>
              <MetaChip icon={Clock}>
                {PROMARKET_AVAILABILITY_LABELS[profile.availability]}
              </MetaChip>
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

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-3">
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setRequestDialog("quote")}
          >
            <Send className="h-3.5 w-3.5" />
            {t("profile.requestQuote")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setRequestDialog("service")}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {t("profile.message")}
          </Button>
          {profile.phone && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() =>
                registerContact({
                  professionalId: profile._id as any,
                  channel: "phone",
                }).catch(() => {})
              }
            >
              <a href={`tel:${profile.phone.replace(/\s+/g, "")}`}>
                <Phone className="h-3.5 w-3.5" />
                {t("card.call")}
              </a>
            </Button>
          )}
          {profile.whatsapp && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() =>
                registerContact({
                  professionalId: profile._id as any,
                  channel: "whatsapp",
                }).catch(() => {})
              }
            >
              <a
                href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="h-3.5 w-3.5" />
                {t("card.whatsapp")}
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className={cn("gap-1.5 text-xs", detail.saved && "text-rose-600")}
            onClick={async () => {
              try {
                const res = await toggleSaved({
                  professionalId: profile._id as any,
                });
                toast.success(res.saved ? t("card.saved") : t("card.save"));
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : t("common.error"),
                );
              }
            }}
          >
            <Heart className={cn("h-3.5 w-3.5", detail.saved && "fill-rose-500")} />
            {detail.saved ? t("profile.savedState") : t("profile.save")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setReportOpen(true)}
          >
            <Flag className="h-3.5 w-3.5" />
            {t("profile.report")}
          </Button>
        </div>

        {profile.demo && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            {t("profile.demoNote")}
          </p>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* ── Présentation ─────────────────────────────────────────────── */}
          {profile.description && (
            <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <SectionHeading icon={ThumbsUp} title={t("profile.about")} />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {profile.description}
              </p>
            </section>
          )}

          {/* ── Services ─────────────────────────────────────────────────── */}
          {profile.services.length > 0 && (
            <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <SectionHeading icon={Wrench} title={t("profile.services")} />
              <ul className="mt-2 divide-y divide-border/40">
                {profile.services.map((service: any, index: number) => (
                  <li
                    key={`${service.name}-${index}`}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium sm:text-sm">
                        {service.name}
                      </p>
                      {service.description && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      {service.priceFrom !== undefined
                        ? t("card.from", {
                            price: service.priceFrom,
                            unit: service.unit ?? "TND",
                          })
                        : t("card.priceOnRequest")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Réalisations ─────────────────────────────────────────────── */}
          {(profile as any).gallery?.length > 0 && (
            <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <SectionHeading icon={Star} title={t("profile.gallery")} />
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(profile as any).gallery.map((item: any) => (
                  <figure
                    key={item.storageId}
                    className="overflow-hidden rounded-xl border border-border/50"
                  >
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.caption ?? item.name ?? profile.displayName}
                        className="h-28 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center bg-muted/20 text-[11px] text-muted-foreground">
                        {item.name ?? profile.displayName}
                      </div>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* ── Avis ─────────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <SectionHeading
              icon={Star}
              title={t("profile.reviews")}
              subtitle={t("card.reviewsOther", { count: profile.ratingCount })}
              action={
                eligibleRequest ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => setReviewOpen(true)}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {t("profile.reviewForm.title")}
                  </Button>
                ) : undefined
              }
            />

            {detail.reviews.length === 0 ? (
              <div className="mt-3">
                <ProMarketEmpty
                  title={t("profile.noReviews")}
                  text={t("profile.noReviewsHint")}
                />
              </div>
            ) : (
              <>
                <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{profile.rating.toFixed(1)}</p>
                    <Stars value={profile.rating} size="md" />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("card.reviewsOther", { count: profile.ratingCount })}
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {ratingBreakdown.map((row) => (
                      <li key={row.score} className="flex items-center gap-2">
                        <span className="w-6 text-[11px] text-muted-foreground">
                          {row.score}★
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-amber-400"
                            style={{
                              width: `${Math.round((row.count / totalReviews) * 100)}%`,
                            }}
                          />
                        </span>
                        <span className="w-6 text-end text-[11px] text-muted-foreground">
                          {row.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <ul className="mt-3 space-y-2 border-t border-border/40 pt-3">
                  {detail.reviews.map((review: any) => (
                    <li
                      key={review._id}
                      className="rounded-xl border border-border/40 bg-muted/10 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ProAvatar name={review.authorName} className="h-8 w-8 rounded-lg" />
                          <div>
                            <p className="text-xs font-medium">{review.authorName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {review.demo && <DemoBadge />}
                          <Stars value={review.rating} />
                        </div>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {review.comment}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {PROMARKET_REVIEW_CRITERIA.map((criterion) => (
                          <span
                            key={criterion}
                            className="text-[10px] text-muted-foreground"
                          >
                            {PROMARKET_REVIEW_CRITERIA_LABELS[criterion]} :{" "}
                            <span className="font-medium text-foreground">
                              {review[criterion]}/5
                            </span>
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        {/* ── Colonne latérale ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <SectionHeading icon={ShieldCheck} title={t("profile.information")} />
            <ul className="mt-2 space-y-2 text-xs">
              <InfoRow label={t("profile.experience")} value={
                t("card.experience", { count: profile.experienceYears })
              } />
              <InfoRow
                label={t("profile.availability")}
                value={PROMARKET_AVAILABILITY_LABELS[profile.availability]}
              />
              <InfoRow
                label={t("profile.professionalStatus")}
                value={
                  profile.kind === "entreprise"
                    ? t("search.kindEntreprise")
                    : t("search.kindIndependant")
                }
              />
              <InfoRow
                label={t("profile.insurance")}
                value={t("profile.insuranceUnknown")}
              />
              <InfoRow
                label={t("card.completedJobs", { count: profile.completedCount ?? 0 })}
                value={`${profile.views} ${t("proSpace.stats.views")}`}
              />
            </ul>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.verifiedDocs && (
                <Badge variant="outline" className="gap-1 border-violet-500/30 text-[10px] text-violet-600 dark:text-violet-400">
                  <BadgeCheck className="h-3 w-3" />
                  {t("card.verifiedDocs")}
                </Badge>
              )}
              {profile.certifications.length > 0 && (
                <Badge variant="outline" className="border-border/60 text-[10px]">
                  {profile.certifications.length} · {t("profile.certifications")}
                </Badge>
              )}
            </div>

            {profile.certifications.length > 0 && (
              <ul className="mt-2 space-y-1">
                {profile.certifications.map((c: string) => (
                  <li key={c} className="flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <SectionHeading icon={MapPin} title={t("profile.zones")} />
            <p className="mt-2 text-xs text-muted-foreground">
              {region ? region.label : profile.region} · {profile.city}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {profile.zones.map((zone: string) => (
                <Badge
                  key={zone}
                  variant="outline"
                  className="border-border/60 text-[10px] font-normal"
                >
                  {zone}
                </Badge>
              ))}
            </div>
          </section>

          {(profile.email || profile.website) && (
            <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <SectionHeading icon={Mail} title={t("profile.contact")} />
              <div className="mt-2 space-y-1.5 text-xs">
                {profile.email && (
                  <p className="flex items-center gap-1.5 break-all">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {profile.email}
                  </p>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    {profile.website}
                  </a>
                )}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-border/50 bg-muted/10 p-4">
            <SectionHeading icon={Calendar} title={t("search.title")} />
            <p className="mt-2 text-xs text-muted-foreground">
              {t("search.subtitle")}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full gap-1.5 text-xs"
              onClick={() => navigate("/promarket/search")}
            >
              {t("nav.search")}
            </Button>
          </section>
        </div>
      </div>

      {/* ── Demande / devis ──────────────────────────────────────────────── */}
      {requestDialog && (
        <RequestDialog
          kind={requestDialog}
          professionalId={profile._id}
          professionalName={profile.companyName || profile.displayName}
          trade={profile.trade}
          region={profile.region}
          city={profile.city}
          onClose={() => setRequestDialog(null)}
          onSubmit={async (values) => {
            const id = await createRequest(values as any);
            await registerContact({
              professionalId: profile._id as any,
              channel: requestDialog === "quote" ? "quote" : "message",
            }).catch(() => {});
            toast.success(
              requestDialog === "quote"
                ? t("request.successTargeted")
                : t("request.successTargeted"),
            );
            setRequestDialog(null);
            navigate(`/promarket/request/${id}`);
          }}
        />
      )}

      {/* ── Avis ─────────────────────────────────────────────────────────── */}
      {reviewOpen && eligibleRequest && (
        <ReviewDialog
          professionalId={profile._id}
          requestId={eligibleRequest._id}
          onClose={() => setReviewOpen(false)}
          onSubmit={async (payload) => {
            await createReview(payload as any);
            toast.success(t("profile.reviewForm.success"));
            setReviewOpen(false);
          }}
        />
      )}

      {/* ── Signalement ──────────────────────────────────────────────────── */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t("profile.reportTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t("profile.reportSubmit")}
            </DialogDescription>
          </DialogHeader>
          <ReportForm
            onSubmit={async (reason) => {
              await reportTarget({
                targetType: "professional",
                targetId: profile._id,
                targetLabel: profile.companyName || profile.displayName,
                reason,
              });
              toast.success(t("profile.reportSent"));
              setReportOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </ProMarketShell>
  );
}

// ----------------------------------------------------------------------------
// Sous-composants
// ----------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </li>
  );
}

export function RequestDialog({
  kind,
  professionalId,
  professionalName,
  trade,
  region,
  city,
  onClose,
  onSubmit,
}: {
  kind: "quote" | "service";
  professionalId?: string;
  professionalName?: string;
  trade: string;
  region: string;
  city?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useTranslation("promarket");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetCity, setTargetCity] = useState(city ?? "");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [homeService, setHomeService] = useState(false);
  const [phone, setPhone] = useState("");
  const [preferences, setPreferences] = useState("");
  const [attachments, setAttachments] = useState<ForumAttachmentInput[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (title.trim().length < 3 || description.trim().length < 10) {
      toast.error(t("request.descriptionPlaceholder"));
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        kind,
        trade,
        title: title.trim(),
        description: description.trim(),
        region,
        city: targetCity.trim() || undefined,
        address: address.trim() || undefined,
        budget: budget ? Number(budget) : undefined,
        deadline: deadline.trim() || undefined,
        urgent,
        homeService,
        phone: phone.trim() || undefined,
        preferences: preferences.trim() || undefined,
        attachments: attachments.length ? attachments : undefined,
        professionalId: professionalId as any,
        source: "profile",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {kind === "quote" ? t("request.quoteForm.title") : t("request.newTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {professionalName
              ? `${professionalName} · ${t("request.newSubtitle")}`
              : t("request.newSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label={t("request.titleLabel")}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("request.titlePlaceholder")}
              className="h-9 text-xs"
            />
          </Field>
          <Field label={t("request.description")}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("request.descriptionPlaceholder")}
              className="min-h-24 text-xs"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("request.city")}>
              <Input
                value={targetCity}
                onChange={(e) => setTargetCity(e.target.value)}
                className="h-9 text-xs"
              />
            </Field>
            <Field label={`${t("request.budget")} (${t("common.optional")})`}>
              <Input
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="h-9 text-xs"
              />
            </Field>
          </div>
          <Field label={`${t("request.address")} (${t("common.optional")})`}>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-9 text-xs"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t("request.deadline")} (${t("common.optional")})`}>
              <Input
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder={t("request.deadlinePlaceholder")}
                className="h-9 text-xs"
              />
            </Field>
            <Field label={`${t("request.phone")} (${t("common.optional")})`}>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs"
              />
            </Field>
          </div>
          <Field label={`${t("request.preferences")} (${t("common.optional")})`}>
            <Textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder={t("request.preferencesPlaceholder")}
              className="min-h-16 text-xs"
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
              {t("request.urgent")}
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={homeService}
                onChange={(e) => setHomeService(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              {t("request.homeService")}
            </label>
          </div>

          <Field label={t("request.attachments")}>
            <AttachmentPicker value={attachments} onChange={setAttachments} />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" disabled={saving} onClick={submit}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {t("request.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  professionalId,
  requestId,
  onClose,
  onSubmit,
}: {
  professionalId: string;
  requestId: string;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useTranslation("promarket");
  const [scores, setScores] = useState<Record<string, number>>({
    quality: 5,
    punctuality: 5,
    professionalism: 5,
    value: 5,
    communication: 5,
  });
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const overall =
    Math.round(
      (Object.values(scores).reduce((a, b) => a + b, 0) /
        PROMARKET_REVIEW_CRITERIA.length) *
        10,
    ) / 10;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("profile.reviewForm.title")}</DialogTitle>
          <DialogDescription className="text-xs">
            {t("profile.reviewForm.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {PROMARKET_REVIEW_CRITERIA.map((criterion) => (
            <div
              key={criterion}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-xs">
                {PROMARKET_REVIEW_CRITERIA_LABELS[criterion]}
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n}/5`}
                    onClick={() =>
                      setScores((prev) => ({ ...prev, [criterion]: n }))
                    }
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        n <= scores[criterion]
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="rounded-lg bg-muted/20 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            {t("profile.reviewForm.overall")} : <strong>{overall}/5</strong>
          </p>

          <Field label={t("profile.reviewForm.comment")}>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("profile.reviewForm.commentPlaceholder")}
              className="min-h-20 text-xs"
            />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit({
                  professionalId,
                  requestId,
                  rating: overall,
                  quality: scores.quality,
                  punctuality: scores.punctuality,
                  professionalism: scores.professionalism,
                  value: scores.value,
                  communication: scores.communication,
                  comment: comment.trim() || undefined,
                });
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : t("common.error"),
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Star className="h-3.5 w-3.5" />
            )}
            {t("profile.reviewForm.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReportForm({
  onSubmit,
}: {
  onSubmit: (reason: string) => Promise<void>;
}) {
  const { t } = useTranslation("promarket");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-3">
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("profile.reportReason")}
        className="min-h-20 text-xs"
      />
      <DialogFooter>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          disabled={saving || reason.trim().length < 5}
          onClick={async () => {
            setSaving(true);
            try {
              await onSubmit(reason.trim());
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : t("common.error"),
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Flag className="h-3.5 w-3.5" />
          )}
          {t("profile.reportSubmit")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function Field({
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

export { RequestStatusBadge };
