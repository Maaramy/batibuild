import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Calendar,
  FileText,
  FilterX,
  Receipt,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  INVOICE_STATUSES,
  INVOICE_STATUS_BADGE_CLASS,
  INVOICE_STATUS_LABELS,
  applyInvoiceFilter,
  emptyInvoiceFilter,
  endOfDay,
  formatInvoiceDate,
  formatMoney,
  invoicePlanLabel,
  isInvoiceFilterActive,
  startOfDay,
  type InvoiceFilter,
} from "@/lib/invoiceStatus";
import { cn } from "@/lib/utils";
import { InvoiceDownloadButton, type InvoiceRecord } from "./InvoiceDownloadButton";

/**
 * « MES FACTURES » — section du profil de l'abonné.
 *
 * Affiche UNIQUEMENT les factures de l'utilisateur connecté : le filtrage est
 * fait côté serveur (`api.invoices.getMyInvoices`, index `by_user`), impossible
 * à contourner depuis le navigateur.
 *
 * La section DISPARAÎT complètement quand l'utilisateur n'a jamais eu de
 * facturation : aucun menu vide, aucun écran inutile pour les comptes sans
 * historique de paiement.
 *
 * Responsive : cartes empilées sur mobile, tableau sur grand écran. Le PDF est
 * généré localement (aucun service tiers) et donc disponible aussi bien sur
 * ordinateur que sur mobile / application Android.
 */
export function MyInvoices() {
  const invoices = useQuery(api.invoices.getMyInvoices);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceFilter["status"]>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filter: InvoiceFilter = useMemo(
    () => ({
      ...emptyInvoiceFilter(),
      search,
      status,
      from: fromDate ? startOfDay(new Date(`${fromDate}T00:00:00`).getTime()) : null,
      to: toDate ? endOfDay(new Date(`${toDate}T00:00:00`).getTime()) : null,
    }),
    [search, status, fromDate, toDate],
  );

  const rows = useMemo(
    () => (invoices ? (applyInvoiceFilter(invoices, filter) as InvoiceRecord[]) : []),
    [invoices, filter],
  );

  const paidTotal = useMemo(
    () =>
      rows
        .filter((invoice) => invoice.status === "paid")
        .reduce((sum, invoice) => sum + invoice.amountTTC, 0),
    [rows],
  );

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setFromDate("");
    setToDate("");
  };

  // Aucune facture (chargement terminé) → la section n'existe pas.
  if (!invoices || invoices.length === 0) return null;

  const filterActive = isInvoiceFilterActive(filter);

  return (
    <Card className="border border-border/40 bg-card/60 shadow-soft">
      <CardHeader className="p-5 sm:p-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Mes factures</CardTitle>
              <CardDescription className="text-[11px]">
                {invoices.length} facture{invoices.length > 1 ? "s" : ""} · téléchargement PDF
                immédiat
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-2 space-y-4">
        {/* ── Filtres ── */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="N° de facture"
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

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              aria-label="Date de début"
              className="h-9 rounded-xl pl-9 text-xs"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              aria-label="Date de fin"
              className="h-9 rounded-xl pl-9 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            {rows.length} facture{rows.length > 1 ? "s" : ""} affichée
            {rows.length > 1 ? "s" : ""} · Total payé {formatMoney(paidTotal, rows[0]?.currency ?? "TND")}
          </span>
          {filterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-primary transition-colors hover:bg-primary/10 cursor-pointer"
            >
              <FilterX className="h-3 w-3" />
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* ── Liste : cartes sur mobile, tableau sur grand écran ── */}
        {rows.length === 0 ? (
          <p className="rounded-xl border border-border/40 bg-background/60 px-3.5 py-3 text-xs text-muted-foreground">
            Aucune facture ne correspond à votre recherche.
          </p>
        ) : (
          <>
            <div className="space-y-2.5 sm:hidden">
              {rows.map((invoice) => (
                <div
                  key={invoice._id}
                  className="rounded-xl border border-border/40 bg-background/60 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] font-semibold">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatInvoiceDate(invoice.issueDate)} · {invoicePlanLabel(invoice.plan)}
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

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney(invoice.amountTTC, invoice.currency)}
                    </span>
                    <InvoiceDownloadButton invoice={invoice} />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">N° facture</TableHead>
                    <TableHead className="text-[11px]">Date</TableHead>
                    <TableHead className="text-[11px]">Abonnement</TableHead>
                    <TableHead className="text-right text-[11px]">Montant</TableHead>
                    <TableHead className="text-[11px]">Statut</TableHead>
                    <TableHead className="text-right text-[11px]">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell className="font-mono text-[11px] font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatInvoiceDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell className="text-xs">{invoicePlanLabel(invoice.plan)}</TableCell>
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
                        <InvoiceDownloadButton invoice={invoice} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <p className="flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
          <FileText className="mt-0.5 h-3 w-3 shrink-0" />
          Vos factures sont conservées dans votre historique : annulation ou changement
          d'abonnement ne les supprime jamais.
        </p>
      </CardContent>
    </Card>
  );
}

export default MyInvoices;
