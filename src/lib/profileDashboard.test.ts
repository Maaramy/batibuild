import { describe, it, expect } from "vitest";
import {
  DASHBOARD_BY_ROLE,
  DEFAULT_DASHBOARD,
  DASHBOARD_PATHS,
  dashboardPathForRole,
  isGenericDashboardPath,
  isUserRole,
  resolvePostAuthDestination,
  sanitizeReturnTo,
  userRoleLabel,
} from "./profileDashboard";

// ============================================================================
// Après inscription / connexion, le dashboard affiché correspond au type de
// profil du compte : Fournisseur → /dashboard/supplier, Expert →
// /dashboard/expert, Client Pro → /dashboard. Ces tests verrouillent la règle.
// ============================================================================

describe("dashboardPathForRole — un dashboard par type de profil", () => {
  it("associe chaque profil à son espace", () => {
    expect(dashboardPathForRole("client")).toBe("/dashboard");
    expect(dashboardPathForRole("supplier")).toBe("/dashboard/supplier");
    expect(dashboardPathForRole("expert")).toBe("/dashboard/expert");
  });

  it("renvoie null pour un type inconnu ou absent", () => {
    expect(dashboardPathForRole(undefined)).toBeNull();
    expect(dashboardPathForRole(null)).toBeNull();
    expect(dashboardPathForRole("")).toBeNull();
    expect(dashboardPathForRole("admin")).toBeNull();
    expect(dashboardPathForRole(42)).toBeNull();
  });

  it("expose des libellés français et un dashboard par défaut cohérents", () => {
    expect(userRoleLabel("supplier")).toBe("Fournisseur");
    expect(userRoleLabel("expert")).toBe("Expert");
    expect(userRoleLabel("client")).toBe("Client Pro");
    expect(userRoleLabel("inconnu")).toBeNull();
    expect(DEFAULT_DASHBOARD).toBe("/dashboard");
    expect(isUserRole("supplier")).toBe(true);
    expect(isUserRole("fournisseur")).toBe(false);
    expect(DASHBOARD_PATHS).toHaveLength(3);
    expect(DASHBOARD_BY_ROLE.supplier).toBe("/dashboard/supplier");
  });
});

describe("sanitizeReturnTo", () => {
  it("accepte un chemin interne", () => {
    expect(sanitizeReturnTo("/dashboard/messages")).toBe("/dashboard/messages");
    expect(sanitizeReturnTo("  /dashboard/projects?tab=all  ")).toBe(
      "/dashboard/projects?tab=all",
    );
  });

  it("refuse les valeurs absentes, relatives ou externes", () => {
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo(undefined)).toBeNull();
    expect(sanitizeReturnTo("")).toBeNull();
    expect(sanitizeReturnTo("dashboard")).toBeNull();
    expect(sanitizeReturnTo("https://evil.com")).toBeNull();
    expect(sanitizeReturnTo("//evil.com")).toBeNull();
    expect(sanitizeReturnTo("/\\evil.com")).toBeNull();
  });
});

describe("isGenericDashboardPath", () => {
  it("reconnaît les dashboards, avec ou sans paramètres et slash final", () => {
    for (const path of DASHBOARD_PATHS) {
      expect(isGenericDashboardPath(path)).toBe(true);
      expect(isGenericDashboardPath(`${path}/`)).toBe(true);
      expect(isGenericDashboardPath(`${path}?tab=all`)).toBe(true);
    }
  });

  it("ne confond pas une page précise avec un dashboard", () => {
    expect(isGenericDashboardPath("/dashboard/messages")).toBe(false);
    expect(isGenericDashboardPath("/dashboard/supplier/stats")).toBe(false);
    expect(isGenericDashboardPath(null)).toBe(false);
  });
});

describe("resolvePostAuthDestination", () => {
  it("envoie chaque profil sur son dashboard (inscription comme connexion)", () => {
    expect(resolvePostAuthDestination({ role: "supplier" })).toBe(
      "/dashboard/supplier",
    );
    expect(resolvePostAuthDestination({ role: "expert" })).toBe("/dashboard/expert");
    expect(resolvePostAuthDestination({ role: "client" })).toBe("/dashboard");
  });

  it("corrige un returnTo générique qui ne correspond pas au profil", () => {
    expect(
      resolvePostAuthDestination({ returnTo: "/dashboard", role: "supplier" }),
    ).toBe("/dashboard/supplier");
    expect(
      resolvePostAuthDestination({
        returnTo: "/dashboard/supplier",
        role: "expert",
      }),
    ).toBe("/dashboard/expert");
    expect(
      resolvePostAuthDestination({
        returnTo: "/dashboard/expert?tab=services",
        role: "client",
      }),
    ).toBe("/dashboard");
  });

  it("respecte une page protégée précise demandée avant la connexion", () => {
    expect(
      resolvePostAuthDestination({
        returnTo: "/dashboard/messages?tab=requests",
        role: "supplier",
      }),
    ).toBe("/dashboard/messages?tab=requests");
    expect(
      resolvePostAuthDestination({
        returnTo: "/dashboard/new",
        role: "client",
      }),
    ).toBe("/dashboard/new");
  });

  it("utilise le repli (`redirectAfterAuth`) quand le type est inconnu", () => {
    expect(resolvePostAuthDestination({ role: undefined })).toBe(DEFAULT_DASHBOARD);
    expect(
      resolvePostAuthDestination({ role: undefined, fallback: "/dashboard/projects" }),
    ).toBe("/dashboard/projects");
    // Un returnTo générique reste soumis au type de profil, jamais au repli.
    expect(
      resolvePostAuthDestination({
        returnTo: "/dashboard",
        role: "supplier",
        fallback: "/dashboard/projects",
      }),
    ).toBe("/dashboard/supplier");
  });

  it("ignore un returnTo dangereux et retombe sur le dashboard du profil", () => {
    expect(
      resolvePostAuthDestination({ returnTo: "//evil.com", role: "expert" }),
    ).toBe("/dashboard/expert");
  });
});
