import { motion } from "framer-motion";
import {
  Building2,
  Check,
  Cpu,
  Download,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Ruler,
  Sparkles,
  Upload,
} from "lucide-react";

export function MockImportScreen() {
  return (
    <div className="space-y-4">
      {/* Project type selector */}
      <div className="flex gap-2 flex-wrap">
        {["Maison", "Villa", "Appartement", "Piscine"].map((t) => (
          <div
            key={t}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
              t === "Maison"
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-300"
                : "border-border/40 text-muted-foreground hover:border-border/70"
            }`}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Main input area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Upload zone */}
        <div className="rounded-xl border-2 border-dashed border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20 p-4 text-center">
          <Upload className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <div className="text-xs font-medium text-foreground mb-1">Importez vos documents</div>
          <div className="text-[10px] text-muted-foreground">Photo, plan PDF, image satellite</div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-[10px] text-blue-600">
            <Check className="h-3 w-3" />
            Plan_maison.pdf
          </div>
        </div>

        {/* Manual input */}
        <div className="space-y-2">
          <div className="rounded-lg border border-border/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium">Région</span>
            </div>
            <div className="rounded-md border border-border/30 bg-background px-3 py-2 text-xs text-foreground">
              Tunis
            </div>
          </div>
          <div className="rounded-lg border border-border/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium">Surface (m²)</span>
            </div>
            <div className="rounded-md border border-border/30 bg-background px-3 py-2 text-xs text-foreground">
              150
            </div>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-xs font-medium text-white shadow-sm">
          <Cpu className="h-3.5 w-3.5" />
          Analyser mon projet
        </div>
      </div>
    </div>
  );
}

export function MockAnalysisScreen() {
  return (
    <div className="space-y-4">
      {/* Analysis progress */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold">Analyse en cours...</div>
          <div className="text-[10px] text-muted-foreground">Reconnaissance du projet par l'IA</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "easeInOut" }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
        />
      </div>

      {/* Detection results appearing */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Type de projet", value: "Maison à étage", icon: Building2, done: true },
          { label: "Surface détectée", value: "150 m²", icon: Ruler, done: true },
          { label: "Matériaux", value: "24 identifiés", icon: Layers, done: true },
          { label: "Qualité", value: "Standard", icon: Sparkles, done: true },
        ].map((item) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-violet-200/40 dark:border-violet-800/30 bg-background/60 p-2.5"
          >
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
              <item.icon className="h-3 w-3 text-violet-500" />
              {item.label}
            </div>
            <div className="text-xs font-semibold">{item.value}</div>
          </motion.div>
        ))}
      </div>

      {/* IA badge */}
      <div className="flex items-center gap-2 rounded-lg bg-violet-500/5 border border-violet-200/40 dark:border-violet-800/30 px-3 py-2">
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        <span className="text-[10px] text-muted-foreground">
          IA : <span className="font-medium text-foreground">Projet détecté avec 92% de confiance</span>
        </span>
      </div>
    </div>
  );
}

export function MockReportScreen() {
  return (
    <div className="space-y-4">
      {/* Total card */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:border-emerald-800/30 p-4 text-center">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Coût total estimé</div>
        <div className="text-2xl sm:text-3xl font-bold gradient-text mt-0.5">253 590 TND</div>
        <div className="text-[10px] text-muted-foreground">Marché tunisien 2026 • Prix TTC</div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Gros œuvre", pct: 38, color: "bg-blue-500" },
          { label: "Second œuvre", pct: 29, color: "bg-violet-500" },
          { label: "Équipements", pct: 15, color: "bg-emerald-500" },
        ].map((cat) => (
          <div key={cat.label} className="rounded-lg border border-border/20 bg-background/40 p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className={`h-2 w-2 rounded-full ${cat.color}`} />
              <span className="text-[10px] text-muted-foreground">{cat.pct}%</span>
            </div>
            <div className="text-[9px] font-medium truncate">{cat.label}</div>
          </div>
        ))}
      </div>

      {/* Scenarios */}
      <div className="flex gap-2">
        {[
          { label: "Économique", value: "163 590 TND", active: false },
          { label: "Standard", value: "253 590 TND", active: true },
          { label: "Premium", value: "398 475 TND", active: false },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex-1 rounded-lg border p-2 text-center transition-all ${
              s.active ? "border-primary bg-primary/5" : "border-border/20 bg-background/40 opacity-70"
            }`}
          >
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
            <div className={`text-[10px] font-semibold ${s.active ? "text-primary" : ""}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-background/40 px-3 py-2 text-[10px] text-muted-foreground">
          <Download className="h-3.5 w-3.5" />
          Télécharger PDF
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-[10px] font-medium text-white shadow-sm">
          <FileText className="h-3.5 w-3.5" />
          Voir le rapport
        </div>
      </div>
    </div>
  );
}





