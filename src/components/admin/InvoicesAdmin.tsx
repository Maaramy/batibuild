import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  FilterX,
  Info,
  Percent,
  Receipt,
  RotateCcw,
  Save,
  Search,
  Settings,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import {
  INVOICE_PROFILE_TYPES,
  INVOICE_PROFILE_TYPE_LABELS,
  INVOICE_STATUSES,
  INVOICE_STATUS_BADGE_CLASS,
  INVOICE_STATUS_LABELS,
  DEFAULT_PAYMENT_TERMS,
  endOfDay,
  formatBillingPeriod,
  formatInvoiceDate,
  formatMoney,
  invoicePlanLabel,
  isInvoiceFilterActive,
  startOfDay,
  type InvoiceFilter,
  type InvoiceStatus,
} from "@/lib/invoiceStatus";
import { cn } from "@/lib/utils";
import { InvoiceDownloadButton, type InvoiceRecord } from "@/components/invoices/InvoiceDownloadButton";

/** Facture enrichie du compte client (renvoyée par la requête administrateur). */
type AdminInvoice = InvoiceRecord & {
  status: InvoiceStatus;
  account?: {
    _id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    userRole: string | null;
  } | null;
};

/** Libellé exact du statut, pour les boutons d'action. */
const STATUS_ACTIONS: InvoiceStatus[] = ["paid", "pending", "cancelled", "refunded"];

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof TrendingUp;
  tone?: "default" | "emerald" | "amber" | "violet" | "muted";
}) {
  const tones: Record<string, string> = {
    default: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    amber: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
    violet: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
    muted: "text-muted-foreground bg-muted/40",
  };
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-3.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            tones[tone],
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * ADMIN → FACTURES
 *
 * Vue complète de la facturation : statistiques (CA facturé, encaissé, en
 * attente, remboursé), recherche par numéro / nom / e-mail du client, filtres
 * (période, type de profil, abonnement, statut), téléchargement PDF, détail de
 * chaque facture et changement de statut.
 *
 * Réservé aux ADMINISTRATEURS : la requête et les mutations refusent tout autre
 * rôle côté serveur (les modérateurs ne voient pas les données de facturation).
 */
export function InvoicesAdmin() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceFilter["status"]>("all");
  const [profileType, setProfileType] = useState<InvoiceFilter["profileType"]>("all");
  const [plan, setPlan] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detail, setDetail] = useState<AdminInvoice | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const data = useQuery(api.invoices.adminListInvoices, {
    search,
    status,
    profileType,
    plan,
    from: fromDate ? startOfDay(new Date(`${fromDate}T00:00:00`).getTime()) : undefined,
    to: toDate ? endOfDay(new Date(`${toDate}T00:00:00`).getTime()) : undefined,
  });

  const updateStatus = useMutation(api.invoices.adminUpdateInvoiceStatus);

  const invoices = useMemo(() => (data?.invoices ?? []) as unknown as AdminInvoice[], [data]);
  const stats = data?.stats;

  const filter: InvoiceFilter = useMemo(
    () => ({
      search,
      status,
      profileType,
      plan,
      from: fromDate ? startOfDay(new Date(`${fromDate}T00:00:00`).getTime()) : null,
      to: toDate ? endOfDay(new Date(`${toDate}T00:00:00`).getTime()) : null,
    }),
    [search, status, profileType, plan, fromDate, toDate],
  );

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setProfileType("all");
    setPlan("all");
    setFromDate("");
    setToDate("");
  };

  const changeStatus = async (invoice: AdminInvoice, next: InvoiceStatus) => {
    setUpdatingId(invoice._id);
    try {
      await updateStatus({ invoiceId: invoice._id as never, status: next });
      toast.success(`Facture ${invoice.invoiceNumber} : statut « ${INVOICE_STATUS_LABELS[next]} »`);
      setDetail((current) =>
        current && current._id === invoice._id ? { ...current, status: next } : current,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Changement de statut impossible");
    } finally {
      setUpdatingId(null);
    }
  };

  const currency = stats?.currency ?? "TND";

  return (
    <div className="space-y-4">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Gestion des factures</h2>
            <p className="text-xs text-muted-foreground">
              Historique complet de la facturation — une facture par paiement ou renouvellement.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          onClick={() => setShowSettings((value) => !value)}
        >
          <Settings className="h-3.5 w-3.5" />
          Paramètres de facturation
        </Button>
      </div>

      {showSettings && <InvoiceBillingSettings />}

      {/* ── Statistiques ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="CA facturé"
          value={formatMoney(stats?.billedTTC ?? 0, currency)}
          hint="Payées + en attente"
          icon={TrendingUp}
        />
        <StatCard
          label="Factures"
          value={stats?.count ?? 0}
          hint="Selon les filtres actifs"
          icon={FileText}
        />
        <StatCard
          label="Payées"
          value={stats?.byStatus.paid ?? 0}
          hint={formatMoney(stats?.collectedTTC ?? 0, currency)}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="En attente"
          value={stats?.byStatus.pending ?? 0}
          hint={formatMoney(stats?.pendingTTC ?? 0, currency)}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Remboursées"
          value={stats?.byStatus.refunded ?? 0}
          hint={formatMoney(stats?.refundedTTC ?? 0, currency)}
          icon={RotateCcw}
          tone="violet"
        />
        <StatCard
          label="Annulées"
          value={stats?.byStatus.cancelled ?? 0}
          hint="Historique conservé"
          icon={Ban}
          tone="muted"
        />
      </div>

      {/* ── Filtres ── */}
      <Card className="border border-border/40 bg-card/60">
        <CardContent className="p-4 space-y-2.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="N° de facture, nom ou e-mail du client"
                className="h-9 rounded-xl pl-9 text-xs"
              />
            </div>

            <Select value={status} onValueChange={(value) => setStatus(value as InvoiceFilter["status"])}>
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {INVOICE_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {INVOICE_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={profileType}
              onValueChange={(value) => setProfileType(value as InvoiceFilter["profileType"])}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Type de profil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les profils</SelectItem>
                {INVOICE_PROFILE_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {INVOICE_PROFILE_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Abonnement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les abonnements</SelectItem>
                <SelectItem value="pro">Client Pro</SelectItem>
                <SelectItem value="supplier">Fournisseur</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                aria-label="Période — à partir du"
                className="h-9 rounded-xl pl-9 text-xs"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                aria-label="Période — jusqu'au"
                className="h-9 rounded-xl pl-9 text-xs"
              />
            </div>
          </div>

          {isInvoiceFilterActive(filter) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:underline cursor-pointer"
            >
              <FilterX className="h-3 w-3" />
              Réinitialiser les filtres
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── Liste ── */}
      {data === undefined ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Chargement des factures…</p>
      ) : invoices.length === 0 ? (
        <p className="rounded-xl border border-border/40 bg-card/60 px-4 py-8 text-center text-xs text-muted-foreground">
          Aucune facture à afficher. Les factures sont créées automatiquement à chaque paiement ou
          renouvellement d'abonnement.
        </p>
      ) : (
        <>
          <div className="space-y-2.5 sm:hidden">
            {invoices.map((invoice) => (
              <div
                key={invoice._id}
                className="rounded-xl border border-border/40 bg-card/60 p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] font-semibold">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium">
                      {invoice.account?.name ?? invoice.customerName ?? "Client"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {invoice.account?.email ?? invoice.customerEmail ?? "—"}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 border text-[9px]",
                      INVOICE_STATUS_BADGE_CLASS[invoice.status],
                    )}
                  >
                    {INVOICE_STATUS_LABELS[invoice.status]}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {formatInvoiceDate(invoice.issueDate)} ·{" "}
                    {INVOICE_PROFILE_TYPE_LABELS[invoice.profileType]}
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatMoney(invoice.amountTTC, invoice.currency)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <InvoiceDownloadButton invoice={invoice} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setDetail(invoice)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Détails
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">N° facture</TableHead>
                  <TableHead className="text-[11px]">Date</TableHead>
                  <TableHead className="text-[11px]">Client</TableHead>
                  <TableHead className="text-[11px]">Profil · Abonnement</TableHead>
                  <TableHead className="text-right text-[11px]">Montant TTC</TableHead>
                  <TableHead className="text-[11px]">Statut</TableHead>
                  <TableHead className="text-right text-[11px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell className="font-mono text-[11px] font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatInvoiceDate(invoice.issueDate)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="block max-w-[200px] truncate font-medium">
                        {invoice.account?.name ?? invoice.customerName ?? "Client"}
                      </span>
                      <span className="block max-w-[200px] truncate text-[10px] text-muted-foreground">
                        {invoice.account?.email ?? invoice.customerEmail ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {INVOICE_PROFILE_TYPE_LABELS[invoice.profileType]}
                      <span className="block text-[10px] text-muted-foreground">
                        {invoicePlanLabel(invoice.plan)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums">
                      {formatMoney(invoice.amountTTC, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border text-[9px]",
                          INVOICE_STATUS_BADGE_CLASS[invoice.status],
                        )}
                      >
                        {INVOICE_STATUS_LABELS[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <InvoiceDownloadButton invoice={invoice} />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => setDetail(invoice)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Détails
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ── Détail d'une facture ── */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-sm">{detail.invoiceNumber}</DialogTitle>
                <DialogDescription className="text-[11px]">
                  {formatInvoiceDate(detail.issueDate)} · {detail.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <Badge
                  className={cn(
                    "border text-[10px]",
                    INVOICE_STATUS_BADGE_CLASS[detail.status],
                  )}
                >
                  {INVOICE_STATUS_LABELS[detail.status]}
                </Badge>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailBlock
                    title="Client"
                    lines={[
                      detail.account?.name ?? detail.customerName ?? "Client",
                      detail.account?.email ?? detail.customerEmail ?? "—",
                      detail.customerCompany ?? detail.account?.company ?? "",
                      detail.customerAddress ?? "",
                      `Profil : ${INVOICE_PROFILE_TYPE_LABELS[detail.profileType]}`,
                    ]}
                  />
                  <DetailBlock
                    title="Abonnement"
                    lines={[
                      invoicePlanLabel(detail.plan),
                      formatBillingPeriod(detail.billingPeriodStart, detail.billingPeriodEnd),
                      `Paiement : ${detail.paymentMethod ?? "—"}`,
                      `Transaction : ${detail.transactionId ?? "—"}`,
                    ]}
                  />
                </div>

                <div className="rounded-xl border border-border/40 bg-background/60 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Prix HT</span>
                    <span className="tabular-nums">
                      {formatMoney(detail.amountHT, detail.currency)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      TVA {detail.taxRate > 0 ? `(${detail.taxRate} %)` : "— non applicable"}
                    </span>
                    <span className="tabular-nums">
                      {formatMoney(detail.taxAmount, detail.currency)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-sm font-bold">
                    <span>Total TTC</span>
                    <span className="tabular-nums">
                      {formatMoney(detail.amountTTC, detail.currency)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Date du paiement</span>
                    <span>
                      {detail.paymentDate ? formatInvoiceDate(detail.paymentDate) : "En attente"}
                    </span>
                  </div>
                </div>

                <p className="flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  Une facture n'est jamais supprimée : l'annulation et le remboursement changent son
                  statut et laissent l'historique intact.
                </p>

                <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
                  {STATUS_ACTIONS.map((value) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={value === detail.status ? "default" : "outline"}
                      disabled={updatingId === detail._id || value === detail.status}
                      onClick={() => void changeStatus(detail, value)}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {value === "paid" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : value === "pending" ? (
                        <Clock className="h-3.5 w-3.5" />
                      ) : value === "cancelled" ? (
                        <Ban className="h-3.5 w-3.5" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      {INVOICE_STATUS_LABELS[value]}
                    </Button>
                  ))}
                  <div className="ml-auto">
                    <InvoiceDownloadButton invoice={detail} size="default" />
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailBlock({ title, lines }: { title: string; lines: string[] }) {
  const visible = lines.filter((line) => line && line.trim().length > 0);
  return (
    <div className="rounded-xl border border-border/40 bg-background/60 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {visible.map((line) => (
        <p key={line} className="mt-1 text-xs break-words">
          {line}
        </p>
      ))}
    </div>
  );
}

/**
 * Paramètres de facturation : TVA appliquée aux prochaines factures et
 * coordonnées de l'émetteur imprimées sur le PDF. Les informations sont
 * laissées vides tant que l'administrateur ne les renseigne pas : aucune donnée
 * légale n'est inventée.
 */
function InvoiceBillingSettings() {
  const config = useQuery(api.payments.getPaymentConfigAdmin);
  const updatePaymentConfig = useMutation(api.payments.updatePaymentConfig);
  const [saving, setSaving] = useState(false);

  // Seuls les champs MODIFIÉS sont conservés en état : tant que l'administrateur
  // n'a rien saisi, les valeurs affichées viennent directement du serveur (elles
  // se remplissent donc seules au chargement, sans effet de bord ni état dupliqué).
  const [form, setForm] = useState<Record<string, string>>({});
  const source = config as Record<string, unknown> | null | undefined;
  const values = {
    vatRate: form.vatRate ?? (source?.vatRate != null ? String(source.vatRate) : "0"),
    companyLegalName: form.companyLegalName ?? String(source?.companyLegalName ?? ""),
    companyAddress: form.companyAddress ?? String(source?.companyAddress ?? ""),
    companyTaxId: form.companyTaxId ?? String(source?.companyTaxId ?? ""),
    companyEmail: form.companyEmail ?? String(source?.companyEmail ?? ""),
    companyPhone: form.companyPhone ?? String(source?.companyPhone ?? ""),
    paymentTerms: form.paymentTerms ?? String(source?.paymentTerms ?? DEFAULT_PAYMENT_TERMS),
  };

  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const save = async () => {
    const vatRate = Number(values.vatRate.replace(",", "."));
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
      toast.error("Le taux de TVA doit être compris entre 0 et 100 %.");
      return;
    }

    setSaving(true);
    try {
      await updatePaymentConfig({
        vatRate,
        companyLegalName: values.companyLegalName,
        companyAddress: values.companyAddress,
        companyTaxId: values.companyTaxId,
        companyEmail: values.companyEmail,
        companyPhone: values.companyPhone,
        paymentTerms: values.paymentTerms,
      });
      setForm({});
      toast.success("Paramètres de facturation enregistrés");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-border/40 bg-card/60">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-primary" />
          Paramètres de facturation
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Ces informations apparaissent sur les factures émises À PARTIR DE MAINTENANT : les
          factures déjà émises conservent leur taux et leurs coordonnées.
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="vatRate" className="flex items-center gap-1.5 text-[11px]">
              <Percent className="h-3 w-3" />
              Taux de TVA (%)
            </Label>
            <Input
              id="vatRate"
              value={values.vatRate}
              onChange={set("vatRate")}
              inputMode="decimal"
              placeholder="0"
              className="h-9 rounded-xl text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              0 = « TVA non applicable » (le prix du forfait est facturé en l'état).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyLegalName" className="text-[11px]">
              Raison sociale
            </Label>
            <Input
              id="companyLegalName"
              value={values.companyLegalName}
              onChange={set("companyLegalName")}
              placeholder="batibuild"
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyAddress" className="text-[11px]">
              Adresse de facturation
            </Label>
            <Input
              id="companyAddress"
              value={values.companyAddress}
              onChange={set("companyAddress")}
              placeholder="Rue, ville, pays"
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyTaxId" className="text-[11px]">
              Matricule fiscal
            </Label>
            <Input
              id="companyTaxId"
              value={values.companyTaxId}
              onChange={set("companyTaxId")}
              placeholder="0000000/A/M/000"
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyEmail" className="text-[11px]">
              E-mail de facturation
            </Label>
            <Input
              id="companyEmail"
              value={values.companyEmail}
              onChange={set("companyEmail")}
              placeholder="facturation@batibuild.app"
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyPhone" className="text-[11px]">
              Téléphone
            </Label>
            <Input
              id="companyPhone"
              value={values.companyPhone}
              onChange={set("companyPhone")}
              placeholder="+216 XX XXX XXX"
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="paymentTerms" className="text-[11px]">
              Conditions de paiement
            </Label>
            <Input
              id="paymentTerms"
              value={values.paymentTerms}
              onChange={set("paymentTerms")}
              className="h-9 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] text-muted-foreground">
            Champs vides = aucune mention sur la facture (aucune donnée inventée).
          </p>
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={saving}
            className="btn-gradient h-8 shrink-0 gap-1.5 text-xs text-white"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default InvoicesAdmin;
