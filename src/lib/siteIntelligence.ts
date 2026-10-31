// ============================================================================
// BatiBuild AI SITE INTELLIGENCE — moteur déterministe (partagé front/back)
// ----------------------------------------------------------------------------
// Ce fichier ne fait AUCUN appel réseau : il calcule tout ce qui peut l'être à
// partir des données réelles du chantier (planning, pointages, inspections,
// dépenses, matériaux). Deux responsabilités :
//   1. valider et normaliser les réponses du fournisseur IA (jamais confiance
//      aveugle dans un JSON de modèle) ;
//   2. produire les anomalies, comparaisons planning/réalisation, séries
//      d'évolution et le mode DÉMONSTRATION, clairement identifié.
// Aucune sortie n'est présentée comme une certitude : `isEstimate` est toujours
// vrai et un avertissement accompagne chaque analyse ou anomalie visuelle.
// ============================================================================

import { phasesForProjectType } from "./siteTracking";

const DAY = 86_400_000;
const clamp = (value: number, min = 0, max = 100) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

/** Avertissement légal apposé sur CHAQUE rendu d'analyse ou d'anomalie. */
export const AI_DISCLAIMER =
  "Analyse assistée par IA, fournie à titre indicatif. L'absence d'un élément sur une photo ne prouve jamais qu'il n'est pas réalisé. Une anomalie visuelle n'est pas une non-conformité technique : seule une vérification humaine sur site peut la confirmer.";

/** Le mode démonstration ne prétend jamais analyser les images. */
export const DEMO_DISCLAIMER =
  "Mode démonstration : ces observations sont construites localement à partir du planning et des taux saisis. Aucune image n'a été analysée et rien ne reflète l'état réel du chantier.";

export const AI_RETENTION_DAYS = 365;

// ── Éléments attendus par phase (utilisés pour la démo et l'affichage) ──────

export const PHASE_VISIBLE_ELEMENTS: Record<string, string[]> = {
  installation: ["Clôture de chantier", "Baraquement", "Zone de stockage"],
  terrassement: ["Décaissement", "Fouilles", "Fond de forme"],
  gros_oeuvre: ["Semelles", "Longrines", "Radier"],
  elevation: ["Poteaux", "Poutres", "Murs"],
  structure: ["Reprises structurelles", "Poteaux", "Plancher"],
  charpente: ["Charpente", "Couverture", "Pannes"],
  techniques: ["Gaines électriques", "Canalisations", "Tableaux"],
  reseaux: ["Fourreaux", "Câblage", "Évacuations"],
  equipements: ["Appareillages", "Sanitaires", "Tableau électrique"],
  enduits: ["Enduits intérieurs", "Enduits extérieurs", "Chapes"],
  menuiserie: ["Fenêtres", "Portes", "Garde-corps"],
  peinture: ["Sous-couche", "Peinture", "Faïence"],
  finitions: ["Peinture", "Faïence", "Nettoyage"],
  exterieurs: ["Voirie", "Trottoirs", "Espaces verts"],
  essais: ["Essais électriques", "Essais de pression", "Mise en service"],
  demolition: ["Démolition", "Dépose", "Évacuation des gravats"],
  preparation: ["Protection", "Dépose", "Préparation des supports"],
  reception: ["Nettoyage final", "Levée des réserves", "Réception"],
};

export const PHASE_REMAINING_WORKS: Record<string, string[]> = {
  installation: ["Implantation des axes", "Raccordements provisoires"],
  terrassement: ["Ferraillage des semelles", "Coulage du béton de propreté"],
  gros_oeuvre: ["Coulage des semelles", "Élévation des longrines"],
  elevation: ["Montage des murs", "Coffrage des poteaux"],
  structure: ["Reprise des appuis", "Coulage du plancher"],
  charpente: ["Pose des fermes", "Couverture et étanchéité"],
  techniques: ["Tirage des câbles", "Pose des sanitaires"],
  reseaux: ["Raccordement au réseau", "Pose des équipements"],
  equipements: ["Branchements", "Essais"],
  enduits: ["Lissage", "Application de la chape"],
  menuiserie: ["Pose des vitrages", "Réglages"],
  peinture: ["Finition", "Retouches"],
  finitions: ["Dernière couche", "Nettoyage final"],
  exterieurs: ["Pavage", "Plantations"],
  essais: ["Procès-verbaux", "Réception des installations"],
  demolition: ["Tri et évacuation", "Reprise des supports"],
  preparation: ["Pose des protections", "Préparation des murs"],
  reception: ["Levée des réserves", "Remise des DOE"],
};

