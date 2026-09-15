import { AttachmentPicker } from "@/components/promarket/AttachmentPicker";
import {
  DemoBadge,
  MetaChip,
  ProAvatar,
  RequestStatusBadge,
  SectionHeading,
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
import type { AttachmentInput } from "@/lib/attachmentUpload";
import {
  PROMARKET_REQUEST_STATUSES,
  PROMARKET_REQUEST_STATUS_LABELS,
  promarketTradeLabel,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Banknote,
  Check,
  Coins,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Star,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

// ============================================================================
// ProMarket — suivi d'une demande (« /promarket/request/:requestId »)
// ============================================================================

export default function ProMarketRequestDetail() {
  useDirection();
  const { t } = useTranslation("promarket");
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();

  const detail = useQuery(
    api.promarket.getRequestDetail,
    requestId ? { requestId: requestId as any } : "skip",
  );
  const sendMessage = useMutation(api.promarket.sendRequestMessage);
  const markRead = useMutation(api.promarket.markRequestMessagesRead);
  const updateStatus = useMutation(api.promarket.updateRequestStatus);
  const createQuote = useMutation(api.promarket.createQuote);
  const respondToQuote = useMutation(api.promarket.respondToQuote);

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentInput[]>([]);
  const [sending, setSending] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const request = detail?.request;

  usePageSEO({
    title: request ? `${request.title} · ProMarket` : t("request.detailTitle"),
    description: request?.description ?? t("meta.description"),
  });

  // Marque les messages reçus comme lus à l'ouverture du dossier.
  useEffect(() => {
    if (!requestId) return;
    markRead({ requestId: requestId as any }).catch(() => {});
  }, [requestId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [detail?.messages.length]);

  if (detail === undefined) {
    return (
      <ProMarketShell title={t("request.detailTitle")} backTo="/promarket/requests">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </ProMarketShell>
    );
  }

  if (!detail || !request) {
    return (
      <ProMarketShell title={t("request.detailTitle")} backTo="/promarket/requests">
        <ProMarketEmpty
          title={t("common.error")}
          text={t("search.noResultsHint")}
          action={
            <Button
              size="sm"
              className="mt-1 text-xs"
              onClick={() => navigate("/promarket/requests")}
            >
              {t("nav.requests")}
            </Button>
          }
        />
      </ProMarketShell>
    );
  }

  const isProfessionalSide = !detail.isOwner;

  return (
    <ProMarketShell
      title={request.title}
      subtitle={`${request.tradeLabel} · ${request.regionLabel}${
        request.city ? ` · ${request.city}` : ""
      }`}
      badge={<RequestStatusBadge status={request.status} />}
      backTo="/promarket/requests"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* ── Demande ─────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <SectionHeading
              icon={FileText}
              title={t("request.detailTitle")}
              subtitle={new Date(request.createdAt).toLocaleString()}
            />
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {request.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <MetaChip icon={MapPin}>
                {request.regionLabel}
                {request.city ? ` · ${request.city}` : ""}
              </MetaChip>
              {request.budget !== undefined && (
                <MetaChip icon={Coins}>
                  {request.budget} TND
                </MetaChip>
              )}
              {request.deadline && (
                <MetaChip icon={FileText}>{request.deadline}</MetaChip>
              )}
              {request.phone && (
                <MetaChip icon={Phone}>{request.phone}</MetaChip>
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

            {request.attachments?.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {request.attachments.map((file: any) => (
                  <li key={file.storageId}>
                    {file.type?.startsWith("image/") && file.url ? (
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="h-20 w-20 rounded-lg border border-border/50 object-cover"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <a
                        href={file.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1 text-[11px] hover:border-primary/40"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="max-w-[10rem] truncate">{file.name}</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Conversation ────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <SectionHeading
              icon={MessageSquare}
              title={t("request.conversation")}
              subtitle={
                isProfessionalSide
                  ? detail.client.name
                  : detail.professional
                    ? detail.professional.displayName
                    : undefined
              }
            />

            <div className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto pe-1">
              {detail.messages.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {t("request.noMessages")}
                </p>
              ) : (
                detail.messages.map((msg: any) => (
                  <div
                    key={msg._id}
                    className={cn(
                      "flex gap-2",
                      msg.mine ? "justify-end" : "justify-start",
                    )}
                  >
                    {!msg.mine && (
                      <ProAvatar name={msg.senderName} className="h-7 w-7 rounded-lg text-[10px]" />
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2",
                        msg.mine
                          ? "bg-primary/10 text-foreground"
                          : "bg-muted/30 text-foreground",
                      )}
                    >
                      <p className="text-[10px] font-medium text-muted-foreground">
                        {msg.senderName} ·{" "}
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                      {msg.body && (
                        <p className="mt-0.5 whitespace-pre-line text-xs">{msg.body}</p>
                      )}
                      {msg.attachments?.length > 0 && (
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                          {msg.attachments.map((file: any) => (
                            <li key={file.storageId}>
                              <a
                                href={file.url ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px]"
                              >
                                <FileText className="h-3 w-3" />
                                <span className="max-w-[8rem] truncate">{file.name}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("request.writeMessage")}
                className="min-h-16 text-xs"
                disabled={request.status === "canceled"}
              />
              <AttachmentPicker
                value={attachments}
                onChange={setAttachments}
                max={5}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={
                    sending ||
                    request.status === "canceled" ||
                    (!message.trim() && attachments.length === 0)
                  }
                  onClick={async () => {
                    setSending(true);
                    try {
                      await sendMessage({
                        requestId: requestId as any,
                        body: message.trim(),
                        attachments: attachments.length
                          ? (attachments as any)
                          : undefined,
                      });
                      setMessage("");
                      setAttachments([]);
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : t("common.error"),
                      );
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {t("request.send")}
                </Button>
              </div>
            </div>
          </section>

          {/* ── Devis ───────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <SectionHeading
              icon={Banknote}
              title={t("request.quotesTitle")}
              action={
                !detail.isOwner &&
                request.status !== "canceled" &&
                request.status !== "done" &&
                !detail.quotes.some((quote: any) => quote.isMine) &&
                detail.myProfileId ? (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setShowQuoteForm(true)}
                  >
                    <Coins className="h-3.5 w-3.5" />
                    {t("request.quoteForm.submit")}
                  </Button>
                ) : undefined
              }
            />

            {detail.quotes.length === 0 ? (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t("request.noQuotes")}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {detail.quotes.map((quote: any) => (
                  <li
                    key={quote._id}
                    className={cn(
                      "rounded-xl border p-3",
                      quote.status === "accepted"
                        ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                        : "border-border/50 bg-muted/10",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ProAvatar
                          name={quote.professionalName}
                          className="h-8 w-8 rounded-lg"
                        />
                        <div>
                          <p className="text-xs font-semibold">
                            {quote.professionalName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {quote.professionalTrade}
                            {quote.professionalCity ? ` · ${quote.professionalCity}` : ""}
                            {quote.professionalRating
                              ? ` · ${quote.professionalRating}/5`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {quote.professionalDemo && <DemoBadge />}
                        <span className="text-sm font-bold text-primary">
                          {quote.price} TND
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {quote.description}
                    </p>
                    {quote.conditions && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {quote.conditions}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {quote.delayDays !== undefined && (
                        <span>
                          {t("request.quoteForm.delay")} : {quote.delayDays}
                        </span>
                      )}
                      <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {quote.status === "accepted"
                          ? t("request.accepted")
                          : quote.status === "refused"
                            ? t("request.refused")
                            : t("request.quoteStatusSent")}
                      </Badge>
                    </div>
                    {detail.isOwner && quote.status === "sent" && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={async () => {
                            try {
                              await respondToQuote({ quoteId: quote._id, accept: true });
                              toast.success(t("request.accepted"));
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : t("common.error"),
                              );
                            }
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t("request.accept")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={async () => {
                            try {
                              await respondToQuote({ quoteId: quote._id, accept: false });
                              toast.success(t("request.refused"));
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : t("common.error"),
                              );
                            }
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("request.refuse")}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Colonne latérale ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <SectionHeading
              icon={Check}
              title={PROMARKET_REQUEST_STATUS_LABELS[request.status]}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("request.statusUpdated")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PROMARKET_REQUEST_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={async () => {
                    try {
                      await updateStatus({
                        requestId: requestId as any,
                        status,
                      });
                      toast.success(t("request.statusUpdated"));
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : t("common.error"),
                      );
                    }
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                    request.status === status
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {PROMARKET_REQUEST_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </section>

          {detail.professional && (
            <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <SectionHeading icon={Star} title={detail.professional.tradeLabel} />
              <div className="mt-2 flex items-center gap-2">
                <ProAvatar name={detail.professional.displayName} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {detail.professional.displayName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {detail.professional.city} ·{" "}
                    {detail.professional.rating.toFixed(1)}/5 (
                    {detail.professional.ratingCount})
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full border-border bg-transparent text-xs transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary active:scale-[0.98]"
                onClick={() =>
                  navigate(`/promarket/pro/${detail.professional!._id}`)
                }
              >
                {t("card.viewProfile")}
              </Button>
            </section>
          )}

          <section className="rounded-2xl border border-border/50 bg-muted/10 p-4">
            <SectionHeading icon={Coins} title={t("request.myQuotesSubtitle")} />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("request.myQuotesTitle")}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full text-xs"
              onClick={() => navigate("/promarket/requests")}
            >
              {t("nav.quotes")}
            </Button>
          </section>
        </div>
      </div>

      {/* ── Formulaire de devis ──────────────────────────────────────────── */}
      {showQuoteForm && (
        <QuoteDialog
          onClose={() => setShowQuoteForm(false)}
          onSubmit={async (values) => {
            await createQuote({ requestId: requestId as any, ...(values as any) });
            toast.success(t("request.quoteForm.success"));
            setShowQuoteForm(false);
          }}
          tradeLabel={promarketTradeLabel(request.trade)}
        />
      )}
    </ProMarketShell>
  );
}

// ----------------------------------------------------------------------------
// Sous-composants
// ----------------------------------------------------------------------------

function QuoteDialog({
  onClose,
  onSubmit,
  tradeLabel,
}: {
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  tradeLabel: string;
}) {
  const { t } = useTranslation("promarket");
  const [price, setPrice] = useState("");
  const [delayDays, setDelayDays] = useState("");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState("");
  const [availability, setAvailability] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border/60 bg-background p-4 shadow-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{t("request.quoteForm.title")}</p>
            <p className="text-xs text-muted-foreground">{tradeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("request.quoteForm.price")}
              </span>
              <Input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-9 text-xs"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("request.quoteForm.delay")}
              </span>
              <Input
                type="number"
                min={0}
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
                className="h-9 text-xs"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("request.quoteForm.description")}
            </span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20 text-xs"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("request.quoteForm.conditions")}
            </span>
            <Textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="min-h-14 text-xs"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("request.quoteForm.availability")}
            </span>
            <Input
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="h-9 text-xs"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            disabled={saving}
            onClick={async () => {
              if (!price || Number(price) <= 0 || description.trim().length < 5) {
                toast.error(t("request.quoteForm.description"));
                return;
              }
              setSaving(true);
              try {
                await onSubmit({
                  price: Number(price),
                  delayDays: delayDays ? Number(delayDays) : undefined,
                  description: description.trim(),
                  conditions: conditions.trim() || undefined,
                  availability: availability.trim() || undefined,
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
              <Banknote className="h-3.5 w-3.5" />
            )}
            {t("request.quoteForm.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
