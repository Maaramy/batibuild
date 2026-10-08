// ============================================================================
// PRIMITIVES DE MISE EN PAGE — hiérarchie sobre et progressive.
// ----------------------------------------------------------------------------
// « Le contenu et l'action avant l'interface » : ces composants imposent des
// titres courts, une typographie compacte et des surfaces discrètes. Ils sont
// volontairement neutres : aucune couleur décorative, seule la sémantique du
// contenu colore les éléments (voir tokens `success` / `warning` / `info`).
// ============================================================================

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** H1 compact : court, sans libellé décoratif. */
  title: ReactNode;
  /** Sous-titre discret (une ligne, text-muted). */
  subtitle?: ReactNode;
  /** Projet ou contexte actif, affiché à côté du titre. */
  context?: ReactNode;
  /** Une SEULE action principale, des actions secondaires facultatives. */
  actions?: ReactNode;
  /** Bouton retour (flèche) si fourni. */
  onBack?: () => void;
  /** Libellé accessible du bouton retour. */
  backLabel?: string;
  className?: string;
}

/** En-tête de page minimaliste (mobile-first, reste compact sur desktop). */
export function PageHeader({
  title,
  subtitle,
  context,
  actions,
  onBack,
  backLabel = "Retour",
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/50 pb-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">
              {title}
            </h1>
            {context}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export interface SectionProps {
  title?: ReactNode;
  /** Une phrase courte : pourquoi cette section existe. */
  description?: ReactNode;
  /** Actions discrètes alignées à droite de l'en-tête. */
  actions?: ReactNode;
  /** Conteneur « surface » (fond carte + bordure légère). */
  surface?: boolean;
  className?: string;
  children: ReactNode;
}

/** Section de page : en-tête compact + contenu, sans imbriquer les cartes. */
export function Section({
  title,
  description,
  actions,
  surface = false,
  className,
  children,
}: SectionProps) {
  return (
    <section className={cn("min-w-0", className)}>
      {(title || actions) && (
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[13px] font-semibold leading-tight sm:text-sm">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      <div
        className={cn(
          surface &&
            "rounded-xl border border-border/60 bg-card shadow-elev-1",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export interface CollapsibleSectionProps {
  /** État ouvert initial. */
  defaultOpen?: boolean;
  /** Contrôle externe (forcé ouvert / fermé). */
  open?: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** Résumé aligné à droite (ex. un montant) toujours visible. */
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Section repliable (progressive disclosure) : le détail n'apparaît qu'au
 * besoin. Le résumé reste visible pour répondre à « Quel est le résultat ? ».
 */
export function CollapsibleSection({
  defaultOpen = false,
  open: controlledOpen,
  title,
  description,
  meta,
  actions,
  className,
  children,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const toggle = () => {
    if (controlledOpen === undefined) setInternalOpen((v) => !v);
  };

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
          <span className="truncate text-[13px] font-semibold">{title}</span>
          {description && (
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
              {description}
            </span>
          )}
          {meta && (
            <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums">
              {meta}
            </span>
          )}
        </button>
        {actions}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
