import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Coins,
  FolderKanban,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CLIENT_PRO_PROJECT_MAX,
  CLIENT_PRO_PROJECT_MIN,
  DEFAULT_CLIENT_PRO_CREDIT_CONFIG,
  projectsLabel,
  type ClientProCreditConfig,
} from "@/lib/clientProCredits";

// ============================================================================
// A. COTISATION CLIENT PRO — crédits de projets
// ----------------------------------------------------------------------------
// L'administrateur règle : la gratuité initiale, le nombre de projets gratuits,
// la cotisation de base (montant + projets inclus), les packs supplémentaires,
// et les règles de consommation. Tous les paramètres sont enregistrés dans
// Convex et relus côté serveur à chaque création de projet / paiement.
// ============================================================================

type TierRow = { projects: string; price: string };

const toTierRows = (tiers: { projects: number; price: number }[]): TierRow[] =>
  tiers.map((tier) => ({ projects: String(tier.projects), price: String(tier.price) }));

export function ClientProCotisationSettings() {
  const data = useQuery(api.clientProCredits.getClientProCreditConfig);
  const orders = useQuery(api.clientProCredits.adminListClientProOrders) ?? [];
  const save = useMutation(api.clientProCredits.updateClientProCreditConfig);
  const approve = useMutation(api.clientProCredits.adminApproveClientProOrder);
  const reject = useMutation(api.clientProCredits.adminRejectClientProOrder);
  const migrate = useMutation(api.clientProCredits.migrateClientProCredits);

  const [form, setForm] = useState<ClientProCreditConfig | null>(null);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);

  const signature = JSON.stringify(data?.config ?? null);
  useEffect(() => {
    if (!data?.config) return;
    setForm(data.config);
    setTiers(toTierRows(data.config.tiers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const pending = orders.filter((order: any) => order.status === "pending");

  const update = (patch: Partial<ClientProCreditConfig>) =>
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSave = async () => {
    if (!form) return;
    const parsedTiers = tiers.map((row) => ({
      projects: parseInt(row.projects, 10),
      price: parseInt(row.price, 10),
    }));
    if (
      !Number.isInteger(form.freeProjects) ||
      form.freeProjects < 0 ||
      form.freeProjects > CLIENT_PRO_PROJECT_MAX
    ) {
      toast.error(`Le nombre de projets gratuits doit être compris entre 0 et ${CLIENT_PRO_PROJECT_MAX}.`);
      return;
    }
    if (
      !Number.isInteger(form.cotisationProjects) ||
      form.cotisationProjects < CLIENT_PRO_PROJECT_MIN ||
      !Number.isFinite(form.cotisationPrice) ||
      form.cotisationPrice <= 0
    ) {
      toast.error("La cotisation de base doit avoir un nombre de projets et un prix positifs.");
      return;
    }
    if (parsedTiers.some((t) => !Number.isInteger(t.projects) || t.projects < 1 || !Number.isFinite(t.price) || t.price <= 0)) {
      toast.error("Chaque pack doit avoir un nombre de projets et un prix positifs.");
      return;
    }
    const quantities = [form.cotisationProjects, ...parsedTiers.map((t) => t.projects)];
    if (new Set(quantities).size !== quantities.length) {
      toast.error("Deux possibilités de cotisation proposent la même quantité de projets.");
      return;
    }

    setSaving(true);
    try {
      await save({
        freeGrantEnabled: form.freeGrantEnabled,
        freeProjects: Math.round(form.freeProjects),
        cotisationPrice: Math.round(form.cotisationPrice),
        cotisationProjects: Math.round(form.cotisationProjects),
        tiers: parsedTiers.map((t) => ({ projects: Math.round(t.projects), price: Math.round(t.price) })),
        refundOnDelete: form.refundOnDelete,
        allowStacking: form.allowStacking,
      });
      toast.success("Cotisation Client Pro enregistrée : les paramètres sont conservés dans Convex.");
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'enregistrer la cotisation.");
    } finally {
      setSaving(false);
    }
  };

  const handleMigration = async () => {
    if (!window.confirm(
      "Accorder la gratuité initiale aux comptes qui ne l'ont jamais reçue ?\n\n" +
        "Aucun projet, paiement ou abonnement n'est supprimé. Les projets existants consomment le quota accordé.",
    )) return;
    setMigrating(true);
    try {
      const res = await migrate({});
      toast.success(
        `${res.granted} compte(s) initialisé(s) — ${projectsLabel(res.freeProjects)} gratuits (une seule fois).`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Migration impossible.");
    } finally {
      setMigrating(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    setBusyOrder(orderId);
    try {
      const res = await approve({ orderId: orderId as any });
      toast.success(
        res.alreadyConfirmed
          ? "Cette cotisation était déjà confirmée : aucun crédit attribué deux fois."
          : `${projectsLabel(res.grantedProjects)} attribués après confirmation du paiement.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Validation impossible.");
    } finally {
      setBusyOrder(null);
    }
  };

  const handleReject = async (orderId: string) => {
    const reason = window.prompt("Motif du refus (facultatif) :") ?? undefined;
    setBusyOrder(orderId);
    try {
      await reject({ orderId: orderId as any, reason });
      toast.success("Cotisation refusée : aucun crédit attribué.");
    } catch (err: any) {
      toast.error(err?.message || "Refus impossible.");
    } finally {
      setBusyOrder(null);
    }
  };

  if (data === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/30 p-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la cotisation Client Pro…
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
  if (!form) return null;

  return (
    <section className="space-y-5 rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/[0.06] to-transparent p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Coins className="h-4 w-4 text-blue-600" />
            A. Cotisation Client Pro
          </h3>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Client Pro n'est pas un abonnement mensuel : l'utilisateur reçoit une fois un quota de
            projets gratuits, puis achète des packs de projets. Aucun renouvellement automatique.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {projectsLabel(form.cotisationProjects)} · {form.cotisationPrice} TND
          </Badge>
          <Badge
            className={cn(
              "text-[10px]",
              form.freeGrantEnabled
                ? "border-emerald-200/30 bg-emerald-500/10 text-emerald-600"
                : "border-border/40 text-muted-foreground",
            )}
          >
            Gratuité initiale {form.freeGrantEnabled ? "activée" : "désactivée"}
          </Badge>
        </div>
      </header>

      {/* Gratuité initiale */}
      <div className="space-y-3 rounded-lg border border-border/30 bg-background/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium">Accorder des projets gratuits à la première inscription</p>
            <p className="text-[11px] text-muted-foreground">
              Accordés une seule fois par utilisateur. Désactivé, aucun projet gratuit n'est accordé —
              même aux comptes existants.
            </p>
          </div>
          <Switch
            checked={form.freeGrantEnabled}
            onCheckedChange={(checked) => update({ freeGrantEnabled: checked })}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="text-[11px] text-muted-foreground">Projets gratuits (par utilisateur)</label>
            <Input
              type="number"
              min={0}
              max={CLIENT_PRO_PROJECT_MAX}
              value={Number.isFinite(form.freeProjects) ? form.freeProjects : ""}
              disabled={!form.freeGrantEnabled}
              onChange={(e) => update({ freeProjects: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <p className="pb-1.5 text-[11px] text-muted-foreground">
            Avec <strong>1 projet gratuit</strong>, le premier projet est créé immédiatement ; la
            cotisation n'est demandée qu'à la création du deuxième.
          </p>
        </div>
      </div>

      {/* Cotisation de base + packs */}
      <div className="space-y-3 rounded-lg border border-border/30 bg-background/60 p-3">
        <p className="flex items-center gap-2 text-xs font-medium">
          <FolderKanban className="h-3.5 w-3.5 text-blue-600" />
          Prix et quantités de projets
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-36">
            <label className="text-[11px] text-muted-foreground">Cotisation de base (TND)</label>
            <Input
              type="number"
              min={1}
              value={form.cotisationPrice}
              onChange={(e) => update({ cotisationPrice: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div className="w-36">
            <label className="text-[11px] text-muted-foreground">Projets inclus</label>
            <Input
              type="number"
              min={1}
              max={CLIENT_PRO_PROJECT_MAX}
              value={form.cotisationProjects}
              onChange={(e) => update({ cotisationProjects: parseInt(e.target.value, 10) || 0 })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <Badge variant="outline" className="mb-1 text-[10px]">
            Utilisée quand tous les crédits sont épuisés
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            Packs supplémentaires (quantité → prix)
          </p>
          {tiers.map((tier, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2">
              <div className="w-32">
                <label className="text-[10px] text-muted-foreground">Projets</label>
                <Input
                  type="number"
                  min={1}
                  max={CLIENT_PRO_PROJECT_MAX}
                  value={tier.projects}
                  onChange={(e) =>
                    setTiers((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, projects: e.target.value } : row,
                      ),
                    )
                  }
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div className="w-32">
                <label className="text-[10px] text-muted-foreground">Prix (TND)</label>
                <Input
                  type="number"
                  min={1}
                  value={tier.price}
                  onChange={(e) =>
                    setTiers((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, price: e.target.value } : row,
                      ),
                    )
                  }
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mb-0.5 h-8 gap-1 text-[11px] text-destructive"
                onClick={() => setTiers((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-3.5 w-3.5" /> Retirer
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-[11px]"
            onClick={() => setTiers((prev) => [...prev, { projects: "", price: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un pack
          </Button>
        </div>
      </div>

      {/* Règles de consommation */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start justify-between gap-3 rounded-lg border border-border/30 bg-background/60 p-3">
          <div>
            <p className="text-xs font-medium">Restituer le crédit à la suppression d'un projet</p>
            <p className="text-[10px] text-muted-foreground">
              Un projet supprimé par son propriétaire rend le crédit consommé (une seule fois).
            </p>
          </div>
          <Switch
            checked={form.refundOnDelete}
            onCheckedChange={(checked) => update({ refundOnDelete: checked })}
          />
        </label>
        <label className="flex items-start justify-between gap-3 rounded-lg border border-border/30 bg-background/60 p-3">
          <div>
            <p className="text-xs font-medium">Autoriser l'achat d'un pack avant épuisement</p>
            <p className="text-[10px] text-muted-foreground">
              Désactivé, la cotisation n'est proposée qu'une fois tous les crédits consommés.
            </p>
          </div>
          <Switch
            checked={form.allowStacking}
            onCheckedChange={(checked) => update({ allowStacking: checked })}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[11px]"
          onClick={() => {
            setForm(DEFAULT_CLIENT_PRO_CREDIT_CONFIG);
            setTiers(toTierRows(DEFAULT_CLIENT_PRO_CREDIT_CONFIG.tiers));
          }}
        >
          <X className="h-3.5 w-3.5" /> Rétablir les valeurs initiales
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-[11px]" onClick={handleMigration} disabled={migrating}>
            {migrating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Initialiser les comptes existants
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer la cotisation
          </Button>
        </div>
      </div>

      {/* Demandes en attente */}
      <div className="rounded-lg border border-border/30 bg-background/60 p-3">
        <p className="flex items-center gap-2 text-xs font-medium">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
          Cotisations en attente de paiement ({pending.length})
        </p>
        {pending.length === 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Aucune demande en attente. Un paiement confirmé attribue les projets achetés, une seule fois.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border/20">
            {pending.map((order: any) => (
              <li key={order._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {order.user?.name || order.user?.email || "Utilisateur"} · {projectsLabel(order.projects)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {order.price} {order.currency} · {order.paymentMethod || "paiement"} ·{" "}
                    {new Date(order.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => handleApprove(order._id)}
                    disabled={busyOrder === order._id}
                  >
                    {busyOrder === order._id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <BadgeCheck className="h-3 w-3" />
                    )}
                    Paiement confirmé
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => handleReject(order._id)}
                    disabled={busyOrder === order._id}
                  >
                    Refuser
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default ClientProCotisationSettings;
