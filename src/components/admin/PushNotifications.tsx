import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarClock,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Eye,
  Gift,
  HardHat,
  Home,
  Megaphone,
  MousePointerClick,
  Package,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TUNISIA_REGION_LABELS } from "@/lib/providerRegions";
import {
  PUSH_AUDIENCE_IDS,
  PUSH_AUDIENCE_LABELS,
  PUSH_MODULE_IDS,
  PUSH_MODULE_LABELS,
  PUSH_SUBSCRIPTION_PLANS,
  PUSH_SUBSCRIPTION_STATUSES,
  PUSH_SUBSCRIPTION_STATUS_LABELS,
  type PushAudienceId,
  type PushFilters,
} from "@/lib/pushAudience";
import {
  PUSH_CATEGORY_LABELS,
  PUSH_MESSAGE_MAX,
  PUSH_TEMPLATES,
  PUSH_TITLE_MAX,
  getPushTemplate,
  templateDefaults,
  type PushCategory,
  type PushTemplate,
} from "@/lib/pushTemplates";

// ============================================================================
// MODULE ADMINISTRATION — PUSH NOTIFICATIONS ANDROID
// ----------------------------------------------------------------------------
// · Tableau de bord : envoyées, acceptées par FCM, ouvertes, clics, taux,
//   conversions, appareils Android et utilisateurs autorisés.
// · Modèles Client Pro / Experts / Fournisseurs (textes imposés) + libre.
// · Éditeur avec aperçu Android temps réel, ciblage et compteur exact.
// · Campagnes : brouillon, programmée, en cours, envoyée, suspendue, échec.
// ============================================================================

type Draft = {
  campaignId?: Id<"pushCampaigns">;
  campaignName: string;
  category: PushCategory;
  templateId?: string;
  title: string;
  message: string;
  imageUrl: string;
  icon: string;
  actionLabel: string;
  destination: string;
  targetAudience: PushAudienceId;
  filters: PushFilters;
  selectedUserIds: Id<"users">[];
  expiresAt?: number;
};

