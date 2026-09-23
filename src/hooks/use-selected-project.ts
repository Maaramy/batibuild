/**
 * Sélection du projet courant — partagée entre la carte « Copilote AI » du
 * Dashboard et la page du Copilote.
 *
 * Priorité au chargement : paramètre `?project=` → projet mémorisé (localStorage)
 * → aucun (l'utilisateur choisit explicitement). Le changement de projet
 * rafraîchit le contexte, les recommandations ET l'historique de conversation
 * (chaque historique est stocké par projet côté Convex : jamais de mélange).
 */
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";

const STORAGE_KEY = "batibuild.copilot.projectId";

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useSelectedProject() {
  const projects: Doc<"projects">[] = useQuery(api.projects.getUserProjects, {}) ?? [];
  const [selectedId, setSelectedId] = useState<Id<"projects"> | null>(null);

  const isValid = useCallback(
    (id: string | null | undefined): id is Id<"projects"> =>
      !!id && projects.some((p) => p._id === id),
    [projects],
  );

  // Restaure la sélection (URL puis mémoire locale) — ne devine jamais un projet.
  useEffect(() => {
    if (selectedId && isValid(selectedId)) return;
    const fromUrl = new URLSearchParams(window.location.search).get("project");
    const next = isValid(fromUrl) ? fromUrl : isValid(readStored()) ? (readStored() as Id<"projects">) : null;
    setSelectedId(next);
  }, [projects, selectedId, isValid]);

  const selectProject = useCallback((id: Id<"projects">) => {
    setSelectedId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* stockage indisponible : la sélection reste valable pour la session */
    }
  }, []);

  const selectedProject = projects.find((p) => p._id === selectedId) ?? null;

  return {
    projects,
    selectedId: selectedProject ? (selectedId as Id<"projects">) : null,
    selectedProject,
    selectProject,
  };
}

/** Libellé « Nom — Ville/Région — 240 m² » (données réelles du projet). */
export function projectDisplayLabel(project: Doc<"projects"> | null): string {
  if (!project) return "";
  const p = project as Record<string, unknown>;
  const place = (p.city as string) || (p.region as string) || "";
  const surface = typeof p.surface === "number" ? ` — ${p.surface.toLocaleString("fr-FR")} m²` : "";
  return `${project.name || "Projet"}${place ? ` — ${place}` : ""}${surface}`;
}