export const AI_ANOMALY_TYPES = [
  "absence_evolution",
  "retard_phase",
  "incoherence_planning",
  "non_conformite_potentielle",
  "modification_non_prevue",
  "ecart_quantites",
  "risque_budgetaire",
  "suivi_insuffisant",
] as const;
export type AiAnomalyType = (typeof AI_ANOMALY_TYPES)[number];

export const AI_ANOMALY_TYPE_LABELS: Record<AiAnomalyType, string> = {
  absence_evolution: "Absence d'évolution visible",
  retard_phase: "Retard de phase",
  incoherence_planning: "Incohérence planning / avancement",
  non_conformite_potentielle: "Non-conformité potentielle",
  modification_non_prevue: "Modification non prévue",
  ecart_quantites: "Écart de quantités",
  risque_budgetaire: "Risque de dépassement budgétaire",
  suivi_insuffisant: "Suivi photographique insuffisant",
};

export const AI_SEVERITIES = ["faible", "moyen", "eleve", "critique"] as const;
export type AiSeverity = (typeof AI_SEVERITIES)[number];

export const AI_SEVERITY_LABELS: Record<AiSeverity, string> = {
  faible: "Faible",
  moyen: "Moyen",
  eleve: "Élevé",
  critique: "Critique",
};

export const AI_SEVERITY_SCORES: Record<AiSeverity, number> = {
  faible: 1,
  moyen: 2,
  eleve: 3,
  critique: 4,
};

export function normalizeSeverity(value: unknown): AiSeverity {
  const raw = String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (raw === "critique" || raw === "critical") return "critique";
  if (raw === "eleve" || raw === "élevé" || raw === "high" || raw === "majeur") return "eleve";
  if (raw === "moyen" || raw === "medium" || raw === "modere") return "moyen";
  return "faible";
}

// ── Analyse IA : structure attendue et validation stricte ──────────────────

export interface AiVisualAnomaly {
  label: string;
  severity: AiSeverity;
  evidence: string;
}

export interface AiAnalysisPayload {
  phaseKey: string;
  elements: string[];
  worksObserved: string[];
  worksRemaining: string[];
  changes: string[];
  anomalies: AiVisualAnomaly[];
  /** Estimation de l'avancement de la phase, 0–100 (jamais validée d'office). */
  progressEstimate: number;
  confidence: number;
  summary: string;
}

const textList = (value: unknown, limit = 10): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 220))
        .slice(0, limit)
    : [];

/**
 * Normalise la réponse du fournisseur IA. Renvoie `null` si la réponse est
 * inexploitable : mieux vaut aucune analyse qu'une analyse inventée.
 */
export function parseAiAnalysis(
  raw: unknown,
  allowedPhaseKeys: string[],
  imageCount: number,
): AiAnalysisPayload | null {
  if (!raw || typeof raw !== "object" || imageCount <= 0) return null;
  const source = raw as Record<string, unknown>;

  const phaseKey = String(source.phaseKey ?? "").trim();
  if (!allowedPhaseKeys.includes(phaseKey)) return null;

  const worksObserved = textList(source.worksObserved);
  const elements = textList(source.elements);
  const anomaliesRaw = Array.isArray(source.anomalies) ? source.anomalies : [];
  const anomalies: AiVisualAnomaly[] = anomaliesRaw
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const label = String(row.label ?? "").trim().slice(0, 160);
      if (!label) return null;
      return {
        label,
        severity: normalizeSeverity(row.severity),
        evidence: String(row.evidence ?? "").trim().slice(0, 240),
      };
    })
    .filter((item): item is AiVisualAnomaly => item !== null)
    .slice(0, 8);

  const confidenceRaw = Number(source.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? clamp(confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw, 0, 1)
    : 0;

  const payload: AiAnalysisPayload = {
    phaseKey,
    elements,
    worksObserved,
    worksRemaining: textList(source.worksRemaining),
    changes: textList(source.changes),
    anomalies,
    progressEstimate: clamp(Number(source.progressEstimate) || 0),
    confidence,
    summary: String(source.summary ?? "").trim().slice(0, 700),
  };

  // Une analyse sans aucun élément observé ni travaux décrits n'apporte rien.
  if (payload.elements.length === 0 && payload.worksObserved.length === 0) return null;
  return payload;
}

