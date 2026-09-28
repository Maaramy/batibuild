import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { FeatureGate } from "@/components/FeatureGate";
import { FeatureFlagsProvider } from "@/hooks/use-feature-flags";
import { SEO } from "@/components/SEO";
import { MessagingBadgeSync } from "@/components/MessagingBadgeSync";
import { WebBootSync } from "@/components/WebBootSync";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { useSessionTracking } from "@/hooks/use-session-tracking";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  DEFAULT_DASHBOARD,
  dashboardPathForRole,
} from "@/lib/profileDashboard";
import { ThemeProvider } from "next-themes";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import "./index.css";

// i18n
import "./i18n/config";

// VlyToolbar is only used by the platform's dev overlay (element selection).
// Lazy-loading it keeps snapdom/@zumer and the remaining framer-motion code
// out of the entry chunk: smaller chunks mean lower peak memory during the
// production build (the platform build sandbox has a tight memory limit).
const VlyToolbar = lazy(() =>
  import("../vly-toolbar-readonly.tsx").then((m) => ({ default: m.VlyToolbar })),
);

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const MyProjects = lazy(() => import("./pages/MyProjects.tsx"));
const ReportCenter = lazy(() => import("./pages/ReportCenter.tsx"));
const NewProject = lazy(() => import("./pages/NewProject.tsx"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail.tsx"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.tsx"));
const SubscriptionAdminPage = lazy(() => import("./pages/SubscriptionAdminPage.tsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage.tsx"));
const AiMaterials = lazy(() => import("./pages/AiMaterials.tsx"));
const AiMaterialsResult = lazy(() => import("./pages/AiMaterialsResult.tsx"));
const PlanGenerator = lazy(() => import("./pages/PlanGenerator.tsx"));
const ProjectGuide = lazy(() => import("./pages/ProjectGuide.tsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage.tsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.tsx"));
const LegalPage = lazy(() => import("./pages/LegalPage.tsx"));
const BlogPage = lazy(() => import("./pages/BlogPage.tsx"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage.tsx"));
const SuppliersDirectory = lazy(() => import("./pages/SuppliersDirectory.tsx"));
const ProfessionalsDirectory = lazy(() => import("./pages/ProfessionalsDirectory.tsx"));
const SupplierProfile = lazy(() => import("./pages/SupplierProfile.tsx"));
const ExpertProfile = lazy(() => import("./pages/ExpertProfile.tsx"));
const SupplierDashboard = lazy(() => import("./pages/SupplierDashboard.tsx"));
const SupplierStats = lazy(() => import("./pages/SupplierStats.tsx"));
const UserMessages = lazy(() => import("./pages/UserMessages.tsx"));
const SupportPage = lazy(() => import("./pages/SupportPage.tsx"));
const ExpertDashboard = lazy(() => import("./pages/ExpertDashboard.tsx"));
const ExpertServices = lazy(() => import("./pages/ExpertServices.tsx"));
const ExpertStats = lazy(() => import("./pages/ExpertStats.tsx"));
const InvestmentAnalysis = lazy(() => import("./pages/InvestmentAnalysis.tsx"));
const InvestmentResults = lazy(() => import("./pages/InvestmentResults.tsx"));
const ShareInvestment = lazy(() => import("./pages/ShareInvestment.tsx"));
const DemoInvestment = lazy(() => import("./pages/DemoInvestment.tsx"));
const DemoProject = lazy(() => import("./pages/DemoProject.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"),);
const OfflineTest = lazy(() => import("./pages/OfflineTest.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Remonte la session temps réel pour l'analytique Admin (anonyme, sans cookie tiers). */
function SessionTracker() {
  useSessionTracking();
  return null;
}

/**
 * Accueil public. Un utilisateur déjà authentifié est renvoyé directement vers le
 * dashboard de SON type de profil (Fournisseur → /dashboard/supplier, Expert →
 * /dashboard/expert, Client Pro → /dashboard), sans repasser par la landing page
 * ni par le login.
 */
function HomeRoute() {
  const { isAuthenticated } = useConvexAuth();
  // `skip` pour les visiteurs anonymes : la landing page reste entièrement
  // publique et ne déclenche aucune souscription inutile.
  const user = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  if (!isAuthenticated) return <Landing />;
  // Le temps que le type de profil arrive, on ne redirige pas trop tôt.
  if (user === undefined) return <RouteLoading />;
  return (
    <Navigate
      to={dashboardPathForRole(user?.userRole) ?? DEFAULT_DASHBOARD}
      replace
    />
  );
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <Suspense fallback={null}>
          <VlyToolbar />
        </Suspense>
      </ToolbarErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="budgetbati-theme"
      >
        <ConvexAuthProvider client={convex}>
          <FeatureFlagsProvider>
          <BrowserRouter>
            <SessionTracker />
            {/* Pastille temps réel de la Messagerie : publiée vers la barre de
                navigation native de l'application Android. */}
            <MessagingBadgeSync />
            {/* Démarrage rapide Web : cookies NON sensibles (langue, thème, état
                de connexion), Service Worker de cache et préchargement du
                module suivant. Sans aucun effet dans l'application Android
                (voir `src/components/WebBootSync.tsx`). */}
            <WebBootSync />
            {/* État du réseau : détection temps réel de la perte de connexion et
                de sa reprise. Bannière unique, non bloquante, sans effet sur la
                session ; identique sur Desktop, Mobile Web et application
                Android (même plateforme Web). */}
            <NetworkStatusBanner />
            <RouteSyncer />
            <SEO />
            <Suspense fallback={<RouteLoading />}>              <Routes>
                <Route path="/" element={<HomeRoute />} />

                <Route
                  path="/auth"
                  element={<AuthPage redirectAfterAuth="/dashboard" />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />
                {/* Liste complète des projets de l'utilisateur — cible de
                    l'onglet « Mes projets » de l'application Android. */}
                <Route
                  path="/dashboard/projects"
                  element={
                    <RequireAuth>
                      <MyProjects />
                    </RequireAuth>
                  }
                />
                {/* Centre de rapports PDF — accessible depuis le menu principal,
                    liste les projets de l'utilisateur et leurs rapports réels. */}
                <Route
                  path="/dashboard/reports"
                  element={
                    <RequireAuth>
                      <ReportCenter />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/new"
                  element={
                    <RequireAuth>
                      <FeatureGate flag="construction_cost_estimation">
                        <NewProject />
                      </FeatureGate>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/project/:id"
                  element={
                    <RequireAuth>
                      <FeatureGate flag="construction_cost_estimation">
                        <ProjectDetail />
                      </FeatureGate>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <RequireAuth>
                      <AdminPanel />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/pricing"
                  element={
                    <RequireAuth>
                      <PricingPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/admin/subscriptions"
                  element={
                    <RequireAuth>
                      <SubscriptionAdminPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/materials"
                  element={
                    <RequireAuth>
                      <FeatureGate flag="ai_materials">
                        <MaterialsPage />
                      </FeatureGate>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/ai-materials"
                  element={
                    <RequireAuth>
                      <FeatureGate flag="ai_materials">
                        <AiMaterials />
                      </FeatureGate>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/ai-materials/result/:id"
                  element={
                    <RequireAuth>
                      <FeatureGate flag="ai_materials">
                        <AiMaterialsResult />
                      </FeatureGate>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/plans/:id"
                  element={
                    <RequireAuth>
                      <FeatureGate flag="architectural_plans">
                        <PlanGenerator />
                      </FeatureGate>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/guide"
                  element={
                    <RequireAuth>
                      <FeatureGate flag="construction_guide">
                        <ProjectGuide />
                      </FeatureGate>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/profile"
                  element={
                    <RequireAuth>
                      <ProfilePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/settings"
                  element={
                    <RequireAuth>
                      <SettingsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/professionals-directory"
                  element={
                    <RequireAuth>
                      <ProfessionalsDirectory />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/suppliers-directory"
                  element={
                    <RequireAuth>
                      <SuppliersDirectory />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/supplier-profile/:id"
                  element={
                    <RequireAuth>
                      <SupplierProfile />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/expert-profile/:id"
                  element={
                    <RequireAuth>
                      <ExpertProfile />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/supplier"
                  element={
                    <RequireAuth>
                      <SupplierDashboard />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/supplier/stats"
                  element={
                    <RequireAuth>
                      <SupplierStats />
                    </RequireAuth>
                  }
                />
                {/* Ancien espace « Devis reçus » : supprimé au profit de la
                    messagerie. Le lien reste un simple renvoi (jamais de page
                    morte) vers l'onglet « Demandes de devis ». */}
                <Route
                  path="/dashboard/supplier/quotes"
                  element={<Navigate to="/dashboard/messages?tab=requests" replace />}
                />
                <Route
                  path="/dashboard/messages"
                  element={
                    <RequireAuth>
                      <UserMessages />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/support"
                  element={
                    <RequireAuth>
                      <SupportPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/expert"
                  element={
                    <RequireAuth>
                      <ExpertDashboard />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/expert/services"
                  element={
                    <RequireAuth>
                      <ExpertServices />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/expert/stats"
                  element={
                    <RequireAuth>
                      <ExpertStats />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/investments"
                  element={
                    <RequireAuth>
                      <FeatureGate flag="investment_project">
                        <InvestmentAnalysis />
                      </FeatureGate>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/investments/result/:analysisId"
                  element={
                    <RequireAuth>
                      <FeatureGate flag="investment_project">
                        <InvestmentResults />
                      </FeatureGate>
                    </RequireAuth>
                  }
                />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/construction/demo" element={<DemoProject />} />
                <Route path="/investments/demo" element={
                  <FeatureGate flag="investment_project">
                    <DemoInvestment />
                  </FeatureGate>
                } />
                <Route path="/share/investment/:token" element={<ShareInvestment />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                {/* Page de TEST interne : force `navigator.onLine` et émet les
                    vrais évènements `offline` / `online` pour vérifier la bannière
                    réseau affichée dans toute l'application. */}
                <Route path="/offline-test" element={<OfflineTest />} />
                <Route path="/terms" element={<LegalPage kind="terms" />} />
                <Route path="/privacy" element={<LegalPage kind="privacy" />} />
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Toaster />
          </BrowserRouter>
          </FeatureFlagsProvider>
        </ConvexAuthProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
