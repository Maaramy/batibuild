// ═══════════════════════════════════════════════════════════════════════════
// COPILOTE DU PROJET — abstraction `CopilotEngine`
// ───────────────────────────────────────────────────────────────────────────
// Le Copilote est un assistant de PROJET dont le moteur est interchangeable :
//
//   Dashboard / Project Journey
//            ↓
//      CopilotEngine            (cette abstraction)
//            ↓
//      RuleBasedCopilot         ← ACTIF aujourd'hui (calculs locaux + règles)
//      FutureAICopilot          ← emplacement réservé (aucun appel réseau tant
//                                 qu'aucun service IA n'est configuré)
//
// Aucune fonctionnalité existante n'est remplacée : les analyses restent
// produites par le moteur déterministe `aiCopilotEngine`. Brancher un
// véritable service IA plus tard ne demandera aucune reconstruction de
// l'interface utilisateur ni du Project Journey.
// ═══════════════════════════════════════════════════════════════════════════

import {
  analyzePreparation,
  buildContextDigest,
  routeQuestion,
  runCopilotAnalysis,
  type CopilotAnswer,
  type CopilotMode,
  type CopilotProjectContext,
} from "./aiCopilotEngine";

/** Moteur réellement utilisé — tracé sans jamais prétendre à une IA absente. */
export type CopilotEngineKind = "rule-based" | "ai";

export type CopilotEngineInput = {
  question: string;
  context: CopilotProjectContext;
  mode?: CopilotMode;
};

export type CopilotEngineResult = CopilotAnswer & {
  /**
   * Explication en langage naturel. Renseignée UNIQUEMENT par un moteur IA :
   * avec le moteur à règles, elle reste absente (l'UI l'affiche si présente).
   */
  narrative?: string;
  /** Moteur ayant effectivement produit la réponse. */
  engine: CopilotEngineKind;
};

export interface CopilotEngine {
  readonly kind: CopilotEngineKind;
  answer(input: CopilotEngineInput): Promise<CopilotEngineResult>;
}

/**
 * Moteur à RÈGLES (implémentation active).
 * Exclusivement local : calculs déterministes + règles métier + réponses
 * prédéfinies, sourcés dans les données du projet sélectionné. Aucun appel
 * réseau, aucune clé d'API, aucune donnée inventée.
 */
export class RuleBasedCopilot implements CopilotEngine {
  readonly kind = "rule-based" as const;

  async answer({ question, context, mode }: CopilotEngineInput): Promise<CopilotEngineResult> {
    const resolved: CopilotMode = mode && mode !== "auto" ? mode : routeQuestion(question);
    // L'indice de préparation est un mode d'analyse supplémentaire : il est
    // résolu ici pour ne pas modifier le contrat de `runCopilotAnalysis`.
    const answer = resolved === "preparation" ? analyzePreparation(context) : runCopilotAnalysis(question, context, resolved);
    return { ...answer, engine: this.kind };
  }
}

/**
 * Moteur IA FUTUR — EMPLACEMENT RÉSERVÉ, NON ACTIF.
 *
 * Tant qu'aucun service IA n'est configuré, ce moteur N'EFFECTUE AUCUN appel
 * réseau : il délègue intégralement au moteur à règles, de sorte que le
 * Copilote reste fonctionnel et honnête (aucune réponse présentée comme
 * générée par une IA). `buildContextDigest` prépare dès maintenant le contexte
 * compact qu'un futur service IA recevrait.
 */
export class FutureAICopilot implements CopilotEngine {
  readonly kind = "ai" as const;
  private readonly fallback = new RuleBasedCopilot();

  async answer(input: CopilotEngineInput): Promise<CopilotEngineResult> {
    // Contexte compact déjà prêt pour un futur service IA (aucun envoi réseau).
    void buildContextDigest(input.context);
    const base = await this.fallback.answer(input);
    return { ...base, engine: "rule-based" };
  }
}

/** Registre des moteurs disponibles (extension future sans changer l'UI). */
export const COPILOT_ENGINES: Record<CopilotEngineKind, () => CopilotEngine> = {
  "rule-based": () => new RuleBasedCopilot(),
  ai: () => new FutureAICopilot(),
};

/**
 * Moteur courant du Copilote. Par défaut : `RuleBasedCopilot`.
 * Sélectionner `"ai"` est possible dès qu'un service IA sera branché, sans
 * modifier l'interface utilisateur.
 */
export function getCopilotEngine(kind: CopilotEngineKind = "rule-based"): CopilotEngine {
  return (COPILOT_ENGINES[kind] ?? COPILOT_ENGINES["rule-based"])();
}
