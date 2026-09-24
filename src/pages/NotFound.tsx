import { motion } from "framer-motion";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Compass, HardHat, Home, Search } from "lucide-react";

export default function NotFound() {
  usePageSEO({ title: "404 - Page non trouvée - batibuild", description: "La page que vous cherchez n'existe pas." });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl mx-auto">
          {/* Hero card — dégradé vertical foncé + motif pointillé */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-800 to-green-900 text-white shadow-soft-lg"
          >
            <div className="dotted-watermark absolute inset-0" />
            <div className="relative px-6 py-12 sm:px-12 sm:py-16 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
                <Search className="h-3 w-3" />
                Page introuvable
              </span>
              <h1 className="mt-5 text-6xl sm:text-7xl font-black tracking-tight">
                4<span className="text-amber-300">0</span>4
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/85 max-w-md mx-auto leading-relaxed">
                Cette page n'existe pas ou a été déplacée. Le chantier continue ailleurs —
                retournez à votre tableau de bord pour retrouver vos projets.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <Button
                  onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
                  className="btn-gradient h-10 gap-2 px-5 text-xs sm:text-sm text-white"
                >
                  <Home className="h-4 w-4" />
                  {isAuthenticated ? "Retour au tableau de bord" : "Accueil"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate(-1)}
                  className="h-10 gap-2 px-5 text-xs sm:text-sm text-white/90 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Page précédente
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Liens rapides */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          >
            {[
              { icon: HardHat, label: "Nouveau projet", desc: "Estimer un chantier", to: "/dashboard/new" },
              { icon: Compass, label: "Prix matériaux", desc: "Marché tunisien 2026", to: "/dashboard/materials" },
              { icon: Home, label: "Mes projets", desc: "Historique & devis", to: "/dashboard" },
            ].map((l) => (
              <button
                key={l.label}
                onClick={() => navigate(l.to)}
                className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3.5 text-left transition-all hover:border-primary/30 hover:shadow-soft cursor-pointer active:scale-[0.98]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary transition-transform group-hover:scale-105">
                  <l.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{l.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{l.desc}</p>
                </div>
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
