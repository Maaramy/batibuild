import { ConvexReactClient } from "convex/react";
import { anyApi } from "convex/server";

// ============================================================================
// Client Convex partagé avec la plateforme Web (même déploiement, mêmes
// données, mêmes calculs). On utilise `anyApi` (proxy léger fourni par le SDK)
// pour référencer les fonctions — le codegen web (_generated) n'est pas
// importé afin de garder le typecheck mobile indépendant du backend.
// ============================================================================

export const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL is not defined. Copiez mobile/.env.example vers " +
      "mobile/.env et renseignez l'URL de votre déploiement Convex " +
      "(la même que VITE_CONVEX_URL sur le Web).",
  );
}

export const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

export const api = anyApi;

// ── Types locaux (miroir du schéma Convex — uniquement ce que le mobile lit) ─
export interface CostEstimateBreakdownItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface CostEstimateBreakdown {
  category: string;
  label: string;
  estimatedCost: number;
  percentage?: number;
  items?: CostEstimateBreakdownItem[];
}

export interface BudgetScenario {
  totalCost: number;
  costPerM2: number;
  label: string;
  multiplier: number;
}

export interface CostEstimate {
  totalCost: number;
  costPerSquareMeter?: number;
  currency: string;
  breakdown: CostEstimateBreakdown[];
  contingencyBuffer: number;
  contingencyPercentage: number;
  budgetScenarios?: {
    economique: BudgetScenario;
    standard: BudgetScenario;
    premium: BudgetScenario;
  };
}

export interface Project {
  _id: string;
  _creationTime?: number;
  userId: string;
  name: string;
  category: string;
  status: "draft" | "analyzing" | "completed" | "archived";
  description?: string;
  region?: string;
  surface?: number;
  floors?: number;
  bedrooms?: number;
  bathrooms?: number;
  isFavorite?: boolean;
  costEstimate?: CostEstimate;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  _id: string;
  name?: string;
  email?: string;
  image?: string;
  phone?: string;
  role?: string;
  userRole?: "client" | "supplier" | "expert";
  subscriptionPlan?: string | null;
  subscriptionEndDate?: number;
  company?: string;
}