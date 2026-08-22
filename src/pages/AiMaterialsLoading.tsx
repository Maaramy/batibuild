import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";

export default function AiMaterialsLoading() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get("analysisId");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = [
      { target: 30, delay: 100 },
      { target: 60, delay: 1200 },
      { target: 90, delay: 2200 },
      { target: 100, delay: 2800 },
    ];

    steps.forEach(({ target, delay }) => {
      setTimeout(() => setProgress(target), delay);
    });

    // Redirect to results after 3 seconds
    const timer = setTimeout(() => {
      if (analysisId) {
        navigate(`/dashboard/ai-materials/results/${analysisId}`, { replace: true });
      } else {
        navigate("/dashboard/ai-materials", { replace: true });
      }
    }, 3200);

    return () => clearTimeout(timer);
  }, [analysisId, navigate]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-6 text-center space-y-8">
        {/* Animated icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative mx-auto"
        >
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 -m-4 rounded-full border-2 border-primary/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          {/* Inner icon */}
          <div className="relative flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-9 w-9 text-primary" />
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </motion.div>
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-lg font-bold">Analyse IA en cours</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Calcul des recommandations de matériaux
            <br />
            selon votre projet et budget...
          </p>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-2"
        >
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {progress < 30 && "Analyse du contexte..."}
            {progress >= 30 && progress < 60 && "Calcul des prix unitaires..."}
            {progress >= 60 && progress < 90 && "Recommandations IA..."}
            {progress >= 90 && "Finalisation..."}
          </p>
        </motion.div>

        {/* Floating dots */}
        <div className="flex justify-center gap-1.5 pt-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary/40"
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
