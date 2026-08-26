import { motion } from "framer-motion";
import {
  Bot,
  Building2,
  Check,
  Cpu,
  Download,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Percent,
  Ruler,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";

const MOCK_FORECAST_BARS = [18, 26, 34, 42, 51, 60, 70, 81, 92, 100];

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

export function MockInvestProcessPanel() {
  return (
    <div className="space-y-4">
      {/* Score + rentabilité */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 bg-gradient-to-br from-indigo-500 to-blue-600 p-3.5 text-white shadow-lg shadow-indigo-500/20">
          <p className="text-[9px] uppercase tracking-widest text-indigo-100/80">Score IA</p>
          <p className="mt-1 text-2xl font-black">78<span className="text-xs font-semibold text-indigo-100">/100</span></p>
          <p className="mt-0.5 text-[10px] text-indigo-100/80">Projet rentable</p>
        </div>
        <div className="rounded-xl border border-border/30 bg-background/70 p-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Rendement net</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">7,4%</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Flux annuel positif</p>
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Budget", value: "185 000 TND" },
          { label: "Loyer/mois", value: "1 350 TND" },
          { label: "ROI 10 ans", value: "142%" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border/30 bg-background/60 px-2.5 py-2 text-center">
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
            <p className="mt-0.5 text-xs font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Barre de progression rentabilité */}
      <div className="rounded-xl border border-border/30 bg-background/70 p-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px]">
          <span className="font-medium text-muted-foreground">Flux de trésorerie cumulés</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">+ 96 500 TND</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "68%" }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          <span>Année 1</span>
          <span>Année 10</span>
        </div>
      </div>

      {/* Scénarios */}
      <div className="flex flex-wrap gap-1.5">
        {["Optimiste +9,1%", "Prudent +5,2%", "Meilleure zone : La Marsa"].map((chip) => (
          <span key={chip} className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MockInvestmentScreen() {
  return (
    <div className="space-y-4">
      {/* Score IA card */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 p-3.5">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
              <circle cx="28" cy="28" r="23" fill="none" strokeWidth="5" className="stroke-muted/40" />
              <circle
                cx="28" cy="28" r="23" fill="none" strokeWidth="5" strokeLinecap="round"
                stroke="#6366f1" strokeDasharray={144.5} strokeDashoffset={144.5 * (1 - 0.94)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold">94</div>
          </div>
          <div>
            <div className="text-xs font-semibold">Score IA</div>
            <div className="text-[10px] text-muted-foreground">Excellent investissement</div>
            <div className="mt-1 flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              Confiance IA 92%
            </div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Appartement</div>
          <div className="text-xs font-bold">La Marsa</div>
          <div className="text-[9px] text-muted-foreground">Tunis</div>
        </div>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Rendement net", value: "6,2%", color: "text-emerald-600 dark:text-emerald-400", icon: Percent },
          { label: "Flux de trésorerie", value: "+980 TND", color: "text-blue-600 dark:text-blue-400", icon: Wallet },
          { label: "Return on Investment 10 ans", value: "82%", color: "text-indigo-600 dark:text-indigo-400", icon: TrendingUp },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-border/20 bg-background/50 p-2.5 text-center">
            <kpi.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${kpi.color}`} />
            <div className={`text-xs font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[8px] text-muted-foreground truncate">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Forecast chart */}
      <div className="rounded-lg border border-border/20 bg-background/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-muted-foreground">Prévisions des bénéfices (10 ans)</span>
          <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold">+428 000 TND</span>
        </div>
        <div className="flex items-end gap-1.5 h-20">
          {MOCK_FORECAST_BARS.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: "easeOut" }}
              className={`flex-1 rounded-t ${i === 9 ? "bg-gradient-to-t from-indigo-600 to-blue-500" : "bg-indigo-500/25 dark:bg-indigo-400/25"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[8px] text-muted-foreground/60">
          <span>An 1</span>
          <span>An 3</span>
          <span>An 5</span>
          <span>An 10</span>
        </div>
      </div>

      {/* Assistant chip */}
      <div className="flex items-center gap-2 rounded-lg border border-indigo-200/40 dark:border-indigo-800/30 bg-indigo-500/5 px-3 py-2">
        <Bot className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
        <span className="text-[10px] text-muted-foreground">
          Assistant IA : <span className="font-medium text-foreground">« Cet investissement est-il rentable ? »</span>
        </span>
      </div>
    </div>
  );
}
