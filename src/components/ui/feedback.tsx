// ============================================================================
// ÉTATS DE FEEDBACK — chargement, vide, erreur.
// ----------------------------------------------------------------------------
// Aucun écran ne doit rester blanc et aucun message technique (« Error 500 »)
// n'est montré : titres courts, phrases humaines, UNE action principale.
// ============================================================================

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Icône linéaire discrète (par défaut : panier vide). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Action principale unique (ex. « Créer un projet »). */
  action?: ReactNode;
  className?: string;
}

/** État vide véritable : jamais de page blanche. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-4 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface LoadingStateProps {
  /** Message principal (ex. « Analyse de votre projet… »). */
  message?: string;
  /**
   * Étapes d'un processus IA : `done` = ✓, `running` = ● en cours.
   * Évite les spinners interminables (progression visible).
   */
  steps?: { label: string; done?: boolean }[];
  className?: string;
}

/** État de chargement sobre, avec progression d'étapes lorsque possible. */
export function LoadingState({ message, steps, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-10 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-sm font-medium">{message ?? "Chargement…"}</p>
      {steps && steps.length > 0 && (
        <ul className="mt-1 space-y-1.5 text-left">
          {steps.map((step) => (
            <li
              key={step.label}
              className={cn(
                "flex items-center gap-2 text-xs",
                step.done ? "text-muted-foreground" : "text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                  step.done ? "bg-success" : "bg-primary animate-pulse",
                )}
              />
              {step.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Action « Réessayer » (affichée seulement si fournie). */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Message d'erreur simple et humain, jamais de code technique. */
export function ErrorState({
  title = "Une erreur est survenue",
  description = "Nous n'avons pas pu terminer cette opération.",
  onRetry,
  retryLabel = "Réessayer",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center",
        className,
      )}
    >
      <AlertTriangle className="h-5 w-5 text-destructive" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
