import { Component, useEffect, useState, type ReactNode } from "react";
import { useFeatureFlagMode } from "@/hooks/use-feature-flags";
import { FloorPlan3DHD } from "@/components/floorplan/FloorPlan3DHD";
import { FloorPlan3DLegacy } from "@/components/floorplan/FloorPlan3DLegacy";
import type { FloorPlan3DProps } from "@/components/floorplan/FloorPlan3DLegacy";

// ============================================================================
// DISPATCHER VUE 3D — rendu amélioré (HD) vs rendu historique, par feature flag
// ----------------------------------------------------------------------------
// Déploiement progressif du rendu 3D haute netteté via `plans_3d_enhanced` :
//   · mode "on"   → FloorPlan3DHD (nouveau moteur : canvas à résolution
//                   physique, DPR correct, cadrage auto « Ajuster à la
//                   scène », ombres adaptatives, arêtes architecturales,
//                   modes Architectural/Réaliste, mode performance auto) ;
//   · mode "beta" → FloorPlan3DHD également (test contrôlé), avec repli
//                   automatique sur le legacy en cas d'échec de rendu ;
//   · mode "off"  → FloorPlan3DLegacy (rendu actuel, conservé à l'identique).
//
// En cas d'erreur inattendue du moteur HD, le legacy est rendu en repli — la
// vue 3D ne doit jamais disparaître. Les données (`FloorPlan`) sont identiques
// pour les deux moteurs : aucune migration, aucun plan à régénérer.
// ============================================================================

export function FloorPlan3D(props: FloorPlan3DProps) {
  const mode = useFeatureFlagMode("plans_3d_enhanced");

  // Un plan de piscine a besoin du rendu HD (bassin enterré, eau, margelle,
  // aucune enveloppe de bâtiment) : le moteur HD est retenu quel que soit le
  // flag, avec repli legacy si le contexte WebGL échoue.
  const poolPlan = props.plan.rooms.some((r) => r.kind === "bassin");

  // En OFF → legacy pur. En BETA/ON → moteur HD avec repli legacy si échec.
  const enhanced = poolPlan || mode === "beta" || mode === "on";

  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [mode]);

  if (!enhanced || failed) return <FloorPlan3DLegacy {...props} />;
  return (
    <ErrorBoundary fallback={<FloorPlan3DLegacy {...props} />} onError={() => setFailed(true)}>
      <FloorPlan3DHD {...props} />
    </ErrorBoundary>
  );
}

/** Boundary minimaliste : bascule sur le fallback au premier rendu en échec. */
class ErrorBoundary extends Component<
  { fallback: ReactNode; onError?: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
