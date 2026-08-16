import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireQuota } from "@/components/RequireQuota";
import { SEO } from "@/components/SEO";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// i18n
import "./i18n/config";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NewProject = lazy(() => import("./pages/NewProject.tsx"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail.tsx"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.tsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage.tsx"));
const AiMaterials = lazy(() => import("./pages/AiMaterials.tsx"));
const ProjectGuide = lazy(() => import("./pages/ProjectGuide.tsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage.tsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.tsx"));
const LegalPage = lazy(() => import("./pages/LegalPage.tsx"));
const BlogPage = lazy(() => import("./pages/BlogPage.tsx"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage.tsx"));
const SupplierDashboard = lazy(() => import("./pages/SupplierDashboard.tsx"));
const InvestmentAnalysis = lazy(() => import("./pages/InvestmentAnalysis.tsx"));
const InvestmentResults = lazy(() => import("./pages/InvestmentResults.tsx"));
const ShareInvestment = lazy(() => import("./pages/ShareInvestment.tsx"));
const DemoInvestment = lazy(() => import("./pages/DemoInvestment.tsx"));
const DemoProject = lazy(() => import("./pages/DemoProject.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"),);

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
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="budgetbati-theme"
      >
        <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <RouteSyncer />
            <SEO />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Landing />} />
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
                <Route
                  path="/dashboard/new"
                  element={
                    <RequireAuth>
                      <RequireQuota type="construction">
                        <NewProject />
                      </RequireQuota>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/project/:id"
                  element={
                    <RequireAuth>
                      <ProjectDetail />
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
                  path="/dashboard/materials"
                  element={
                    <RequireAuth>
                      <MaterialsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/ai-materials"
                  element={
                    <RequireAuth>
                      <AiMaterials />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/guide"
                  element={
                    <RequireAuth>
                      <ProjectGuide />
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
                  path="/dashboard/supplier"
                  element={
                    <RequireAuth>
                      <SupplierDashboard />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/investments"
                  element={
                    <RequireAuth>
                      <RequireQuota type="investissement">
                        <InvestmentAnalysis />
                      </RequireQuota>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dashboard/investments/result/:analysisId"
                  element={
                    <RequireAuth>
                      <InvestmentResults />
                    </RequireAuth>
                  }
                />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/construction/demo" element={<DemoProject />} />
                <Route path="/investments/demo" element={<DemoInvestment />} />
                <Route path="/share/investment/:token" element={<ShareInvestment />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/terms" element={<LegalPage kind="terms" />} />
                <Route path="/privacy" element={<LegalPage kind="privacy" />} />
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Toaster />
          </BrowserRouter>
        </ConvexAuthProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
