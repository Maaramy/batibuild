import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  HardHat,
  LayoutDashboard,
  Loader2,
  Mail,
  MailOpen,
  Megaphone,
  MessageSquare,
  Monitor,
  MousePointerClick,
  Pencil,
  Search,
  Send,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  MARKETING_CATEGORY_LABELS,
  MARKETING_TEMPLATES,
  templateDefaults,
  templatesForCategory,
  type MarketingCategory,
  type MarketingTemplate,
} from "@/lib/marketingTemplates";
import {
  MARKETING_SEGMENTS,
  segmentsForCategory,
  segmentLabel,
  type MarketingSegmentId,
} from "@/lib/marketingAudience";
import {
  MARKETING_VARIABLES,
  SAMPLE_MARKETING_VARIABLES,
  buildMarketingEmail,
} from "@/lib/marketingEmail";

// ============================================================================
// OFFRES & CAMPAGNES MARKETING — administration
// ----------------------------------------------------------------------------
// Tableau de bord · Offres Client Pro / Experts / Fournisseurs · Modèles
// personnalisés · Historique · Avis reçus. Toutes les données sensibles
// (destinataires, statistiques, avis) sont lues via des requêtes admin : le
// serveur renvoie [] ou null pour tout autre rôle.
// ============================================================================

type MainTab = "dashboard" | MarketingCategory | "custom" | "history" | "feedback";

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "client_pro", label: "Offres Client Pro" },
  { id: "expert", label: "Offres Experts" },
  { id: "supplier", label: "Offres Fournisseurs" },
  { id: "custom", label: "Modèles personnalisés" },
  { id: "history", label: "Historique des envois" },
  { id: "feedback", label: "Avis reçus" },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-100 text-slate-600 border-slate-200" },
  scheduled: { label: "Programmée", className: "bg-blue-50 text-blue-700 border-blue-200" },
  sending: { label: "Envoi en cours", className: "bg-amber-50 text-amber-700 border-amber-200" },
  sent: { label: "Envoyée", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Annulée", className: "bg-red-50 text-red-600 border-red-200" },
  failed: { label: "Échec", className: "bg-red-50 text-red-600 border-red-200" },
};

