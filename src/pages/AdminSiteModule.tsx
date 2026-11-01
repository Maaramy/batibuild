// ============================================================================
// ADMINISTRATION — MODULE « GESTION & SUIVI DE CHANTIER »
// ----------------------------------------------------------------------------
// Un seul endroit pour : activer/désactiver le module, fixer le prix et la
// durée de la cotisation, valider ou refuser les demandes (après vérification
// du justificatif), et suivre les abonnés, les paiements et l'usage réel.
// Les mutations correspondantes sont protégées côté serveur (rôle admin ou
// modérateur) : cette page n'est qu'une interface.
// ============================================================================

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Gauge,
  HardHat,
  Loader2,
  Save,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePageSEO } from "@/hooks/use-page-seo";
import { formatSiteDate, formatTND } from "@/lib/siteTracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const statusBadge: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300" },
  pending: { label: "En attente", className: "border-amber-500/40 text-amber-700 dark:text-amber-300" },
  expired: { label: "Expirée", className: "border-rose-500/40 text-rose-700 dark:text-rose-300" },
  refused: { label: "Refusée", className: "border-rose-500/40 text-rose-700 dark:text-rose-300" },
  cancelled: { label: "Annulée", className: "border-border/60 text-muted-foreground" },
};

export default function AdminSiteModule() {
  usePageSEO({
    title: "Administration — Suivi de chantier | batibuild",
    description: "Cotisations, abonnés et usage du module Gestion & Suivi de Chantier.",
  });

  const navigate = useNavigate();
  const data = useQuery(api.siteTracking.adminGetSiteModule, {});
  const saveConfig = useMutation(api.siteTracking.adminSetModuleConfig);
  const approve = useMutation(api.siteTracking.adminApproveSiteCotisation);
  const refuse = useMutation(api.siteTracking.adminRefuseSiteCotisation);

  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ enabled: boolean; price: string; durationDays: string; currency: string } | null>(null);
  const [refuseTarget, setRefuseTarget] = useState<Id<"siteCotisations"> | null>(null);
  const [refuseReason, setRefuseReason] = useState("");

  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Accès réservé à l'administration</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  const config = data.config;
  const form = draft ?? {
    enabled: config.enabled,
    price: String(config.price),
    durationDays: String(config.durationDays),
    currency: config.currency,
  };

  const pending = data.cotisations.filter((row: any) => row.status === "pending");

  return (
    <div className="site-module min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <div className="mb-5 flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-10 w-10 shrink-0 sm:h-8 sm:w-8"
            aria-label="Retour à l'administration"
            onClick={() => navigate("/dashboard/admin")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
                <HardHat className="h-4 w-4" />
              </span>
              Suivi de chantier — administration
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Cotisation du module, validation des paiements et usage réel. Les accès sont contrôlés côté serveur.
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: HardHat, label: "Chantiers", value: String(data.stats.totalSites) },
            { icon: Gauge, label: "En cours", value: String(data.stats.activeSites) },
            { icon: Users, label: "Abonnés actifs", value: String(data.stats.subscribersActive) },
            { icon: Users, label: "Abonnés (total)", value: String(data.stats.subscribersTotal) },
            { icon: CalendarClock, label: "Demandes en attente", value: String(data.stats.pending) },
            { icon: Banknote, label: "Revenus", value: formatTND(data.stats.revenue) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/50 bg-card p-3">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <item.icon className="h-3 w-3" /> {item.label}
              </p>
              <p className="mt-1 break-words text-[13px] font-semibold leading-tight tabular-nums sm:text-sm">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Paramètres de la cotisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-2.5">
                <div>
                  <p className="text-xs font-medium">Module ouvert</p>
                  <p className="text-[10px] text-muted-foreground">Désactivé : plus aucune nouvelle cotisation.</p>
                </div>
                <Switch checked={form.enabled} onCheckedChange={(value) => setDraft({ ...form, enabled: value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Prix</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 text-xs"
                    value={form.price}
                    onChange={(event) => setDraft({ ...form, price: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Devise</Label>
                  <Input
                    className="h-8 text-xs"
                    value={form.currency}
                    onChange={(event) => setDraft({ ...form, currency: event.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px]">Durée (jours)</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-8 text-xs"
                    value={form.durationDays}
                    onChange={(event) => setDraft({ ...form, durationDays: event.target.value })}
                  />
                </div>
              </div>
              <Button
                className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
                size="sm"
                disabled={busy === "config"}
                onClick={async () => {
                  setBusy("config");
                  try {
                    await saveConfig({
                      enabled: form.enabled,
                      price: Number(form.price),
                      durationDays: Number(form.durationDays),
                      currency: form.currency.trim() || "TND",
                    });
                    setDraft(null);
                    toast.success("Paramètres enregistrés.");
                  } catch (error: any) {
                    toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Enregistrement impossible.");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === "config" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Enregistrer
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Le prix et la durée sont figés sur chaque demande au moment de sa création : modifier les
                paramètres n'altère jamais une cotisation déjà demandée ou validée.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cotisations ({data.cotisations.length})</CardTitle>
              {pending.length > 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  {pending.length} demande(s) à vérifier : contrôlez le justificatif avant validation.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data.cotisations.length === 0 && <p className="text-xs text-muted-foreground">Aucune cotisation enregistrée.</p>}
              {data.cotisations.map((row: any) => {
                const badge = statusBadge[row.effectiveStatus] ?? statusBadge.cancelled;
                return (
                  <div key={row._id} className="rounded-lg border border-border/50 p-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {row.user?.name ?? "Utilisateur supprimé"}{" "}
                          <span className="text-muted-foreground">{row.user?.email ?? ""}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatTND(row.amount)} · {row.durationDays} jours · demandée le {formatSiteDate(row.createdAt)}
                          {row.startDate ? ` · du ${formatSiteDate(row.startDate)}` : ""}
                          {row.endDate ? ` au ${formatSiteDate(row.endDate)}` : ""}
                          {row.paymentMethod ? ` · ${row.paymentMethod}` : ""}
                        </p>
                        {row.refusalReason && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400">Motif : {row.refusalReason}</p>
                        )}
                      </div>
                      <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:shrink-0 sm:justify-end">
                        <Badge variant="outline" className={`text-[9px] ${badge.className}`}>
                          {badge.label}
                        </Badge>
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
                        {row.invoiceId && (
                          <span className="text-[10px] text-muted-foreground">Facture émise</span>
                        )}
                        {row.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 gap-1 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-500"
                              disabled={busy === row._id}
                              onClick={async () => {
                                setBusy(row._id);
                                try {
                                  await approve({ cotisationId: row._id });
                                  toast.success("Cotisation activée : l'accès du client est ouvert.");
                                } catch (error: any) {
                                  toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Validation impossible.");
                                } finally {
                                  setBusy(null);
                                }
                              }}
                            >
                              {busy === row._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              Activer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 px-2 text-[10px] text-rose-600"
                              onClick={() => {
                                setRefuseTarget(row._id);
                                setRefuseReason("");
                              }}
                            >
                              <XCircle className="h-3 w-3" /> Refuser
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!refuseTarget} onOpenChange={(open) => !open && setRefuseTarget(null)}>
        <DialogContent className="site-module sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Refuser la cotisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Motif communiqué au client</Label>
            <Textarea rows={3} className="text-xs" value={refuseReason} onChange={(event) => setRefuseReason(event.target.value)} placeholder="Justificatif illisible, montant incorrect…" />
          </div>
          <DialogFooter className="gap-2 [&>button]:w-full sm:[&>button]:w-auto">
            <Button variant="outline" onClick={() => setRefuseTarget(null)}>
              Annuler
            </Button>
            <Button
              className="gap-1.5 bg-rose-600 text-white hover:bg-rose-500"
              disabled={!!busy}
              onClick={async () => {
                if (!refuseTarget) return;
                setBusy(refuseTarget);
                try {
                  await refuse({ cotisationId: refuseTarget, reason: refuseReason.trim() || undefined });
                  toast.success("Cotisation refusée. Le client peut déposer une nouvelle demande.");
                  setRefuseTarget(null);
                } catch (error: any) {
                  toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Refus impossible.");
                } finally {
                  setBusy(null);
                }
              }}
            >
              <XCircle className="h-3.5 w-3.5" /> Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
