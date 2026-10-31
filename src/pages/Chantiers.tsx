// ============================================================================
// GESTION & SUIVI DE CHANTIER — page module
// ----------------------------------------------------------------------------
// Point d'entrée : carte du Dashboard, navigation latérale, ou retour depuis un
// chantier. Deux modes de création aboutissent à la MÊME interface :
//   A. depuis une estimation existante (le chantier ne duplique rien : il
//      référence le projet et relit ses données) ;
//   B. chantier autonome (saisie directe).
// L'accès est contrôlé côté serveur : sans cotisation active, la liste est vide
// et la carte de souscription s'affiche.
// ============================================================================

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarRange,
  HardHat,
  LayoutGrid,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { PROJECT_TYPE_LABELS, PROJECT_TYPES, type ProjectType } from "@/convex/projectTypes";
import { TUNISIA_REGION_LABELS } from "@/lib/providerRegions";
import { formatSiteDate, formatTND, siteTypeLabel } from "@/lib/siteTracking";
import { SiteCotisationCard } from "@/components/site/SitePaywall";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const DAY = 86_400_000;
const isoDate = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);
const fromIso = (value: string) => new Date(`${value}T00:00:00`).getTime();

const statusStyles: Record<string, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  completed: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  archived: "border-border/50 bg-muted text-muted-foreground",
};

