import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { runBIMEstimation } from "@/convex/bimEngine";
import {
  recommendForProject,
  type CatalogMaterial,
  type ProjectContext,
  type CategoryResult,
} from "@/convex/aiMaterialsEngine";
import { TUNISIA_2026_CATALOG } from "@/convex/materialCatalog2026";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatTnd } from "@/lib/utils";
import { fmtTND, fmtPct } from "@/components/investment/shared";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useNavigate } from "react-router";
import { useMemo } from "react";
import {
  FlaskConical,
  ArrowLeft,
  Lock,
  HardHat,
  Ruler,
  CalendarRange,
  Gauge,
  Layers,
  Sparkles,
  Landmark,
  Store,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  FileText,
  MessageSquare,
  Settings,
  Eye,
  MousePointerClick,
  TrendingUp,
  Paperclip,
  Send,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Bell,
  Globe,
  Sun,
  CheckCircle2,
  Star,
  Play,
  Lightbulb,
  Building2,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// PAGE « CHARGER DÉMO » — démonstration complète de la plateforme, LECTURE SEULE.
//
// Contraintes appliquées :
//   • Passer des appels            → téléphones affichés en texte (pas de lien tel:)
//   • Demander un devis / service  → boutons désactivés (mode démo)
//   • Modifier les paramètres      → réglages verrouillés (switchs désactivés)
// Aucune mutation Convex n'est appelée depuis cette page.
// ═══════════════════════════════════════════════════════════════════════════

const DEMO_MODE_NOTE =
  "Mode démonstration — lecture seule. Les appels, demandes de devis et modifications de paramètres sont désactivés. Explorez librement : aucune donnée n'est enregistrée.";

// ── Données démo (statiques, pour l'affichage uniquement) ────────────────────

const DEMO_SUPPLIERS = [
  {
    name: "Bâtiment Plus SARL",
    specialty: "Gros œuvre · Béton · Acier",
    region: "Tunis",
    phone: "+216 71 234 567",
    email: "contact@batimentplus.tn",
    address: "Ariana, Tunis",
    rating: 4.6,
    verified: true,
    initials: "BP",
  },
  {
    name: "Céramique Méditerranée",
    specialty: "Carrelage · Faïence · Revêtements",
    region: "Sousse",
    phone: "+216 73 201 415",
    email: "devis@ceramed.tn",
    address: "Zone industrielle, Sousse",
    rating: 4.8,
    verified: true,
    initials: "CM",
  },
  {
    name: "Atlas Menuiserie",
    specialty: "Menuiserie aluminium & PVC",
    region: "Sfax",
    phone: "+216 74 228 910",
    email: "contact@atlas-menuiserie.tn",
    address: "Route de Gabès, Sfax",
    rating: 4.4,
    verified: false,
    initials: "AM",
  },
];

const DEMO_EXPERTS = [
  {
    name: "Ing. Karim Ben Salah",
    profession: "Ingénieur BTP",
    specialty: "Études de structure · Suivi de chantier",
    region: "Tunis",
    phone: "+216 98 765 432",
    email: "k.bensalah@expert.tn",
    rating: 4.9,
    verified: true,
    initials: "KB",
  },
  {
    name: "Cabinet Architecture Nord",
    profession: "Architecte",
    specialty: "Plans d'architecture · Permis de construire",
    region: "Bizerte",
    phone: "+216 72 431 122",
    email: "contact@archi-nord.tn",
    rating: 4.7,
    verified: true,
    initials: "AN",
  },
];

const DEMO_KPIS = [
  { label: "Vues du profil", value: "128", icon: Eye, tone: "text-blue-600 bg-blue-50" },
  { label: "Demandes reçues", value: "24", icon: MessageSquare, tone: "text-violet-600 bg-violet-50" },
  { label: "Réponses envoyées", value: "18", icon: MousePointerClick, tone: "text-emerald-600 bg-emerald-50" },
  { label: "Taux de réponse", value: "75%", icon: TrendingUp, tone: "text-amber-600 bg-amber-50" },
];

const DEMO_MESSAGES = [
  {
    from: "Céramique Méditerranée",
    initials: "CM",
    text: "Bonjour, nous avons bien reçu votre demande de devis. Vous trouverez en pièce jointe notre offre pour le carrelage 60×60 grès cérame. N'hésitez pas pour toute question.",
    time: "Hier, 14:32",
    attachment: "devis-ceramique-mediterranee.pdf",
  },
  {
    from: "Vous",
    initials: "VO",
    text: "Merci ! Pouvez-vous également chiffrer la faïence de la salle de bain (1er étage) ?",
    time: "Hier, 15:05",
    attachment: null,
  },
  {
    from: "Céramique Méditerranée",
    initials: "CM",
    text: "Bien sûr, nous vous envoyons le complément de devis d'ici demain matin.",
    time: "Hier, 15:20",
    attachment: null,
  },
];

const DEMO_SETTINGS = [
  { icon: Bell, label: "Notifications", desc: "Alertes demandes de devis, réponses et messages" },
  { icon: Globe, label: "Langue", desc: "Français (Tunisie)" },
  { icon: Sun, label: "Thème", desc: "Mode clair / sombre automatique" },
  { icon: FileText, label: "Format des rapports", desc: "PDF, Excel et CSV pour vos estimations" },
];

// Matériaux de démonstration — construits depuis le catalogue officiel 2026
// (source unique de prix, jamais inventés).
const DEMO_MATERIALS: CatalogMaterial[] = TUNISIA_2026_CATALOG.map((item, i) => ({
  _id: item.sku ?? `demo-${i}`,
  name: item.name,
  category: item.category,
  subcategory: item.subcategory,
  unit: item.unit,
  unitPrice: item.unitPrice,
  priceQuality: item.quality,
  confidenceIndex: item.confidence,
  availability: "disponible",
}));

const DEMO_CONTEXT: ProjectContext = {
  projectName: "Villa Les Oliviers — Démo",
  projectCategory: "maison",
  region: "tunis",
  climateZone: "sub_humide",
  city: "Tunis",
  surface: 150,
  floors: 1,
  year: 2026,
  standing: "standard",
  budgetMode: "moyen",
  priorities: { price: 60, quality: 70, isolation: 55, durability: 60, eco: 40 },
  rooms: { bathrooms: 2, kitchens: 1, bedrooms: 3 },
  terrainSurface: 300,
};

const DEMO_MATERIAL_CATEGORIES = ["beton", "ciment", "carrelage", "peinture", "electricite"];

const CATEGORY_TONES: Record<string, { bar: string; chip: string }> = {
  beton: { bar: "bg-slate-500", chip: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  ciment: { bar: "bg-amber-500", chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  carrelage: { bar: "bg-sky-500", chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  peinture: { bar: "bg-rose-500", chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  electricite: { bar: "bg-yellow-500", chip: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
};

const BREAKDOWN_COLORS: Record<string, string> = {
  gros_oeuvre: "bg-indigo-500",
  second_oeuvre: "bg-sky-500",
  equipements: "bg-emerald-500",
  main_oeuvre: "bg-amber-500",
  transport: "bg-rose-500",
  etudes_imprevus: "bg-slate-500",
};

// ── Petit composant : bouton d'action bloqué en mode démo ─────────────────────

function LockedAction({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Phone;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      disabled
      title={hint}
      className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border/30 bg-muted/20 px-2 py-1 text-[10px] font-medium text-muted-foreground/60 line-through decoration-muted-foreground/30"
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
      <Lock className="h-2.5 w-2.5 text-amber-500" />
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  tone,
  demoLabel,
}: {
  icon: typeof HardHat;
  title: string;
  subtitle: string;
  tone: string;
  demoLabel: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 flex-wrap">
            {title}
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
              <FlaskConical className="h-2.5 w-2.5" />
              {demoLabel}
            </span>
          </h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// ── Carte fournisseur / expert démo (actions bloquées) ───────────────────────

function DemoProCard({
  kind,
  name,
  meta,
  specialty,
  region,
  phone,
  email,
  rating,
  verified,
  initials,
}: {
  kind: "supplier" | "expert";
  name: string;
  meta: string;
  specialty: string;
  region: string;
  phone: string;
  email: string;
  rating: number;
  verified: boolean;
  initials: string;
}) {
  const isSupplier = kind === "supplier";
  return (
    <Card className="border border-border/40 bg-background/50">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 rounded-full border border-border/40">
            <AvatarFallback
              className={`text-[11px] font-bold ${
                isSupplier ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
              }`}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold truncate">{name}</p>
              {verified ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 className="h-2 w-2" /> Vérifié
                </span>
              ) : (
                <span className="text-[9px] font-medium text-muted-foreground bg-muted/50 border border-border/40 px-1.5 py-0.5 rounded-full">
                  En vérification
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-600">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> {rating}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{meta}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5 text-muted-foreground/60" /> {specialty}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 text-muted-foreground/60" /> {region}
              </span>
            </div>
            {/* Coordonnées — téléphone en TEXTE (pas de lien tel:) en mode démo */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-border/60 bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <Lock className="h-2.5 w-2.5 text-amber-500" />
                <Phone className="h-2.5 w-2.5" /> {phone}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Mail className="h-2.5 w-2.5 text-muted-foreground/60" /> {email}
              </span>
            </div>
            {/* Actions — bloquées en mode démo */}
            <div className="flex gap-1.5 mt-3">
              <LockedAction
                icon={Phone}
                label="Contacter"
                hint="Mode démo : les appels sont désactivés"
              />
              <LockedAction
                icon={FileText}
                label={isSupplier ? "Demander un devis" : "Demander un service"}
                hint="Mode démo : l'envoi de demandes est désactivé"
              />
              {!isSupplier && (
                <LockedAction
                  icon={CalendarRange}
                  label="Réserver"
                  hint="Mode démo : la réservation est désactivée"
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DemoDashboard() {
  usePageSEO({
    title: "Charger démo - batibuild App",
    description:
      "Démonstration complète de la plateforme batibuild App en lecture seule : estimation IA, assistant matériaux, investissements immobiliers, annuaire fournisseurs & experts, messagerie et statistiques.",
  });
  const navigate = useNavigate();

  // Estimation de construction — vrai moteur BIM, données démo
  const bm = useMemo(() => runBIMEstimation("maison", 150, 1, "tunis", "standard"), []);
  const ce = bm.costEstimate;
  const ai = bm.aiAnalysis;
  const confidence = Math.round(ai.confidence * 100);

  // Assistant Matériaux IA — vrai moteur de recommandation, catalogue officiel 2026
  const materialDemo = useMemo(
    () =>
      recommendForProject({
        context: DEMO_CONTEXT,
        categories: DEMO_MATERIAL_CATEGORIES,
        materials: DEMO_MATERIALS,
        offers: [],
      }),
    []
  );

  // Investissement immobilier — analyse de démonstration (query publique, lecture seule)
  const investDemo = useQuery(api.investments.getDemoAnalysis);
  const invest = investDemo
    ? {
        input: (investDemo as any).input,
        results: (investDemo as any).results,
      }
    : null;
  const investScore = invest?.results?.score;
  const investInd = invest?.results?.indicators;
  const investForecast = invest?.results?.forecast;

  return (
    <main className="min-h-screen bg-background">
      {/* ── Barre supérieure ── */}
      <header className="glass-header sticky top-0 z-30 border-b border-border/40">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 lg:px-6 h-12 sm:h-14">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold hover:opacity-80 transition-opacity min-w-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <HardHat className="h-4 w-4" />
            </span>
            <span className="truncate">batibuild App</span>
            <span className="hidden sm:inline text-muted-foreground font-normal text-[10px]">/ Charger démo</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Badge variant="outline" className="gap-1 border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400 text-[9px] sm:text-[10px]">
              <Lock className="h-3 w-3" />
              Lecture seule
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-[10px] sm:text-xs"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quitter la démo</span>
              <span className="sm:hidden">Quitter</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ── Bannière mode démo ── */}
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/10 via-orange-400/5 to-transparent p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400">
              <Play className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 flex-wrap">
                Charger démo
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  <FlaskConical className="h-2.5 w-2.5" />
                  Démonstration
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
                {DEMO_MODE_NOTE}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={() => navigate("/dashboard/new")}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Créer un vrai projet
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-xs"
                onClick={() => navigate("/dashboard/ai-materials")}
              >
                Assistant Matériaux IA
              </Button>
            </div>
          </div>
        </div>

        {/* ══════════ 1. ESTIMATION DE CONSTRUCTION IA ══════════ */}
        <section className="space-y-3">
          <SectionHeader
            icon={HardHat}
            title="Estimation de construction par IA"
            subtitle="Analyse de plan, surfaces, matériaux et coût estimé — marché tunisien 2026"
            tone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            demoLabel="Projet démo"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent">
              <CardContent className="p-3.5 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Coût total estimé</p>
                <p className="text-lg sm:text-2xl font-black mt-1 text-blue-600 dark:text-blue-400 truncate">{formatTnd(ce.totalCost)}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">TND · TVA incluse</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> Prix au m²
                </p>
                <p className="text-lg sm:text-2xl font-black mt-1 truncate">
                  {formatTnd(ce.costPerSquareMeter)} <span className="text-[10px] font-normal text-muted-foreground">/m²</span>
                </p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">150 m² construits</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" /> Durée du chantier
                </p>
                <p className="text-lg sm:text-2xl font-black mt-1 truncate">{ai.estimatedDuration}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                  ≈ {ai.laborEstimate.totalWorkers} ouvriers simultanés
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5 sm:p-4">
                <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Indice de confiance IA
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-lg sm:text-2xl font-black">{confidence}%</p>
                  <Progress value={confidence} className="h-2 flex-1" />
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">Région + finition renseignées</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Scénarios */}
            <Card className="border-border/40 bg-background/50">
              <CardHeader className="p-3.5 sm:p-4 pb-0">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-500" /> Scénarios de budget
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 space-y-2">
                {Object.entries(ce.budgetScenarios).map(([key, s]: [string, any]) => (
                  <div
                    key={key}
                    className={`rounded-xl border px-3 py-2.5 flex items-center justify-between ${
                      key === "standard" ? "border-blue-500/30 bg-blue-500/5" : "border-border/30"
                    }`}
                  >
                    <div>
                      <p className="text-[11px] sm:text-xs font-semibold">{s.label}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">{formatTnd(s.costPerM2)} /m²</p>
                    </div>
                    <div className="text-right">
                      {key === "standard" && (
                        <Badge className="mb-0.5 bg-blue-600 text-white border-0 text-[8px] px-1.5 py-0">Recommandé</Badge>
                      )}
                      <p className="text-xs sm:text-sm font-bold">{formatTnd(s.totalCost)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Répartition */}
            <Card className="border-border/40 bg-background/50">
              <CardHeader className="p-3.5 sm:p-4 pb-0">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> Répartition détaillée
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 space-y-2.5">
                {ce.breakdown.slice(0, 4).map((b: any) => (
                  <div key={b.category}>
                    <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
                      <span className="font-medium">{b.label}</span>
                      <span className="text-muted-foreground">{formatTnd(b.estimatedCost)} · {b.percentage}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${BREAKDOWN_COLORS[b.category] || "bg-blue-500"}`} style={{ width: `${b.percentage}%` }} />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] sm:text-xs font-semibold">
                  <span>Total (avec marge d'imprévus {ce.contingencyPercentage}%)</span>
                  <span>{formatTnd(ce.totalCost)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export — présenté, mais verrouillé en mode démo */}
          <Card className="border-border/40 bg-background/50">
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold">Rapport professionnel — PDF · Excel · CSV</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                    Export disponible dans la version réelle : coût total, matériaux, main-d'œuvre, planning, prix au m²
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="outline" disabled className="h-8 gap-1 text-[10px] opacity-60 cursor-not-allowed" title="Mode démo : export désactivé">
                  <Download className="h-3 w-3" /> PDF <Lock className="h-2.5 w-2.5 text-amber-500" />
                </Button>
                <Button size="sm" variant="outline" disabled className="h-8 gap-1 text-[10px] opacity-60 cursor-not-allowed" title="Mode démo : export désactivé">
                  <FileSpreadsheet className="h-3 w-3" /> Excel <Lock className="h-2.5 w-2.5 text-amber-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ══════════ 2. ASSISTANT MATÉRIAUX IA ══════════ */}
        <section className="space-y-3">
          <SectionHeader
            icon={Sparkles}
            title="Assistant Matériaux IA"
            subtitle="Recommandations par catégorie : score, quantité, prix et fournisseur — catalogue officiel 2026"
            tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            demoLabel="Projet démo"
          />
          <div className="grid gap-3 md:grid-cols-3">
            {materialDemo.categories.slice(0, 3).map((cat: CategoryResult) => {
              const eq = cat.solutions.find((s) => s.profile === "equilibre") ?? cat.solutions[0];
              if (!eq) return null;
              const tone = CATEGORY_TONES[cat.categoryId] ?? { bar: "bg-violet-500", chip: "bg-violet-500/10 text-violet-600" };
              return (
                <Card key={cat.categoryId} className="border-violet-500/15 bg-gradient-to-b from-violet-500/[0.04] to-background">
                  <CardContent className="p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${tone.chip}`}>
                        {cat.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{cat.candidatesCount} références</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold line-clamp-1">{eq.material.name}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                      {eq.material.quantity} {eq.material.quantityUnit} · {formatTnd(eq.material.band.avg)} /{eq.material.unit}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, eq.recommendationScore)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums">{eq.recommendationScore}/100</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1.5 line-clamp-2">{eq.justification}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Fournisseur recommandé (bloqué) */}
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-background">
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold">Fournisseur recommandé par l'IA</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                      Sélection automatique selon la spécialité de la catégorie
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-background/60 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    BP
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-semibold">Bâtiment Plus SARL</p>
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/40 px-1 py-0.5 rounded-full">
                        <CheckCircle2 className="h-2 w-2" /> Vérifié
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> Tunis · Gros œuvre · Béton
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-border/60 bg-muted/20 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        <Lock className="h-2 w-2 text-amber-500" /> <Phone className="h-2 w-2" /> +216 71 234 567
                      </span>
                    </div>
                    <div className="flex gap-1.5 mt-2.5">
                      <LockedAction icon={Phone} label="Contacter" hint="Mode démo : les appels sont désactivés" />
                      <LockedAction icon={FileText} label="Demander un devis" hint="Mode démo : l'envoi de demandes est désactivé" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aperçu des catégories analysées */}
            <Card className="border-border/40 bg-background/50">
              <CardContent className="p-3.5 sm:p-4">
                <p className="text-xs sm:text-sm font-semibold mb-2.5 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-violet-500" /> Catégories analysées
                </p>
                <div className="space-y-2">
                  {materialDemo.categories.map((cat: CategoryResult) => {
                    const eq = cat.solutions.find((s) => s.profile === "equilibre") ?? cat.solutions[0];
                    return (
                      <div key={cat.categoryId} className="flex items-center justify-between gap-2 text-[10px] sm:text-xs">
                        <span className="text-muted-foreground min-w-0 truncate">{cat.label}</span>
                        <span className="font-medium min-w-0 truncate text-right">
                          {eq ? eq.material.name : "—"}
                        </span>
                        <span className="text-muted-foreground tabular-nums shrink-0">
                          {eq ? formatTnd(eq.material.band.avg * eq.material.quantity) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Total matériaux estimé</span>
                  <span className="text-xs sm:text-sm font-bold text-violet-600 dark:text-violet-400">
                    {formatTnd(materialDemo.cost.total)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ══════════ 3. INVESTISSEMENT IMMOBILIER ══════════ */}
        <section className="space-y-3">
          <SectionHeader
            icon={Landmark}
            title="Investissement immobilier"
            subtitle="Score IA, rendement net, cashflow et scénarios — marché tunisien 2026"
            tone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            demoLabel="Bien démo"
          />
          {!invest && (
            <Card className="border-border/40 bg-background/50">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
                <p className="text-xs text-muted-foreground">Calcul de l'analyse de démonstration…</p>
              </CardContent>
            </Card>
          )}
          {invest && (
            <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.05] to-background">
              <CardContent className="p-3.5 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-bold truncate">{invest.input?.name}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                      {invest.input?.area} m² · {invest.input?.city} · {invest.input?.investmentType?.replace(/_/g, " ")}
                    </p>
                  </div>
                  {investScore && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Gauge className="h-3 w-3" /> Score IA {investScore.total}/100 · {investScore.grade}
                      </span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-xl border border-border/30 bg-background/60 p-3">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Coût total</p>
                    <p className="text-sm sm:text-base font-bold truncate">{investInd ? fmtTND(investInd.totalCost) : "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-background/60 p-3">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Rendement net</p>
                    <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 truncate">
                      {investInd ? fmtPct(investInd.netYieldPct) : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-background/60 p-3">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Cashflow mensuel</p>
                    <p className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400 truncate">
                      {investInd ? `${fmtTND(investInd.monthlyCashflow)}/mois` : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-background/60 p-3">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">ROI à {investForecast?.horizon ?? 10} ans</p>
                    <p className="text-sm sm:text-base font-bold truncate">
                      {investForecast ? fmtPct(investForecast.roiPct) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3">
                  <Button size="sm" variant="outline" disabled className="h-8 gap-1 text-[10px] opacity-60 cursor-not-allowed" title="Mode démo : export désactivé">
                    <FileSpreadsheet className="h-3 w-3" /> CSV <Lock className="h-2.5 w-2.5 text-amber-500" />
                  </Button>
                  <Button size="sm" variant="outline" disabled className="h-8 gap-1 text-[10px] opacity-60 cursor-not-allowed" title="Mode démo : export désactivé">
                    <Download className="h-3 w-3" /> Rapport PDF <Lock className="h-2.5 w-2.5 text-amber-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ══════════ 4. ANNUAIRE FOURNISSEURS & EXPERTS ══════════ */}
        <section className="space-y-3">
          <SectionHeader
            icon={Store}
            title="Annuaire des fournisseurs & experts"
            subtitle="Filtrage automatique par région et spécialité — contact et devis désactivés en mode démo"
            tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            demoLabel="Annuaire démo"
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {DEMO_SUPPLIERS.map((s) => (
              <DemoProCard
                key={s.name}
                kind="supplier"
                name={s.name}
                meta={s.specialty}
                specialty={s.specialty}
                region={s.region}
                phone={s.phone}
                email={s.email}
                rating={s.rating}
                verified={s.verified}
                initials={s.initials}
              />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {DEMO_EXPERTS.map((e) => (
              <DemoProCard
                key={e.name}
                kind="expert"
                name={e.name}
                meta={e.profession}
                specialty={e.specialty}
                region={e.region}
                phone={e.phone}
                email={e.email}
                rating={e.rating}
                verified={e.verified}
                initials={e.initials}
              />
            ))}
          </div>
        </section>

        {/* ══════════ 5. ESPACE FOURNISSEUR / EXPERT ══════════ */}
        <section className="space-y-3">
          <SectionHeader
            icon={Briefcase}
            title="Espace fournisseur & expert"
            subtitle="Statistiques en temps réel (Vues, Demandes reçues, Réponses, Taux de réponse) — lecture seule"
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            demoLabel="Statistiques démo"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {DEMO_KPIS.map((k) => (
              <Card key={k.label} className="border-border/40 bg-background/50">
                <CardContent className="p-3.5 sm:p-4 flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ${k.tone}`}>
                    <k.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg font-black tabular-nums leading-none">{k.value}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mt-1">{k.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-border/40 bg-background/50">
            <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold">Devis reçus — notifications en temps réel</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                    Pastille rouge sur les onglets « Devis reçus » et dans l'en-tête dès réception d'une nouvelle demande
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                <Bell className="h-3 w-3" />
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">3</span>
                nouvelles demandes
              </span>
            </CardContent>
          </Card>
        </section>

        {/* ══════════ 6. MESSAGERIE ══════════ */}
        <section className="space-y-3">
          <SectionHeader
            icon={MessageSquare}
            title="Messagerie"
            subtitle="Réponses des fournisseurs & experts avec pièces jointes (devis) — envoi désactivé en mode démo"
            tone="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            demoLabel="Conversation démo"
          />
          <Card className="border-border/40 bg-background/50">
            <CardContent className="p-3.5 sm:p-4 space-y-3">
              {DEMO_MESSAGES.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.from === "Vous" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                    m.from === "Vous"
                      ? "bg-primary/15 text-primary"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {m.initials}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl border px-3 py-2 ${
                    m.from === "Vous"
                      ? "border-primary/20 bg-primary/5 rounded-tr-sm"
                      : "border-border/30 bg-background rounded-tl-sm"
                  }`}>
                    <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">
                      {m.from} · <span className="font-normal">{m.time}</span>
                    </p>
                    <p className="text-[11px] sm:text-xs leading-relaxed">{m.text}</p>
                    {m.attachment && (
                      <button
                        type="button"
                        disabled
                        title="Mode démo : téléchargement désactivé"
                        className="mt-1.5 inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border/40 bg-muted/20 px-2 py-1 text-[9px] font-medium text-muted-foreground/70 line-through decoration-muted-foreground/30"
                      >
                        <Paperclip className="h-2.5 w-2.5" /> {m.attachment} <Lock className="h-2 w-2 text-amber-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {/* Saisie verrouillée */}
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
                  <Send className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground/60 flex-1">Écrire un message…</span>
                  <Lock className="h-3 w-3 text-amber-500" />
                </div>
                <span className="absolute -top-2 right-2 rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[8px] font-semibold text-amber-600 dark:text-amber-400">
                  Envoi désactivé
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ══════════ 7. PARAMÈTRES (verrouillés) ══════════ */}
        <section className="space-y-3">
          <SectionHeader
            icon={Settings}
            title="Paramètres"
            subtitle="Modification des paramètres désactivée en mode démo — aperçu du panneau réel"
            tone="bg-slate-500/10 text-slate-600 dark:text-slate-300"
            demoLabel="Verrouillé"
          />
          <Card className="border-border/40 bg-background/50">
            <CardContent className="p-3.5 sm:p-4 space-y-1.5">
              {DEMO_SETTINGS.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5 opacity-75"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium">{s.label}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{s.desc}</p>
                  </div>
                  <Switch checked disabled aria-label={`${s.label} (verrouillé en mode démo)`} />
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Tous les réglages sont verrouillés en mode démonstration. Créez un compte pour personnaliser votre espace.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ══════════ CTA FINAL ══════════ */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-teal-500/5 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold tracking-tight">Prêt à passer à l'action ?</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                Cette démo est en lecture seule. Créez un projet réel pour estimer, analyser, contacter des fournisseurs et gérer vos devis.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button size="sm" className="gap-1.5 h-9" onClick={() => navigate("/dashboard/new")}>
              <Sparkles className="h-3.5 w-3.5" />
              Créer un projet réel
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour au tableau de bord
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}