/** Analyse de démonstration : construite localement, jamais présentée comme IA. */
export function buildDemoAnalysis(input: {
  phaseKey: string;
  progress: number;
  imageCount: number;
}): AiAnalysisPayload {
  const pct = clamp(input.progress);
  const elements = PHASE_VISIBLE_ELEMENTS[input.phaseKey] ?? [];
  const remaining = PHASE_REMAINING_WORKS[input.phaseKey] ?? [];
  const shown = Math.round((elements.length * pct) / 100);
  return {
    phaseKey: input.phaseKey,
    elements: elements.slice(0, shown),
    worksObserved:
      shown > 0
        ? [`Éléments du planning déclarés à ${pct} % pour cette phase (démonstration).`]
        : [],
    worksRemaining: remaining,
    changes: [],
    anomalies: [],
    progressEstimate: pct,
    confidence: 0,
    summary: DEMO_DISCLAIMER,
  };
}

// ── Progression : IA / déclarée / validée, pondérée par phase ──────────────

/** Tâche de planning telle que lue depuis Convex (dates obligatoires). */
export interface AiTask {
  phaseKey?: string | null;
  name: string;
  weight: number;
  progress: number;
  startDate: number;
  endDate: number;
}

export interface ProgressRecordLike {
  phaseKey: string;
  percent: number;
  source: string;
  status: string;
  date: number;
}

export interface PhaseProgressRow {
  phaseKey: string;
  name: string;
  weight: number;
  planned: number;
  ai: number | null;
  declared: number | null;
  validated: number;
  remaining: number;
  delta: number;
}

export function phaseProgressRows(
  tasks: AiTask[],
  records: ProgressRecordLike[],
  now: number,
): PhaseProgressRow[] {
  return tasks.map((task) => {
    const phaseKey = task.phaseKey ?? task.name;
    const mine = records
      .filter((record) => record.phaseKey === phaseKey)
      .sort((a, b) => b.date - a.date);

    const latest = (predicate: (record: ProgressRecordLike) => boolean) =>
      mine.find(predicate) ?? null;

    const aiRecord = latest((record) => record.source === "ai" && record.status !== "rejected");
    const declaredRecord = latest(
      (record) => record.source === "declared" && record.status !== "rejected",
    );

    const validated = clamp(task.progress);
    const duration = Math.max(1, task.endDate - task.startDate);
    const planned = clamp(((now - task.startDate) / duration) * 100);

    return {
      phaseKey,
      name: task.name,
      weight: Math.max(0, task.weight),
      planned: Math.round(planned),
      ai: aiRecord ? clamp(aiRecord.percent) : null,
      declared: declaredRecord ? clamp(declaredRecord.percent) : null,
      validated: Math.round(validated),
      remaining: Math.round(100 - validated),
      delta: Math.round(validated - planned),
    };
  });
}

/** Moyenne pondérée : jamais une simple moyenne de phases. */
export function weightedPercent(
  rows: PhaseProgressRow[],
  pick: (row: PhaseProgressRow) => number | null,
): number {
  let weightSum = 0;
  let total = 0;
  for (const row of rows) {
    const value = pick(row);
    const weight = Number(row.weight) || 0;
    if (value == null || weight <= 0) continue;
    weightSum += weight;
    total += weight * clamp(value);
  }
  return weightSum > 0 ? Math.round((total / weightSum) * 10) / 10 : 0;
}

export interface ProgressSummary {
  planned: number;
  validated: number;
  declared: number;
  ai: number | null;
  gap: number;
  remainingTasks: number;
  criticalPhases: number;
}

