import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useFeatureFlag } from "@/hooks/use-feature-flags";
import { MaterialAlertDialog } from "@/components/materials/MaterialAlertDialog";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  FlaskConical,
  HardHat,
  History,
  Info,
  Layers,
  Package,
  Ruler,
  Scale,
  ShieldCheck,
  Store,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Warehouse,
  Wrench,
} from "lucide-react";

const QUALITY_BADGE: Record<string, { label: string; cls: string }> = {
  observé_en_ligne: {
    label: "Prix observé",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  publication_2026: {
    label: "Publication 2026",
    cls: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  estimation_indicative: {
    label: "Estimation",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

function fmt(value: number, currency = "TND"): string {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Mini courbe de prix (SVG pur, sans dépendance). */
function Sparkline({ points }: { points: { price: number; at: number }[] }) {
  const path = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.price);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const w = 100;
    const h = 32;
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / span) * h;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  if (!path) {
    return (
      <div className="h-8 flex items-center text-[10px] text-muted-foreground">
        Historique de prix insuffisant
      </div>
    );
  }
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-full">
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-emerald-500"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Info; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-muted/10 px-3 py-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/70 leading-tight">{label}</p>
        <p className="text-xs font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const alertsEnabled = useFeatureFlag("material_price_alerts");
  const [showAlertDialog, setShowAlertDialog] = useState(false);

  const detail = useQuery(
    api.materialProfiles.getMaterialDetail,
    id ? { id: id as Id<"materialPrices"> } : "skip",
  );
  const alerts = useQuery(
    api.materialAlerts.getAlertsForMaterial,
    id ? { materialPriceId: id as Id<"materialPrices"> } : "skip",
  );
  const toggleAlert = useMutation(api.materialAlerts.toggleAlert);
  const deleteAlert = useMutation(api.materialAlerts.deleteAlert);

  usePageSEO(
    detail
      ? {
          title: `${detail.material.name} — Fiche matériau | BatiBuild`,
          description:
            detail.profile.usageAdvice ||
            `Fiche technique et prix du matériau ${detail.material.name}.`,
        }
      : null,
  );

  if (detail === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <div className="h-10 w-40 rounded-lg bg-muted/40 animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted/30 animate-pulse" />
          <div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />
        </div>
      </div>
    );
  }

  if (detail === null) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <HardHat className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">Matériau introuvable</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/materials")}>
              Retour aux matériaux
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { material, profile, stats, history, offers, similar } = detail;
  const currency = material.currency || "TND";
  const up = stats.changePct >= 0;
  const change30 = stats.change30dPct;
  const qb = QUALITY_BADGE[material.priceQuality ?? ""] ?? QUALITY_BADGE.estimation_indicative;
  const myAlerts = alerts ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.02] via-background to-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => navigate("/dashboard/materials")}
              aria-label="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground leading-tight">BatiBuild · Matériaux</p>
              <h1 className="text-xs sm:text-sm font-semibold leading-tight truncate">
                {material.name}
              </h1>
            </div>
          </div>
          {alertsEnabled && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => navigate("/dashboard/materials/alerts")}
              >
                <Bell className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mes alertes</span>
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowAlertDialog(true)}>
                <Bell className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Créer une alerte</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Hero produit */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Badge variant="secondary" className="text-[10px]">
                  <Layers className="h-3 w-3 mr-1" />
                  {profile.categoryLabel}
                </Badge>
                {material.subcategory && (
                  <Badge variant="outline" className="text-[10px]">
                    {material.subcategory}
                  </Badge>
                )}
                <Badge className={`text-[10px] border ${qb.cls}`}>{qb.label}</Badge>
                {material.sku && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    <Tag className="h-3 w-3 mr-1" />
                    {material.sku}
                  </Badge>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">{material.name}</h2>
              {material.description && (
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-2xl">
                  {material.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {material.brand && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    {material.brand}
                  </Badge>
                )}
                {material.manufacturer && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Building2 className="h-3 w-3" />
                    {material.manufacturer}
                  </Badge>
                )}
                {material.region && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Warehouse className="h-3 w-3" />
                    {material.region}
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground">Prix unitaire HT/estimé</p>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums">
                {fmt(material.unitPrice, currency)}
              </p>
              <p className="text-[10px] text-muted-foreground">/ {material.unit}</p>
              {stats.changePct !== 0 && (
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    up
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {up ? "+" : ""}
                  {stats.changePct.toFixed(1)} % depuis l'origine
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Statistiques de prix */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[
            { icon: BarChart3, label: "Prix actuel", value: fmt(stats.latestPrice, currency) },
            { icon: TrendingDown, label: "Prix mini historique", value: fmt(stats.minPrice, currency) },
            { icon: TrendingUp, label: "Prix maxi historique", value: fmt(stats.maxPrice, currency) },
            {
              icon: History,
              label: "Variation 30 jours",
              value: `${change30 >= 0 ? "+" : ""}${change30.toFixed(1)} %`,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-br from-background to-muted/20 border border-border/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground/70 leading-tight">{s.label}</p>
                <p className="text-sm font-extrabold tabular-nums leading-tight truncate">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Courbe + historique */}
        <Card className="border border-border/40 rounded-xl overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/20 px-4 py-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Évolution du prix
              <span className="text-[10px] font-normal text-muted-foreground">
                {history.length} changement(s) historisé(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Sparkline points={stats.points} />
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Origine : {fmt(stats.firstPrice, currency)}</span>
              <span>Dernier relevé : {fmtDate(stats.lastChangeAt)}</span>
            </div>
            {history.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-border/20 divide-y divide-border/10">
                {history
                  .slice()
                  .reverse()
                  .slice(0, 12)
                  .map((h, i) => (
                    <div
                      key={`${h.changedAt}-${i}`}
                      className="flex items-center justify-between px-3 py-1.5 text-[11px]"
                    >
                      <span className="text-muted-foreground">{fmtDate(h.changedAt)}</span>
                      <span className="tabular-nums">
                        {h.previousPrice.toFixed(3)} →{" "}
                        <strong
                          className={
                            h.newPrice >= h.previousPrice
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {h.newPrice.toFixed(3)}
                        </strong>
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Caractéristiques + conformité */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border border-border/40 rounded-xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/20 px-4 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Ruler className="h-4 w-4 text-emerald-600" />
                Caractéristiques techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {profile.characteristics.map((c) => (
                  <div
                    key={c.label}
                    className="rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                  >
                    <dt className="text-[10px] text-muted-foreground/70">{c.label}</dt>
                    <dd className="text-xs font-semibold">{c.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="border border-border/40 rounded-xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/20 px-4 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Normes & certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Normes de référence
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.norms.map((n) => (
                    <Badge key={n} variant="outline" className="text-[10px] gap-1">
                      <Scale className="h-3 w-3" />
                      {n}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Certifications
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.certifications.map((c) => (
                    <Badge
                      key={c}
                      className="text-[10px] gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conseils */}
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: Wrench, title: "Mise en œuvre", value: profile.usageAdvice, color: "text-sky-600" },
            { icon: Warehouse, title: "Stockage", value: profile.storageAdvice, color: "text-amber-600" },
            { icon: ShieldCheck, title: "Sécurité", value: profile.safetyAdvice, color: "text-rose-600" },
          ].map((c) => (
            <Card key={c.title} className="border border-border/40 rounded-xl">
              <CardContent className="p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                  <p className="text-xs font-semibold">{c.title}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Conditionnement + compatibilités + documentation */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="border border-border/40 rounded-xl">
            <CardHeader className="pb-2 border-b border-border/20 px-4 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" />
                Conditionnement & compatibilités
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <InfoRow icon={Boxes} label="Conditionnement" value={profile.packaging} />
              {profile.compatibility.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    Compatibilités
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.compatibility.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/40 rounded-xl">
            <CardHeader className="pb-2 border-b border-border/20 px-4 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                Documentation technique
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {profile.documentation.map((doc) => (
                <div
                  key={doc.type}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-xs font-medium truncate">{doc.label}</span>
                  </div>
                  {doc.url ? (
                    <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-[11px]">
                      <a href={doc.url} target="_blank" rel="noreferrer">
                        <Download className="h-3 w-3" />
                        PDF
                      </a>
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Sur demande</span>
                  )}
                </div>
              ))}
              {!profile.enriched && (
                <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground pt-1">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  Fiche dérivée automatiquement de la catégorie et du libellé. L'administrateur
                  peut enrichir et surcharger ces informations.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Offres fournisseurs */}
        <Card className="border border-border/40 rounded-xl overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/20 px-4 py-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-600" />
              Offres fournisseurs
              <span className="text-[10px] font-normal text-muted-foreground">
                {offers.length} offre(s) recensée(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {offers.length === 0 ? (
              <div className="p-8 text-center">
                <Truck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  Aucune offre fournisseur référencée pour ce matériau.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/10 bg-muted/20 text-left">
                      <th className="py-2.5 px-4 font-medium text-muted-foreground">Fournisseur</th>
                      <th className="py-2.5 px-4 font-medium text-muted-foreground hidden sm:table-cell">
                        Localisation
                      </th>
                      <th className="py-2.5 px-4 font-medium text-muted-foreground text-right">
                        Prix moyen
                      </th>
                      <th className="py-2.5 px-4 font-medium text-muted-foreground hidden md:table-cell">
                        Fourchette
                      </th>
                      <th className="py-2.5 px-4 font-medium text-muted-foreground">Disponibilité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((o) => (
                      <tr key={o.supplier} className="border-b border-border/5 hover:bg-muted/10">
                        <td className="py-2.5 px-4 font-medium">{o.supplier}</td>
                        <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell">
                          {[o.city, o.governorate].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                          {o.avgPrice.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-4 hidden md:table-cell text-muted-foreground tabular-nums">
                          {o.minPrice.toFixed(3)} – {o.maxPrice.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant={o.availability === "disponible" ? "secondary" : "outline"}
                            className="text-[10px]"
                          >
                            {o.availability === "disponible"
                              ? "Disponible"
                              : o.availability === "sur_commande"
                                ? "Sur commande"
                                : "Rupture"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mes alertes sur ce matériau */}
        {alertsEnabled && myAlerts.length > 0 && (
          <Card className="border border-border/40 rounded-xl">
            <CardHeader className="pb-2 border-b border-border/20 px-4 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-600" />
                Mes alertes sur ce matériau
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2">
              {myAlerts.map((a) => (
                <div
                  key={a._id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {a.direction === "below"
                        ? `Sous ${a.targetPrice?.toFixed(3)} ${currency}`
                        : a.direction === "above"
                          ? `Au-dessus de ${a.targetPrice?.toFixed(3)} ${currency}`
                          : `Variation ≥ ${a.thresholdPercent} %`}
                    </p>
                    {a.note && <p className="text-[10px] text-muted-foreground truncate">{a.note}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={a.active ? "Désactiver" : "Activer"}
                      onClick={() => toggleAlert({ alertId: a._id }).catch(() => toast.error("Erreur"))}
                    >
                      {a.active ? (
                        <ToggleRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      aria-label="Supprimer"
                      onClick={() => deleteAlert({ alertId: a._id }).catch(() => toast.error("Erreur"))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Matériaux similaires */}
        {similar.length > 0 && (
          <Card className="border border-border/40 rounded-xl">
            <CardHeader className="pb-2 border-b border-border/20 px-4 py-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                Matériaux similaires
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {similar.map((m) => (
                <Link
                  key={m._id}
                  to={`/dashboard/materials/${m._id}`}
                  className="group rounded-lg border border-border/30 bg-muted/10 px-3 py-2.5 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors"
                >
                  <p className="text-xs font-medium truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    {m.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold tabular-nums">
                    {fmt(m.unitPrice, m.currency || currency)}{" "}
                    <span className="font-normal text-muted-foreground">/ {m.unit}</span>
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/10 px-4 py-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FlaskConical className="h-3 w-3" />
            Fiche enrichie générée depuis la base matériaux batibuild.
          </span>
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-[10px]">
            <Link to="/dashboard/materials">
              <ExternalLink className="h-3 w-3" />
              Tous les matériaux
            </Link>
          </Button>
        </div>

        {/* Liste des prix comparés (accès direct au catalogue) */}
        <Card className="border border-border/30 rounded-xl">
          <CardContent className="p-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Comparez ce matériau avec l'ensemble du catalogue et suivez l'évolution des prix dans
            la base matériaux 2026.
          </CardContent>
        </Card>
      </div>

      {alertsEnabled && showAlertDialog && (
        <MaterialAlertDialog
          materialId={material._id}
          materialName={material.name}
          unit={material.unit}
          currentPrice={material.unitPrice}
          currency={currency}
          open
          onOpenChange={setShowAlertDialog}
        />
      )}
    </main>
  );
}
