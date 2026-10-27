import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  Loader2,
  Save,
  Truck,
  UserRoundCheck,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PROFESSIONAL_SERVICES,
  PROFESSIONAL_SERVICES,
  TRIAL_MAX_DAYS,
  TRIAL_MIN_DAYS,
  professionalServiceLabels,
  type ProfessionalRole,
} from "@/lib/subscriptionPlans";

// ============================================================================
// B / C. ABONNEMENTS MENSUELS EXPERT & FOURNISSEUR — configuration séparée
// ----------------------------------------------------------------------------
// Prix mensuel, essai (activation + durée), services inclus et conditions de
// renouvellement. Client Pro (cotisation par crédits) est totalement séparé :
// aucun paiement professionnel n'attribue de crédits Client Pro.
// ============================================================================

interface PlanForm {
  price: string;
  free: boolean;
  trialEnabled: boolean;
  trialDays: string;
  services: string[];
  autoRenew: boolean;
  reminderDays: string;
}

const EMPTY_FORM: PlanForm = {
  price: "",
  free: false,
  trialEnabled: true,
  trialDays: "7",
  services: [],
  autoRenew: true,
  reminderDays: "3",
};

export function ProfessionalPlanSettings({ role }: { role: ProfessionalRole }) {
  const data = useQuery(api.payments.getProfessionalPlansAdmin);
  const save = useMutation(api.payments.updateProfessionalPlanConfig);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const plan = data?.[role];
  const signature = JSON.stringify(plan ?? null);

  useEffect(() => {
    if (!plan) return;
    const services =
      plan.includedServices && plan.includedServices.length > 0
        ? plan.includedServices
        : DEFAULT_PROFESSIONAL_SERVICES[role];
    setForm({
      price: plan.price === null ? "" : String(plan.price),
      free: plan.price === null || plan.price === 0,
      trialEnabled: plan.trialEnabled,
      trialDays: String(plan.trialDays),
      services,
      autoRenew: plan.autoRenew,
      reminderDays: String((plan as any).reminderDays ?? 3),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, role]);

  const isExpert = role === "expert";
  const label = isExpert ? "Expert" : "Fournisseur";

  const handleSave = async () => {
    const price = form.free ? null : parseInt(form.price, 10);
    const trialDays = parseInt(form.trialDays, 10);
    if (!form.free && (!Number.isFinite(price) || (price as number) < 0)) {
      toast.error("Saisissez un prix mensuel en TND (ou activez l'offre gratuite).");
      return;
    }
    if (
      !Number.isInteger(trialDays) ||
      trialDays < TRIAL_MIN_DAYS ||
      trialDays > TRIAL_MAX_DAYS
    ) {
      toast.error(`La durée de l'essai doit être comprise entre ${TRIAL_MIN_DAYS} et ${TRIAL_MAX_DAYS} jours.`);
      return;
    }
    setSaving(true);
    try {
      await save({
        plan: role,
        price,
        trialEnabled: form.trialEnabled,
        trialDays,
        includedServices: form.services,
        autoRenew: form.autoRenew,
        reminderDays: parseInt(form.reminderDays, 10) || 3,
      });
      toast.success(`Abonnement ${label} enregistré — paramètres persistants.`);
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'enregistrer l'abonnement.");
    } finally {
      setSaving(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/30 p-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de l'abonnement {label}…
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-600 dark:text-red-400">
        Accès administrateur requis.
      </div>
    );
  }

  return (
    <section
      className={cn(
        "space-y-4 rounded-xl border p-5",
        isExpert
          ? "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] to-transparent"
          : "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] to-transparent",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            {isExpert ? (
              <BriefcaseBusiness className="h-4 w-4 text-violet-600" />
            ) : (
              <Truck className="h-4 w-4 text-amber-600" />
            )}
            {isExpert ? "B. Abonnement mensuel Expert" : "C. Abonnement mensuel Fournisseur"}
          </h3>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Abonnement mensuel (30 jours) distinct de la cotisation Client Pro. À l'expiration sans
            paiement, les services professionnels sont suspendus et le profil devient invisible —
            les données sont conservées.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {form.free ? "Offre gratuite" : `${form.price || "—"} TND/mois`}
          </Badge>
          <Badge
            className={cn(
              "text-[10px]",
              form.trialEnabled
                ? "border-emerald-200/30 bg-emerald-500/10 text-emerald-600"
                : "border-border/40 text-muted-foreground",
            )}
          >
            Essai {form.trialEnabled ? `${form.trialDays} j` : "désactivé"}
          </Badge>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="text-[11px] text-muted-foreground">Prix mensuel (TND)</label>
          <Input
            type="number"
            min={0}
            value={form.free ? "" : form.price}
            disabled={form.free}
            placeholder={form.free ? "Offre gratuite" : "120"}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-[11px] text-muted-foreground">
          <Switch
            checked={form.free}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, free: checked }))}
          />
          Offre gratuite (0 TND)
        </label>
        <div className="w-40">
          <label className="text-[11px] text-muted-foreground">Durée de l'essai (jours)</label>
          <Input
            type="number"
            min={TRIAL_MIN_DAYS}
            max={TRIAL_MAX_DAYS}
            value={form.trialDays}
            disabled={!form.trialEnabled}
            onChange={(e) => setForm((prev) => ({ ...prev, trialDays: e.target.value }))}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-[11px] text-muted-foreground">
          <Switch
            checked={form.trialEnabled}
            onCheckedChange={(checked) =>
              setForm((prev) => ({ ...prev, trialEnabled: checked }))
            }
          />
          Essai gratuit activé
        </label>
      </div>

      <div className="rounded-lg border border-border/30 bg-background/60 p-3">
        <p className="flex items-center gap-2 text-xs font-medium">
          <UserRoundCheck className="h-3.5 w-3.5" /> Services inclus dans le forfait
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {PROFESSIONAL_SERVICES[role].map((service) => {
            const checked = form.services.includes(service.key);
            return (
              <label
                key={service.key}
                className="flex items-start gap-2 rounded-md px-1.5 py-1 text-[11px] hover:bg-muted/30"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      services: e.target.checked
                        ? [...prev.services, service.key]
                        : prev.services.filter((key) => key !== service.key),
                    }))
                  }
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                />
                <span>{service.label}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {professionalServiceLabels(role, form.services).length} service(s) inclus.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/30 bg-background/60 p-3">
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">Rappel de renouvellement avant l'échéance</p>
            <p className="text-[10px] text-muted-foreground">
              Aucun prélèvement automatique : le renouvellement est une demande dont le paiement
              doit être confirmé. Le profil reste visible jusqu'à la date d'échéance.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32">
            <label className="text-[10px] text-muted-foreground">Rappel (jours avant)</label>
            <Input
              type="number"
              min={1}
              max={30}
              value={form.reminderDays}
              onChange={(e) => setForm((prev) => ({ ...prev, reminderDays: e.target.value }))}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <Switch
            checked={form.autoRenew}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, autoRenew: checked }))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/20 pt-3">
        <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
        <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer l'abonnement {label}
        </Button>
      </div>
    </section>
  );
}

export default ProfessionalPlanSettings;