export function progressSummary(rows: PhaseProgressRow[]): ProgressSummary {
  const validated = weightedPercent(rows, (row) => row.validated);
  const planned = weightedPercent(rows, (row) => row.planned);
  const declaredRows = rows.filter((row) => row.declared != null);
  const aiRows = rows.filter((row) => row.ai != null);
  return {
    planned,
    validated,
    declared: declaredRows.length > 0 ? weightedPercent(declaredRows, (row) => row.declared) : 0,
    ai: aiRows.length > 0 ? weightedPercent(aiRows, (row) => row.ai) : null,
    gap: Math.round((validated - planned) * 10) / 10,
    remainingTasks: rows.filter((row) => row.validated < 100).length,
    criticalPhases: rows.filter((row) => row.delta <= -15).length,
  };
}

// ── Courbe d'évolution (historique réel des pointages) ────────────────────

export interface TimelinePoint {
  date: number;
  declared: number | null;
  validated: number | null;
  ai: number | null;
}

export function buildTimeline(
  records: ProgressRecordLike[],
  startDate: number,
  endDate: number,
): TimelinePoint[] {
  const relevant = records
    .filter((record) => record.status !== "rejected")
    .slice()
    .sort((a, b) => a.date - b.date);
  if (relevant.length === 0) return [];

  const firstDay = Math.max(startDate, relevant[0].date);
  const buckets = new Map<number, TimelinePoint>();
  const dayOf = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return Math.min(date.getTime(), Math.max(firstDay, endDate));
  };

  for (const record of relevant) {
    const day = dayOf(record.date);
    const point =
      buckets.get(day) ?? { date: day, declared: null, validated: null, ai: null };
    if (record.source === "ai" && record.status !== "rejected") {
      point.ai = Math.max(point.ai ?? 0, clamp(record.percent));
    } else if (record.source === "declared") {
      point.declared = clamp(record.percent);
    } else if (record.source === "validated" || record.status === "validated") {
      point.validated = clamp(record.percent);
    }
    buckets.set(day, point);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date - b.date);
}

// ── Comparaison planning / réalisation ────────────────────────────────────

export type PhaseScheduleStatus = "en_avance" | "a_jour" | "retard" | "terminee";

export const PHASE_SCHEDULE_LABELS: Record<PhaseScheduleStatus, string> = {
  en_avance: "En avance",
  a_jour: "À jour",
  retard: "En retard",
  terminee: "Terminée",
};

export function phaseScheduleStatus(row: PhaseProgressRow): PhaseScheduleStatus {
  if (row.validated >= 100) return "terminee";
  if (row.delta >= 5) return "en_avance";
  if (row.delta <= -10) return "retard";
  return "a_jour";
}

export interface PhaseComparisonRow extends PhaseProgressRow {
  status: PhaseScheduleStatus;
  /** Retard exprimé en jours ouvrés calendaires (0 si à jour). */
  delayDays: number;
}

export function comparePlanning(
  rows: PhaseProgressRow[],
  tasks: AiTask[],
  now: number,
): PhaseComparisonRow[] {
  return rows.map((row, index) => {
    const task = tasks[index];
    const status = phaseScheduleStatus(row);
    let delayDays = 0;
    if (task && task.endDate < now && row.validated < 100) {
      delayDays = Math.max(1, Math.round((now - task.endDate) / DAY));
    }
    return { ...row, status, delayDays };
  });
}

// ── Détection d'anomalies (règles déterministes, aucun modèle requis) ──────

export interface AnomalyDraft {
  type: AiAnomalyType;
  severity: AiSeverity;
  title: string;
  description: string;
  phaseKey: string | null;
  evidence: string[];
  recommendation: string;
  source: "engine" | "ai" | "human";
  requiresHumanCheck: boolean;
}

export interface AnomalyInput {
  now: number;
  startDate: number;
  expectedEndDate: number;
  budgetInitial: number;
  budgetRevised?: number | null;
  tasks: AiTask[];
  rows: PhaseProgressRow[];
  expenses: { amount: number; date: number }[];
  materials: { name: string; plannedQty: number; orderedQty: number; deliveredQty: number }[];
  inspections: { phaseKey: string; status: string }[];
  sessions: { date: number; imageCount: number }[];
  analyses: {
    phaseKey: string;
    visualAnomalies: { label: string; severity: AiSeverity }[];
    changes: string[];
    createdAt: number;
  }[];
  /** Coût final projeté issu du moteur de prévision, s'il existe. */
  projectedFinalCost?: number | null;
}

