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

// ============================================================================
// FEATURE FLAGS — contexte central (performance : une seule requête Convex)
// ============================================================================
// Système générique : ajouter une fonctionnalité = l'ajouter au catalogue
// (`src/convex/featureFlags.ts`). `useFeatureFlag("clé")` devient ensuite
// disponible partout, avec repli local instantané pendant le chargement.

/** Repli local pendant le chargement / déconnecté : tout actif (état actuel). */
export const LOCAL_DEFAULT_FLAGS: Record<string, boolean> = {
  construction_cost_estimation: true,
  investment_project: true,
  ai_materials: true,
  architectural_plans: true,
};

interface FeatureFlagsContextValue {
  /** Map complète des flags ; `undefined` tant que le serveur n'a pas répondu. */
  flags: Record<string, boolean> | undefined;
  isLoaded: boolean;
  /** Lit un flag avec repli local (jamais d'exception, jamais de flash). */
  isEnabled: (key: string) => boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: undefined,
  isLoaded: false,
  isEnabled: (key) => LOCAL_DEFAULT_FLAGS[key] ?? true,
});

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  // Requête unique, réactive : un changement admin se propage partout (Convex
  // souscrit en temps réel), sans multiplier les appels backend.
  const serverFlags = useQuery(
    api.featureFlags.getFlagsMap,
    isAuthenticated ? {} : "skip",
  );

  // Miroir local : garde le dernier état connu après déconnexion, évite les
  // flashs de contenu au premier rendu.
  const [cachedFlags, setCachedFlags] = useState<Record<string, boolean> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (serverFlags) setCachedFlags(serverFlags);
  }, [serverFlags]);

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      flags: serverFlags ?? cachedFlags,
      isLoaded: serverFlags !== undefined,
      isEnabled: (key: string) => {
        const source = serverFlags ?? cachedFlags;
        if (!source) return LOCAL_DEFAULT_FLAGS[key] ?? true;
        return source[key] ?? true;
      },
    }),
    [serverFlags, cachedFlags],
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