const EMPTY_DRAFT: Draft = {
  campaignName: "",
  category: "custom",
  title: "",
  message: "",
  imageUrl: "",
  icon: "Bell",
  actionLabel: "",
  destination: "/dashboard",
  targetAudience: "all_android",
  filters: {},
  selectedUserIds: [],
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  scheduled: "Programmée",
  sending: "En cours d'envoi",
  sent: "Envoyée",
  suspended: "Suspendue",
  failed: "Échec",
  cancelled: "Annulée",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  sending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  suspended: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const CATEGORY_ORDER: PushCategory[] = ["client_pro", "expert", "supplier"];

const DESTINATIONS = [
  { value: "/dashboard", label: "Tableau de bord / avis" },
  { value: "/dashboard/new", label: "Coût estimatif & plans" },
  { value: "/dashboard/projects", label: "Projets / aide à la décision" },
  { value: "/dashboard/professionals-directory", label: "Mise en relation" },
  { value: "/dashboard/investments", label: "Investissement immobilier" },
  { value: "/dashboard/chantiers", label: "Gestion & suivi de chantier" },
  { value: "/dashboard/materials", label: "Matériaux" },
  { value: "/dashboard/ai-materials", label: "Choix des matériaux IA" },
  { value: "/dashboard/pricing", label: "Cotisations / abonnements" },
  { value: "/dashboard/expert", label: "Espace Expert" },
  { value: "/dashboard/supplier", label: "Espace Fournisseur" },
  { value: "/dashboard/settings", label: "Paramètres / notifications" },
];

function templateIcon(name: string | undefined) {
  const icons: Record<string, typeof Star> = {
    Star,
    Gift,
    Calculator,
    HardHat,
    Home,
    Wallet,
    ClipboardList,
    Package,
    Rocket,
    Sparkles,
    TrendingUp,
    Bell,
  };
  return icons[name ?? ""] ?? Bell;
}

function formatDate(value: number | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function datetimeLocal(value: number | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toDraft(campaign: any): Draft {
  return {
    campaignId: campaign._id,
    campaignName: campaign.campaignName ?? "",
    category: campaign.category ?? "custom",
    templateId: campaign.templateId,
    title: campaign.title ?? "",
    message: campaign.message ?? "",
    imageUrl: campaign.imageUrl ?? "",
    icon: campaign.icon ?? "Bell",
    actionLabel: campaign.actionLabel ?? "",
    destination: campaign.destination ?? "/dashboard",
    targetAudience: campaign.targetAudience ?? "all_android",
    filters: campaign.filters ?? {},
    selectedUserIds: campaign.selectedUserIds ?? [],
    expiresAt: campaign.expiresAt,
  };
}

// ============================================================================
// Aperçu Android temps réel
// ============================================================================

function AndroidPreview({ draft }: { draft: Draft }) {
  const title = draft.title.trim() || "Votre titre de notification";
  const message =
    draft.message.trim() || "Le message de votre notification apparaîtra ici, sur deux à quatre lignes.";
  const Icon = templateIcon(draft.icon);

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="rounded-[2rem] border-[6px] border-slate-800 bg-slate-900 p-1.5 shadow-xl">
        <div className="overflow-hidden rounded-[1.6rem] bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950">
          <div className="flex items-center justify-between px-4 pt-2 text-[9px] text-slate-300">
            <span>09:41</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-sm bg-slate-300/80" />
              <span className="h-2 w-2 rounded-full bg-slate-300/80" />
            </span>
          </div>
          <div className="px-3 pt-6 pb-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Aperçu de la notification
            </p>
            <div className="rounded-2xl bg-white/95 p-3 shadow-lg dark:bg-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-slate-900">batibuild</p>
                  <p className="text-[9px] text-slate-500">maintenant</p>
                </div>
                <Bell className="h-3 w-3 text-slate-400" />
              </div>
              <p className="mt-2 line-clamp-2 text-[12px] font-bold leading-snug text-slate-900">
                {title}
              </p>
              <p className="mt-1 line-clamp-4 text-[11px] leading-snug text-slate-600">
                {message}
              </p>
              {draft.actionLabel.trim() && (
                <div className="mt-2.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-center text-[10px] font-semibold text-primary">
                  {draft.actionLabel.trim()}
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-[9px] text-slate-500">
              Toucher la notification ouvre directement la fonctionnalité.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-2 text-center text-[11px] text-muted-foreground">
        {draft.targetAudience === "all_android"
          ? "Tous les appareils Android autorisés"
          : PUSH_AUDIENCE_LABELS[draft.targetAudience]}
      </div>
    </div>
  );
}

// ============================================================================
// Éditeur de campagne
// ============================================================================

export function CampaignEditor({
  draft,
  setDraft,
  onSaved,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  onSaved?: (id: Id<"pushCampaigns">) => void;
}) {
  const [audienceSearch, setAudienceSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [pendingSend, setPendingSend] = useState<{ id: Id<"pushCampaigns">; count: number } | null>(
    null,
  );

  const userResults = useQuery(
    api.push.searchRecipients,
    audienceSearch.trim().length >= 2 ? { search: audienceSearch.trim() } : "skip",
  );
  const preview = useQuery(api.push.previewAudience, {
    audience: draft.targetAudience,
    userIds: draft.selectedUserIds.length > 0 ? draft.selectedUserIds : undefined,
    filters: draft.filters,
  });

  const saveCampaign = useMutation(api.push.saveCampaign);
  const startCampaign = useMutation(api.push.startCampaign);
  const scheduleCampaign = useMutation(api.push.scheduleCampaign);
  const sendTest = useMutation(api.push.sendTestNotification);

  const audienceCount = preview?.total ?? 0;
  const titleCount = draft.title.length;
  const messageCount = draft.message.length;

  const patch = (values: Partial<Draft>) => setDraft({ ...draft, ...values });
  const patchFilters = (values: Partial<PushFilters>) =>
    setDraft({ ...draft, filters: { ...draft.filters, ...values } });

  const toggleUser = (userId: Id<"users">) => {
    const exists = draft.selectedUserIds.some((id) => id === userId);
    patch({
      selectedUserIds: exists
        ? draft.selectedUserIds.filter((id) => id !== userId)
        : [...draft.selectedUserIds, userId],
    });
  };

  const persist = async (): Promise<Id<"pushCampaigns"> | null> => {
    if (!draft.campaignName.trim()) {
      toast.error("Renseignez le nom interne de la campagne.");
      return null;
    }
    if (!draft.title.trim() || !draft.message.trim()) {
      toast.error("Renseignez le titre et le message.");
      return null;
    }
    if (draft.title.length > PUSH_TITLE_MAX || draft.message.length > PUSH_MESSAGE_MAX) {
      toast.error("Respectez les limites de longueur du titre et du message.");
      return null;
    }
    if (draft.targetAudience === "selected" && draft.selectedUserIds.length === 0) {
      toast.error("Sélectionnez au moins un utilisateur.");
      return null;
    }

    setSaving(true);
    try {
      const result = await saveCampaign({
        campaignId: draft.campaignId,
        campaignName: draft.campaignName.trim(),
        category: draft.category,
        templateId: draft.templateId,
        title: draft.title.trim(),
        message: draft.message.trim(),
        imageUrl: draft.imageUrl.trim() || undefined,
        icon: draft.icon,
        actionLabel: draft.actionLabel.trim() || undefined,
        destination: draft.destination.trim() || undefined,
        targetAudience: draft.targetAudience,
        filters: draft.filters,
        selectedUserIds: draft.selectedUserIds.length > 0 ? draft.selectedUserIds : undefined,
        expiresAt: draft.expiresAt,
      });
      const id = result.campaignId as Id<"pushCampaigns">;
      setDraft({ ...draft, campaignId: id });
      toast.success("Campagne enregistrée.");
      onSaved?.(id);
      return id;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (audienceCount === 0) {
      toast.error("Aucun destinataire éligible : vérifiez le ciblage et les autorisations.");
      return;
    }
    const id = await persist();
    if (id) setPendingSend({ id, count: audienceCount });
  };

  const confirmSend = async () => {
    if (!pendingSend) return;
    try {
      const result = await startCampaign({ campaignId: pendingSend.id });
      toast.success(`Envoi lancé vers ${result.recipients} destinataire(s).`);
      setPendingSend(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    }
  };

  const handleSchedule = async () => {
    if (!scheduleAt) {
      toast.error("Choisissez une date et une heure d'envoi.");
      return;
    }
    const timestamp = new Date(scheduleAt).getTime();
    if (!Number.isFinite(timestamp)) {
      toast.error("Date d'envoi invalide.");
      return;
    }
    const id = await persist();
    if (!id) return;
    try {
      await scheduleCampaign({ campaignId: id, scheduledAt: timestamp });
      toast.success(`Campagne programmée pour le ${formatDate(timestamp)}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Programmation impossible.");
    }
  };

  const handleTest = async () => {
    const id = await persist();
    if (!id) return;
    try {
      await sendTest({ campaignId: id });
      toast.success("Notification test envoyée à votre appareil Android.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi test impossible.");
    }
  };

  const hasFilters = Object.values(draft.filters).some(
    (value) => value !== undefined && value !== "" && value !== 0,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Megaphone className="h-4 w-4" /> Contenu de la notification
            </CardTitle>
            <CardDescription className="text-xs">
              Titre et message courts : ils s'affichent sur l'écran verrouillé Android.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nom interne de la campagne</Label>
                <Input
                  value={draft.campaignName}
                  onChange={(event) => patch({ campaignName: event.target.value })}
                  placeholder="Ex. Relance estimation — novembre"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Catégorie d'utilisateur</Label>
                <Select
                  value={draft.category}
                  onValueChange={(value) => patch({ category: value as PushCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_pro">Client Pro</SelectItem>
                    <SelectItem value="expert">Experts</SelectItem>
                    <SelectItem value="supplier">Fournisseurs</SelectItem>
                    <SelectItem value="custom">Personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Titre</Label>
                <span
                  className={`text-[10px] ${
                    titleCount > PUSH_TITLE_MAX ? "text-red-600" : "text-muted-foreground"
                  }`}
                >
                  {titleCount}/{PUSH_TITLE_MAX}
                </span>
              </div>
              <Input
                value={draft.title}
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="⭐ Votre avis compte !"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Message</Label>
                <span
                  className={`text-[10px] ${
                    messageCount > PUSH_MESSAGE_MAX ? "text-red-600" : "text-muted-foreground"
                  }`}
                >
                  {messageCount}/{PUSH_MESSAGE_MAX}
                </span>
              </div>
              <Textarea
                rows={4}
                value={draft.message}
                onChange={(event) => patch({ message: event.target.value })}
                placeholder="Message affiché dans la notification…"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Image (URL HTTPS, facultative)</Label>
                <Input
                  value={draft.imageUrl}
                  onChange={(event) => patch({ imageUrl: event.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Icône (nom ou emoji)</Label>
                <Input
                  value={draft.icon}
                  onChange={(event) => patch({ icon: event.target.value })}
                  placeholder="Bell, Star, 🎁…"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Bouton d'action (facultatif)</Label>
                <Input
                  value={draft.actionLabel}
                  onChange={(event) => patch({ actionLabel: event.target.value })}
                  placeholder="Découvrir les plans"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Destination du clic</Label>
                <Select
                  value={
                    DESTINATIONS.some((d) => d.value === draft.destination)
                      ? draft.destination
                      : "__custom__"
                  }
                  onValueChange={(value) =>
                    patch({ destination: value === "__custom__" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINATIONS.map((destination) => (
                      <SelectItem key={destination.value} value={destination.value}>
                        {destination.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">URL / route personnalisée…</SelectItem>
                  </SelectContent>
                </Select>
                {!DESTINATIONS.some((d) => d.value === draft.destination) && (
                  <Input
                    className="mt-1.5"
                    value={draft.destination}
                    onChange={(event) => patch({ destination: event.target.value })}
                    placeholder="/dashboard/new ou https://…"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Date d'expiration (facultative)</Label>
              <Input
                type="datetime-local"
                value={datetimeLocal(draft.expiresAt)}
                onChange={(event) =>
                  patch({
                    expiresAt: event.target.value
                      ? new Date(event.target.value).getTime()
                      : undefined,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Ciblage ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" /> Ciblage des destinataires
            </CardTitle>
            <CardDescription className="text-xs">
              Seuls les appareils Android autorisés et non désinscrits reçoivent la notification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Audience</Label>
              <Select
                value={draft.targetAudience}
                onValueChange={(value) => patch({ targetAudience: value as PushAudienceId })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUSH_AUDIENCE_IDS.map((audience) => (
                    <SelectItem key={audience} value={audience}>
                      {PUSH_AUDIENCE_LABELS[audience]}
                      {preview?.counts?.[audience] !== undefined
                        ? ` — ${preview.counts[audience]}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Inscription depuis</Label>
                <Input
                  type="date"
                  value={draft.filters.createdFrom ? datetimeLocal(draft.filters.createdFrom).slice(0, 10) : ""}
                  onChange={(event) =>
                    patchFilters({
                      createdFrom: event.target.value
                        ? new Date(event.target.value).getTime()
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Inscription jusqu'à</Label>
                <Input
                  type="date"
                  value={draft.filters.createdTo ? datetimeLocal(draft.filters.createdTo).slice(0, 10) : ""}
                  onChange={(event) =>
                    patchFilters({
                      createdTo: event.target.value
                        ? new Date(`${event.target.value}T23:59:59`).getTime()
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dernière activité</Label>
                <Select
                  value={draft.filters.lastActiveDays ? String(draft.filters.lastActiveDays) : "all"}
                  onValueChange={(value) =>
                    patchFilters({ lastActiveDays: value === "all" ? undefined : Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les appareils</SelectItem>
                    <SelectItem value="7">Actif ces 7 derniers jours</SelectItem>
                    <SelectItem value="30">Actif ces 30 derniers jours</SelectItem>
                    <SelectItem value="90">Actif ces 90 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type d'abonnement</Label>
                <Select
                  value={draft.filters.subscriptionPlan || "all"}
                  onValueChange={(value) =>
                    patchFilters({ subscriptionPlan: value === "all" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les forfaits</SelectItem>
                    {PUSH_SUBSCRIPTION_PLANS.map((plan) => (
                      <SelectItem key={plan} value={plan}>
                        {plan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">État de l'abonnement</Label>
                <Select
                  value={draft.filters.subscriptionStatus || "all"}
                  onValueChange={(value) =>
                    patchFilters({ subscriptionStatus: value === "all" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les états</SelectItem>
                    {PUSH_SUBSCRIPTION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {PUSH_SUBSCRIPTION_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Région</Label>
                <Select
                  value={draft.filters.region || "all"}
                  onValueChange={(value) =>
                    patchFilters({ region: value === "all" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les régions</SelectItem>
                    {Object.entries(TUNISIA_REGION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">N'ayant pas encore utilisé</Label>
                <Select
                  value={draft.filters.notUsedModule || "all"}
                  onValueChange={(value) =>
                    patchFilters({ notUsedModule: value === "all" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Aucun filtre de module</SelectItem>
                    {PUSH_MODULE_IDS.map((module) => (
                      <SelectItem key={module} value={module}>
                        {PUSH_MODULE_LABELS[module]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => patch({ filters: {} })}
              >
                <X className="mr-1 h-3 w-3" /> Réinitialiser les filtres
              </Button>
            )}

            {draft.targetAudience === "selected" && (
              <div className="space-y-2 rounded-lg border border-border/50 p-2.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="h-8 pl-8 text-xs"
                    value={audienceSearch}
                    onChange={(event) => setAudienceSearch(event.target.value)}
                    placeholder="Rechercher un utilisateur Android (nom, e-mail)…"
                  />
                </div>
                {draft.selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.selectedUserIds.map((id) => (
                      <Badge key={id} variant="secondary" className="gap-1 text-[10px]">
                        {preview?.sample?.find((user) => user._id === id)?.name ?? "Sélectionné"}
                        <button onClick={() => toggleUser(id)} aria-label="Retirer">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {(userResults ?? []).map((user) => {
                  const selected = draft.selectedUserIds.includes(user._id);
                  return (
                    <button
                      key={user._id}
                      onClick={() => toggleUser(user._id)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                        selected ? "bg-primary/10 text-primary" : "hover:bg-muted/40"
                      }`}
                    >
                      <span className="truncate">
                        {user.name} · <span className="text-muted-foreground">{user.email}</span>
                      </span>
                      {selected ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Destinataires éligibles
              </span>
              <span className="text-sm font-bold">{audienceCount}</span>
            </div>
            {audienceCount > 5000 && (
              <p className="flex gap-1.5 text-[11px] text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Limitez l'audience à 5 000
                destinataires par envoi.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSendNow} disabled={saving} className="gap-1.5">
            <Send className="h-4 w-4" /> Envoyer maintenant
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={saving} className="gap-1.5">
            <Smartphone className="h-4 w-4" /> Envoyer un test
          </Button>
          <Button variant="secondary" onClick={() => void persist()} disabled={saving} className="gap-1.5">
            <Clock className="h-4 w-4" /> Enregistrer le brouillon
          </Button>
          <div className="flex items-center gap-1.5">
            <Input
              type="datetime-local"
              className="h-9 w-[190px] text-xs"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
            />
            <Button variant="outline" onClick={handleSchedule} disabled={saving} className="gap-1.5">
              <CalendarClock className="h-4 w-4" /> Programmer
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <AndroidPreview draft={draft} />
      </div>

      <Dialog open={!!pendingSend} onOpenChange={(open) => !open && setPendingSend(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'envoi</DialogTitle>
            <DialogDescription>
              Cette notification sera envoyée à{" "}
              <strong>{pendingSend?.count ?? 0} destinataire(s)</strong> éligible(s). Les
              utilisateurs désinscrits et les appareils non autorisés sont exclus. Vous ne pourrez
              plus annuler l'envoi une fois lancé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingSend(null)}>
              Annuler
            </Button>
            <Button onClick={confirmSend} className="gap-1.5">
              <Send className="h-4 w-4" /> Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Module principal
// ============================================================================

export function PushNotifications({ initialTab = "dashboard" }: { initialTab?: string } = {}) {
  const [tab, setTab] = useState(initialTab);
  const [periodDays, setPeriodDays] = useState("30");
  const [category, setCategory] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailId, setDetailId] = useState<Id<"pushCampaigns"> | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Id<"pushCampaigns"> | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");
  const [editId, setEditId] = useState<Id<"pushCampaigns"> | null>(null);

  const stats = useQuery(api.push.getDashboardStats, {
    periodDays: periodDays === "all" ? undefined : Number(periodDays),
    category: category === "all" ? undefined : (category as PushCategory),
    campaignId: campaignFilter === "all" ? undefined : (campaignFilter as Id<"pushCampaigns">),
  });
  const campaigns = useQuery(api.push.listCampaigns, {
    status: statusFilter === "all" ? undefined : (statusFilter as any),
  });
  const tokens = useQuery(api.push.getTokenSummary, {});
  const detail = useQuery(
    api.push.getCampaign,
    detailId ? { campaignId: detailId } : "skip",
  );
  const editing = useQuery(
    api.push.getCampaign,
    editId ? { campaignId: editId } : "skip",
  );

  const startCampaign = useMutation(api.push.startCampaign);
  const suspendCampaign = useMutation(api.push.suspendCampaign);
  const cancelCampaign = useMutation(api.push.cancelCampaign);
  const deleteCampaign = useMutation(api.push.deleteCampaign);
  const scheduleCampaign = useMutation(api.push.scheduleCampaign);

  useEffect(() => {
    if (editing?.campaign) {
      setDraft(toDraft(editing.campaign));
      setTab("editor");
      setEditId(null);
    }
  }, [editing]);

  const byCategory = useMemo(() => stats?.byCategory ?? [], [stats]);
  const maxSeries = useMemo(
    () => Math.max(1, ...(stats?.series ?? []).map((point) => point.delivered)),
    [stats],
  );

  const useTemplate = (template: PushTemplate) => {
    const defaults = templateDefaults(template);
    const audience: PushAudienceId =
      template.category === "expert"
        ? "expert_all"
        : template.category === "supplier"
          ? "supplier_all"
          : template.category === "client_pro"
            ? "client_pro_all"
            : "all_android";
    setDraft({
      ...EMPTY_DRAFT,
      ...defaults,
      icon: defaults.icon,
      targetAudience: audience,
      filters: {},
    });
    setTab("editor");
  };

  const confirmSendCampaign = async (campaign: any) => {
    if (!campaign.audienceCount) {
      toast.error("Aucun destinataire éligible pour cette campagne.");
      return;
    }
    if (
      !window.confirm(
        `Envoyer « ${campaign.title} » à ${campaign.audienceCount} destinataire(s) ?`,
      )
    ) {
      return;
    }
    try {
      const result = await startCampaign({ campaignId: campaign._id });
      toast.success(`Envoi lancé vers ${result.recipients} destinataire(s).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    }
  };

  const handleSchedule = async () => {
    if (!scheduleFor || !scheduleValue) return;
    const timestamp = new Date(scheduleValue).getTime();
    try {
      await scheduleCampaign({ campaignId: scheduleFor, scheduledAt: timestamp });
      toast.success(`Campagne programmée pour le ${formatDate(timestamp)}.`);
      setScheduleFor(null);
      setScheduleValue("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Programmation impossible.");
    }
  };

  const handleAction = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-primary" /> Push Notifications
          </h2>
          <p className="text-xs text-muted-foreground">
            Notifications Android (Firebase Cloud Messaging) — livraison même application fermée.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setDraft({ ...EMPTY_DRAFT, campaignName: "Nouvelle notification" });
            setTab("editor");
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle notification
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
          {[
            { value: "dashboard", label: "Tableau de bord", icon: BarChart3 },
            { value: "modeles", label: "Modèles", icon: Copy },
            { value: "editor", label: "Éditeur", icon: Pencil },
            { value: "campagnes", label: "Campagnes", icon: Megaphone },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5 px-3 py-1.5 text-xs">
              <Icon className="h-3.5 w-3.5" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ───────────────────────── Tableau de bord ───────────────────────── */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={periodDays} onValueChange={setPeriodDays}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
                <SelectItem value="all">Depuis le début</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="client_pro">Client Pro</SelectItem>
                <SelectItem value="expert">Experts</SelectItem>
                <SelectItem value="supplier">Fournisseurs</SelectItem>
                <SelectItem value="custom">Personnalisées</SelectItem>
              </SelectContent>
            </Select>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="h-8 w-[210px] text-xs">
                <SelectValue placeholder="Toutes les campagnes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les campagnes</SelectItem>
                {(stats?.campaignOptions ?? []).map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: "Notifications envoyées", value: stats?.totals.sent ?? 0, icon: Send },
              {
                label: "Acceptées par FCM",
                value: stats?.totals.delivered ?? 0,
                icon: CheckCircle2,
              },
              { label: "Ouvertes (tap détecté)", value: stats?.totals.opened ?? 0, icon: Eye },
              { label: "Clics (destination ouverte)", value: stats?.totals.clicked ?? 0, icon: MousePointerClick },
              { label: "Taux d'ouverture", value: `${stats?.totals.openRate ?? 0} %`, icon: BarChart3 },
              { label: "Conversions attribuées", value: stats?.totals.conversions ?? 0, icon: TrendingUp },
              { label: "Utilisateurs Android", value: stats?.totals.androidUsers ?? 0, icon: Smartphone },
              { label: "Ayant autorisé", value: stats?.totals.authorizedUsers ?? 0, icon: Bell },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="mt-1 text-xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performance par campagne</CardTitle>
                <CardDescription className="text-[11px]">
                  Acceptées = reçues par FCM. Ouvertes / clics = mesurés uniquement lorsque
                  l'application Android le signale.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {(stats?.series ?? []).length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Aucune campagne sur la période sélectionnée.
                  </p>
                ) : (
                  (stats?.series ?? []).map((point) => (
                    <div key={point.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="truncate font-medium">{point.name}</span>
                        <span className="text-muted-foreground">
                          {point.delivered} acceptées · {point.opened} ouvertes · {point.clicked}{" "}
                          clics
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(4, (point.delivered / maxSeries) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Comparaison des catégories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {byCategory.map((row: any) => (
                  <div
                    key={row.category}
                    className="flex items-center justify-between rounded-lg border border-border/40 px-2.5 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium">
                        {PUSH_CATEGORY_LABELS[row.category as PushCategory] ?? row.category}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {row.delivered} acceptées · {row.opened} ouvertes · {row.clicked} clics
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{row.sent}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-3 w-3" /> Appareils actifs
                  </span>
                  <span className="font-semibold text-foreground">{tokens?.active ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Autorisation refusée
                  </span>
                  <span className="font-semibold text-foreground">{tokens?.denied ?? 0}</span>
                </div>
                <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
                  Les conversions comptent l'ouverture d'un parcours monétisable (estimation,
                  cotisation, mise en relation, plans, investissement) ou d'une évaluation.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ──────────────────────────── Modèles ───────────────────────────── */}
        <TabsContent value="modeles" className="mt-4 space-y-4">
          {CATEGORY_ORDER.map((categoryKey) => (
            <div key={categoryKey}>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {categoryKey === "client_pro" ? (
                  <Star className="h-3.5 w-3.5" />
                ) : categoryKey === "expert" ? (
                  <HardHat className="h-3.5 w-3.5" />
                ) : (
                  <Package className="h-3.5 w-3.5" />
                )}
                {PUSH_CATEGORY_LABELS[categoryKey]}
              </h3>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {PUSH_TEMPLATES.filter(
                  (template) =>
                    template.category === categoryKey ||
                    (categoryKey === "client_pro" && template.id === "cp-custom"),
                ).map((template) => {
                  const Icon = templateIcon(template.icon);
                  return (
                    <Card key={template.id} className="flex flex-col border-border/40">
                      <CardContent className="flex flex-1 flex-col gap-2 p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-xs font-semibold leading-snug">
                            {template.title || "Offre personnalisée"}
                          </p>
                        </div>
                        {template.message ? (
                          <p className="line-clamp-4 text-[11px] leading-relaxed text-muted-foreground">
                            {template.message}
                          </p>
                        ) : (
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Créez librement : titre, message, image, bouton, destination et date de
                            validité.
                          </p>
                        )}
                        {template.note && (
                          <p className="flex gap-1 text-[10px] leading-relaxed text-amber-600">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            {template.note}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {template.actionLabel || "Sans bouton"}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-[11px]"
                            onClick={() => useTemplate(template)}
                          >
                            <Pencil className="h-3 w-3" /> Utiliser
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ──────────────────────────── Éditeur ───────────────────────────── */}
        <TabsContent value="editor" className="mt-4">
          <CampaignEditor draft={draft} setDraft={setDraft} />
        </TabsContent>

        {/* ─────────────────────────── Campagnes ──────────────────────────── */}
        <TabsContent value="campagnes" className="mt-4 space-y-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(campaigns ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-xs text-muted-foreground">
                Aucune campagne. Créez une notification depuis un modèle ou l'éditeur.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(campaigns ?? []).map((campaign: any) => (
                <Card key={campaign._id} className="border-border/40">
                  <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs font-semibold">{campaign.title}</p>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] ${STATUS_STYLES[campaign.status] ?? ""}`}
                        >
                          {STATUS_LABELS[campaign.status] ?? campaign.status}
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">
                          {PUSH_CATEGORY_LABELS[campaign.category as PushCategory] ??
                            campaign.category}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {campaign.campaignName} · {campaign.audienceCount} destinataire(s)
                        {campaign.scheduledAt
                          ? ` · programmée le ${formatDate(campaign.scheduledAt)}`
                          : campaign.sentAt
                            ? ` · envoyée le ${formatDate(campaign.sentAt)}`
                            : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {["draft", "suspended", "failed"].includes(campaign.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-[11px]"
                          onClick={() => {
                            setEditId(campaign._id);
                          }}
                        >
                          <Pencil className="h-3 w-3" /> Modifier
                        </Button>
                      )}
                      {["draft", "scheduled", "suspended", "failed"].includes(campaign.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-[11px]"
                          onClick={() => void confirmSendCampaign(campaign)}
                        >
                          <Play className="h-3 w-3" /> Envoyer
                        </Button>
                      )}
                      {["draft", "suspended", "failed"].includes(campaign.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-[11px]"
                          onClick={() => {
                            setScheduleFor(campaign._id);
                            setScheduleValue(datetimeLocal(Date.now() + 3_600_000));
                          }}
                        >
                          <CalendarClock className="h-3 w-3" /> Programmer
                        </Button>
                      )}
                      {campaign.status === "scheduled" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-[11px]"
                          onClick={() =>
                            void handleAction(
                              () => suspendCampaign({ campaignId: campaign._id }),
                              "Campagne suspendue.",
                            )
                          }
                        >
                          <X className="h-3 w-3" /> Suspendre
                        </Button>
                      )}
                      {!["sent", "cancelled"].includes(campaign.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-[11px] text-amber-600"
                          onClick={() =>
                            void handleAction(
                              () => cancelCampaign({ campaignId: campaign._id }),
                              "Campagne annulée.",
                            )
                          }
                        >
                          <X className="h-3 w-3" /> Annuler
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-[11px]"
                        onClick={() => setDetailId(campaign._id)}
                      >
                        <Eye className="h-3 w-3" /> Détails
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600"
                        aria-label="Supprimer"
                        onClick={() => {
                          if (!window.confirm("Supprimer définitivement cette campagne ?")) return;
                          void handleAction(
                            () => deleteCampaign({ campaignId: campaign._id }),
                            "Campagne supprimée.",
                          );
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Détail d'une campagne */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.campaign.title ?? "Détail de la campagne"}</DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.campaign.campaignName} · ${detail.campaign.stats.targeted} destinataire(s)`
                : "Chargement…"}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Acceptées", value: detail.campaign.stats.delivered },
                  { label: "Ouvertes", value: detail.campaign.stats.opened },
                  { label: "Clics", value: detail.campaign.stats.clicked },
                  { label: "Conversions", value: detail.campaign.stats.conversions },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/40 p-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-lg font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Échecs : {detail.campaign.stats.failed} · ignorés :{" "}
                {detail.campaign.stats.skipped} · taux d'ouverture{" "}
                {detail.campaign.stats.openRate} %
              </p>
              <div className="max-h-64 overflow-auto rounded-lg border border-border/40">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/40 text-left text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">Utilisateur</th>
                      <th className="px-2 py-1.5">Livraison</th>
                      <th className="px-2 py-1.5">Ouverture</th>
                      <th className="px-2 py-1.5">Clic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.logs.map((log) => (
                      <tr key={log._id} className="border-t border-border/30">
                        <td className="max-w-[160px] truncate px-2 py-1.5">
                          {log.userName}
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {log.userEmail}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">{log.deliveryStatus}</td>
                        <td className="px-2 py-1.5">{formatDate(log.openedAt)}</td>
                        <td className="px-2 py-1.5">{formatDate(log.clickedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.logs.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun envoi enregistré pour cette campagne.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Programmation */}
      <Dialog open={!!scheduleFor} onOpenChange={(open) => !open && setScheduleFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programmer la notification</DialogTitle>
            <DialogDescription>
              L'envoi démarre automatiquement à l'heure choisie (décalage maximal : une minute).
            </DialogDescription>
          </DialogHeader>
          <Input
            type="datetime-local"
            value={scheduleValue}
            onChange={(event) => setScheduleValue(event.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScheduleFor(null)}>
              Annuler
            </Button>
            <Button onClick={handleSchedule} className="gap-1.5">
              <CalendarClock className="h-4 w-4" /> Programmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PushNotifications;
