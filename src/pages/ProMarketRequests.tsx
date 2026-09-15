import { DemoBadge, RequestStatusBadge } from "@/components/promarket/bits";
import { ProMarketEmpty, ProMarketShell } from "@/components/promarket/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Banknote,
  Coins,
  Inbox,
  MessageSquare,
  Plus,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

// ============================================================================
// ProMarket — mes demandes & mes devis (« /promarket/requests »)
// ============================================================================

export default function ProMarketRequests() {
  useDirection();
  const { t } = useTranslation("promarket");
  usePageSEO({
    title: t("request.myTitle"),
    description: t("request.mySubtitle"),
  });

  const navigate = useNavigate();
  const [tab, setTab] = useState<"requests" | "sent" | "received">("requests");

  const requests = useQuery(api.promarket.listMyRequests, {});
  const quotes = useQuery(api.promarket.listMyQuotes, {});

  return (
    <ProMarketShell
      title={t("request.myTitle")}
      subtitle={t("request.mySubtitle")}
      backTo="/promarket"
      action={
        <Button
          size="sm"
          className="h-9 gap-1.5 text-xs"
          onClick={() => navigate("/promarket/request/new")}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("request.newRequest")}</span>
        </Button>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        <Tab
          active={tab === "requests"}
          onClick={() => setTab("requests")}
          label={`${t("nav.requests")}${
            requests ? ` (${requests.length})` : ""
          }`}
        />
        <Tab
          active={tab === "received"}
          onClick={() => setTab("received")}
          label={`${t("request.received")}${
            quotes ? ` (${quotes.received.length})` : ""
          }`}
        />
        <Tab
          active={tab === "sent"}
          onClick={() => setTab("sent")}
          label={`${t("request.sent")}${quotes ? ` (${quotes.sent.length})` : ""}`}
        />
      </div>

      <div className="mt-4">
        {tab === "requests" ? (
          requests === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : requests.length === 0 ? (
            <ProMarketEmpty
              icon={<Inbox className="h-5 w-5" />}
              title={t("request.empty")}
              text={t("request.emptyHint")}
              action={
                <Button
                  size="sm"
                  className="mt-1 gap-1.5 text-xs"
                  onClick={() => navigate("/promarket/request/new")}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("request.newRequest")}
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {requests.map((request: any) => (
                <li key={request._id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/promarket/request/${request._id}`)}
                    className="w-full rounded-2xl border border-border/50 bg-background/60 p-3.5 text-start transition-colors hover:border-primary/40 active:scale-[0.995]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{request.title}</span>
                      <RequestStatusBadge status={request.status} />
                      {request.unreadCount > 0 && (
                        <Badge className="bg-primary text-[10px] text-primary-foreground">
                          {t("request.unread", { count: request.unreadCount })}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {request.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{request.tradeLabel}</span>
                      <span>{request.regionLabel}</span>
                      {request.professional && (
                        <span className="inline-flex items-center gap-1">
                          {request.professional.companyName ??
                            request.professional.displayName}
                          {request.professional.demo && <DemoBadge />}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {t("request.quotesCount", { count: request.quotesCount })}
                      </span>
                      {request.bestQuote !== null && (
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          <Coins className="h-3 w-3" />
                          {t("request.bestQuote", { price: request.bestQuote })}
                        </span>
                      )}
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                    {request.lastMessage && (
                      <p className="mt-2 line-clamp-1 rounded-lg bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
                        {request.lastMessage.body}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : quotes === undefined ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : (tab === "sent" ? quotes.sent : quotes.received).length === 0 ? (
          <ProMarketEmpty
            icon={<Banknote className="h-5 w-5" />}
            title={tab === "sent" ? t("request.noSent") : t("request.noReceived")}
            text={t("request.myQuotesSubtitle")}
          />
        ) : (
          <ul className="space-y-2">
            {(tab === "sent" ? quotes.sent : quotes.received).map((quote: any) => (
              <li
                key={quote._id}
                className="rounded-2xl border border-border/50 bg-background/60 p-3.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {quote.requestTitle || quote.tradeLabel}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      quote.status === "accepted" &&
                        "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                      quote.status === "refused" && "text-muted-foreground",
                    )}
                  >
                    {quote.status === "accepted"
                      ? t("request.accepted")
                      : quote.status === "refused"
                        ? t("request.refused")
                        : t("request.quoteStatusSent")}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {quote.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    <Coins className="h-3 w-3" />
                    {quote.price} TND
                  </span>
                  {quote.delayDays !== undefined && (
                    <span>
                      {t("request.quoteForm.delay")} : {quote.delayDays}
                    </span>
                  )}
                  <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 gap-1 text-xs"
                  onClick={() => navigate(`/promarket/request/${quote.requestId}`)}
                >
                  {t("request.detailTitle")}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Send className="h-3 w-3" />
        {t("request.mySubtitle")}
      </p>
    </ProMarketShell>
  );
}

function Tab({
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
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
