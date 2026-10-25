import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Crown,
  Gift,
  Info,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PROJECT_LIMIT_MAX,
  PROJECT_LIMIT_MIN,
  PROJECT_LIMIT_TIERS,
  PROJECT_LIMIT_TIER_LABELS,
  normalizeProjectLimitConfig,
  validateProjectLimitConfig,
  type ProjectLimitConfig,
  type ProjectLimitResetMode,
  type ProjectLimitRule,
  type ProjectLimitTier,
} from "@/lib/projectLimits";

// ============================================================================
// ADMINISTRATION — LIMITE DU NOMBRE DE PROJETS PAR OFFRE
// ----------------------------------------------------------------------------
// Admin → Abonnements mensuels → Prix et configuration.
//
// Trois plafonds indépendants, enregistrés dans Convex (`paymentConfig`) :
//   • période d'essai gratuite ;
//   • offre gratuite (forfait sans paiement) ;
//   • Client Pro payant (limite facultative, désactivée par défaut).
//
// Aucune valeur n'est codée en dur dans le moteur : le backend
// (`convex/projectLimits.ts`) relit ces paramètres à chaque création de projet.
// Les projets déjà créés ne sont jamais supprimés ni verrouillés.
// ============================================================================

const TIER_ICONS: Record<ProjectLimitTier, typeof Sparkles> = {
  trial: Sparkles,
  free: Gift,
  paid: Crown,
};

const TIER_TONES: Record<ProjectLimitTier, string> = {
  trial: "border-emerald-500/25 from-emerald-500/[0.06]",
  free: "border-amber-500/25 from-amber-500/[0.06]",
  paid: "border-blue-500/25 from-blue-500/[0.06]",
};

const TIER_HINTS: Record<ProjectLimitTier, string> = {
  trial: "S'applique aux comptes dont la période d'essai est active.",
  free: "S'applique aux abonnés dont le forfait est proposé gratuitement (« Offre gratuite »).",
  paid:
    "S'applique aux abonnés Client Pro payants. Désactivé par défaut : les conditions du forfait payant restent inchangées.",
};

