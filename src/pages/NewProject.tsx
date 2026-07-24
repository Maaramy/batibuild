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
  ArrowLeft,
  Upload,
  FileImage,
  FileText,
  Map,
  Pen,
  Ruler,
  Loader2,
  Check,
  X,
  Building2,
  ChevronRight,
  HardHat,
  Image,
  FileUp,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// Tunisian Regions
// ============================================================================

const TUNISIA_REGIONS = [
  { value: "tunis", label: "Tunis" },
  { value: "ariana", label: "Ariana" },
  { value: "ben_arous", label: "Ben Arous" },
  { value: "manouba", label: "Manouba" },
  { value: "nabeul", label: "Nabeul" },
  { value: "zaghouan", label: "Zaghouan" },
  { value: "bizerte", label: "Bizerte" },
  { value: "beja", label: "Béja" },
  { value: "jendouba", label: "Jendouba" },
  { value: "le_kef", label: "Le Kef" },
  { value: "siliana", label: "Siliana" },
  { value: "kairouan", label: "Kairouan" },
  { value: "kasserine", label: "Kasserine" },
  { value: "sidi_bouzid", label: "Sidi Bouzid" },
  { value: "sousse", label: "Sousse" },
  { value: "monastir", label: "Monastir" },
  { value: "mahdia", label: "Mahdia" },
  { value: "sfax", label: "Sfax" },
  { value: "gabes", label: "Gabès" },
  { value: "medenine", label: "Médenine" },
  { value: "tataouine", label: "Tataouine" },
  { value: "gafsa", label: "Gafsa" },
  { value: "tozeur", label: "Tozeur" },
  { value: "kebili", label: "Kébili" },
];

// ============================================================================
// Constants
// ============================================================================

const PROJECT_CATEGORIES = [
  { value: "maison", label: "Maison", icon: "🏠" },
  { value: "maison_r+1", label: "Maison R+1", icon: "🏗️" },
  { value: "villa", label: "Villa", icon: "🏡" },
  { value: "immeuble_residentiel", label: "Immeuble résidentiel", icon: "🏢" },
  { value: "piscine", label: "Piscine", icon: "🏊" },
  { value: "jardin", label: "Jardin", icon: "🌿" },
  { value: "amenagement_paysager", label: "Aménagement paysager", icon: "🌳" },
  { value: "garage", label: "Garage", icon: "🚗" },
  { value: "cloture", label: "Clôture", icon: "🪧" },
  { value: "terrasse", label: "Terrasse", icon: "☀️" },
  { value: "pergola", label: "Pergola", icon: "🏗️" },
  { value: "toiture", label: "Toiture", icon: "🔺" },
  { value: "extension_batiment", label: "Extension de bâtiment", icon: "🏘️" },
  { value: "entrepot", label: "Entrepôt", icon: "🏭" },
  { value: "local_commercial", label: "Local commercial", icon: "🏪" },
  { value: "bureau", label: "Bureau", icon: "💼" },
  { value: "renovation_interieure", label: "Rénovation intérieure", icon: "🔨" },
  { value: "renovation_salle_de_bain", label: "Rénovation salle de bain", icon: "🛁" },
  { value: "renovation_cuisine", label: "Rénovation cuisine", icon: "🍳" },
  { value: "renovation_facade", label: "Rénovation façade", icon: "🏛️" },
  { value: "installation_solaire", label: "Installation solaire", icon: "☀️" },
  { value: "systeme_irrigation", label: "Système d'irrigation", icon: "💧" },
  { value: "mosquee", label: "Mosquée", icon: "🕌" },
  { value: "ecole", label: "École", icon: "📚" },
  { value: "hotel", label: "Hôtel", icon: "🏨" },
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "cafe", label: "Café", icon: "☕" },
  { value: "ferme", label: "Ferme", icon: "🌾" },
  { value: "serre_agricole", label: "Serre agricole", icon: "🌱" },
  { value: "usine", label: "Usine", icon: "🏭" },
  { value: "parking", label: "Parking", icon: "🅿️" },
  { value: "route", label: "Route", icon: "🛣️" },
  { value: "trottoir", label: "Trottoir", icon: "🚶" },
  { value: "demolition", label: "Démolition", icon: "🏚️" },
  { value: "installations_sanitaires", label: "Installations sanitaires", icon: "🚿" },
  { value: "installations_electricite", label: "Installations électriques", icon: "⚡" },
];

