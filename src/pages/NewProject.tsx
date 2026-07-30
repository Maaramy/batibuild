import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Upload, FileImage, FileText, Map, Pen, Ruler,
  Loader2, Check, X, Building2, ChevronRight, HardHat, Image,
  FileUp, MapPin, AlertCircle, Asterisk, Crown, AlertTriangle,
  CircleDot, CircleDashed, CircleCheck, Circle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const TUNISIA_REGIONS = [
  { value: "tunis", label: "Tunis" }, { value: "ariana", label: "Ariana" },
  { value: "ben_arous", label: "Ben Arous" }, { value: "manouba", label: "Manouba" },
  { value: "nabeul", label: "Nabeul" }, { value: "zaghouan", label: "Zaghouan" },
  { value: "bizerte", label: "Bizerte" }, { value: "beja", label: "Béja" },
  { value: "jendouba", label: "Jendouba" }, { value: "le_kef", label: "Le Kef" },
  { value: "siliana", label: "Siliana" }, { value: "kairouan", label: "Kairouan" },
  { value: "kasserine", label: "Kasserine" }, { value: "sidi_bouzid", label: "Sidi Bouzid" },
  { value: "sousse", label: "Sousse" }, { value: "monastir", label: "Monastir" },
  { value: "mahdia", label: "Mahdia" }, { value: "sfax", label: "Sfax" },
  { value: "gabes", label: "Gabès" }, { value: "medenine", label: "Médenine" },
  { value: "tataouine", label: "Tataouine" }, { value: "gafsa", label: "Gafsa" },
  { value: "tozeur", label: "Tozeur" }, { value: "kebili", label: "Kébili" },
];

const PROJECT_CATEGORIES = [
  { value: "maison", label: "Maison", icon: "🏠" },
  { value: "villa", label: "Villa", icon: "🏡" },
  { value: "immeuble_residentiel", label: "Immeuble", icon: "🏢" },
  { value: "piscine", label: "Piscine", icon: "🏊" },
  { value: "jardin", label: "Jardin", icon: "🌿" },
  { value: "amenagement_paysager", label: "Paysager", icon: "🌳" },
  { value: "garage", label: "Garage", icon: "🚗" },
  { value: "cloture", label: "Clôture", icon: "🪧" },
  { value: "terrasse", label: "Terrasse", icon: "☀️" },
  { value: "pergola", label: "Pergola", icon: "🏗️" },
  { value: "toiture", label: "Toiture", icon: "🔺" },
  { value: "renovation_interieure", label: "Rénovation intérieure", icon: "🏠" },
  { value: "renovation_exterieure", label: "Rénovation extérieure", icon: "🏗️" },
  { value: "renovation_salle_de_bain", label: "Salle de bain", icon: "🛁" },
  { value: "renovation_cuisine", label: "Cuisine", icon: "🍳" },
  { value: "bureau", label: "Bureau", icon: "💼" },
  { value: "local_commercial", label: "Commerce", icon: "🏪" },
  { value: "entrepot", label: "Entrepôt", icon: "🏭" },
  { value: "installation_solaire", label: "Solaire", icon: "☀️" },
  { value: "mosquee", label: "Mosquée", icon: "🕌" },
  { value: "ecole", label: "École", icon: "📚" },
  { value: "hotel", label: "Hôtel", icon: "🏨" },
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "cafe", label: "Café", icon: "☕" },
  { value: "ferme", label: "Ferme", icon: "🌾" },
  { value: "usine", label: "Usine", icon: "🏭" },
  { value: "parking", label: "Parking", icon: "🅿️" },
  { value: "demolition", label: "Démolition", icon: "🏚️" },
];

const IMPORT_METHODS = [
  { id: "manual", icon: Ruler, label: "Manuelle", desc: "Saisie directe" },
  { id: "photo", icon: Image, label: "Photo", desc: "Importez une photo" },
  { id: "satellite", icon: Map, label: "Satellite", desc: "Image satellite" },
  { id: "plan", icon: FileText, label: "Plan", desc: "PDF, JPG, DWG" },
  { id: "sketch", icon: Pen, label: "Croquis", desc: "Dessin à main levée" },
];

// ─── VERTICAL STEPS CONFIG ──────────────────────────────────────────────────