function fmtDate(value?: number) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MarketingOffers({ initialTab }: { initialTab?: MainTab } = {}) {
  const [tab, setTab] = useState<MainTab>(initialTab ?? "dashboard");
  const [editor, setEditor] = useState<EditorState | null>(null);

  if (editor) {
    return (
      <CampaignEditor
        initial={editor}
        onClose={() => setEditor(null)}
        onDone={() => {
          setEditor(null);
          setTab("history");
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/[0.04] via-background to-background p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight">Offres & campagnes</h2>
            <p className="text-xs text-muted-foreground">
              Modèles prêts à l'emploi, ciblage par profil et suivi des envois. Les statistiques
              d'ouverture et de clic sont <strong>estimatives</strong> : certaines messageries
              bloquent le pixel de suivi.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {MAIN_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors",
                tab === t.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "dashboard" && <CampaignDashboard />}
      {(tab === "client_pro" || tab === "expert" || tab === "supplier") && (
        <TemplateGallery category={tab} onCreate={setEditor} />
      )}
      {tab === "custom" && <CustomCampaigns onCreate={setEditor} />}
      {tab === "history" && <CampaignHistory onOpen={setEditor} />}
      {tab === "feedback" && <FeedbackInbox />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tableau de bord                                                            */
/* -------------------------------------------------------------------------- */

function CampaignDashboard() {
  const [period, setPeriod] = useState("30");
  const [category, setCategory] = useState<"" | MarketingCategory>("");
  const periodDays = period === "all" ? undefined : Number(period);

  const stats = useQuery(api.marketing.getDashboardStats, {
    periodDays,
    category: category || undefined,
  });

  const maxSent = Math.max(1, ...(stats?.series ?? []).map((s) => s.sent));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-1">
          {[
            { id: "7", label: "7 j" },
            { id: "30", label: "30 j" },
            { id: "90", label: "90 j" },
            { id: "all", label: "Tout" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium",
                period === p.id ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          className="h-8 rounded-lg border border-border/50 bg-background px-2 text-[11px]"
        >
          <option value="">Toutes les catégories</option>
          <option value="client_pro">Client Pro</option>
          <option value="expert">Expert</option>
          <option value="supplier">Fournisseur</option>
        </select>
      </div>

      {!stats ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des statistiques…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <Kpi icon={Mail} label="E-mails envoyés" value={stats.totals.recipients} tone="primary" />
            <Kpi icon={MailOpen} label="Ouverts (est.)" value={stats.totals.opened} tone="amber" hint={`${stats.totals.openRate} % d'ouverture`} />
            <Kpi icon={MousePointerClick} label="Clics (est.)" value={stats.totals.clicked} tone="blue" hint={`${stats.totals.clickRate} % de clics`} />
            <Kpi icon={CheckCircle2} label="Conversions" value={stats.totals.conversions} tone="emerald" hint={`${stats.totals.conversionRate} % · clic ou avis`} />
            <Kpi icon={CheckCircle2} label="Délivrés" value={stats.totals.delivered} tone="slate" hint="acceptés par le serveur" />
            <Kpi icon={Star} label="Avis reçus" value={stats.totals.feedbacks} tone="amber" hint={stats.totals.averageRating ? `${stats.totals.averageRating}/5 de moyenne` : undefined} />
            <Kpi icon={Megaphone} label="Campagnes envoyées" value={stats.totals.sentCampaigns} tone="primary" />
            <Kpi icon={AlertTriangle} label="Échecs d'envoi" value={stats.totals.failed} tone="red" />
          </div>

          <div className="rounded-2xl border border-border/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" /> Dernières campagnes (e-mails acceptés)
              </p>
              <span className="text-[10px] text-muted-foreground">Jaune = ouverts · bleu = clics</span>
            </div>
            {stats.series.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Aucune campagne sur cette période.
              </p>
            ) : (
              <div className="space-y-2.5">
                {stats.series.map((s) => (
                  <div key={s.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="shrink-0 text-muted-foreground">{s.sent} envoyés</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted/50 overflow-hidden flex">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, (s.opened / maxSent) * 100)}%` }}
                        title={`${s.opened} ouverture(s) estimée(s)`}
                      />
                      <div
                        className="h-full bg-sky-400"
                        style={{ width: `${Math.min(100, (s.clicked / maxSent) * 100)}%` }}
                        title={`${s.clicked} clic(s) estimé(s)`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/40 p-4">
              <p className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500" /> Répartition des notes
              </p>
              <div className="space-y-1.5">
                {[...stats.distribution].reverse().map((d) => {
                  const total = stats.distribution.reduce((s, x) => s + x.count, 0);
                  return (
                    <div key={d.rating} className="flex items-center gap-2">
                      <span className="w-10 text-[10px] text-muted-foreground">{d.rating} ★</span>
                      <div className="h-2 flex-1 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${total ? (d.count / total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-[10px] text-muted-foreground">{d.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 p-4">
              <p className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" /> Derniers avis
              </p>
              {stats.recentFeedbacks.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Aucun avis pour l'instant.</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.recentFeedbacks.map((f) => (
                    <div key={f._id} className="rounded-lg bg-muted/30 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={cn(
                                "h-3 w-3",
                                n <= f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
                              )}
                            />
                          ))}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">{f.campaignName}</span>
                      </div>
                      {f.comment && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{f.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: typeof Mail;
  label: string;
  value: number;
  hint?: string;
  tone?: "primary" | "amber" | "blue" | "emerald" | "slate" | "red";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="rounded-xl border border-border/40 p-3">
      <div className={cn("mb-2 flex h-7 w-7 items-center justify-center rounded-lg", tones[tone])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-lg font-bold leading-none">{value.toLocaleString("fr-FR")}</p>
      <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Galerie de modèles                                                         */
/* -------------------------------------------------------------------------- */

function TemplateGallery({
  category,
  onCreate,
}: {
  category: MarketingCategory;
  onCreate: (state: EditorState) => void;
}) {
  const templates = templatesForCategory(category);
  const icon =
    category === "client_pro" ? Users : category === "expert" ? HardHat : ShoppingBag;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon === Users ? <Users className="h-4 w-4" /> : icon === HardHat ? <HardHat className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Offres {MARKETING_CATEGORY_LABELS[category]}</h3>
          <p className="text-[11px] text-muted-foreground">
            {templates.length} modèles prêts à personnaliser et à envoyer.
          </p>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <article key={template.id} className="rounded-2xl border border-border/40 p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-[13px] font-semibold leading-snug">{template.title}</h4>
              {template.feedback && (
                <Badge variant="outline" className="shrink-0 gap-1 text-[9px] border-amber-300 text-amber-700">
                  <Star className="h-2.5 w-2.5" /> Avis
                </Badge>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 flex-1">{template.objective}</p>
            <p className="mt-2 line-clamp-2 text-[11px] font-medium text-foreground/80">
              « {template.subject} »
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-8 text-[11px] gap-1.5"
              onClick={() => onCreate(editorFromTemplate(template))}
            >
              <Sparkles className="h-3 w-3" /> Personnaliser & envoyer
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}

function CustomCampaigns({ onCreate }: { onCreate: (state: EditorState) => void }) {
  const campaigns = useQuery(api.marketing.listCampaigns, {}) ?? [];
  const custom = campaigns.filter((c) => !c.templateId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Offres personnalisées</h3>
          <p className="text-[11px] text-muted-foreground">
            Créez une campagne entièrement sur mesure (objet, contenu, bannière, bouton, conditions).
          </p>
        </div>
        <Button size="sm" className="h-8 text-[11px] gap-1.5" onClick={() => onCreate(blankEditor())}>
          <Megaphone className="h-3.5 w-3.5" /> Nouvelle offre
        </Button>
      </div>

      {custom.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {custom.slice(0, 6).map((c) => (
            <div key={c._id} className="rounded-xl border border-border/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold truncate">{c.name}</p>
                <Badge variant="outline" className={cn("text-[9px]", STATUS_META[c.status]?.className)}>
                  {STATUS_META[c.status]?.label ?? c.status}
                </Badge>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {c.stats.delivered} envoyés · {c.stats.opened} ouverts · {c.stats.feedbacks} avis
              </p>
              {(c.status === "draft" || c.status === "cancelled") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-[10px] gap-1"
                  onClick={() => onCreate(editorFromCampaign(c))}
                >
                  <Pencil className="h-3 w-3" /> Modifier
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Éditeur de campagne                                                        */
/* -------------------------------------------------------------------------- */

type EditorState = {
  campaignId?: string;
  name: string;
  category: MarketingCategory;
  templateId?: string;
  subject: string;
  intro: string;
  body: string;
  bannerUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  conditions: string;
  validUntil: string;
  signature: string;
  feedbackEnabled: boolean;
  segments: MarketingSegmentId[];
  userIds: string[];
};

function blankEditor(): EditorState {
  return {
    name: "",
    category: "client_pro",
    subject: "",
    intro: "",
    body: "",
    bannerUrl: "",
    ctaLabel: "",
    ctaUrl: "",
    conditions: "",
    validUntil: "",
    signature: "L'équipe batibuild",
    feedbackEnabled: false,
    segments: ["client_pro_all"],
    userIds: [],
  };
}

function editorFromTemplate(template: MarketingTemplate): EditorState {
  const d = templateDefaults(template);
  return {
    ...blankEditor(),
    campaignId: undefined,
    name: d.name,
    category: template.category,
    templateId: template.id,
    subject: d.subject,
    intro: d.intro,
    body: d.body,
    ctaLabel: d.ctaLabel,
    ctaUrl: d.ctaUrl,
    conditions: d.conditions,
    feedbackEnabled: d.feedbackEnabled,
    segments: [
      (template.category === "client_pro"
        ? "client_pro_all"
        : template.category === "expert"
          ? "expert_all"
          : "supplier_all") as MarketingSegmentId,
    ],
  };
}

function editorFromCampaign(c: any): EditorState {
  return {
    campaignId: c._id,
    name: c.name,
    category: c.category,
    templateId: c.templateId,
    subject: c.subject,
    intro: c.intro,
    body: c.body,
    bannerUrl: c.bannerUrl ?? "",
    ctaLabel: c.ctaLabel ?? "",
    ctaUrl: c.ctaUrl ?? "",
    conditions: c.conditions ?? "",
    validUntil: c.validUntil ?? "",
    signature: c.signature ?? "",
    feedbackEnabled: !!c.feedbackEnabled,
    segments: (c.audienceSegments ?? []) as MarketingSegmentId[],
    userIds: (c.audienceUserIds ?? []) as string[],
  };
}

export function CampaignEditor({
  initial,
  onClose,
  onDone,
}: {
  initial: EditorState;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<EditorState>(initial);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  const save = useMutation(api.marketing.saveCampaign);
  const start = useMutation(api.marketing.startCampaign);
  const schedule = useMutation(api.marketing.scheduleCampaign);
  const cancel = useMutation(api.marketing.cancelCampaign);
  const remove = useMutation(api.marketing.deleteCampaign);
  const test = useMutation(api.marketing.sendTestEmail);

  const audience = useQuery(api.marketing.previewAudience, {
    segments: form.segments,
    userIds: form.userIds as any,
  });
  const searchResults = useQuery(
    api.marketing.searchRecipients,
    search.trim().length >= 2 ? { search } : "skip",
  );
  const selectedUsers = useQuery(
    api.marketing.previewAudience,
    form.userIds.length > 0
      ? { segments: [], userIds: form.userIds as any }
      : "skip",
  );

  const preview = useMemo(
    () =>
      buildMarketingEmail(
        {
          subject: form.subject || "Objet de votre campagne",
          intro: form.intro,
          body: form.body,
          bannerUrl: form.bannerUrl || undefined,
          ctaLabel: form.ctaLabel,
          ctaUrl: form.ctaUrl || "/dashboard",
          conditions: form.conditions,
          validUntil: form.validUntil,
          signature: form.signature,
          feedbackEnabled: form.feedbackEnabled,
          feedbackUrl: "https://batibuild.app/avis?c=apercu&t=demo",
          siteUrl: "https://batibuild.app",
          siteName: "batibuild",
        },
        SAMPLE_MARKETING_VARIABLES,
      ),
    [form],
  );

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSegment = (id: MarketingSegmentId) =>
    setForm((prev) => ({
      ...prev,
      segments: prev.segments.includes(id)
        ? prev.segments.filter((s) => s !== id)
        : [...prev.segments, id],
    }));

  const addUser = (id: string) =>
    setForm((prev) =>
      prev.userIds.includes(id) ? prev : { ...prev, userIds: [...prev.userIds, id] },
    );

  const removeUser = (id: string) =>
    setForm((prev) => ({ ...prev, userIds: prev.userIds.filter((u) => u !== id) }));

  function appendVariable(key: string) {
    set("body", `${form.body}${form.body ? "\n" : ""}{{${key}}}`);
    toast.success(`Variable {{${key}}} ajoutée au contenu`);
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Donnez un nom à la campagne.";
    if (!form.subject.trim()) return "Renseignez l'objet de l'e-mail.";
    if (!form.intro.trim() && !form.body.trim()) return "Le contenu de l'e-mail est vide.";
    if (form.segments.length === 0 && form.userIds.length === 0) {
      return "Sélectionnez au moins une audience.";
    }
    return null;
  }

  async function persist(): Promise<string> {
    const res = await save({
      campaignId: form.campaignId as any,
      name: form.name,
      category: form.category,
      templateId: form.templateId,
      subject: form.subject,
      intro: form.intro,
      body: form.body,
      bannerUrl: form.bannerUrl || undefined,
      ctaLabel: form.ctaLabel || undefined,
      ctaUrl: form.ctaUrl || undefined,
      conditions: form.conditions || undefined,
      validUntil: form.validUntil || undefined,
      signature: form.signature || undefined,
      feedbackEnabled: form.feedbackEnabled,
      audienceSegments: form.segments,
      audienceUserIds: (form.userIds.length ? form.userIds : undefined) as any,
    });
    const campaignId = (res as any).campaignId as string;
    set("campaignId", campaignId);
    return campaignId;
  }

  async function handleSaveDraft() {
    const error = validate();
    if (error) return toast.error(error);
    setSaving(true);
    try {
      await persist();
      toast.success("Campagne enregistrée en brouillon");
    } catch (err: any) {
      toast.error(err?.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const error = validate();
    if (error) return toast.error(error);
    setTesting(true);
    try {
      const campaignId = await persist();
      await test({ campaignId: campaignId as any });
      toast.success("E-mail de test envoyé à votre adresse administrateur");
    } catch (err: any) {
      toast.error(err?.message || "Envoi de test impossible");
    } finally {
      setTesting(false);
    }
  }

  async function handleSend() {
    const error = validate();
    if (error) return toast.error(error);
    if (!audience?.total) return toast.error("Aucun destinataire éligible.");
    setSending(true);
    try {
      const campaignId = await persist();
      await start({ campaignId: campaignId as any });
      toast.success(`Envoi lancé vers ${audience.total} destinataire(s)`);
      onDone();
    } catch (err: any) {
      toast.error(err?.message || "Envoi impossible");
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  async function handleSchedule() {
    const error = validate();
    if (error) return toast.error(error);
    if (!scheduleAt) return toast.error("Choisissez une date d'envoi.");
    const when = new Date(scheduleAt).getTime();
    if (!Number.isFinite(when)) return toast.error("Date d'envoi invalide.");
    setSaving(true);
    try {
      const campaignId = await persist();
      await schedule({ campaignId: campaignId as any, scheduledAt: when });
      toast.success(`Campagne programmée pour le ${fmtDate(when)}`);
      onDone();
    } catch (err: any) {
      toast.error(err?.message || "Programmation impossible");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!form.campaignId) return;
    try {
      await cancel({ campaignId: form.campaignId as any });
      toast.success("Campagne annulée");
      onDone();
    } catch (err: any) {
      toast.error(err?.message || "Annulation impossible");
    }
  }

  async function handleDelete() {
    if (!form.campaignId) return;
    try {
      await remove({ campaignId: form.campaignId as any });
      toast.success("Campagne supprimée");
      onDone();
    } catch (err: any) {
      toast.error(err?.message || "Suppression impossible");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onClose}>
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5" onClick={handleSaveDraft} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Brouillon
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
            E-mail test
          </Button>
          <Button size="sm" className="h-8 text-[11px] gap-1.5" onClick={() => setConfirmOpen(true)} disabled={sending}>
            <Send className="h-3 w-3" /> Envoyer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Formulaire */}
        <div className="space-y-3">
          <section className="rounded-2xl border border-border/40 p-4 space-y-3">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5 text-primary" /> Contenu de l'e-mail
            </h3>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Nom de la campagne">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-9 text-xs" maxLength={160} />
              </Field>
              <Field label="Catégorie">
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value as MarketingCategory)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="client_pro">Client Pro</option>
                  <option value="expert">Expert</option>
                  <option value="supplier">Fournisseur</option>
                </select>
              </Field>
            </div>

            <Field label="Objet de l'e-mail">
              <Input value={form.subject} onChange={(e) => set("subject", e.target.value)} className="h-9 text-xs" maxLength={200} />
            </Field>

            <Field label="Texte d'introduction">
              <Textarea value={form.intro} onChange={(e) => set("intro", e.target.value)} rows={4} className="text-xs resize-none" />
            </Field>

            <Field label="Contenu détaillé (une ligne vide = nouveau paragraphe, « - » = puce)">
              <Textarea value={form.body} onChange={(e) => set("body", e.target.value)} rows={8} className="text-xs resize-none font-mono" />
            </Field>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Image / bannière (URL facultative)">
                <Input value={form.bannerUrl} onChange={(e) => set("bannerUrl", e.target.value)} placeholder="https://…" className="h-9 text-xs" />
              </Field>
              <Field label="Signature">
                <Input value={form.signature} onChange={(e) => set("signature", e.target.value)} className="h-9 text-xs" />
              </Field>
              <Field label="Texte du bouton">
                <Input value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className="h-9 text-xs" />
              </Field>
              <Field label="URL du bouton">
                <Input value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/dashboard" className="h-9 text-xs" />
              </Field>
              <Field label="Conditions de l'offre">
                <Input value={form.conditions} onChange={(e) => set("conditions", e.target.value)} className="h-9 text-xs" />
              </Field>
              <Field label="Date de validité">
                <Input type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} className="h-9 text-xs" />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-amber-50/60 border border-amber-200/60 px-3 py-2">
              <div className="pr-3">
                <p className="text-[11px] font-medium">Demander une évaluation</p>
                <p className="text-[10px] text-muted-foreground">
                  Ajoute 5 étoiles et la page publique « Comment évaluez-vous votre expérience ? ».
                </p>
              </div>
              <Switch checked={form.feedbackEnabled} onCheckedChange={(v) => set("feedbackEnabled", v)} />
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">Variables dynamiques</p>
              <div className="flex flex-wrap gap-1">
                {MARKETING_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => appendVariable(v.key)}
                    title={v.label}
                    className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-1.5 py-1 font-mono text-[9px] text-muted-foreground hover:bg-muted"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Destinataires
              </h3>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                {audience ? `${audience.total} destinataire(s)` : "…"}
              </Badge>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Les doublons sont supprimés et les personnes désinscrites sont exclues automatiquement.
            </p>

            <div className="space-y-2">
              {(["client_pro", "expert", "supplier"] as MarketingCategory[]).map((cat) => (
                <div key={cat}>
                  <p className="mb-1 text-[10px] font-semibold text-muted-foreground">
                    {MARKETING_CATEGORY_LABELS[cat]}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {segmentsForCategory(cat).map((segment) => {
                      const active = form.segments.includes(segment.id);
                      return (
                        <button
                          key={segment.id}
                          type="button"
                          onClick={() => toggleSegment(segment.id)}
                          className={cn(
                            "rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/50 text-muted-foreground hover:bg-muted/40",
                          )}
                        >
                          {segment.label}
                          {audience?.bySegment?.[segment.id] != null && (
                            <span className="ml-1 opacity-70">({audience.bySegment[segment.id]})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border/40 pt-3">
              <p className="text-[10px] font-semibold text-muted-foreground">
                Utilisateurs sélectionnés individuellement
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un nom ou un e-mail…"
                  className="h-8 pl-8 text-[11px]"
                />
              </div>
              {search.trim().length >= 2 && (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/30">
                  {(searchResults ?? []).length === 0 ? (
                    <p className="p-2 text-[10px] text-muted-foreground">Aucun utilisateur trouvé.</p>
                  ) : (
                    (searchResults ?? []).map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => addUser(u._id)}
                        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-muted/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-medium">{u.name || "Sans nom"}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">{u.email}</span>
                        </span>
                        <span className="shrink-0 text-[10px] text-primary">Ajouter</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {form.userIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(selectedUsers?.sample ?? []).map((u) => (
                    <span
                      key={u._id}
                      className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px]"
                    >
                      {u.email}
                      <button type="button" onClick={() => removeUser(u._id)} aria-label="Retirer">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  {selectedUsers && selectedUsers.total > selectedUsers.sample.length && (
                    <span className="text-[10px] text-muted-foreground">
                      +{selectedUsers.total - selectedUsers.sample.length} autre(s)
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/40 p-4 space-y-3">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-primary" /> Programmation & brouillon
            </h3>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Envoyer le" className="flex-1 min-w-[180px]">
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="h-9 text-xs"
                />
              </Field>
              <Button size="sm" variant="outline" className="h-9 text-[11px] gap-1.5" onClick={handleSchedule} disabled={saving}>
                <Clock className="h-3 w-3" /> Programmer
              </Button>
            </div>

            {form.campaignId && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1 text-amber-700 border-amber-200" onClick={handleCancel}>
                  <Ban className="h-3 w-3" /> Annuler la campagne
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1 text-red-600 border-red-200" onClick={handleDelete}>
                  <Trash2 className="h-3 w-3" /> Supprimer
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1" onClick={() => setDetailOpen(true)}>
                  <Eye className="h-3 w-3" /> Détails de la campagne
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Aperçu */}
        <div className="space-y-2 xl:sticky xl:top-4 xl:self-start">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-primary" /> Aperçu en temps réel
            </p>
            <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">
              <button
                onClick={() => setDevice("desktop")}
                className={cn("rounded-md p-1.5", device === "desktop" ? "bg-background shadow-sm" : "text-muted-foreground")}
                aria-label="Aperçu ordinateur"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={cn("rounded-md p-1.5", device === "mobile" ? "bg-background shadow-sm" : "text-muted-foreground")}
                aria-label="Aperçu mobile"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-2">
            <p className="px-1 pb-1.5 text-[10px] text-muted-foreground">
              Objet : <span className="font-medium text-foreground">{preview.subject}</span>
            </p>
            <div className={cn("mx-auto transition-all", device === "mobile" ? "max-w-[380px]" : "w-full")}>
              <iframe
                title="Aperçu de l'e-mail"
                srcDoc={preview.html}
                sandbox=""
                className="h-[560px] w-full rounded-lg border border-border/30 bg-white"
              />
            </div>
          </div>
          <p className="px-1 text-[10px] text-muted-foreground">
            Aperçu avec des données d'exemple ({SAMPLE_MARKETING_VARIABLES.prenom}{" "}
            {SAMPLE_MARKETING_VARIABLES.nom}). Les variables sont remplacées pour chaque destinataire
            à l'envoi.
          </p>
        </div>
      </div>

      {/* Confirmation d'envoi */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer l'envoi</DialogTitle>
            <DialogDescription>
              Cet e-mail va partir immédiatement vers {audience?.total ?? 0} destinataire(s).
              L'action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
            <p><span className="text-muted-foreground">Campagne :</span> <strong>{form.name || "Sans nom"}</strong></p>
            <p><span className="text-muted-foreground">Objet :</span> {form.subject}</p>
            <p><span className="text-muted-foreground">Destinataires :</span> {audience?.total ?? 0}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Annuler</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Envoyer maintenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {form.campaignId && (
        <CampaignDetailsDialog
          campaignId={form.campaignId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Historique                                                                */
/* -------------------------------------------------------------------------- */

function CampaignHistory({ onOpen }: { onOpen: (state: EditorState) => void }) {
  const [category, setCategory] = useState<"" | MarketingCategory>("");
  const [status, setStatus] = useState("");
  const [details, setDetails] = useState<string | null>(null);
  const campaigns = useQuery(api.marketing.listCampaigns, {
    category: category || undefined,
    status: status || undefined,
  }) ?? [];
  const cancel = useMutation(api.marketing.cancelCampaign);
  const remove = useMutation(api.marketing.deleteCampaign);

  async function handleCancel(id: string) {
    try {
      await cancel({ campaignId: id as any });
      toast.success("Campagne annulée");
    } catch (err: any) {
      toast.error(err?.message || "Annulation impossible");
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove({ campaignId: id as any });
      toast.success("Campagne supprimée");
    } catch (err: any) {
      toast.error(err?.message || "Suppression impossible");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          className="h-8 rounded-lg border border-border/50 bg-background px-2 text-[11px]"
        >
          <option value="">Toutes les catégories</option>
          <option value="client_pro">Client Pro</option>
          <option value="expert">Expert</option>
          <option value="supplier">Fournisseur</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 rounded-lg border border-border/50 bg-background px-2 text-[11px]"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="scheduled">Programmées</option>
          <option value="sending">En cours</option>
          <option value="sent">Envoyées</option>
          <option value="cancelled">Annulées</option>
          <option value="failed">Échecs</option>
        </select>
        <span className="text-[10px] text-muted-foreground">{campaigns.length} campagne(s)</span>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-14 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-xs font-medium">Aucune campagne</p>
          <p className="text-[11px] text-muted-foreground">Créez une offre depuis un modèle.</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-border/40">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-muted/40 text-[10px] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Campagne</th>
                  <th className="px-2 py-2 font-medium">Cible</th>
                  <th className="px-2 py-2 font-medium text-right">Dest.</th>
                  <th className="px-2 py-2 font-medium text-right">Délivrés</th>
                  <th className="px-2 py-2 font-medium text-right">Ouverts*</th>
                  <th className="px-2 py-2 font-medium text-right">Clics*</th>
                  <th className="px-2 py-2 font-medium text-right">Avis</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Statut</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {campaigns.map((c) => (
                  <tr key={c._id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 max-w-[220px]">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{c.subject}</p>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{MARKETING_CATEGORY_LABELS[c.category]}</td>
                    <td className="px-2 py-2 text-right">{c.stats.recipients}</td>
                    <td className="px-2 py-2 text-right">{c.stats.delivered}</td>
                    <td className="px-2 py-2 text-right">{c.stats.opened} <span className="text-muted-foreground">({c.openRate}%)</span></td>
                    <td className="px-2 py-2 text-right">{c.stats.clicked}</td>
                    <td className="px-2 py-2 text-right">{c.stats.feedbacks}</td>
                    <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(c.sentAt ?? c.scheduledAt ?? c.createdAt)}</td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className={cn("text-[9px]", STATUS_META[c.status]?.className)}>
                        {STATUS_META[c.status]?.label ?? c.status}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetails(c._id)} className="rounded p-1 hover:bg-muted" aria-label="Détails">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {(c.status === "draft" || c.status === "cancelled") && (
                          <button onClick={() => onOpen(editorFromCampaign(c))} className="rounded p-1 hover:bg-muted" aria-label="Modifier">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(c.status === "scheduled" || c.status === "sending") && (
                          <button onClick={() => handleCancel(c._id)} className="rounded p-1 text-amber-600 hover:bg-muted" aria-label="Annuler">
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(c.status === "draft" || c.status === "cancelled") && (
                          <button onClick={() => handleDelete(c._id)} className="rounded p-1 text-red-500 hover:bg-muted" aria-label="Supprimer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-2 md:hidden">
            {campaigns.map((c) => (
              <article key={c._id} className="rounded-2xl border border-border/40 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-snug">{c.name}</p>
                  <Badge variant="outline" className={cn("shrink-0 text-[9px]", STATUS_META[c.status]?.className)}>
                    {STATUS_META[c.status]?.label ?? c.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{MARKETING_CATEGORY_LABELS[c.category]} · {fmtDate(c.sentAt ?? c.scheduledAt ?? c.createdAt)}</p>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    ["Dest.", c.stats.recipients],
                    ["Déliv.", c.stats.delivered],
                    ["Ouv.", c.stats.opened],
                    ["Clics", c.stats.clicked],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg bg-muted/30 py-1">
                      <p className="text-xs font-semibold">{value as number}</p>
                      <p className="text-[9px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setDetails(c._id)}>
                    <Eye className="h-3 w-3" /> Détails
                  </Button>
                  {(c.status === "draft" || c.status === "cancelled") && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => onOpen(editorFromCampaign(c))}>
                      <Pencil className="h-3 w-3" /> Modifier
                    </Button>
                  )}
                  {(c.status === "scheduled" || c.status === "sending") && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-amber-700" onClick={() => handleCancel(c._id)}>
                      <Ban className="h-3 w-3" /> Annuler
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            * Ouvertures et clics estimatifs : un e-mail lu sans images (ou une messagerie qui bloque
            le pixel) ne sera pas compté.
          </p>
        </>
      )}

      {details && (
        <CampaignDetailsDialog campaignId={details} open={!!details} onOpenChange={(o) => !o && setDetails(null)} />
      )}
    </div>
  );
}

function CampaignDetailsDialog({
  campaignId,
  open,
  onOpenChange,
}: {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const data = useQuery(
    api.marketing.getCampaign,
    open ? ({ campaignId } as any) : "skip",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.campaign.name ?? "Campagne"}</DialogTitle>
          <DialogDescription>
            {data ? `${MARKETING_CATEGORY_LABELS[data.campaign.category]} · ${data.campaign.stats.recipients} destinataire(s)` : "Chargement…"}
          </DialogDescription>
        </DialogHeader>

        {!data ? (
          <div className="flex items-center gap-2 py-8 justify-center text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="font-medium">{data.campaign.subject}</p>
              <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-line line-clamp-4">
                {data.campaign.intro}
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold">Destinataires ({data.recipients.length})</p>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/30">
                {data.recipients.length === 0 ? (
                  <p className="p-3 text-[11px] text-muted-foreground">Aucun destinataire (brouillon).</p>
                ) : (
                  data.recipients.map((r) => (
                    <div key={r._id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[11px]">{r.name || "—"}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{r.email}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[9px] text-muted-foreground">
                        {r.openedAt && <span title="Ouvert">👁</span>}
                        {r.clickedAt && <span title="Cliqué">🖱</span>}
                        {r.feedbackAt && <span title="Avis donné">★</span>}
                        <Badge variant="outline" className="text-[9px]">
                          {r.status === "sent" ? "Envoyé" : r.status === "failed" ? "Échec" : "En attente"}
                        </Badge>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold">Avis reçus ({data.feedbacks.length})</p>
              {data.feedbacks.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Aucun avis pour cette campagne.</p>
              ) : (
                <div className="space-y-2">
                  {data.feedbacks.map((f) => (
                    <div key={f._id} className="rounded-lg border border-border/40 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={cn("h-3 w-3", n <= f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                          ))}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{fmtDate(f.createdAt)}</span>
                      </div>
                      {f.comment && <p className="mt-1 text-[11px] text-muted-foreground">{f.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Avis reçus                                                                */
/* -------------------------------------------------------------------------- */

function FeedbackInbox() {
  const feedbacks = useQuery(api.marketing.listFeedback, {}) ?? [];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Avis et évaluations des campagnes</h3>
        <p className="text-[11px] text-muted-foreground">
          Données confidentielles — accessibles uniquement aux administrateurs.
        </p>
      </div>

      {feedbacks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 py-14 text-center">
          <Star className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-xs font-medium">Aucun avis reçu</p>
          <p className="text-[11px] text-muted-foreground">
            Activez « Demander une évaluation » dans une campagne.
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {feedbacks.map((f) => (
            <article key={f._id} className="rounded-xl border border-border/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={cn("h-3.5 w-3.5", n <= f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                  ))}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtDate(f.createdAt)}</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {f.name || f.email || "Utilisateur"} · {f.campaignName}
              </p>
              {f.comment && <p className="mt-1.5 text-[11px]">{f.comment}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
