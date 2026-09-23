/**
 * Carte « Copilote AI » du Dashboard — module INDÉPENDANT ajouté au Dashboard
 * existant (aucun composant existant n'est modifié ni remplacé).
 *
 * Affiche le projet actuellement sélectionné et permet d'ouvrir le Copilote.
 * Sans projet sélectionné : « Sélectionnez un projet pour utiliser le
 * Copilote AI. » + bouton « Sélectionner un projet ».
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Bot, ArrowUpRight, FolderOpen, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSelectedProject, projectDisplayLabel } from "@/hooks/use-selected-project";

export default function CopilotCard() {
  const navigate = useNavigate();
  const { projects, selectedProject, selectProject } = useSelectedProject();
  const [picking, setPicking] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
    >
      <Card className="border border-border/40 bg-background/50 backdrop-blur-sm shadow-none overflow-hidden">
        <CardContent className="p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Identité du module */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base lg:text-lg font-semibold">🤖 Copilote AI</span>
                </div>
                <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">
                  Votre assistant intelligent de projet
                </p>
              </div>
            </div>

            {/* Projet sélectionné + action */}
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0">
              {selectedProject ? (
                <>
                  <div className="text-left sm:text-right">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-muted-foreground">
                      Projet sélectionné
                    </p>
                    <p className="text-xs sm:text-sm font-medium truncate max-w-[240px]">
                      {projectDisplayLabel(selectedProject)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 gap-1 text-xs sm:text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25 hover:from-violet-500 hover:to-indigo-500"
                    onClick={() =>
                      navigate(`/dashboard/copilot?project=${encodeURIComponent(selectedProject._id)}`)
                    }
                  >
                    Ouvrir le Copilote
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Sélectionnez un projet pour utiliser le Copilote AI.
                  </p>
                  {projects.length === 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      onClick={() => navigate("/dashboard/new")}
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Nouveau projet
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      onClick={() => setPicking((v) => !v)}
                    >
                      Sélectionner un projet
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${picking ? "rotate-180" : ""}`} />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Liste de sélection (affichée à la demande) */}
          {picking && !selectedProject && projects.length > 0 && (
            <div className="mt-3 rounded-lg border border-border/40 divide-y divide-border/30 max-h-48 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => {
                    selectProject(p._id);
                    setPicking(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs sm:text-sm hover:bg-violet-500/[0.06] transition-colors"
                >
                  <span className="truncate">{projectDisplayLabel(p)}</span>
                  <Check className="h-3.5 w-3.5 opacity-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
