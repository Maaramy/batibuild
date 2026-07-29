import { motion } from "framer-motion";
import { Mail, MapPin, Building2, HardHat, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { usePageSEO } from "@/hooks/use-page-seo";

export default function ContactPage() {
  usePageSEO({ title: "Contact - BudgetBati", description: "Contactez l'équipe BudgetBati pour vos projets de construction en Tunisie." });
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <HardHat className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold">BudgetBati</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-4">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            GALISKON PROJECT
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Contactez-nous
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Une question, un projet ? Notre équipe est à votre écoute.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Rania Marzougui */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="group rounded-xl border border-border/50 bg-card p-6 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                <span className="text-base font-bold">RM</span>
              </div>
              <div>
                <h3 className="font-semibold">Rania Marzougui</h3>
                <p className="text-xs text-muted-foreground">Responsable Commerciale</p>
              </div>
            </div>
            <a
              href="mailto:Rania.marzougui@budgetbati.com"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group-hover:translate-x-0.5 transition-transform"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">Rania.marzougui@budgetbati.com</span>
            </a>
          </motion.div>

          {/* Maatougui Rami */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="group rounded-xl border border-border/50 bg-card p-6 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                <span className="text-base font-bold">MR</span>
              </div>
              <div>
                <h3 className="font-semibold">Maatougui Rami</h3>
                <p className="text-xs text-muted-foreground">CEO - Fondateur</p>
              </div>
            </div>
            <a
              href="mailto:rami.maatougui@budgetbati.com"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group-hover:translate-x-0.5 transition-transform"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">rami.maatougui@budgetbati.com</span>
            </a>
          </motion.div>

          {/* Maatougui Seifeddine */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="group rounded-xl border border-border/50 bg-card p-6 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-emerald-600">
                <span className="text-base font-bold">MS</span>
              </div>
              <div>
                <h3 className="font-semibold">Maatougui Seifeddine</h3>
                <p className="text-xs text-muted-foreground">Consultant &amp; Directeur régional (SAFI)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">Safi, Tunisie</span>
            </div>
            <a
              href="mailto:Maatougui.Seifeddine@budgetbati.com"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-2 group-hover:translate-x-0.5 transition-transform"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">Maatougui.Seifeddine@budgetbati.com</span>
            </a>
          </motion.div>

          {/* Marzougui Riadh */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="group rounded-xl border border-border/50 bg-card p-6 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/5 text-amber-600">
                <span className="text-base font-bold">MR</span>
              </div>
              <div>
                <h3 className="font-semibold">Marzougui Riadh</h3>
                <p className="text-xs text-muted-foreground">Architecte (Expert Conseiller)</p>
              </div>
            </div>
            <a
              href="mailto:Riadh.marzougui@budgetbati.com"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group-hover:translate-x-0.5 transition-transform"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">Riadh.marzougui@budgetbati.com</span>
            </a>
          </motion.div>
        </div>

        {/* Company Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 max-w-3xl mx-auto"
        >
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/[0.03] to-background p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">GALISKON PROJECT</h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Estimation de projets de construction par Intelligence Artificielle — Prix Tunisie 2026
            </p>
          </div>
        </motion.div>

        {/* Back CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-10 text-center"
        >
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