export default function Chantiers() {
  usePageSEO({
    title: "Gestion & Suivi de Chantier — batibuild",
    description:
      "Planning, suivi quotidien, budget, matériaux, intervenants, qualité et prévisions de risques de vos chantiers.",
  });

  const navigate = useNavigate();
  const access = useQuery(api.siteTracking.getMySiteAccess, {});
  const data = useQuery(api.siteTracking.listSites, {});
  const projects = useQuery(api.projects.getUserProjects, {});
  const createSite = useMutation(api.siteTracking.createSite);
  const createFromProject = useMutation(api.siteTracking.createSiteFromProject);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState("estimation");
  const [busy, setBusy] = useState(false);

  // ── Formulaire « depuis une estimation » ──────────────────────────────
  const [projectId, setProjectId] = useState("");
  const [projectStart, setProjectStart] = useState(isoDate(Date.now()));
  const [projectEnd, setProjectEnd] = useState(isoDate(Date.now() + 180 * DAY));
  const [projectClient, setProjectClient] = useState("");
  const [projectManager, setProjectManager] = useState("");

  // ── Formulaire « chantier autonome » ──────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    category: "villa" as ProjectType,
    region: "tunis",
    address: "",
    surface: "",
    clientName: "",
    managerName: "",
    budgetInitial: "",
    startDate: isoDate(Date.now()),
    expectedEndDate: isoDate(Date.now() + 180 * DAY),
    description: "",
    characteristics: "",
  });

  const sites = data?.sites ?? [];
  const stats = useMemo(() => {
    const active = sites.filter((site: any) => site.status === "active");
    const budget = sites.reduce((sum: number, site: any) => sum + (site.budget?.revised ?? 0), 0);
    const spent = sites.reduce((sum: number, site: any) => sum + (site.budget?.spent ?? 0), 0);
    return { active: active.length, total: sites.length, budget, spent };
  }, [sites]);

  const canCreate = !!access?.allowed;

  const openDialog = () => {
    if (!canCreate) {
      toast.error("Une cotisation active est nécessaire pour créer un chantier.");
      return;
    }
    setDialogOpen(true);
  };

  const submitFromProject = async () => {
    if (!projectId) {
      toast.error("Choisissez l'estimation à transformer en chantier.");
      return;
    }
    setBusy(true);
    try {
      const result = await createFromProject({
        projectId: projectId as any,
        startDate: fromIso(projectStart),
        expectedEndDate: fromIso(projectEnd),
        clientName: projectClient.trim() || undefined,
        managerName: projectManager.trim() || undefined,
      });
      toast.success("Chantier créé depuis l'estimation. Le projet d'origine reste inchangé.");
      setDialogOpen(false);
      navigate(`/dashboard/chantiers/${result.siteId}`);
    } catch (error: any) {
      toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Création impossible.");
    } finally {
      setBusy(false);
    }
  };

  const submitStandalone = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom du chantier est obligatoire.");
      return;
    }
    if (!form.budgetInitial || Number(form.budgetInitial) < 0) {
      toast.error("Indiquez un budget prévisionnel valide.");
      return;
    }
    if (fromIso(form.expectedEndDate) <= fromIso(form.startDate)) {
      toast.error("La date de livraison doit être postérieure au démarrage.");
      return;
    }
    setBusy(true);
    try {
      const result = await createSite({
        name: form.name.trim(),
        category: form.category,
        region: form.region as any,
        address: form.address.trim() || undefined,
        surface: form.surface ? Number(form.surface) : undefined,
        clientName: form.clientName.trim() || undefined,
        managerName: form.managerName.trim() || undefined,
        budgetInitial: Number(form.budgetInitial),
        startDate: fromIso(form.startDate),
        expectedEndDate: fromIso(form.expectedEndDate),
        description: form.description.trim() || undefined,
        characteristics: form.characteristics.trim() || undefined,
      });
      toast.success("Chantier créé. Le planning initial est prêt à être ajusté.");
      setDialogOpen(false);
      navigate(`/dashboard/chantiers/${result.siteId}`);
    } catch (error: any) {
      toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Création impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 h-8 w-8 shrink-0"
              onClick={() => navigate("/dashboard")}
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/25">
                  <HardHat className="h-4 w-4" />
                </span>
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl">
                  Gestion & Suivi de Chantier
                </h1>
              </div>
              <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
                Du planning à la livraison : avancement réel, dépenses, matériaux, intervenants, contrôles
                qualité et prévisions de risques — dans batibuild, sans ressaisie de vos estimations.
              </p>
            </div>
          </div>
          <Button className="gap-1.5 self-start bg-emerald-600 text-white hover:bg-emerald-500" onClick={openDialog}>
            <Plus className="h-4 w-4" /> Nouveau chantier
          </Button>
        </div>

        {/* La cotisation n'est proposée qu'à qui elle manque ET qui possède un
            chantier à rouvrir : un intervenant consulte les chantiers partagés
            sans payer, c'est le responsable qui est cotisant. */}
        {(!access?.allowed
          ? sites.length === 0 || sites.some((site: any) => site.isOwner)
          : false) && (
          <div className="mb-5">
            <SiteCotisationCard />
          </div>
        )}
        {access?.allowed && (
          <div className="mb-5">
            <SiteCotisationCard compact />
          </div>
        )}

        {sites.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              { icon: LayoutGrid, label: "Chantiers suivis", value: String(stats.total) },
              { icon: Building2, label: "En cours", value: String(stats.active) },
              { icon: Wallet, label: "Budget révisé", value: formatTND(stats.budget) },
              { icon: Sparkles, label: "Dépensé", value: formatTND(stats.spent) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/50 bg-card/60 p-3 shadow-none backdrop-blur-sm"
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                  <item.icon className="h-3 w-3" /> {item.label}
                </div>
                <p className="mt-1 truncate text-sm font-semibold sm:text-base">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {data === undefined ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement de vos chantiers…
          </div>
        ) : sites.length === 0 ? (
          <Card className="border-dashed border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10">
            <CardContent className="px-4 py-10 text-center sm:py-14">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25">
                <HardHat className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold sm:text-lg">
                {canCreate ? "Votre premier chantier commence ici" : "Débloquez le suivi de chantier"}
              </h2>
              <p className="mx-auto mt-1.5 max-w-lg text-xs text-muted-foreground sm:text-sm">
                {canCreate
                  ? "Partez d'une estimation existante — le budget, le DQE et les matériaux sont repris sans la modifier — ou créez un chantier autonome."
                  : "Le module est payant et son accès est contrôlé côté serveur. Déposez votre demande de cotisation ci-dessus : un administrateur active votre accès après validation du paiement."}
              </p>
              {canCreate && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
                    onClick={() => {
                      setMode("estimation");
                      openDialog();
                    }}
                  >
                    <Sparkles className="h-4 w-4" /> Depuis une estimation
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      setMode("standalone");
                      openDialog();
                    }}
                  >
                    <Plus className="h-4 w-4" /> Chantier autonome
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sites.map((site: any) => {
              const progress = Math.round(site.progress ?? 0);
              const overBudget = (site.budget?.variance ?? 1) < 0;
              return (
                <button
                  key={site._id}
                  type="button"
                  onClick={() => navigate(`/dashboard/chantiers/${site._id}`)}
                  className="group flex h-full flex-col rounded-xl border border-border/50 bg-card p-4 text-left shadow-none transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-600/5 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{site.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {siteTypeLabel(site.category)}
                        {site.surface ? ` · ${site.surface} m²` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${statusStyles[site.status] ?? ""}`}>
                      {site.status === "active" ? "En cours" : site.status === "completed" ? "Terminé" : "Archivé"}
                    </Badge>
                  </div>

                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Avancement</span>
                    <span className="font-medium text-foreground">{progress} %</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Budget révisé</p>
                      <p className="truncate font-medium">{site.budget ? formatTND(site.budget.revised) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dépensé</p>
                      <p className={`truncate font-medium ${overBudget ? "text-rose-600 dark:text-rose-400" : ""}`}>
                        {site.budget ? formatTND(site.budget.spent) : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarRange className="h-3 w-3" /> {formatSiteDate(site.expectedEndDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {site.taskCount} phase(s)
                    </span>
                    {!site.isOwner && (
                      <Badge variant="secondary" className="text-[9px]">
                        Intervenant
                      </Badge>
                    )}
                    {overBudget && (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-3 w-3" /> dépassement
                      </span>
                    )}
                  </div>

                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 transition-transform group-hover:translate-x-0.5 dark:text-emerald-300">
                    Ouvrir le chantier <ArrowUpRight className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!canCreate && sites.length > 0 && (
          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            Vous consultez les chantiers où vous êtes intervenant. Seul le responsable paie la cotisation.
          </p>
        )}
      </div>

      {/* ═══ Création — deux modes, une seule interface ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Créer un chantier</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Les deux modes mènent au même suivi. Depuis une estimation, le budget et les matériaux sont
              repris du projet, qui n'est jamais modifié.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={setMode} className="mt-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="estimation" className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> Depuis une estimation
              </TabsTrigger>
              <TabsTrigger value="standalone" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Chantier autonome
              </TabsTrigger>
            </TabsList>

            <TabsContent value="estimation" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Estimation source</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={(projects ?? []).length ? "Choisir un projet" : "Aucune estimation disponible"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(projects ?? []).map((project: any) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.name} — {PROJECT_TYPE_LABELS[project.category as ProjectType] ?? project.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(projects ?? []).length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Créez d'abord une estimation, ou utilisez l'onglet « Chantier autonome ».
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Démarrage</Label>
                  <Input type="date" value={projectStart} onChange={(event) => setProjectStart(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Livraison prévisionnelle</Label>
                  <Input type="date" value={projectEnd} onChange={(event) => setProjectEnd(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Maître d'ouvrage (optionnel)</Label>
                  <Input value={projectClient} onChange={(event) => setProjectClient(event.target.value)} placeholder="Nom du client" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Suivi de chantier (optionnel)</Label>
                  <Input value={projectManager} onChange={(event) => setProjectManager(event.target.value)} placeholder="Chef de chantier" />
                </div>
              </div>
              <p className="rounded-lg border border-emerald-500/25 bg-emerald-50/50 p-2.5 text-[11px] text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
                Le budget initial reprend le scénario retenu de l'estimation, et le DQE est importé dans le suivi
                des matériaux. Modifier le chantier ne modifie jamais l'estimation.
              </p>
              <DialogFooter className="gap-2 pt-1">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
                  disabled={busy || !projectId}
                  onClick={submitFromProject}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Créer depuis l'estimation
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="standalone" className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Nom du chantier *</Label>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="Ex. Villa Les Oliviers"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type de projet</Label>
                  <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value as ProjectType })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {PROJECT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gouvernorat</Label>
                  <Select value={form.region} onValueChange={(value) => setForm({ ...form, region: value })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TUNISIA_REGION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Surface (m²)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.surface}
                    onChange={(event) => setForm({ ...form, surface: event.target.value })}
                    placeholder="180"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Budget prévisionnel (TND) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.budgetInitial}
                    onChange={(event) => setForm({ ...form, budgetInitial: event.target.value })}
                    placeholder="250000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Démarrage</Label>
                  <Input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Livraison prévisionnelle</Label>
                  <Input
                    type="date"
                    value={form.expectedEndDate}
                    onChange={(event) => setForm({ ...form, expectedEndDate: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Adresse</Label>
                  <Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Rue, quartier" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Maître d'ouvrage</Label>
                  <Input value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Chef de chantier</Label>
                  <Input value={form.managerName} onChange={(event) => setForm({ ...form, managerName: event.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Nature des travaux, contraintes du site…"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Caractéristiques techniques</Label>
                  <Input
                    value={form.characteristics}
                    onChange={(event) => setForm({ ...form, characteristics: event.target.value })}
                    placeholder="R+1, fondations spéciales, piscine…"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-1">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500" disabled={busy} onClick={submitStandalone}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Créer le chantier
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
