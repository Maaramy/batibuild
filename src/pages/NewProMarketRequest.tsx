import { AttachmentPicker } from "@/components/promarket/AttachmentPicker";
import { ProIcon } from "@/components/promarket/bits";
import { ProMarketShell } from "@/components/promarket/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useDirection } from "@/hooks/use-direction";
import { usePageSEO } from "@/hooks/use-page-seo";
import type { AttachmentInput } from "@/lib/attachmentUpload";
import {
  PROMARKET_CATEGORIES,
  PROMARKET_REGIONS,
  PROMARKET_TRADES,
  promarketRegion,
  promarketTradeLabel,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Send, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

// ============================================================================
// ProMarket — nouvelle demande (« /promarket/request/new »)
// ============================================================================

export default function NewProMarketRequest() {
  useDirection();
  const { t } = useTranslation("promarket");
  usePageSEO({ title: t("request.newTitle"), description: t("meta.description") });

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryRegion = params.get("region") ?? "";
  const queryCity = params.get("city") ?? "";
  const aiQuery = params.get("ai") ?? "";

  const [category, setCategory] = useState(
    PROMARKET_TRADES.find((tr) => tr.slug === params.get("trade"))?.category ??
      PROMARKET_CATEGORIES[0].slug,
  );
  const [trade, setTrade] = useState(params.get("trade") ?? "");
  const [title, setTitle] = useState(aiQuery ? aiQuery.slice(0, 120) : "");
  const [description, setDescription] = useState(aiQuery);
  const [region, setRegion] = useState(queryRegion);
  const [city, setCity] = useState(queryCity);
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [urgent, setUrgent] = useState(params.get("urgent") === "1");
  const [homeService, setHomeService] = useState(false);
  const [phone, setPhone] = useState("");
  const [preferences, setPreferences] = useState("");
  const [projectId, setProjectId] = useState(params.get("project") ?? "");
  const [attachments, setAttachments] = useState<AttachmentInput[]>([]);
  const [saving, setSaving] = useState(false);

  const createRequest = useMutation(api.promarket.createRequest);
  const projects = useQuery(api.projects.getUserProjects, {});

  const trades = PROMARKET_TRADES.filter((tr) => tr.category === category);
  const selectedRegion = promarketRegion(region);

  const submit = async () => {
    if (!trade) {
      toast.error(t("request.serviceType"));
      return;
    }
    if (title.trim().length < 3 || description.trim().length < 10) {
      toast.error(t("request.descriptionPlaceholder"));
      return;
    }
    if (!region) {
      toast.error(t("request.region"));
      return;
    }
    setSaving(true);
    try {
      const id = await createRequest({
        kind: "service",
        trade,
        title: title.trim(),
        description: description.trim(),
        region,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        budget: budget ? Number(budget) : undefined,
        deadline: deadline.trim() || undefined,
        urgent,
        homeService,
        phone: phone.trim() || undefined,
        preferences: preferences.trim() || undefined,
        projectId: projectId ? (projectId as any) : undefined,
        attachments: attachments.length ? (attachments as any) : undefined,
        source: aiQuery ? "ai" : "search",
        aiQuery: aiQuery || undefined,
      });
      toast.success(t("request.success"));
      navigate(`/promarket/request/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProMarketShell
      title={t("request.newTitle")}
      subtitle={t("request.newSubtitle")}
      backTo="/promarket"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* ── Type de service ─────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <h2 className="text-sm font-semibold">{t("request.serviceType")}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PROMARKET_CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    setCategory(c.slug);
                    if (
                      trade &&
                      PROMARKET_TRADES.find((tr) => tr.slug === trade)?.category !==
                        c.slug
                    ) {
                      setTrade("");
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95",
                    category === c.slug
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ProIcon name={c.icon} className="h-3 w-3" />
                  {c.label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {trades.map((tr) => (
                <button
                  key={tr.slug}
                  type="button"
                  onClick={() => setTrade(tr.slug)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-start text-[11px] font-medium transition-colors active:scale-[0.98]",
                    trade === tr.slug
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/50 bg-background/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ProIcon name={tr.icon} className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{tr.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Détails ─────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <h2 className="text-sm font-semibold">{t("request.description")}</h2>
            <div className="mt-2 space-y-3">
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
                  className="min-h-28 text-xs"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("request.region")}>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">{t("request.region")}</option>
                    {PROMARKET_REGIONS.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("request.city")}>
                  {selectedRegion ? (
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">{t("search.allCities")}</option>
                      {selectedRegion.cities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-9 text-xs"
                    />
                  )}
                </Field>
              </div>
              <Field label={`${t("request.address")} (${t("common.optional")})`}>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {t("request.addressHint")}
                </span>
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={`${t("request.budget")} (${t("common.optional")})`}>
                  <Input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="h-9 text-xs"
                  />
                </Field>
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
          </section>
        </div>

        {/* ── Colonne latérale ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <h2 className="text-sm font-semibold">{t("request.project")}</h2>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">{t("request.noProject")}</option>
              {(projects ?? []).map((project: any) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
            {aiQuery && (
              <p className="mt-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] text-primary">
                <Wand2 className="me-1 inline h-3 w-3" />
                {t("assistant.understood")}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border/50 bg-muted/10 p-4">
            <h2 className="text-sm font-semibold">{t("assistant.suggestions")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("assistant.subtitle")}
            </p>
            {trade && (
              <p className="mt-2 text-xs">
                {t("assistant.trade")} :{" "}
                <span className="font-medium">{promarketTradeLabel(trade)}</span>
              </p>
            )}
            <Button
              size="sm"
              className="mt-3 w-full gap-1.5 text-xs"
              disabled={saving}
              onClick={submit}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {t("request.submit")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 w-full gap-1.5 text-xs text-muted-foreground"
              onClick={() => navigate("/promarket")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("assistant.refine")}
            </Button>
          </section>
        </div>
      </div>
    </ProMarketShell>
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