const openTasksAfter = (input: AnomalyInput) =>
  input.rows.filter((row) => row.validated < 100).length;

export function detectAnomalies(input: AnomalyInput): AnomalyDraft[] {
  const drafts: AnomalyDraft[] = [];

  // 1. Phases en retard sur le planning.
  for (const row of input.rows) {
    if (row.validated >= 100) continue;
    const task = input.tasks.find((item) => (item.phaseKey ?? item.name) === row.phaseKey);
    if (!task || task.endDate >= input.now) continue;
    const days = Math.max(1, Math.round((input.now - task.endDate) / DAY));
    drafts.push({
      type: "retard_phase",
      severity: days >= 30 ? "critique" : days >= 14 ? "eleve" : "moyen",
      title: `Phase « ${row.name} » en retard de ${days} jour(s)`,
      description: `L'échéance planifiée est dépassée depuis ${days} jour(s) alors que l'avancement validé est de ${row.validated} %.`,
      phaseKey: row.phaseKey,
      evidence: [
        `Échéance planifiée : ${new Date(task.endDate).toLocaleDateString("fr-FR")}`,
        `Avancement validé : ${row.validated} %`,
        `Avancement prévu à date : ${row.planned} %`,
      ],
      recommendation:
        "Revoir l'ordonnancement de la phase, vérifier les approvisionnements et replanifier avec le responsable des travaux.",
      source: "engine",
      requiresHumanCheck: false,
    });
  }

  // 2. Incohérence entre avancement déclaré et planning.
  for (const row of input.rows) {
    if (row.declared != null && row.declared - row.planned >= 25 && row.validated < row.declared) {
      drafts.push({
        type: "incoherence_planning",
        severity: "moyen",
        title: `Avancement déclaré très supérieur au planning (${row.name})`,
        description: `Le taux déclaré (${row.declared} %) dépasse de ${Math.round(row.declared - row.planned)} points l'avancement prévu et n'est pas encore validé.`,
        phaseKey: row.phaseKey,
        evidence: [
          `Déclaré : ${row.declared} %`,
          `Validé : ${row.validated} %`,
          `Prévu : ${row.planned} %`,
        ],
        recommendation:
          "Demander une inspection contradictoire avant validation du taux déclaré.",
        source: "engine",
        requiresHumanCheck: true,
      });
    }
  }

  // 3. Écarts de quantités sur les matériaux.
  for (const material of input.materials) {
    if (material.plannedQty <= 0) continue;
    const ratio = material.deliveredQty / material.plannedQty;
    if (ratio >= 1.2) {
      drafts.push({
        type: "ecart_quantites",
        severity: ratio >= 1.5 ? "eleve" : "moyen",
        title: `Quantité livrée supérieure au prévisionnel — ${material.name}`,
        description: `${material.deliveredQty} livrés pour ${material.plannedQty} prévus (${Math.round(ratio * 100)} %).`,
        phaseKey: null,
        evidence: [
          `Prévu : ${material.plannedQty}`,
          `Livré : ${material.deliveredQty}`,
          `Commande : ${material.orderedQty}`,
        ],
        recommendation:
          "Vérifier le bon de livraison et l'incidence budgétaire ; corriger le quantitatif si le besoin a évolué.",
        source: "engine",
        requiresHumanCheck: false,
      });
    }
  }

  // 4. Risque budgétaire fondé sur les dépenses réelles.
  const revised = input.budgetRevised ?? input.budgetInitial;
  const spent = input.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  if (revised > 0 && spent > revised) {
    drafts.push({
      type: "risque_budgetaire",
      severity: spent > revised * 1.1 ? "critique" : "eleve",
      title: "Dépenses réelles supérieures au budget révisé",
      description: `Le cumul des dépenses atteint ${Math.round((spent / revised) * 100)} % du budget révisé.`,
      phaseKey: null,
      evidence: [`Budget révisé : ${revised} TND`, `Dépensé : ${spent} TND`],
      recommendation:
        "Geler les dépenses non critiques, renégocier les lots en cours et réviser le budget avec le maître d'ouvrage.",
      source: "engine",
      requiresHumanCheck: false,
    });
  } else if (input.projectedFinalCost && revised > 0 && input.projectedFinalCost > revised * 1.05) {
    drafts.push({
      type: "risque_budgetaire",
      severity: "moyen",
      title: "Coût final projeté supérieur au budget",
      description: `La projection (${Math.round(input.projectedFinalCost)} TND) dépasse le budget révisé (${revised} TND).`,
      phaseKey: null,
      evidence: [
        `Projection : ${Math.round(input.projectedFinalCost)} TND`,
        `Budget révisé : ${revised} TND`,
      ],
      recommendation:
        "Confirmer la projection avec les engagements réels avant toute décision ; elle reste une estimation.",
      source: "engine",
      requiresHumanCheck: true,
    });
  }

  // 5. Absence d'évolution visible entre deux inspections photographiques.
  const sessions = input.sessions.slice().sort((a, b) => a.date - b.date);
  for (let index = 1; index < sessions.length; index++) {
    const previous = sessions[index - 1];
    const current = sessions[index];
    const gapDays = Math.round((current.date - previous.date) / DAY);
    if (gapDays < 7 || current.imageCount === 0) continue;
    const touched = input.rows.some((row) => {
      const task = input.tasks.find((item) => (item.phaseKey ?? item.name) === row.phaseKey);
      return task && task.startDate <= current.date && task.endDate >= previous.date && row.validated < 100;
    });
    if (!touched) continue;
    drafts.push({
      type: "absence_evolution",
      severity: gapDays >= 21 ? "eleve" : "moyen",
      title: `Aucune session photographique pendant ${gapDays} jours`,
      description:
        "Des phases étaient en cours sur cette période mais aucune nouvelle inspection photo n'a été enregistrée entre deux échéances.",
      phaseKey: null,
      evidence: [
        `Dernière session : ${new Date(previous.date).toLocaleDateString("fr-FR")}`,
        `Session suivante : ${new Date(current.date).toLocaleDateString("fr-FR")}`,
      ],
      recommendation:
        "Programmer une inspection photo et confirmer l'avancement avec le conducteur de travaux.",
      source: "engine",
      requiresHumanCheck: true,
    });
  }

  // 6. Suivi photographique absent alors que le chantier est actif.
  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1].date : null;
  const active = openTasksAfter(input) > 0;
  if (active && input.now - input.startDate > 7 * DAY) {
    const staleDays = lastSession ? Math.round((input.now - lastSession) / DAY) : 999;
    if (staleDays >= 14) {
      drafts.push({
        type: "suivi_insuffisant",
        severity: staleDays >= 30 ? "eleve" : "moyen",
        title: lastSession
          ? `Dernière inspection photo il y a ${staleDays} jours`
          : "Aucune inspection photo enregistrée",
        description:
          "Le suivi intelligent s'appuie sur des photos datées : sans nouvelle session, les écarts ne peuvent plus être mesurés.",
        phaseKey: null,
        evidence: lastSession
          ? [`Dernière session : ${new Date(lastSession).toLocaleDateString("fr-FR")}`]
          : ["Aucune session de surveillance"],
        recommendation: "Planifier une session photo hebdomadaire pour chaque phase en cours.",
        source: "engine",
        requiresHumanCheck: false,
      });
    }
  }

  // 7. Anomalies visuelles signalées par une analyse IA (jamais une certitude).
  for (const analysis of input.analyses) {
    for (const anomaly of analysis.visualAnomalies) {
      drafts.push({
        type: "non_conformite_potentielle",
        severity: anomaly.severity === "faible" ? "moyen" : anomaly.severity,
        title: `Point à vérifier (${anomaly.label})`,
        description:
          "Une analyse d'image signale un point qui pourrait ne pas être conforme. Il s'agit d'une observation visuelle, pas d'une non-conformité établie.",
        phaseKey: analysis.phaseKey,
        evidence: [`Signalé le ${new Date(analysis.createdAt).toLocaleDateString("fr-FR")}`],
        recommendation:
          "Faire vérifier sur site par une personne habilitée avant toute décision ou reprise.",
        source: "ai",
        requiresHumanCheck: true,
      });
    }
    if (analysis.changes.length > 0) {
      drafts.push({
        type: "modification_non_prevue",
        severity: "faible",
        title: "Modification constatée par rapport aux photos précédentes",
        description: analysis.changes.join(" · ").slice(0, 300),
        phaseKey: analysis.phaseKey,
        evidence: [`Analyse du ${new Date(analysis.createdAt).toLocaleDateString("fr-FR")}`],
        recommendation:
          "Confirmer s'il s'agit d'un travail prévu au planning actualisé ou d'un changement à documenter.",
        source: "ai",
        requiresHumanCheck: true,
      });
    }
  }

  // 8. Réserves qualité non levées.
  const failed = input.inspections.filter((inspection) => inspection.status === "failed");
  if (failed.length > 0) {
    drafts.push({
      type: "non_conformite_potentielle",
      severity: "eleve",
      title: `${failed.length} inspection(s) qualité en échec`,
      description:
        "Des contrôles qualité ont été marqués en échec : les réserves associées doivent être levées avant de poursuivre la phase concernée.",
      phaseKey: failed[0]?.phaseKey ?? null,
      evidence: [`Inspections en échec : ${failed.length}`],
      recommendation: "Ouvrir une action corrective et replanifier l'inspection de contrôle.",
      source: "engine",
      requiresHumanCheck: false,
    });
  }

  return drafts;
}