const IMPORT_METHODS = [
  { id: "photo", icon: Image, label: "Photo du terrain", desc: "Prenez ou importez une photo" },
  { id: "satellite", icon: Map, label: "Image satellite", desc: "Capture satellite du site" },
  { id: "plan", icon: FileText, label: "Plan architectural", desc: "PDF, JPG, PNG, DWG" },
  { id: "sketch", icon: Pen, label: "Croquis dessiné", desc: "Dessin à main levée" },
  { id: "manual", icon: Ruler, label: "Saisie manuelle", desc: "Entrez les dimensions" },
];

// ============================================================================
// New Project Page
// ============================================================================

export default function NewProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"method" | "upload" | "form" | "analyzing" | "complete">("method");
  const [importMethod, setImportMethod] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [surface, setSurface] = useState("");
  const [floors, setFloors] = useState("1");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProject = useMutation(api.projects.createProject);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles].slice(0, 5));
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
    if (!projectName || !selectedCategory) return;
    setAnalyzing(true);
    setStep("analyzing");

    // Simulate analysis progress
    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      const projectId = await createProject({
        name: projectName,
        category: selectedCategory as any,
        description: description || undefined,
        region: (region || undefined) as any,
        surface: surface ? parseFloat(surface) : undefined,
        floors: floors ? parseInt(floors) : undefined,
        manualInput: {
          surface: surface ? parseFloat(surface) : undefined,
          floors: floors ? parseInt(floors) : undefined,
          description: description || undefined,
        },
      });

      // Run simulation
      await simulateAnalysis({ projectId });

      clearInterval(interval);
      setAnalysisProgress(100);
      setTimeout(() => {
        setStep("complete");
        setTimeout(() => {
          navigate(`/dashboard/project/${projectId}`);
        }, 1500);
      }, 500);
    } catch (error) {
      clearInterval(interval);
      console.error("Error creating project:", error);
      setAnalyzing(false);
    }
  };

  const handleMethodSelect = (methodId: string) => {
    setImportMethod(methodId);
    if (methodId === "manual") {
      setStep("form");
    } else {
      setStep("upload");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-3 sm:px-6 flex items-center h-14 sm:h-16">
          <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 shrink-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Retour</span>
          </Button>
          <div className="ml-2 sm:ml-4 flex items-center gap-2">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HardHat className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </div>
            <span className="font-semibold text-xs sm:text-sm">Nouveau projet</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-3 sm:px-6 py-4 sm:py-8">
        {/* Progress steps */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2">
          {[
            { label: "Méthode", key: "method" },
            { label: "Import", key: "upload" },
            { label: "Détails", key: "form" },
            { label: "Analyse", key: "analyzing" },
          ].map((s, i) => {
            const stepOrder = ["method", "upload", "form", "analyzing", "complete"];
            const currentIdx = stepOrder.indexOf(step);
            const stepIdx = stepOrder.indexOf(s.key);
            const isActive = stepIdx === currentIdx;
            const isDone = stepIdx < currentIdx;
            
            return (
              <div key={s.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[10px] sm:text-xs font-medium transition-all ${
                  isDone ? "bg-primary text-primary-foreground" :
                  isActive ? "bg-primary/10 text-primary border border-primary/30" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="h-3 sm:h-3.5 w-3 sm:w-3.5" /> : i + 1}
                </div>
                <span className={`text-[10px] sm:text-xs ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < 3 && <div className={`w-4 sm:w-8 h-px ${isDone ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step: Choose Method */}
          {step === "method" && (
            <motion.div
              key="method"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Comment souhaitez-vous importer votre projet ?</h1>
                <p className="mt-2 text-muted-foreground">Choisissez la méthode qui vous convient</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {IMPORT_METHODS.map((method) => (
                  <Card key={method.id}
                    className="group cursor-pointer border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 bg-background/50 backdrop-blur-sm"
                    onClick={() => handleMethodSelect(method.id)}
                  >
                    <CardContent className="p-3 sm:p-5 text-center">
                      <div className="mx-auto mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                        <method.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">{method.label}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">{method.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step: Upload Files */}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Importez vos fichiers</h1>
                <p className="mt-2 text-muted-foreground">Glissez-déposez ou sélectionnez vos fichiers</p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.dwg"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                  <FileUp className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium">
                  {dragOver ? "Déposez vos fichiers ici" : "Glissez-déposez vos fichiers ici"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ou cliquez pour parcourir
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Photos, PDF, PNG, JPG, DWG (max 5 fichiers)
                </p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 text-primary">
                          {file.type.startsWith("image/") ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFile(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between gap-3">
                <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 h-9" onClick={() => setStep("method")}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
                <Button size="sm" className="gap-1 sm:gap-1.5 h-9" onClick={() => setStep("form")} disabled={files.length === 0 && importMethod !== "manual"}>
                  Continuer
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Project Details Form */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Détails du projet</h1>
                <p className="mt-2 text-muted-foreground">Complétez les informations de votre projet</p>
              </div>

              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-sm sm:text-base">Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-2 sm:pt-4">
                  <div>
                    <Label htmlFor="projectName">Nom du projet *</Label>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="ex: Villa à Carthage"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Type de projet *</Label>
                    <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {PROJECT_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setSelectedCategory(cat.value)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all ${
                            selectedCategory === cat.value
                              ? "border-primary bg-primary/5 text-primary font-medium"
                              : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          }`}
                        >
                          <span className="text-base">{cat.icon}</span>
                          <span className="truncate">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="region">Région (Gouvernorat)</Label>
                    <div className="mt-1.5 relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <select
                        id="region"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="h-10 w-full rounded-lg border border-border/50 bg-background pl-9 pr-3 text-sm appearance-none focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="">Sélectionnez une région</option>
                        {TUNISIA_REGIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none rotate-90" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description du projet</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez brièvement votre projet..."
                      className="mt-1.5 min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                  <CardTitle className="text-sm sm:text-base">Surface</CardTitle>
                  <CardDescription className="text-xs">Optionnel - l'IA peut estimer la surface à partir des fichiers importés</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <Label htmlFor="surface">Surface (m²)</Label>
                      <Input
                        id="surface"
                        type="number"
                        value={surface}
                        onChange={(e) => setSurface(e.target.value)}
                        placeholder="ex: 200"
                        className="mt-1.5"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Label htmlFor="floors">Nombre d'étages</Label>
                      <Input
                        id="floors"
                        type="number"
                        value={floors}
                        onChange={(e) => setFloors(e.target.value)}
                        min="0"
                        max="20"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between gap-3">
                <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 h-9" onClick={() => setStep(importMethod === "manual" ? "method" : "upload")}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
                <Button size="sm" className="gap-1 sm:gap-1.5 h-9" onClick={handleStartAnalysis} disabled={!projectName || !selectedCategory || analyzing}>
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Lancer l'analyse IA</span>
                      <span className="sm:hidden">Analyser</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Analyzing */}
          {step === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Analyse en cours</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Notre IA analyse votre projet, identifie le type de construction, 
                calcule les surfaces et estime les coûts selon les prix du marché tunisien...
              </p>
              
              <div className="max-w-md mx-auto space-y-4">
                <Progress value={analysisProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Analyse des documents</span>
                  <span>{Math.round(analysisProgress)}%</span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {analysisProgress > 20 && <p className="flex items-center gap-2 justify-center"><Check className="h-3 w-3 text-emerald-500" /> Documents chargés</p>}
                  {analysisProgress > 40 && <p className="flex items-center gap-2 justify-center"><Check className="h-3 w-3 text-emerald-500" /> Type de projet identifié</p>}
                  {analysisProgress > 60 && <p className="flex items-center gap-2 justify-center"><Check className="h-3 w-3 text-emerald-500" /> Dimensions calculées</p>}
                  {analysisProgress > 80 && <p className="flex items-center gap-2 justify-center"><Check className="h-3 w-3 text-emerald-500" /> Coûts estimés</p>}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step: Complete */}
          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Analyse terminée !</h2>
              <p className="text-muted-foreground">Redirection vers le rapport...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
