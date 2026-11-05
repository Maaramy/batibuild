import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Save,
  Users,
  XCircle,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatSiteDate, formatTND } from "@/lib/siteTracking";

// ============================================================================
// E. COTISATION « GESTION & SUIVI DE CHANTIER »
// ----------------------------------------------------------------------------
// Prix, durée et ouverture du module, puis validation des demandes de
// cotisation. Source de vérité unique : `siteModuleConfig` côté Convex (lue et
// écrite par `siteTracking.adminSetModuleConfig`) — aucun prix n'est dupliqué
// côté client. Les contrôles d'accès restent effectués côté serveur.
// ============================================================================

export function SiteCotisationSettings() {
  const navigate = useNavigate();
  const data = useQuery(api.siteTracking.adminGetSiteModule, {});
  const saveConfig = useMutation(api.siteTracking.adminSetModuleConfig);
  const approve = useMutation(api.siteTracking.adminApproveSiteCotisation);
  const refuse = useMutation(api.siteTracking.adminRefuseSiteCotisation);

  const [form, setForm] = useState<{
    enabled: boolean;
    price: string;
    currency: string;
    durationDays: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const signature = JSON.stringify(data?.config ?? null);
  useEffect(() => {
    if (!data?.config) return;
    setForm({
      enabled: data.config.enabled,
      price: String(data.config.price),
      currency: data.config.currency,
      durationDays: String(data.config.durationDays),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (data === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/30 p-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la cotisation chantier…
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

  const pending = data.cotisations.filter((row: any) => row.status === "pending");

  const handleSave = async () => {
    const price = Number(form.price);
    const durationDays = Number(form.durationDays);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Le prix de la cotisation doit être un montant positif.");
      return;
    }
    if (!Number.isFinite(durationDays) || durationDays < 1) {
      toast.error("La durée doit être d'au moins 1 jour.");
      return;
    }
    setBusy("config");
    try {
      await saveConfig({
        enabled: form.enabled,
        price,
        durationDays,
        currency: form.currency.trim() || "TND",
      });
      toast.success("Cotisation chantier enregistrée : prix et durée appliqués aux prochaines demandes.");
    } catch (err: any) {
      toast.error(err?.message?.replace(/^[A-Z_]+:/, "") || "Enregistrement impossible.");
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = async (cotisationId: any) => {
    setBusy(cotisationId);
    try {
      const res: any = await approve({ cotisationId });
      toast.success(
        res?.alreadyActive
          ? "Cette cotisation était déjà active : aucun accès accordé deux fois."
          : "Cotisation activée : l'accès du client est ouvert.",
      );
    } catch (err: any) {
      toast.error(err?.message?.replace(/^[A-Z_]+:/, "") || "Validation impossible.");
    } finally {
      setBusy(null);
    }
  };

  const handleRefuse = async (cotisationId: any) => {
    const reason = window.prompt("Motif du refus (facultatif) :") ?? undefined;
    setBusy(cotisationId);
    try {
      await refuse({ cotisationId, reason: reason?.trim() || undefined });
      toast.success("Cotisation refusée : le client peut déposer une nouvelle demande.");
    } catch (err: any) {
      toast.error(err?.message?.replace(/^[A-Z_]+:/, "") || "Refus impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.06] to-transparent p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <ClipboardCheck className="h-4 w-4 text-teal-600" />
            E. Cotisation « Gestion & Suivi de Chantier »
          </h3>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Module payant : le prix et la durée sont figés sur chaque demande au moment de sa
            création. Modifier les paramètres ne réécrit jamais une cotisation déjà demandée ou
            validée.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {formatTND(data.config.price)} · {data.config.durationDays} jours
          </Badge>
          <Badge
            className={cn(
              "text-[10px]",
              data.config.enabled
                ? "border-emerald-200/30 bg-emerald-500/10 text-emerald-600"
                : "border-border/40 text-muted-foreground",
            )}
          >
            Module {data.config.enabled ? "ouvert" : "fermé"}
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { icon: Users, label: "Abonnés actifs", value: String(data.stats.subscribersActive) },
          { icon: Users, label: "Abonnés (total)", value: String(data.stats.subscribersTotal) },
          { icon: BadgeCheck, label: "En attente", value: String(data.stats.pending) },
          { icon: Banknote, label: "Revenus", value: formatTND(data.stats.revenue) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border/30 bg-background/60 p-2.5">
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <item.icon className="h-3 w-3" /> {item.label}
            </p>
            <p className="mt-1 break-words text-[13px] font-semibold leading-tight tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border border-border/30 bg-background/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium">Module ouvert aux nouvelles cotisations</p>
            <p className="text-[11px] text-muted-foreground">
              Désactivé : plus aucune demande n'est acceptée (les accès déjà payés restent valables
              jusqu'à leur échéance).
            </p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <label className="text-[11px] text-muted-foreground" htmlFor="site-cotisation-price">
              Prix
            </label>
            <Input
              id="site-cotisation-price"
              type="number"
              min={0}
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div className="w-24">
            <label className="text-[11px] text-muted-foreground" htmlFor="site-cotisation-currency">
              Devise
            </label>
            <Input
              id="site-cotisation-currency"
              value={form.currency}
              maxLength={8}
              onChange={(event) => setForm({ ...form, currency: event.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div className="w-32">
            <label className="text-[11px] text-muted-foreground" htmlFor="site-cotisation-duration">
              Durée (jours)
            </label>
            <Input
              id="site-cotisation-duration"
              type="number"
              min={1}
              value={form.durationDays}
              onChange={(event) => setForm({ ...form, durationDays: event.target.value })}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            className="mb-0.5 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={handleSave}
            disabled={busy === "config"}
          >
            {busy === "config" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/30 bg-background/60 p-3">
        <p className="flex items-center gap-2 text-xs font-medium">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
          Demandes en attente de paiement ({pending.length})
        </p>
        {pending.length === 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Aucune demande en attente. Vérifiez le justificatif avant de valider un paiement.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border/20">
            {pending.map((row: any) => (
              <li key={row._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {row.user?.name || row.user?.email || "Utilisateur"} · {formatTND(row.amount)} ·{" "}
                    {row.durationDays} jours
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {row.paymentMethod || "paiement"} · demandée le {formatSiteDate(row.createdAt)}
                    {row.paymentProofUrl ? " · justificatif joint" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {row.paymentProofUrl && (
                    <a
                      href={row.paymentProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                    >
                      Justificatif
                    </a>
                  )}
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => handleApprove(row._id)}
                    disabled={busy === row._id}
                  >
                    {busy === row._id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    Paiement confirmé
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[11px] text-rose-600"
                    onClick={() => handleRefuse(row._id)}
                    disabled={busy === row._id}
                  >
                    <XCircle className="h-3 w-3" /> Refuser
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end border-t border-border/20 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[11px]"
          onClick={() => navigate("/dashboard/galiskonadmin/chantiers")}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Abonnés, justificatifs et historique complets
        </Button>
      </div>
    </section>
  );
}

export default SiteCotisationSettings;