export function ProjectLimitSettings() {
  const data = useQuery(api.projectLimits.getProjectLimitConfig);
  const saveConfig = useMutation(api.projectLimits.updateProjectLimitConfig);
  const resetConfig = useMutation(api.projectLimits.resetProjectLimitConfig);

  const [form, setForm] = useState<ProjectLimitConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Synchronisation depuis le serveur uniquement lorsque la configuration
  // enregistrée change réellement (une saisie en cours n'est pas écrasée par un
  // simple rafraîchissement réactif).
  const signature = JSON.stringify(data?.config ?? null);
  useEffect(() => {
    if (data?.config) setForm(data.config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const errors = form ? validateProjectLimitConfig(form) : [];

  const updateRule = (tier: ProjectLimitTier, patch: Partial<ProjectLimitRule>) => {
    setForm((prev) => (prev ? { ...prev, [tier]: { ...prev[tier], ...patch } } : prev));
  };

  const handleSave = async () => {
    if (!form) return;
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    setSaving(true);
    try {
      await saveConfig({
        trial: { ...form.trial, maxProjects: Math.round(form.trial.maxProjects) },
        free: { ...form.free, maxProjects: Math.round(form.free.maxProjects) },
        paid: { ...form.paid, maxProjects: Math.round(form.paid.maxProjects) },
      });
      const active = PROJECT_LIMIT_TIERS.filter((tier) => form[tier].enabled);
      toast.success(
        active.length === 0
          ? "Limites de projets enregistrées : aucune limite active (création illimitée)."
          : `Limites enregistrées : ${active
              .map((tier) => `${PROJECT_LIMIT_TIER_LABELS[tier]} → ${form[tier].maxProjects}`)
              .join(" · ")}.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'enregistrer les limites de projets.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "Réinitialiser les limites de projets ? Aucune limite ne sera plus appliquée (création illimitée pour les offres concernées). Aucun projet existant n'est supprimé.",
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await resetConfig({});
      setForm(normalizeProjectLimitConfig(res.config as any));
      toast.success("Limites de projets réinitialisées (aucune limite).");
    } catch (err: any) {
      toast.error(err?.message || "Réinitialisation impossible.");
    } finally {
      setSaving(false);
    }
  };

  if (data === undefined || !form) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/30 p-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des limites de projets…
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-600 dark:text-red-400">
        Accès administrateur requis pour configurer les limites de projets.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-gradient-to-br from-background/80 to-background/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <AlertCircle className="h-4 w-4 text-primary" />
            Limite du nombre de projets par offre
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Plafond de projets créables par compte. La limite est vérifiée côté serveur à chaque
            création ; les projets déjà créés restent consultables et modifiables.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PROJECT_LIMIT_TIERS.filter((tier) => form[tier].enabled).length === 0 ? (
            <Badge variant="outline" className="text-[10px]">
              Aucune limite active
            </Badge>
          ) : (
            PROJECT_LIMIT_TIERS.filter((tier) => form[tier].enabled).map((tier) => (
              <Badge
                key={tier}
                variant="outline"
                className="text-[10px] border-primary/30 text-primary"
              >
                {PROJECT_LIMIT_TIER_LABELS[tier]} : {form[tier].maxProjects}
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {PROJECT_LIMIT_TIERS.map((tier) => {
          const Icon = TIER_ICONS[tier];
          const rule = form[tier];
          return (
            <div
              key={tier}
              className={cn(
                "space-y-3 rounded-xl border bg-gradient-to-br to-transparent p-3.5",
                TIER_TONES[tier],
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <Icon className="h-3.5 w-3.5" />
                    {PROJECT_LIMIT_TIER_LABELS[tier]}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    {TIER_HINTS[tier]}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-[10px]",
                    rule.enabled
                      ? "border-emerald-200/30 bg-emerald-500/10 text-emerald-600"
                      : "text-muted-foreground",
                  )}
                >
                  {rule.enabled ? `${rule.maxProjects} max` : "Illimité"}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-background/60 px-2.5 py-2">
                <span className="text-[11px]">Activer la limite de projets</span>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) => updateRule(tier, { enabled: checked })}
                />
              </div>

              <div className="space-y-2 rounded-lg border border-border/30 bg-background/60 p-2.5">
                <div>
                  <label className="text-[10px] text-muted-foreground">
                    Nombre maximal de projets
                  </label>
                  <Input
                    type="number"
                    min={PROJECT_LIMIT_MIN}
                    max={PROJECT_LIMIT_MAX}
                    value={Number.isFinite(rule.maxProjects) ? rule.maxProjects : ""}
                    onChange={(e) =>
                      updateRule(tier, { maxProjects: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-1 h-8 w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Réinitialisation</label>
                  <Select
                    value={rule.resetMode}
                    onValueChange={(value) =>
                      updateRule(tier, { resetMode: value as ProjectLimitResetMode })
                    }
                  >
                    <SelectTrigger size="sm" className="mt-1 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offer">Par période de l'offre</SelectItem>
                      <SelectItem value="total">Total cumulé (jamais réinitialisé)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {[1, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => updateRule(tier, { maxProjects: n })}
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[10px] transition-colors",
                        rule.maxProjects === n
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/40 text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 rounded-lg border border-border/30 bg-muted/10 p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          « Par période de l'offre » compte les projets créés depuis le début de la période en cours
          (essai ou abonnement mensuel). « Total cumulé » compte tous les projets du compte, sans
          remise à zéro. À l'expiration de l'essai, les projets existants sont conservés et les
          règles de l'offre suivante s'appliquent. Le forfait Client Pro conserve ses fonctionnalités
          : seul un plafond explicitement activé ci-dessus le limite.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {saving ? (
          <Button disabled className="gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Enregistrement…
          </Button>
        ) : (
          <Button onClick={() => void handleSave()} className="gap-2">
            <Save className="h-4 w-4" />
            Enregistrer les limites
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => void handleReset()}
          disabled={saving}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser (aucune limite)
        </Button>
        {errors.length > 0 && (
          <span className="text-[11px] text-red-600 dark:text-red-400">{errors[0]}</span>
        )}
      </div>
    </div>
  );
}

export default ProjectLimitSettings;
