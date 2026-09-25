import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarWithInitials } from "@/components/AvatarWithInitials";
import {
  QUOTE_STATUS_ORDER,
  canSupplierAct,
  quoteStatusMeta,
} from "@/lib/quoteStatus";
import {
  Download,
  FileText,
  Mail,
  MessageCircleQuestion,
  Package,
  Paperclip,
  Phone,
  Send,
  Tag,
  ThumbsDown,
  User,
} from "lucide-react";
import { resolveQuoteMotif } from "@/lib/quoteMotifs";
import {
  QuoteResponseDialog,
  type QuoteResponseKind,
} from "./QuoteResponseDialog";

// ============================================================================
// CONVERSATIONS — DEMANDES DE DEVIS REÇUES PAR LE FOURNISSEUR
//
// Affichées dans la messagerie, chaque demande est une conversation dédiée :
// projet, client, date, matériaux + quantités, informations complémentaires et
// statut, suivis des messages déjà envoyés par le fournisseur. Le fournisseur
// traite la demande directement depuis la conversation.
// ============================================================================

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtTND = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

const KIND_LABEL: Record<string, string> = {
  quote: "Devis",
  refusal: "Refus",
  clarification: "Précision demandée",
};

interface SupplierQuoteConversationsProps {
  /** Demandes reçues (`quoteRequests.getBySupplier`). */
  requests: any[] | undefined;
  /** Messages du fournisseur (`quoteResponses.getBySupplier`). */
  responses: any[] | undefined;
}

