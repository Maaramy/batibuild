/**
 * ANIMATION DE PREMIÈRE GÉNÉRATION — « Plans architecturaux AI »
 *
 * L'écran de chargement animé (logo Batibuild, 6 étapes, barre de progression)
 * ne doit être joué qu'UNE seule fois par projet : à la toute première
 * génération de ses plans.
 *
 *   - première génération   → `shouldPlayPlansIntro` renvoie `true`, la page
 *                             joue l'animation puis affiche les résultats ;
 *   - retour sur la page,
 *     actualisation, navigation
 *     entre les étapes       → `false` : plans affichés directement, simple
 *                             indicateur discret si les données arrivent ;
 *   - régénération           → `false` : l'affichage courant est conservé.
 *
 * La décision est mémorisée par projet dans `localStorage` (survit à
 * l'actualisation et à la fermeture de l'onglet) ; la mémoire de module
 * couvre les cas où le stockage est indisponible (navigation privée stricte,
 * WebView) et absorbe le double montage de React StrictMode en développement,
 * qui rejoue les effets quelques millisecondes après le premier montage : sans
 * cette tolérance, l'animation serait coupée avant d'être visible en dev.
 */

/** Préfixe de la clé `localStorage` : une clé par projet. */
export const PLAN_INTRO_STORAGE_PREFIX = "batibuild.plans.intro.v1.";

/**
 * Fenêtre pendant laquelle un nouveau montage est considéré comme le rejeu
 * StrictMode du montage précédent (l'animation en cours ne doit pas être
 * coupée). Un retour réel sur la page arrive toujours bien après.
 */
export const PLAN_INTRO_REPLAY_WINDOW_MS = 1500;

/** Sous-ensemble de `Storage` utilisé ici (injectable pour les tests). */
export interface PlanIntroStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface PlanIntroOptions {
  /** Horodatage injectable (tests). */
  now?: number;
  /**
   * Stockage injectable. `undefined` = `localStorage` du navigateur ;
   * `null` = aucun stockage disponible.
   */
  storage?: PlanIntroStorage | null;
}

/** Dernier projet dont l'animation a été lancée (mémoire de session). */
let lastStarted: { projectId: string; at: number } | null = null;
/** Projets déjà annoncés quand `localStorage` est indisponible. */
const playedWithoutStorage = new Set<string>();

/** Clé `localStorage` d'un projet. */
export function planIntroStorageKey(projectId: string): string {
  return `${PLAN_INTRO_STORAGE_PREFIX}${projectId.trim()}`;
}

/** `localStorage` du navigateur, ou `null` s'il est inaccessible. */
function defaultStorage(): PlanIntroStorage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    // Mode privé strict / WebView : le stockage lève à l'accès.
    return null;
  }
}

function resolveStorage(options: PlanIntroOptions): PlanIntroStorage | null {
  return options.storage === undefined ? defaultStorage() : options.storage;
}

/**
 * Vrai si l'animation de première génération doit être jouée pour ce projet.
 * Fonction pure : elle ne marque jamais le projet comme déjà vu.
 */
export function shouldPlayPlansIntro(
  projectId: string | null | undefined,
  options: PlanIntroOptions = {},
): boolean {
  const id = (projectId ?? "").trim();
  if (!id) return false;

  const now = options.now ?? Date.now();
  // Rejeu immédiat du montage (React StrictMode) : l'animation en cours
  // continue au lieu d'être remplacée par les résultats.
  if (
    lastStarted &&
    lastStarted.projectId === id &&
    now - lastStarted.at < PLAN_INTRO_REPLAY_WINDOW_MS
  ) {
    return true;
  }

  const storage = resolveStorage(options);
  if (!storage) return !playedWithoutStorage.has(id);
  try {
    return storage.getItem(planIntroStorageKey(id)) === null;
  } catch {
    return !playedWithoutStorage.has(id);
  }
}

/**
 * Marque l'animation comme jouée pour ce projet. Appelée au démarrage de
 * l'animation (et non à sa fin) : une actualisation pendant les quelques
 * secondes de chargement ne la rejoue pas.
 */
export function markPlansIntroPlayed(
  projectId: string | null | undefined,
  options: PlanIntroOptions = {},
): void {
  const id = (projectId ?? "").trim();
  if (!id) return;

  const now = options.now ?? Date.now();
  lastStarted = { projectId: id, at: now };
  playedWithoutStorage.add(id);

  const storage = resolveStorage(options);
  try {
    storage?.setItem(planIntroStorageKey(id), String(now));
  } catch {
    // Stockage plein ou refusé : la mémoire de module suffit pour la session.
  }
}

/** Réinitialise la mémoire de session (tests uniquement). */
export function resetPlansIntroMemory(): void {
  lastStarted = null;
  playedWithoutStorage.clear();
}
