import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ProfessionalCard, ProfessionalCardSkeleton } from "@/components/promarket/bits";
import { api } from "@/convex/_generated/api";
import {
  promarketRegionLabel,
  promarketTradeLabel,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { Loader2, MapPin, Send, Sparkles, Wand2, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

// ============================================================================
// Assistant ProMarket — compréhension d'un besoin en langage naturel
// ============================================================================

export function ProMarketAssistant({
  compact,
  defaultQuery,
}: {
  compact?: boolean;
  defaultQuery?: string;
}) {
  const { t } = useTranslation("promarket");
  const navigate = useNavigate();
  const [input, setInput] = useState(defaultQuery ?? "");
  const [submitted, setSubmitted] = useState<string | null>(
    defaultQuery && defaultQuery.length > 5 ? defaultQuery : null,
  );

  const result = useQuery(
    api.promarket.interpretNeed,
    submitted ? { query: submitted } : "skip",
  );

  const need = result?.need;
  const professionals = result?.professionals ?? [];

  return (
    <section
      className={cn(
        "rounded-2xl border border-primary/20 bg-primary/[0.03] p-3.5 sm:p-4",
        compact && "rounded-xl",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Wand2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold sm:text-base">
            {t("assistant.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("assistant.subtitle")}
          </p>
        </div>
      </div>

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const value = input.trim();
          if (value.length < 5) return;
          setSubmitted(value);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("assistant.placeholder")}
          className="h-10 flex-1 text-sm"
          aria-label={t("assistant.title")}
        />
        <Button type="submit" size="sm" className="h-10 gap-1.5 text-xs sm:w-auto">
          {result === undefined && submitted ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {t("assistant.analyze")}
        </Button>
      </form>

      {submitted && result && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("assistant.understood")}
            </span>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
              <Wand2 className="h-3 w-3" />
              {need?.trade
                ? t("assistant.trade") + " : " + promarketTradeLabel(need.trade)
                : t("assistant.unknown")}
            </Badge>
            {need?.region && (
              <Badge variant="outline" className="border-border/60 text-[10px]">
                <MapPin className="h-3 w-3" />
                {t("assistant.location")} : {promarketRegionLabel(need.region)}
              </Badge>
            )}
            {need?.urgent && (
              <Badge
                variant="outline"
                className="border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-600 dark:text-rose-400"
              >
                <Zap className="h-3 w-3" />
                {t("assistant.urgency")}
              </Badge>
            )}
            {need?.homeService && (
              <Badge variant="outline" className="border-border/60 text-[10px]">
                {t("assistant.home")}
              </Badge>
            )}
          </div>

          {professionals.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">
                {t("assistant.suggestions")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {professionals.map((p: any) => (
                  <ProfessionalCard key={p._id} profile={p} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("assistant.noSuggestion")}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                const params = new URLSearchParams();
                if (need?.trade) params.set("trade", need.trade);
                if (need?.region) params.set("region", need.region);
                if (need?.city) params.set("city", need.city);
                if (need?.urgent) params.set("urgent", "1");
                params.set("ai", submitted);
                navigate(`/promarket/request/new?${params.toString()}`);
              }}
            >
              <Send className="h-3.5 w-3.5" />
              {t("assistant.publish")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => {
                const params = new URLSearchParams();
                if (need?.trade) params.set("trade", need.trade);
                if (need?.region) params.set("region", need.region);
                navigate(`/promarket/search?${params.toString()}`);
              }}
            >
              {t("assistant.refine")}
            </Button>
          </div>
        </div>
      )}

      {submitted && result === undefined && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <ProfessionalCardSkeleton />
          <ProfessionalCardSkeleton />
          <ProfessionalCardSkeleton />
        </div>
      )}
    </section>
  );
}
