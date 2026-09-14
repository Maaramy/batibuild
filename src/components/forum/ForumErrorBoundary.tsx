import React from "react";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

/**
 * Garde-fou d'affichage pour les sections du forum.
 *
 * Une erreur de souscription Convex (ou une erreur de rendu) ne doit jamais
 * faire tomber toute la page : on affiche un message clair et un bouton
 * « Réessayer » qui remonte le sous-arbre (clé de réessai incrémentée).
 */
interface Props {
  children: React.ReactNode;
  title: string;
  description: string;
  retryLabel: string;
}

interface State {
  hasError: boolean;
  retryKey: number;
}

export class ForumErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[Forum] Erreur de section:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/50 px-6 py-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{this.props.title}</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {this.props.description}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() =>
              this.setState((s) => ({ hasError: false, retryKey: s.retryKey + 1 }))
            }
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {this.props.retryLabel}
          </Button>
        </div>
      );
    }
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}
