import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { useQuery, useAction, useMutation } from "convex/react";
import {
  Landmark,
  Download,
  Plus,
  Share2,
  Copy,
  Clock,
  ExternalLink,
  Ban,
  Loader2,
  SearchX,
  Sparkles,
  Star,
  FileSpreadsheet,
  ChevronRight,
} from "lucide-react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { generatePdf, exportCsv, TYPE_META } from "@/components/investment/shared";
import type { AnalysisRun, ChatMsg, InvestmentType } from "@/components/investment/shared";
import { ResultsView } from "@/components/investment/results-view";

// ============================================================================
// Page résultat — tableau de bord décisionnel de l'analyse immobilière
// ============================================================================

export default function InvestmentResults() {
  usePageSEO({
    title: "Résultats de l'analyse immobilière - BudgetBati",
    description: "Tableau de bord décisionnel de votre investissement immobilier en Tunisie : ROI, cash-flow, prévisions, scénarios, score IA et assistant investisseur.",
  });
  const navigate = useNavigate();
  const { analysisId } = useParams<{ analysisId: string }>();
  const location = useLocation();

  const [initialRun] = useState<AnalysisRun | null>(() => (location.state as any)?.run ?? null);
  const doc = useQuery(
    api.investments.getAnalysis,
    analysisId ? { analysisId: analysisId as any } : "skip",
  );
  const run: AnalysisRun | null = (doc as any) ?? initialRun;

  // AI assistant chat
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: "assistant", content: "Bonjour ! Je suis votre conseiller en investissement immobilier pour la Tunisie. Posez-moi une question sur la rentabilité de cette analyse, les zones, le risque ou le financement." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const shareAnalysisMut = useMutation(api.investments.shareAnalysis);
  const unshareAnalysisMut = useMutation(api.investments.unshareAnalysis);

  const zones = useQuery(api.investments.getInvestmentZones) || [];
  const askAssistant = useAction(api.investmentAi.askInvestorAssistant);
  const toggleFavorite = useMutation(api.investments.toggleFavorite);
  const [favBusy, setFavBusy] = useState(false);

  const docData = doc as any;
  const isFav = !!(docData && docData.isFavorite);

  const handleToggleFavorite = async () => {
    if (!analysisId) return;
    setFavBusy(true);
    try {
      await toggleFavorite({ analysisId: analysisId as any });
      toast.success(isFav ? "Retiré des favoris" : "Ajouté aux favoris");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setFavBusy(false);
    }
  };

  const notFound = !initialRun && (doc === null || !analysisId);
  const loading = !run && !notFound;

  const shareToken = docData?.shareToken as string | undefined;
  const shareExpiresAt = docData?.shareExpiresAt as number | undefined;
  const shareUrl = shareToken ? `${window.location.origin}/share/investment/${shareToken}` : null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMsgs, chatBusy]);

  const backToForm = (prefill?: boolean) => {
    if (prefill && run) {
      navigate("/dashboard/investments", { state: { prefill: run.input } });
    } else {
      navigate("/dashboard/investments");
    }
  };

  const contextFor = (): string | undefined => {
    if (!run) return undefined;
    const ind = run.results.indicators;
    const input = run.input as any;
    const rentLabel =
      input?.rentMode === "nuit"
        ? `${input?.rentAmount ?? 0} TND/nuit (≈ ${ind.monthlyRent} TND/mois)`
        : `${ind.monthlyRent} TND/mois`;
    return (
      `Type: ${TYPE_META[run.input.investmentType]?.label ?? run.input.investmentType}. ` +
      `Zone: ${run.results.zone.name} (demande ${run.results.zone.demandIndex}/100, risque ${run.results.zone.riskScore}/100). ` +
      `Prix d'achat: ${ind.purchasePrice} TND. Coût total: ${ind.totalCost} TND. Loyer estimé: ${rentLabel} (occupation ${ind.occupancyRate}%). ` +
      `Revenu net annuel: ${ind.netAnnualIncome} TND. Rendement net: ${ind.netYieldPct}%. ROI 5 ans: ${ind.roi5yPct}%. ROI 10 ans: ${ind.roi10yPct}%. ` +
      `Récupération du capital: ${ind.paybackYears} ans. Score IA: ${run.results.score.total}/100.`
    );
  };

  const sendChat = async (text?: string) => {
    const msg = (text ?? chatInput).trim();
    if (!msg || chatBusy) return;
    setChatInput("");
    setChatMsgs((m) => [...m, { role: "user", content: msg }]);
    setChatBusy(true);
    try {
      const res = await askAssistant({ message: msg, context: contextFor() });
      setChatMsgs((m) => [...m, { role: "assistant", content: (res as any).answer }]);
    } catch (err: any) {
      setChatMsgs((m) => [...m, { role: "assistant", content: "Désolé, je n'ai pas pu répondre. Réessayez." }]);
    } finally {
      setChatBusy(false);
    }
  };

  const handleShare = async () => {
    if (!analysisId || !run) return;
    setShareBusy(true);
    try {
      await shareAnalysisMut({ analysisId: analysisId as any });
      toast.success("Lien de partage généré");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du partage");
    } finally {
      setShareBusy(false);
    }
  };

  const handleUnshare = async () => {
    if (!analysisId) return;
    setShareBusy(true);
    try {
      await unshareAnalysisMut({ analysisId: analysisId as any });
      toast.success("Partage arrêté — le lien n'est plus accessible");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setShareBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ═══ Header ═══ */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            <nav className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <button
                onClick={() => navigate("/dashboard/investments")}
                className="transition-colors hover:text-primary cursor-pointer"
              >
                Analyses immobilières
              </button>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate font-medium text-foreground/80">
                {run?.input?.name || (run ? TYPE_META[run.input.investmentType as InvestmentType]?.label : "Résultats de l'analyse")}
              </span>
            </nav>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold truncate">
                  {run?.input?.name || (run ? TYPE_META[run.input.investmentType as InvestmentType]?.label : "Résultats de l'analyse")}
                </h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Tableau de bord décisionnel · marché tunisien 2026
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 lg:pb-0">
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs"
              variant="outline"
              onClick={() => backToForm(false)}
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvelle analyse
            </Button>
            <Button
              size="sm"
              className={cn(
                "gap-1.5 h-8 text-xs",
                isFav ? "border-amber-500/40 text-amber-600 dark:text-amber-400" : "",
              )}
              variant="outline"
              disabled={!run || !analysisId || favBusy}
              onClick={handleToggleFavorite}
            >
              {favBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Star className="h-3.5 w-3.5" fill={isFav ? "currentColor" : "none"} />
              )}
              {isFav ? "Favori" : "Favoris"}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs"
              variant="outline"
              disabled={!run || !analysisId}
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-3.5 w-3.5" />
              Partager
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs"
              variant="outline"
              disabled={!run}
              onClick={() => run && exportCsv(run)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!run}
              onClick={() => run && generatePdf(run)}
            >
              <Download className="h-3.5 w-3.5" />
              Rapport PDF
            </Button>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-border/40 bg-background/50 p-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">Chargement de l'analyse…</p>
            <p className="text-xs text-muted-foreground mt-1">Récupération des indicateurs financiers et du conseil IA</p>
          </div>
        )}

        {notFound && (
          <div className="rounded-2xl border border-dashed border-border/40 bg-background/50 p-10 sm:p-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground">
              <SearchX className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Analyse introuvable</h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Cette analyse n'existe pas ou n'appartient pas à votre compte. Lancez une nouvelle analyse
              pour générer un tableau de bord décisionnel complet.
            </p>
            <Button
              className="mt-6 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => backToForm(false)}
            >
              <Sparkles className="h-4 w-4" />
              Nouvelle analyse
            </Button>
          </div>
        )}

        {run && (
          <ResultsView
            run={run}
            zones={zones}
            assistant={{ chatMsgs, chatInput, setChatInput, chatBusy, sendChat, chatEndRef }}
          />
        )}
      </div>

      {/* ═══ Share dialog ═══ */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              Partager l'analyse
            </DialogTitle>
            <DialogDescription className="text-xs">
              Créez un lien public en lecture seule pour cette analyse. Toute personne disposant du lien
              peut consulter les résultats.
            </DialogDescription>
          </DialogHeader>
          {!shareUrl ? (
            <div className="space-y-3 pt-1">
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
                Le lien sera valable <span className="font-semibold">30 jours</span>. Vous pourrez l'arrêter
                à tout moment depuis cette fenêtre.
              </div>
              <Button
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleShare}
                disabled={shareBusy}
              >
                {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Générer le lien de partage
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="h-9 text-xs" />
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={copyLink}>
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expire le {shareExpiresAt ? new Date(shareExpiresAt).toLocaleDateString("fr-FR") : "—"}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => window.open(shareUrl, "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ouvrir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs text-destructive hover:text-destructive"
                    onClick={handleUnshare}
                    disabled={shareBusy}
                  >
                    {shareBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                    Arrêter
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