/** Clé de déduplication stable entre deux scans successifs. */
export function anomalyKey(anomaly: { type: string; phaseKey?: string | null; title: string }): string {
  return `${anomaly.type}::${anomaly.phaseKey ?? "global"}::${anomaly.title}`.slice(0, 300);
}

// ── Mode démonstration : anomalies explicitement fictives ──────────────────

export function demoAnomalies(rows: PhaseProgressRow[]): AnomalyDraft[] {
  return rows.slice(0, 2).map((row) => ({
    type: "absence_evolution" as const,
    severity: "faible" as const,
    title: `[Démo] Exemple d'alerte sur « ${row.name} »`,
    description: DEMO_DISCLAIMER,
    phaseKey: row.phaseKey,
    evidence: ["Anomalie générée en mode démonstration"],
    recommendation: "Aucune action requise : il s'agit d'un exemple.",
    source: "human" as const,
    requiresHumanCheck: true,
  }));
}

// ── Périodes de rapport ───────────────────────────────────────────────────

export type AiReportKind =
  | "journalier"
  | "hebdomadaire"
  | "mensuel"
  | "progression"
  | "anomalies"
  | "planning_realisation";

export const AI_REPORTS: { kind: AiReportKind; label: string; hint: string }[] = [
  { kind: "journalier", label: "Rapport journalier", hint: "Journée sélectionnée" },
  { kind: "hebdomadaire", label: "Rapport hebdomadaire", hint: "7 derniers jours" },
  { kind: "mensuel", label: "Rapport mensuel", hint: "30 derniers jours" },
  { kind: "progression", label: "Progression globale", hint: "Depuis le démarrage" },
  { kind: "anomalies", label: "Rapport d'anomalies", hint: "Anomalies ouvertes et résolues" },
  { kind: "planning_realisation", label: "Planning / Réalisation", hint: "Comparaison par phase" },
];

export function reportPeriod(
  kind: AiReportKind,
  now: number,
  startDate: number,
  day?: number,
): { start: number; end: number; label: string } {
  const fmt = (value: number) =>
    new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (kind === "journalier") {
    const base = day ?? now;
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    return { start: d.getTime(), end: d.getTime() + DAY - 1, label: fmt(base) };
  }
  if (kind === "hebdomadaire") {
    const start = now - 7 * DAY;
    return { start, end: now, label: `du ${fmt(start)} au ${fmt(now)}` };
  }
  if (kind === "mensuel") {
    const start = now - 30 * DAY;
    return { start, end: now, label: `du ${fmt(start)} au ${fmt(now)}` };
  }
  if (kind === "progression") {
    return { start: startDate, end: now, label: `depuis le ${fmt(startDate)}` };
  }
  return { start: startDate, end: now, label: `depuis le ${fmt(startDate)}` };
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return "Confiance élevée";
  if (confidence >= 0.5) return "Confiance moyenne";
  if (confidence > 0) return "Confiance faible";
  return "Sans indice de confiance";
}

export function phasesOfType(type: string | null | undefined) {
  return phasesForProjectType(type);
}
