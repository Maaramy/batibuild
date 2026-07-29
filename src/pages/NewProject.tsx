import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Upload, FileImage, FileText, Map, Pen, Ruler,
  Loader2, Check, X, Building2, ChevronRight, HardHat, Image,
  FileUp, MapPin, AlertCircle, Asterisk, Crown, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function NewProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"method" | "upload" | "form" | "analyzing" | "complete">("method");
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

  const handleStartAnalysis = async () => {
    if (!validateForm()) return;
    setAnalyzing(true);
    setStep("analyzing");

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
        setStep("complete");
        setTimeout(() => navigate(`/dashboard/project/${projectId}`), 1500);
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

  const handleMethodSelect = (methodId: string) => {
    setImportMethod(methodId);
    setStep(methodId === "manual" ? "form" : "upload");
  };

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

      <header className="sticky top-0 z-20 border-b border-border/20 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-3 sm:px-6 flex items-center h-12 sm:h-14">
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

      <div className="mx-auto max-w-3xl px-3 sm:px-6 py-4 sm:py-8 space-y-6">
        {/* Steps */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto pb-2">
          {[
            { label: "Méthode", key: "method" },
            { label: "Fichiers", key: "upload" },
            { label: "Détails", key: "form" },
            { label: "Analyse", key: "analyzing" },
          ].map((s, i) => {
            const order = ["method","upload","form","analyzing","complete"];
            const cur = order.indexOf(step);
            const idx = order.indexOf(s.key);
            const done = idx < cur;
            const active = idx === cur;
            return (
              <div key={s.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium ${
                  done ? "bg-primary text-primary-foreground" :
                  active ? "bg-primary/10 text-primary border border-primary/30" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className={`text-[10px] sm:text-xs ${active ? "font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                {i < 3 && <div className={`w-4 sm:w-8 h-px ${done ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step: Method */}
          {step === "method" && (
            <motion.div key="method" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-bold">Comment importer votre projet ?</h1>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">Choisissez la méthode</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                {IMPORT_METHODS.map((method) => (
                  <button key={method.id} onClick={() => handleMethodSelect(method.id)}
                    className="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 active:scale-[0.98]">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                      <method.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold">{method.label}</span>
                    <span className="text-[10px] text-muted-foreground text-center">{method.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step: Upload */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold">Importez vos fichiers</h1>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Glissez-déposez ou sélectionnez</p>
              </div>
              <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  dragOver ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30 hover:bg-muted/20"
                }`}>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.dwg" className="hidden" onChange={handleFileSelect} />
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                  <FileUp className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">{dragOver ? "Déposez ici" : "Glissez-déposez vos fichiers"}</p>
                <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir</p>
                <p className="text-xs text-muted-foreground mt-2">Photos, PDF, PNG, JPG, DWG (max 5)</p>
              </div>
              {files.length > 0 && (
                <div className="space-y-1.5 mt-4">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/30">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                          {file.type.startsWith("image/") ? <Image className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate max-w-[180px]">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between gap-3 mt-6">
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setStep("method")}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour
                </Button>
                <Button size="sm" className="h-9 text-xs" onClick={() => setStep("form")} disabled={files.length === 0}>
                  Continuer <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Form */}
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold">Détails du projet</h1>

              </div>

              <div className="space-y-4">
                {/* Nom */}
                <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                  <Label htmlFor="projectName" className="text-xs sm:text-sm font-semibold">
                    Nom du projet <span className="text-primary">*</span>
                  </Label>
                  <Input id="projectName" value={projectName} onChange={(e) => { setProjectName(e.target.value); setErrors((e) => ({...e, name: ''})); }}
                    placeholder="ex: Villa à Carthage" className="mt-1.5 h-9 sm:h-10 text-xs sm:text-sm" />
                  {errors.name && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                </div>

                {/* Catégorie */}
                <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                  <Label className="text-xs sm:text-sm font-semibold">
                    Type de projet <span className="text-primary">*</span>
                  </Label>
                  <div className="mt-1.5 grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                    {PROJECT_CATEGORIES.map((cat) => (
                      <button key={cat.value} type="button" onClick={() => { setSelectedCategory(cat.value); setErrors((e) => ({...e, category: ''})); }}
                        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-[10px] sm:text-xs border transition-all ${
                          selectedCategory === cat.value
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}>
                        <span className="text-xs">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  {errors.category && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.category}</p>}
                </div>

                {/* Région + Surface */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                    <Label htmlFor="region" className="text-xs sm:text-sm font-semibold">
                      Région <span className="text-primary">*</span>
                    </Label>
                    <div className="mt-1.5 relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <select id="region" value={region} onChange={(e) => { setRegion(e.target.value); setErrors((e) => ({...e, region: ''})); }}
                        className="h-9 sm:h-10 w-full rounded-lg border border-border/40 bg-background pl-9 pr-3 text-xs sm:text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                        <option value="">Sélectionnez...</option>
                        {TUNISIA_REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none rotate-90" />
                    </div>
                    {errors.region && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.region}</p>}
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                    <Label htmlFor="surface" className="text-xs sm:text-sm font-semibold">
                      Surface couverte (m²) <span className="text-primary">*</span>
                    </Label>
                    <div className="mt-1.5 relative">
                      <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input id="surface" type="number" value={surface} onChange={(e) => { setSurface(e.target.value); setErrors((e) => ({...e, surface: ''})); }}
                        placeholder="ex: 150" min="1" className="pl-9 h-9 sm:h-10 text-xs sm:text-sm" />
                    </div>
                    {errors.surface && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.surface}</p>}
                  </div>
                </div>

                {/* Étages + Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30">
                    <Label htmlFor="floors" className="text-xs sm:text-sm font-semibold">Nombre d'étages</Label>
                    <div className="mt-1.5 relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input id="floors" type="number" value={floors} onChange={(e) => setFloors(e.target.value)}
                        min="0" max="20" className="pl-9 h-9 sm:h-10 text-xs sm:text-sm" />
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/30 sm:col-span-2">
                    <Label htmlFor="description" className="text-xs sm:text-sm font-semibold">Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez votre projet..." className="mt-1.5 min-h-[60px] text-xs sm:text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setStep(importMethod === "manual" ? "method" : "upload")}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour
                </Button>
                <Button size="sm" className="h-9 text-xs gap-1.5" onClick={handleStartAnalysis} disabled={analyzing}>
                  {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {analyzing ? "Analyse..." : "Lancer l'estimation"}
                  {!analyzing && <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Analyzing */}
          {step === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <h2 className="text-lg font-bold mb-2">Analyse en cours</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Calcul de l'estimation selon les prix du marché tunisien 2026...
              </p>
              <div className="max-w-sm mx-auto">
                <Progress value={analysisProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">{Math.round(analysisProgress)}%</p>
              </div>
            </motion.div>
          )}

          {/* Step: Complete */}
          {step === "complete" && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-7 w-7 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold">Analyse terminée !</h2>
              <p className="text-xs text-muted-foreground mt-1">Redirection vers le rapport...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