const STEPS = [
  { key: "method",    label: "Méthode d'import",  desc: "Choisissez comment importer" },
  { key: "upload",    label: "Fichiers",           desc: "Ajoutez vos documents" },
  { key: "form",      label: "Détails du projet",  desc: "Complétez les informations" },
  { key: "analyzing", label: "Analyse IA",         desc: "Calcul de l'estimation" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

// ─── STEPPER COMPONENT ──────────────────────────────────────────────────────

function VerticalStepper({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: {
  steps: readonly typeof STEPS[number][];
  currentStep: StepKey;
  completedSteps: Set<StepKey>;
  onStepClick: (key: StepKey) => void;
}) {
  const order = steps.map((s) => s.key);
  const curIdx = order.indexOf(currentStep);

  // Which steps actually appear in the flow (skip upload if manual)
  const visibleSteps = steps.filter((s) => {
    // upload step can be conditionally hidden — but we keep it visible in stepper
    return true;
  });

  return (
    <nav className="flex flex-col gap-0" aria-label="Progression du projet">
      {visibleSteps.map((step, i) => {
        const idx = order.indexOf(step.key);
        const done = completedSteps.has(step.key);
        const active = step.key === currentStep;
        const future = !done && !active;
        const isLast = i === visibleSteps.length - 1;

        return (
          <div key={step.key} className="flex gap-3">
            {/* Left: Step Indicator */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => done && onStepClick(step.key)}
                disabled={!done && !active}
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                  done && "border-emerald-500 bg-emerald-500 cursor-pointer hover:shadow-md hover:shadow-emerald-500/20",
                  active && "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20",
                  future && "border-muted-foreground/25 bg-muted/10 text-muted-foreground/40",
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : active ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="h-2.5 w-2.5 rounded-full bg-primary"
                  />
                ) : (
                  <span className="text-[10px] font-semibold">{i + 1}</span>
                )}
              </button>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 h-10 sm:h-12 transition-colors duration-500",
                    done ? "bg-emerald-400" : "bg-border/40"
                  )}
                />
              )}
            </div>

            {/* Right: Step Info */}
            <div
              className={cn(
                "flex flex-col justify-start pb-6 sm:pb-7 transition-all duration-300 min-w-0",
                active && "translate-x-0",
                future && "opacity-40",
                done && "opacity-70 hover:opacity-100 cursor-pointer"
              )}
              onClick={() => done && onStepClick(step.key)}
            >
              <span
                className={cn(
                  "text-xs sm:text-sm font-semibold leading-tight transition-colors",
                  done && "text-emerald-600",
                  active && "text-foreground",
                  future && "text-muted-foreground/60"
                )}
              >
                {step.label}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground/60 mt-0.5 leading-tight">
                {active
                  ? step.desc
                  : done
                    ? "Terminé"
                    : "À venir"}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// ─── PAGE COMPONENT ─────────────────────────────────────────────────────────

export default function NewProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepKey>("method");
  const [importMethod, setImportMethod] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [surface, setSurface] = useState("");
  const [floors, setFloors] = useState("1");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [limitExceeded, setLimitExceeded] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProject = useMutation(api.projects.createProject);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);

  // Completed steps tracking
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());

  // Determine which steps are in the flow
  const hasUploadStep = importMethod !== "" && importMethod !== "manual";
  const visibleSteps = STEPS.filter((s) => s.key !== "upload" || hasUploadStep);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!projectName.trim()) errs.name = "Le nom du projet est requis";
    if (!selectedCategory) errs.category = "Sélectionnez un type de projet";
    if (!region) errs.region = "La région est requise";
    if (!surface || parseFloat(surface) <= 0) errs.surface = "La surface est requise";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)].slice(0, 5));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const markStepCompleted = (key: StepKey) => {
    setCompletedSteps((prev) => new Set(prev).add(key));
  };

  const goToStep = (key: StepKey) => {
    setStep(key);
  };

  const handleMethodSelect = (methodId: string) => {
    setImportMethod(methodId);
    markStepCompleted("method");
    if (methodId === "manual") {
      goToStep("form");
    } else {
      goToStep("upload");
    }
  };

  const handleUploadNext = () => {
    if (files.length > 0) {
      markStepCompleted("upload");
      goToStep("form");
    }
  };

  const handleStartAnalysis = async () => {
    if (!validateForm()) return;

    setAnalyzing(true);
    markStepCompleted("form");
    goToStep("analyzing");

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 95) { clearInterval(interval); return 95; }
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      const projectId = await createProject({
        name: projectName.trim(),
        category: selectedCategory as any,
        description: description || undefined,
        region: region ? (region as any) : undefined,
        surface: surface ? parseFloat(surface) : undefined,
        floors: floors ? parseInt(floors) : 1,
      });

      await simulateAnalysis({ projectId });

      clearInterval(interval);
      setAnalysisProgress(100);
      setTimeout(() => {
        markStepCompleted("analyzing");
        setTimeout(() => navigate(`/dashboard/project/${projectId}`), 800);
      }, 500);
    } catch (error: any) {
      clearInterval(interval);
      console.error("Error:", error);
      const msg = error?.message || error?.toString() || "";
      if (msg.includes("LIMITE_ATTEINTE")) {
        const userMsg = msg.replace("LIMITE_ATTEINTE:", "");
        setLimitExceeded(userMsg);
      } else {
        setErrors({ name: "Une erreur est survenue. Veuillez réessayer." });
      }
      setAnalyzing(false);
    }
  };

  // ─── RENDER CONTENT FOR CURRENT STEP ──────────────────────────────

  const renderStepContent = () => {
    return (
      <AnimatePresence mode="wait">
        {step === "method" && (
          <motion.div
            key="method"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold">Méthode d'import</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Comment souhaitez-vous importer votre projet&nbsp;?
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              {IMPORT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleMethodSelect(method.id)}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 active:scale-[0.97]",
                    importMethod === method.id
                      ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                      : "border-border/40 bg-card/30 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                  )}
                >
                  {/* Selected check badge */}
                  {importMethod === method.id && (
                    <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl transition-colors",
                      importMethod === method.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/5 text-primary group-hover:bg-primary/10"
                    )}
                  >
                    <method.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold">{method.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">
                    {method.desc}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold">Fichiers du projet</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Importez vos documents (photos, plans, PDF, DWG)
              </p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center cursor-pointer transition-all",
                dragOver
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border/40 hover:border-primary/30 hover:bg-muted/20"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.dwg"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                <FileUp className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">
                {dragOver ? "Déposez ici" : "Glissez-déposez vos fichiers"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir</p>
              <p className="text-xs text-muted-foreground mt-2">
                Photos, PDF, PNG, JPG, DWG (max 5)
              </p>
            </div>

            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5 mt-4"
              >
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                        {file.type.startsWith("image/") ? (
                          <Image className="h-3.5 w-3.5" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate max-w-[180px]">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}

            <div className="flex justify-between gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => goToStep("method")}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs"
                onClick={handleUploadNext}
                disabled={files.length === 0}
              >
                Continuer <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold">Détails du projet</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Complétez les informations pour l'estimation
              </p>
            </div>

            <div className="space-y-4">
              {/* Nom */}
              <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                <Label htmlFor="projectName" className="text-xs sm:text-sm font-semibold">
                  Nom du projet <span className="text-primary">*</span>
                </Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => { setProjectName(e.target.value); setErrors((e) => ({...e, name: ''})); }}
                  placeholder="ex: Villa à Carthage"
                  className="mt-1.5 h-9 sm:h-10 text-xs sm:text-sm"
                />
                {errors.name && (
                  <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{errors.name}
                  </p>
                )}
              </div>

              {/* Catégorie */}
              <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                <Label className="text-xs sm:text-sm font-semibold">
                  Type de projet <span className="text-primary">*</span>
                </Label>
                <div className="mt-1.5 grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                  {PROJECT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => { setSelectedCategory(cat.value); setErrors((e) => ({...e, category: ''})); }}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-2 rounded-lg text-[10px] sm:text-xs border transition-all",
                        selectedCategory === cat.value
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      <span className="text-xs">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
                {errors.category && (
                  <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{errors.category}
                  </p>
                )}
              </div>

              {/* Région + Surface */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                  <Label htmlFor="region" className="text-xs sm:text-sm font-semibold">
                    Région <span className="text-primary">*</span>
                  </Label>
                  <div className="mt-1.5 relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      id="region"
                      value={region}
                      onChange={(e) => { setRegion(e.target.value); setErrors((e) => ({...e, region: ''})); }}
                      className="h-9 sm:h-10 w-full rounded-lg border border-border/40 bg-background pl-9 pr-3 text-xs sm:text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="">Sélectionnez...</option>
                      {TUNISIA_REGIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none rotate-90" />
                  </div>
                  {errors.region && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors.region}
                    </p>
                  )}
                </div>

                <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                  <Label htmlFor="surface" className="text-xs sm:text-sm font-semibold">
                    Surface couverte (m²) <span className="text-primary">*</span>
                  </Label>
                  <div className="mt-1.5 relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="surface"
                      type="number"
                      value={surface}
                      onChange={(e) => { setSurface(e.target.value); setErrors((e) => ({...e, surface: ''})); }}
                      placeholder="ex: 150"
                      min="1"
                      className="pl-9 h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  {errors.surface && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors.surface}
                    </p>
                  )}
                </div>
              </div>

              {/* Étages + Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                  <Label htmlFor="floors" className="text-xs sm:text-sm font-semibold">
                    Nombre d'étages
                  </Label>
                  <div className="mt-1.5 relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="floors"
                      type="number"
                      value={floors}
                      onChange={(e) => setFloors(e.target.value)}
                      min="0"
                      max="20"
                      className="pl-9 h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30 sm:col-span-2">
                  <Label htmlFor="description" className="text-xs sm:text-sm font-semibold">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez votre projet..."
                    className="mt-1.5 min-h-[60px] text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => goToStep(hasUploadStep ? "upload" : "method")}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs gap-1.5"
                onClick={handleStartAnalysis}
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {analyzing ? "Analyse..." : "Lancer l'estimation"}
                {!analyzing && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-8 sm:py-12"
          >
            <div className="relative mb-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
              {/* Animated rings */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/20"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              />
            </div>

            <h2 className="text-lg sm:text-xl font-bold mb-2">Analyse en cours</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-sm text-center leading-relaxed">
              Notre moteur BIM calcule l'estimation selon les prix du marché tunisien 2026
            </p>

            <div className="w-full max-w-xs mx-auto space-y-2">
              <Progress value={analysisProgress} className="h-2.5" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">
                  {analysisProgress < 30 && "📐 Préparation des données..."}
                  {analysisProgress >= 30 && analysisProgress < 60 && "🧱 Calcul des matériaux..."}
                  {analysisProgress >= 60 && analysisProgress < 85 && "💰 Estimation des coûts..."}
                  {analysisProgress >= 85 && "✅ Finalisation du rapport..."}
                </span>
                <span className="text-xs font-semibold text-primary">
                  {Math.round(analysisProgress)}%
                </span>
              </div>
            </div>

            {analysisProgress === 100 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="flex items-center gap-2 text-emerald-600">
                  <CircleCheck className="h-5 w-5" />
                  <span className="text-sm font-medium">Rapport prêt !</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // ─── RENDER ─────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      {/* ── Limite atteinte Dialog ── */}
      <AnimatePresence>
        {limitExceeded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setLimitExceeded(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-border/40 bg-background p-6 shadow-2xl text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-7 w-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Limite atteinte</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                {limitExceeded}
              </p>
              <div className="flex flex-col gap-2.5">
                <Button
                  size="sm"
                  className="h-10 text-xs gap-2 w-full"
                  onClick={() => { navigate("/pricing"); }}
                >
                  <Crown className="h-4 w-4" />
                  Passer à l'offre Pro
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs w-full"
                  onClick={() => { setLimitExceeded(null); navigate("/dashboard"); }}
                >
                  Retour au tableau de bord
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-border/20 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-3 sm:px-6 flex items-center h-12 sm:h-14">
          <Button variant="ghost" size="sm" className="gap-1 h-8 shrink-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Retour</span>
          </Button>
          <div className="ml-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HardHat className="h-3 w-3" />
            </div>
            <span className="font-semibold text-xs sm:text-sm">Nouveau projet</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-12">
          
          {/* ── Vertical Steps Sidebar ── */}
          <aside className="md:w-56 lg:w-64 shrink-0">
            {/* Desktop: full vertical stepper */}
            <div className="hidden md:block sticky top-20">
              <VerticalStepper
                steps={STEPS}
                currentStep={step}
                completedSteps={completedSteps}
                onStepClick={goToStep}
              />
            </div>

            {/* Mobile: compact horizontal indicator */}
            <div className="md:hidden mb-4">
              <div className="flex items-center justify-between gap-0 overflow-x-auto pb-2">
                {STEPS.map((s, i) => {
                  const done = completedSteps.has(s.key as StepKey);
                  const active = s.key === step;
                  return (
                    <div key={s.key} className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => done && goToStep(s.key as StepKey)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-all",
                          done && "bg-emerald-500 text-white",
                          active && "bg-primary text-primary-foreground shadow-sm",
                          !done && !active && "bg-muted text-muted-foreground"
                        )}
                      >
                        {done ? <Check className="h-3 w-3" /> : i + 1}
                      </button>
                      {i < STEPS.length - 1 && (
                        <div className={cn(
                          "w-6 h-px",
                          done ? "bg-emerald-400" : "bg-border"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Mobile step label */}
              <p className="text-center text-[10px] font-medium text-muted-foreground mt-1">
                {STEPS.find((s) => s.key === step)?.label ?? ""}
              </p>
            </div>
          </aside>

          {/* ── Step Content ── */}
          <section className="flex-1 min-w-0">
            <div className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6 lg:p-8 shadow-sm">
              {renderStepContent()}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
