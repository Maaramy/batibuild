// ============================================================================
// Type de profil → dashboard
//
// Source unique de vérité pour la destination affichée après inscription ou
// connexion : le dashboard dépend TOUJOURS du type de profil du compte
// (`users.userRole`), et non d'une URL générique.
//
//   client   (Client Pro)  → /dashboard
//   supplier (Fournisseur) → /dashboard/supplier
//   expert   (Expert)      → /dashboard/expert
//
// Un utilisateur sans type enregistré (comptes historiques) suit le profil
// « client », exactement comme le reste de l'application (voir
// `src/convex/users.ts#adminFixUserRoles`).
// ============================================================================

/** Types de profil utilisateur — miroir frontend de `users.userRole`. */
export type UserRole = "client" | "supplier" | "expert";

/** Dashboard de chaque type de profil. */
export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  client: "/dashboard",
  supplier: "/dashboard/supplier",
  expert: "/dashboard/expert",
};

/** Dashboard par défaut (profil Client Pro). */
export const DEFAULT_DASHBOARD = DASHBOARD_BY_ROLE.client;

/** Libellés français des profils (badges, messages). */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  client: "Client Pro",
  supplier: "Fournisseur",
  expert: "Expert",
};

/** Tous les dashboards « racine » : leur destination dépend du type de profil. */
export const DASHBOARD_PATHS: readonly string[] = Object.values(DASHBOARD_BY_ROLE);

const KNOWN_ROLES = Object.keys(DASHBOARD_BY_ROLE) as UserRole[];

/** Le type de profil est-il reconnu par la plateforme ? */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (KNOWN_ROLES as string[]).includes(value);
}

/**
 * Chemin du dashboard correspondant au type de profil.
 * `null` si le type est inconnu (l'appelant décide alors du repli).
 */
export function dashboardPathForRole(role: unknown): string | null {
  return isUserRole(role) ? DASHBOARD_BY_ROLE[role] : null;
}

/** Libellé français du type de profil, ou `null` si inconnu. */
export function userRoleLabel(role: unknown): string | null {
  return isUserRole(role) ? USER_ROLE_LABELS[role] : null;
}

/** Chemin sans query ni hash et sans slash final (`/dashboard/` → `/dashboard`). */
function normalizePath(path: string): string {
  const withoutQuery = path.split(/[?#]/)[0] ?? "";
  const trimmed = withoutQuery.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Chemin de retour interne et sûr, ou `null` quand la valeur est absente,
 * relative, externe (`https://…`) ou détournée (`//evil.com`, `/\evil.com`).
 */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw === "") return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}

/**
 * Le chemin de retour vise-t-il un dashboard (racine, avec ou sans paramètres) ?
 *
 * Dans ce cas c'est le type de profil qui décide — jamais l'URL d'origine :
 * un fournisseur arrivé sur `/dashboard` (ou `/dashboard/supplier`) avant sa
 * connexion doit atterrir sur le dashboard Fournisseur après son inscription.
 */
export function isGenericDashboardPath(value: string | null | undefined): boolean {
  const safe = sanitizeReturnTo(value);
  if (safe === null) return false;
  return DASHBOARD_PATHS.includes(normalizePath(safe));
}

/**
 * Destination après inscription ou connexion.
 *
 * 1. une page protégée précise demandée avant l'authentification
 *    (`/auth?returnTo=/dashboard/messages`) est respectée ;
 * 2. sinon → le dashboard du type de profil ;
 * 3. sinon → `fallback` (prop `redirectAfterAuth`), puis le dashboard Client.
 */
export function resolvePostAuthDestination({
  returnTo,
  role,
  fallback,
}: {
  returnTo?: string | null;
  role?: unknown;
  fallback?: string | null;
}): string {
  const target = sanitizeReturnTo(returnTo);
  if (target !== null && !isGenericDashboardPath(target)) return target;
  return (
    dashboardPathForRole(role) ?? sanitizeReturnTo(fallback) ?? DEFAULT_DASHBOARD
  );
}
