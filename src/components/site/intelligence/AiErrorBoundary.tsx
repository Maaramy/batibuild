// ============================================================================
// AI SITE INTELLIGENCE — garde-fou local
// ----------------------------------------------------------------------------
// Une défaillance du module IA (requête refusée, fournisseur indisponible,
// rendu d'un graphique) ne doit jamais faire tomber la page chantier ni les
// autres modules. Cette barrière confine l'erreur à l'onglet Intelligence IA
// et propose une reprise sans recharger toute l'application.
// ============================================================================

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AiErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[batibuild] Intelligence de chantier indisponible :", error);
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-amber-500" />
          <p className="text-sm font-medium">Intelligence de chantier momentanément indisponible</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Le reste du chantier fonctionne normalement. Aucune donnée n'est perdue : réessayez
            d'ouvrir le module dans un instant.
          </p>
          <Button variant="outline" size="sm" className="mt-3 h-8 text-xs" onClick={this.retry}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }
}
