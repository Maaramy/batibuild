import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

/** Mode d'un flag progressif (déploiement progressif). */
export type FeatureFlagMode = "off" | "beta" | "on";

export type FeatureFlagsMap = Record<string, FeatureFlagMode>;

// ============================================================================
// FEATURE FLAGS — contexte central (performance : une seule requête Convex)
// ============================================================================
// Système générique : ajouter une fonctionnalité = l'ajouter au catalogue
// (`src/convex/featureFlags.ts`). `useFeatureFlag("clé")` devient ensuite
// disponible partout, avec repli local instantané pendant le chargement.

/** Repli local pendant le chargement / déconnecté : tout actif (état actuel). */
export const LOCAL_DEFAULT_FLAGS: Record<string, boolean> = {
  construction_cost_estimation: true,
  decision_support: true,
  ai_materials: true,
  architectural_plans: true,
  construction_guide: true,
};

interface FeatureFlagsContextValue {
  /** Map complète des flags ; `undefined` tant que le serveur n'a pas répondu. */
  flags: Record<string, boolean> | undefined;
  /** Map des modes progressifs ; repli dérivé de `flags` / défauts locaux. */
  modes: Record<string, FeatureFlagMode> | undefined;
  isLoaded: boolean;
  /** Lit un flag avec repli local (jamais d'exception, jamais de flash). */
  isEnabled: (key: string) => boolean;
  /** Lit le mode d'un flag progressif (défaut : dérivé du binaire ou "on"). */
  getMode: (key: string) => FeatureFlagMode;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: undefined,
  modes: undefined,
  isLoaded: false,
  isEnabled: (key) => LOCAL_DEFAULT_FLAGS[key] ?? true,
  getMode: (key) => ((LOCAL_DEFAULT_FLAGS[key] ?? true) ? "on" : "off"),
});

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  // Requête unique, réactive : un changement admin se propage partout (Convex
  // souscrit en temps réel), sans multiplier les appels backend.
  const serverFlags = useQuery(
    api.featureFlags.getFlagsMap,
    isAuthenticated ? {} : "skip",
  );
  // Modes progressifs (off/beta/on) — même politique de souscription unique.
  const serverModes = useQuery(
    api.featureFlags.getModesMap,
    isAuthenticated ? {} : "skip",
  );

  // Miroir local : garde le dernier état connu après déconnexion, évite les
  // flashs de contenu au premier rendu.
  const [cachedFlags, setCachedFlags] = useState<Record<string, boolean> | undefined>(
    undefined,
  );
  const [cachedModes, setCachedModes] = useState<
    Record<string, FeatureFlagMode> | undefined
  >(undefined);

  useEffect(() => {
    if (serverFlags) setCachedFlags(serverFlags);
  }, [serverFlags]);
  useEffect(() => {
    if (serverModes) setCachedModes(serverModes);
  }, [serverModes]);

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      flags: serverFlags ?? cachedFlags,
      modes: serverModes ?? cachedModes,
      isLoaded: serverFlags !== undefined,
      isEnabled: (key: string) => {
        const source = serverFlags ?? cachedFlags;
        if (!source) return LOCAL_DEFAULT_FLAGS[key] ?? true;
        return source[key] ?? true;
      },
      getMode: (key: string) => {
        const mSource = serverModes ?? cachedModes;
        if (mSource && mSource[key]) return mSource[key];
        // Repli : dériver du binaire connu.
        return (serverFlags ?? cachedFlags ?? LOCAL_DEFAULT_FLAGS)[key] ?? true
          ? "on"
          : "off";
      },
    }),
    [serverFlags, cachedFlags, serverModes, cachedModes],
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/** Accès à la map complète des feature flags. */
export function useFeatureFlags(): FeatureFlagsContextValue {
  return useContext(FeatureFlagsContext);
}

/**
 * `isFeatureEnabled("ai_materials")` — helper central.
 * Faux uniquement quand le serveur a confirmé le flag désactivé.
 */
export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}

/**
 * Mode progressif d'un flag (off / beta / on).
 * Utilisé par le déploiement progressif du rendu 3D amélioré.
 */
export function useFeatureFlagMode(key: string): FeatureFlagMode {
  const { getMode } = useFeatureFlags();
  return getMode(key);
}