export function SupplierQuoteConversations({
  requests,
  responses,
}: SupplierQuoteConversationsProps) {
  const [filter, setFilter] = useState<"all" | string>("all");
  const [dialog, setDialog] = useState<{ quote: any; kind: QuoteResponseKind } | null>(null);

  const responsesByRequest = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of responses ?? []) {
      const list = map.get(r.quoteRequestId) ?? [];
      list.push(r);
      map.set(r.quoteRequestId, list);
    }
    return map;
  }, [responses]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of requests ?? []) map.set(q.status, (map.get(q.status) ?? 0) + 1);
    return map;
  }, [requests]);

  if (requests === undefined) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Chargement des demandes…
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Aucune demande de devis</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Les demandes de vos clients apparaîtront ici, et vous les traiterez directement depuis la
            conversation.
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleStatuses = QUOTE_STATUS_ORDER.filter((s) => (counts.get(s) ?? 0) > 0);
  const filtered = filter === "all" ? requests : requests.filter((q) => q.status === filter);

  return (
    <div className="space-y-3">
      {/* Filtres par statut */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("all")}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Toutes ({requests.length})
        </button>
        {visibleStatuses.map((status) => {
          const meta = quoteStatusMeta(status);
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {meta.label} ({counts.get(status)})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Aucune demande pour ce statut.
        </p>
      ) : (
        filtered.map((quote) => {
          const meta = quoteStatusMeta(quote.status);
          const messages = responsesByRequest.get(quote._id) ?? [];
          const isNew = quote.readAt === undefined;
          const actionable = canSupplierAct(quote.status);
          return (
            <motion.div
              key={quote._id}
              id={`request-${quote._id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="scroll-mt-20"
            >
              <Card
                className={`border-border/40 transition-colors ${
                  isNew ? "border-primary/30 bg-primary/[0.02]" : "hover:border-primary/15"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* En-tête : statut + nouvelle + date */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`text-[9px] border ${meta.chip}`}>
                      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </Badge>
                    {isNew && (
                      <Badge className="text-[9px] border bg-red-100 text-red-700 border-red-200">
                        Nouvelle
                      </Badge>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {fmtDate(quote.createdAt)}
                    </span>
                  </div>

                  {/* Projet + client */}
                  <div className="flex items-start gap-2.5">
                    <AvatarWithInitials name={quote.userName || "Client"} size="sm" className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {quote.projectName || quote.category}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {quote.category} · {quote.userName || "Client"}
                      </p>
                    </div>
                  </div>

                  {/* Coordonnées client */}
                  <div className="flex flex-wrap gap-1.5">
                    {quote.userPhone && (
                      <a
                        href={`tel:${quote.userPhone}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/40 px-2 py-1 text-[10px] font-medium hover:bg-muted/40"
                      >
                        <Phone className="h-3 w-3" /> {quote.userPhone}
                      </a>
                    )}
                    {quote.userEmail && (
                      <a
                        href={`mailto:${quote.userEmail}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/40 px-2 py-1 text-[10px] font-medium hover:bg-muted/40"
                      >
                        <Mail className="h-3 w-3" /> {quote.userEmail}
                      </a>
                    )}
                  </div>

                  {/* Matériaux + quantités */}
                  {quote.materials && quote.materials.length > 0 && (
                    <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5">
                      <p className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                        <Package className="h-2.5 w-2.5" /> Matériaux demandés
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/10">
                            <th className="text-left py-1 font-medium text-muted-foreground">Désignation</th>
                            <th className="text-right py-1 font-medium text-muted-foreground">Qté</th>
                            <th className="text-right py-1 font-medium text-muted-foreground">Unité</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quote.materials.map((m: any, i: number) => (
                            <tr key={i} className="border-b border-border/5 last:border-0">
                              <td className="py-1 font-medium">{m.name}</td>
                              <td className="py-1 text-right tabular-nums">{m.quantity}</td>
                              <td className="py-1 text-right text-muted-foreground">{m.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Motif de la demande */}
                  {quote.motif && (
                    <div className="rounded-lg bg-amber-50/60 border border-amber-200/50 p-2.5">
                      <p className="text-[9px] font-semibold text-amber-700 mb-0.5 flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" /> Motif de la demande
                      </p>
                      <p className="text-xs text-foreground">
                        {resolveQuoteMotif(quote.motif, quote.motifOther)}
                      </p>
                    </div>
                  )}

                  {/* Pièces jointes de la demande */}
                  {quote.attachments && quote.attachments.length > 0 && (
                    <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5">
                      <p className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                        <Paperclip className="h-2.5 w-2.5" /> Pièces jointes ({quote.attachments.length})
                      </p>
                      <ul className="space-y-1">
                        {quote.attachments.map((a: any, i: number) => (
                          <li key={`${a.storageId}-${i}`}>
                            {a.url ? (
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={a.name}
                                className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                              >
                                <FileText className="h-3 w-3" /> {a.name}
                                <Download className="h-3 w-3 opacity-70" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <FileText className="h-3 w-3" /> {a.name}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Informations complémentaires (demandes historiques) */}
                  {quote.message && (
                    <div className="rounded-lg bg-primary/[0.03] border border-primary/10 p-2.5">
                      <p className="text-[9px] font-semibold text-primary/70 mb-0.5 flex items-center gap-1">
                        <User className="h-2.5 w-2.5" /> Informations complémentaires
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{quote.message}</p>
                    </div>
                  )}

                  {/* Messages déjà envoyés par le fournisseur */}
                  {messages.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Vos messages ({messages.length})
                      </p>
                      {messages.map((m) => (
                        <div
                          key={m._id}
                          className="rounded-lg border border-border/30 bg-background/60 p-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[8px]">
                              {KIND_LABEL[m.kind ?? "quote"]}
                            </Badge>
                            {typeof m.totalAmount === "number" && (
                              <span className="text-[10px] font-semibold text-emerald-600">
                                {fmtTND(m.totalAmount)}
                              </span>
                            )}
                            <span className="ml-auto text-[9px] text-muted-foreground/60">
                              {fmtDate(m.createdAt)}
                            </span>
                          </div>
                          {m.message && (
                            <p className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap">
                              {m.message}
                            </p>
                          )}
                          {m.attachmentUrl && (
                            <a
                              href={m.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                            >
                              <FileText className="h-3 w-3" />
                              {m.attachmentFileName || "Pièce jointe"}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {actionable && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border/10 pt-3">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setDialog({ quote, kind: "quote" })}
                      >
                        <Send className="h-3 w-3" /> Répondre avec un devis
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setDialog({ quote, kind: "clarification" })}
                      >
                        <MessageCircleQuestion className="h-3 w-3" /> Demander des précisions
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs border-red-500/30 text-red-600 hover:bg-red-500/5"
                        onClick={() => setDialog({ quote, kind: "refusal" })}
                      >
                        <ThumbsDown className="h-3 w-3" /> Refuser
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })
      )}

      <QuoteResponseDialog
        quote={dialog?.quote ?? null}
        kind={dialog?.kind ?? "quote"}
        open={!!dialog}
        onOpenChange={(o) => { if (!o) setDialog(null); }}
        onSent={() => setDialog(null)}
      />
    </div>
  );
}

export default SupplierQuoteConversations;
