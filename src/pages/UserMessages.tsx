import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, MessageSquare, Loader2, Clock, CheckCircle2,
  AlertCircle, Send, Building2, Package, Download, FileText,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const STATUS_CONFIG = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  responded: { label: "Répondu", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  closed: { label: "Fermé", color: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertCircle },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function UserMessages() {
  const navigate = useNavigate();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  const quotes = useQuery(api.quoteRequests.getMyRequests);
  const allResponses = useQuery(api.quoteResponses.getMyResponses);

  // Build a map of quoteId → responses
  const responsesByQuote = new Map<string, any[]>();
  if (allResponses) {
    for (const r of allResponses) {
      const list = responsesByQuote.get(r.quoteRequestId) ?? [];
      list.push(r);
      responsesByQuote.set(r.quoteRequestId, list);
    }
  }

  const pendingCount = quotes?.filter((q) => q.status === "pending").length ?? 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Messagerie fournisseurs</h1>
            <p className="text-xs text-muted-foreground">
              Vos demandes de devis et les réponses des fournisseurs
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
              {pendingCount} en attente
            </Badge>
          )}
        </div>

        {/* Quote list */}
        {!quotes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : quotes.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucune demande envoyée</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Envoyez une demande de devis depuis la page matériaux IA ou les résultats de votre projet.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 text-xs"
                onClick={() => navigate("/dashboard/ai-materials")}
              >
                <FileText className="h-3 w-3 mr-1" /> Aller aux Matériaux IA
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => {
              const cfg = STATUS_CONFIG[quote.status];
              const StatusIcon = cfg.icon;
              const responses = responsesByQuote.get(quote._id) ?? [];

              return (
                <motion.div
                  key={quote._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`border-border/40 transition-colors ${
                      selectedQuote?._id === quote._id
                        ? "border-primary/30 bg-primary/[0.02]"
                        : "hover:border-primary/15"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div
                        className="cursor-pointer"
                        onClick={() => setSelectedQuote(
                          selectedQuote?._id === quote._id ? null : quote
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold">
                                {quote.projectName || quote.category}
                              </p>
                              <Badge className={`text-[9px] border ${cfg.color}`}>
                                <StatusIcon className="h-2.5 w-2.5 mr-1" />
                                {cfg.label}
                              </Badge>
                              {responses.length > 0 && (
                                <Badge variant="secondary" className="text-[9px]">
                                  {responses.length} réponse{responses.length > 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {quote.category} · {fmtDate(quote.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Materials summary */}
                        {quote.materials && quote.materials.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {quote.materials.slice(0, 4).map((m: any, i: number) => (
                              <span
                                key={i}
                                className="text-[9px] bg-muted/30 border border-border/20 rounded px-1.5 py-0.5"
                              >
                                {m.name}
                              </span>
                            ))}
                            {quote.materials.length > 4 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{quote.materials.length - 4} autres
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expanded view with responses */}
                      {selectedQuote?._id === quote._id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-3 border-t border-border/10 space-y-3"
                        >
                          {/* Materials detail */}
                          {quote.materials && quote.materials.length > 0 && (
                            <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5">
                              <p className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
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

                          {/* User message */}
                          {quote.message && (
                            <div className="rounded-lg bg-primary/[0.03] border border-primary/10 p-2.5">
                              <p className="text-[9px] font-semibold text-primary/70 mb-0.5">Votre message</p>
                              <p className="text-xs text-muted-foreground">{quote.message}</p>
                            </div>
                          )}

                          {/* Supplier responses */}
                          {responses.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Réponses des fournisseurs ({responses.length})
                              </p>
                              {responses.map((resp) => (
                                <div
                                  key={resp._id}
                                  className="rounded-lg border border-emerald-200/40 bg-emerald-50/30 p-3"
                                >
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Building2 className="h-3 w-3 text-emerald-600" />
                                    <span className="text-xs font-semibold">Fournisseur</span>
                                    {resp.totalAmount && (
                                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] ml-auto">
                                        {new Intl.NumberFormat("fr-TN", {
                                          style: "currency", currency: "TND",
                                        }).format(resp.totalAmount)}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                    {resp.message}
                                  </p>
                                  {resp.attachmentUrl && (
                                    <a
                                      href={resp.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-primary hover:underline"
                                    >
                                      <Download className="h-3 w-3" />
                                      {resp.attachmentFileName || "Voir la pièce jointe"}
                                    </a>
                                  )}
                                  <p className="text-[9px] text-muted-foreground/60 mt-1.5">
                                    {fmtDate(resp.createdAt)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground/60 text-center py-2">
                              Aucune réponse pour l'instant. Le fournisseur examinera votre demande prochainement.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
