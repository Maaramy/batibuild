import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { ArrowLeft, Briefcase, Heart, Home, Search, Send, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router";

// ============================================================================
// ProMarket — coquille de page + navigation horizontale scrollable
// (mêmes conventions que le reste de la plateforme : pas de barre fixe en bas)
// ============================================================================

export function ProMarketShell({
  title,
  subtitle,
  badge,
  action,
  children,
  bottomBar,
  backTo = "/dashboard",
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Barre d'actions fixe en bas (bottom navigation bar, ex. profil pro). */
  bottomBar?: React.ReactNode;
  backTo?: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation("promarket");

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(backTo)}
            aria-label={t("common.back")}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/60 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold sm:text-xl">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        <ProMarketTabs />

        <div className={cn("mt-4", bottomBar && "pb-20 sm:pb-16")}>{children}</div>
      </div>

      {/* ── Barre d'actions fixe en bas (mobile-first, RTL-friendly) ─────── */}
      {bottomBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-5 sm:py-3 lg:px-8">
            {bottomBar}
          </div>
        </div>
      )}
    </main>
  );
}

/** Onglets ProMarket : défilement horizontal fluide, état actif clair. */
export function ProMarketTabs() {
  const { t } = useTranslation("promarket");
  // Espace professionnel : STRICTEMENT réservé aux Experts BatiBuild. Le
  // drapeau vient du serveur (aucun état local ne peut le contourner) et
  // l'onglet reste masqué tant qu'il n'est pas confirmé.
  const access = useQuery(api.promarket.getMyProMarketAccess, {});
  const items = [
    { to: "/promarket", label: t("nav.home"), icon: Home, end: true },
    { to: "/promarket/search", label: t("nav.search"), icon: Search },
    { to: "/promarket/requests", label: t("nav.requests"), icon: Send },
    { to: "/promarket/saved", label: t("nav.saved"), icon: Heart },
    ...(access?.isExpert
      ? [{ to: "/promarket/pro-space", label: t("nav.proSpace"), icon: Briefcase }]
      : []),
  ];

  return (
    <div className="mt-3 -mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <nav className="flex w-max items-center gap-1 px-1">
        <span className="me-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
          <Store className="h-4 w-4" />
        </span>
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-95",
                isActive
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground",
              )
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** État vide / erreur compact, centré. */
export function ProMarketEmpty({
  icon,
  title,
  text,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center">
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold">{title}</p>
      {text && <p className="max-w-sm text-xs text-muted-foreground">{text}</p>}
      {action}
    </div>
  );
}
