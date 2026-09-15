import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";
import SeoSettings from "./SeoSettings";
import BlogAdmin from "./BlogAdmin";
import BIMSettings from "./BIMSettings";
import EmailSettings from "./EmailSettings";
import EmailTemplates from "./EmailTemplates";
import EmailHistory from "./EmailHistory";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import SupportAdmin from "@/components/admin/SupportAdmin";
import { ProMarketAdmin } from "@/components/admin/ProMarketAdmin";
import { AnnouncementList } from "@/components/admin/announcements/AnnouncementList";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  Cpu,
  Edit,
  HardHat,
  Loader2,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  User,
  Users,
  Briefcase,
  X,
  Package,
  Shield,
  Banknote,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Mail,
  MapPin,
  Phone,
  Crown,
  CreditCard,
  Activity,
  UserPlus,
  RefreshCw,
  Smartphone,
  Globe,
  Map as MapIcon,
  FileText,
  Calendar,
  NotebookPen,
  CheckCheck,
  Upload,
  ToggleLeft,
  ToggleRight,
  Download,
  Eye,
  EyeOff,
  Receipt,
  Landmark,
  Newspaper,
  Megaphone,
  Headset,
  Store,
} from "lucide-react";

// ============================================================================
// Admin Panel
// ============================================================================

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Agent support : ouvre directement le module Support & Messagerie
  const isSupportAgentRole = user?.role === ("support_agent" as any);
  // Ouverture directe d'un onglet via l'URL (ex : notifications → ?tab=support&ticket=...)
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const VALID_TABS = [
    "dashboard", "users", "projects", "investments", "materials", "virements",
    "recus", "recusFournisseurs", "recusExperts", "subscriptions", "fournisseurs",
    "experts", "analytics", "support", "promarket", "journal", "paiement", "limites",
    "seo", "blog", "bim", "emails", "modeles", "historique",
  ];
  const initialTab =
    isSupportAgentRole
      ? "support"
      : requestedTab && VALID_TABS.includes(requestedTab)
        ? requestedTab
        : "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [recusFilter, setRecusFilter] = useState<string>("all");
  const [supplierRecusFilter, setSupplierRecusFilter] = useState<string>("all");
  const [expertSearch, setExpertSearch] = useState("");
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const [previewSupplierReceipt, setPreviewSupplierReceipt] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allProjects = useQuery(api.projects.getAllProjects) || [];
  const allAnalyses = useQuery(api.investments.getAllAnalyses) || [];
  const materialPrices = useQuery(api.materials.getMaterialPrices, {}) || [];

  // New material form
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    category: "ciment",
    unit: "",
    unitPrice: 0,
    currency: "TND",
  });
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ updated: number; created: number; errors: string[]; total: number } | null>(null);
  const [showImportZone, setShowImportZone] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [batchDeletingProjects, setBatchDeletingProjects] = useState(false);
  const [investmentSearch, setInvestmentSearch] = useState("");
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<Set<string>>(new Set());
  const [batchDeletingAnalyses, setBatchDeletingAnalyses] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRecuIds, setSelectedRecuIds] = useState<Set<string>>(new Set());
  const [batchDeletingRecus, setBatchDeletingRecus] = useState(false);
  const [purgeResult, setPurgeResult] = useState<any>(null);
  const [purgeRunning, setPurgeRunning] = useState(false);

  const pendingSubs = useQuery(api.subscriptions.getPendingSubscriptions) || [];
  const allSubsWithUsers = useQuery(api.subscriptions.getAllSubscriptionsWithUsers) || [];
  const allUsers = useQuery(api.users.getAllUsers) || [];
  // Compteur temps réel de messages non lus dans le module Support (badge onglet)
  const supportUnread = useQuery(api.support.adminUnreadTotal) || 0;
  const approveSub = useMutation(api.subscriptions.adminApproveSubscription);
  const rejectSub = useMutation(api.subscriptions.adminRejectSubscription);
  const updateUserRole = useMutation(api.users.adminUpdateUserRole);
  const setUserProfileRole = useMutation(api.users.adminSetUserProfileRole);
  const updateUserPlan = useMutation(api.users.adminUpdateUserPlan);
  const deleteUser = useMutation(api.users.deleteUser);
  const toggleUserStatus = useMutation(api.users.toggleUserStatus);
  const markReceiptVerified = useMutation(api.subscriptions.markReceiptVerified);
  const deleteSubscriptionReceipt = useMutation(api.subscriptions.adminDeleteSubscriptionReceipt);
  const runStoragePurge = useMutation(api.storageCleanup.runStoragePurge);
  const fixUserRoles = useMutation(api.users.adminFixUserRoles);
  const batchDeleteUsers = useMutation(api.users.batchDeleteUsers);
  const batchDeleteProjects = useMutation(api.projects.adminBatchDeleteProjects);
  const batchDeleteAnalyses = useMutation(api.investments.adminDeleteAnalyses);
  const deleteAnalysisMutation = useMutation(api.investments.adminDeleteAnalysis);
  const batchDeleteSubscriptions = useMutation(api.subscriptions.adminBatchDeleteSubscriptions);
  const adminDeleteSupplierProfile = useMutation(api.supplierProfiles.adminDeleteProfile);
  const adminToggleSupplierVisibility = useMutation(api.supplierProfiles.adminToggleVisibility);
  const approveSupplierSub = useMutation(api.supplierProfiles.adminApproveSupplierSubscription);
  const rejectSupplierSub = useMutation(api.supplierProfiles.adminRejectSupplierSubscription);
  const verifySupplierReceipt = useMutation(api.supplierProfiles.adminVerifySupplierReceipt);
  const deleteSupplierReceipt = useMutation(api.supplierProfiles.adminDeleteSupplierReceipt);
  const approveExpertSub = useMutation(api.expertProfiles.adminApproveExpertSubscription);
  const rejectExpertSub = useMutation(api.expertProfiles.adminRejectExpertSubscription);
  const verifyExpertReceipt = useMutation(api.expertProfiles.adminVerifyExpertReceipt);
  const deleteExpertReceipt = useMutation(api.expertProfiles.adminDeleteExpertReceipt);
  const deleteExpertProfile = useMutation(api.expertProfiles.adminDeleteExpertProfile);
  const toggleExpertVisibility = useMutation(api.expertProfiles.adminToggleExpertVisibility);

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const adminLogs = useQuery(api.users.getAdminLogs, { limit: 100 }) || [];
  
  // Plan limits
  const planForm = useQuery(api.payments.getPlanPricing);
  const allSuppliers = useQuery(api.supplierProfiles.getAllSupplierProfiles) || [];
  const allExperts = useQuery(api.expertProfiles.getAllExpertProfiles) || [];
  const updatePlanPricing = useMutation(api.payments.updatePlanPricing);
  const paymentConfigData = useQuery(api.payments.getPaymentConfigAdmin) || null;
  const updatePaymentConfig = useMutation(api.payments.updatePaymentConfig);
  // Abonnements mensuels (30 jours) — trois offres : Client Pro, Fournisseur, Expert.
  // Prix null/0 = forfait gratuit (bascule « Offre gratuite » par forfait).
  // Client Pro est payant par défaut (80 TND/mois) — plus aucun essai gratuit.
  const [limitForm, setLimitForm] = useState({
    clientProPrice: 80,
    supplierPrice: 120,
    expertPrice: 120,
    clientProFree: false,
    supplierFree: false,
    expertFree: false,
  });
  const [savingLimits, setSavingLimits] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<Record<string, any>>({
    bankName: "", bankTitulaire: "", bankRib: "", bankIban: "", bankSwift: "",
    d17MerchantName: "", d17Phone: "", d17Email: "", d17Notice: "",
  });

  // Sync local form when config loads (prix uniques par forfait, appliqués aux deux types)
  useEffect(() => {
    if (planForm) {
      const isFree = (p: number | null | undefined) => p == null || p === 0;
      setLimitForm({
        clientProPrice: isFree(planForm.proPrice) ? 80 : planForm.proPrice,
        supplierPrice: isFree(planForm.supplierPrice) ? 120 : planForm.supplierPrice,
        expertPrice: isFree(planForm.expertPrice) ? 120 : planForm.expertPrice,
        clientProFree: isFree(planForm.proPrice),
        supplierFree: isFree(planForm.supplierPrice),
        expertFree: isFree(planForm.expertPrice),
      });
    }
  }, [planForm?.proPrice, planForm?.expertPrice, planForm?.supplierPrice]);

  // Sync payment form when config loads
  useEffect(() => {
    if (paymentConfigData && paymentConfigData._id) {
      setPaymentForm({
        bankName: paymentConfigData.bankName || "",
        bankTitulaire: paymentConfigData.bankTitulaire || "",
        bankRib: paymentConfigData.bankRib || "",
        bankIban: paymentConfigData.bankIban || "",
        bankSwift: paymentConfigData.bankSwift || "",
        d17MerchantName: paymentConfigData.d17MerchantName || "",
        d17Phone: paymentConfigData.d17Phone || "",
        d17Email: paymentConfigData.d17Email || "",
        d17Notice: paymentConfigData.d17Notice || "",
      });
    }
  }, [paymentConfigData?._id]);

  const createMaterial = useMutation(api.materials.createMaterialPrice);
  const updateMaterial = useMutation(api.materials.updateMaterialPrice);
  const deleteMaterial = useMutation(api.materials.deleteMaterialPrice);
  const bulkUpdateMaterialPrices = useMutation(api.materials.bulkUpdateMaterialPrices);

  // Handle user deletion
  useEffect(() => {
    if (!deletingUserId) return;
    const doDelete = async () => {
      try {
        await deleteUser({ userId: deletingUserId as any });
        toast.success("Utilisateur supprimé avec succès");
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de la suppression");
      }
      setDeletingUserId(null);
    };
    doDelete();
  }, [deletingUserId, deleteUser]);

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedUserIds.size === 0) return;
    if (!window.confirm(`⚠️ Supprimer définitivement ${selectedUserIds.size} utilisateur(s) ?\n\nToutes leurs données seront supprimées. Cette action est irréversible.`)) return;

    setBatchDeleting(true);
    try {
      const result = await batchDeleteUsers({ userIds: Array.from(selectedUserIds) as any });
      if (result.deleted?.length) {
        toast.success(`${result.deleted.length} utilisateur(s) supprimé(s)`);
      }
      if (result.errors?.length) {
        toast.error(result.errors.join(", "));
      }
      setSelectedUserIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
    setBatchDeleting(false);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    const filtered = allUsers.filter((u: any) =>
      userSearch
        ? (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.email || "").toLowerCase().includes(userSearch.toLowerCase())
        : true
    );
    if (selectedUserIds.size === filtered.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filtered.map((u: any) => u._id)));
    }
  };

  // Roles with access to the admin panel
  const isAdmin = user?.role === "admin";
  const isModerator = user?.role === "moderator";
  // Onglets accessibles au modérateur (le module support est accessible à tout le staff)
  const MODERATOR_TABS = ["dashboard", "users", "recus", "recusFournisseurs", "recusExperts", "subscriptions", "fournisseurs", "experts", "support", "promarket"];
  // Agent support : accès uniquement au module Support & Messagerie
  const canSee = (tab: string) =>
    isAdmin ||
    MODERATOR_TABS.includes(tab) ||
    (isSupportAgentRole && tab === "support");

  // Check if user is admin/moderator/support agent
  if (user && !isAdmin && !isModerator && !isSupportAgentRole) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <div>
          <Card className="border border-border/40 shadow-xl shadow-primary/5 max-w-md overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-500 to-primary/50" />
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/20">
                <Shield className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold">Accès refusé</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Vous n'avez pas les droits d'administration nécessaires pour accéder à cette page.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Retour au tableau de bord
                </Button>
                <Button onClick={() => navigate("/admin")}>
                  <Shield className="h-4 w-4 mr-2" />
                  Administration
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      if (wb.SheetNames.length === 0) throw new Error("Le fichier Excel est vide");

      // ── 1. Auto-detect the data sheet ──
      // Prefer sheets named "Base matériaux" or containing "matériaux" in the name.
      // Fallback: scan each sheet's first 10 rows for known header keywords.
      const HEADER_SIGNALS = ["désignation", "designation", "prix", "unité", "id matériau"];
      let chosenSheet = wb.SheetNames[0];
      let rawRows: (string | number)[][] = [];

      for (const sn of wb.SheetNames) {
        const lower = sn.toLowerCase();
        const ws = wb.Sheets[sn];
        const candidate = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: "", blankrows: false });
        if (candidate.length === 0) continue;

        // Check if any of the first 10 rows contain header signals
        const sample = candidate.slice(0, 10).flat().join(" ").toLowerCase();
        const signalCount = HEADER_SIGNALS.filter(s => sample.includes(s)).length;

        if (lower.includes("base") && lower.includes("matériau")) {
          chosenSheet = sn; rawRows = candidate; break; // Perfect match
        }
        if (signalCount >= 3) {
          chosenSheet = sn; rawRows = candidate; break; // Good enough
        }
        // Keep first sheet as fallback
        if (rawRows.length === 0) { rawRows = candidate; chosenSheet = sn; }
      }

      if (rawRows.length === 0) throw new Error("Aucune feuille de données trouvée dans le fichier");

      // ── 2. Find the real header row (scan first 20 rows) ──
      let headerIdx = -1;
      let headers: string[] = [];
      const scanLimit = Math.min(20, rawRows.length);

      for (let r = 0; r < scanLimit; r++) {
        const row = rawRows[r];
        if (!Array.isArray(row) || row.length < 3) continue;
        const cells = row.map(c => String(c || "").toLowerCase().trim());
        const joined = cells.join(" ");
        const hitCount = HEADER_SIGNALS.filter(s => joined.includes(s)).length;
        if (hitCount >= 2) {
          headerIdx = r;
          headers = cells;
          break;
        }
      }

      if (headerIdx === -1) {
        throw new Error(`En-têtes non trouvés dans les 20 premières lignes de « ${chosenSheet} ».
Colonnes de la 1ère ligne : ${rawRows[0]?.slice(0, 8).join(", ")}`);
      }

      // ── 3. Map columns ──
      const skuKeys = ["id matériau", "sku", "id", "réf", "ref", "code"];
      const priceKeys = ["prix référence", "prix ref", "prix", "price", "tarif", "montant"];
      const nameKeys = ["désignation", "designation", "nom", "name", "libellé", "description"];
      const unitKeys = ["unité", "unite", "unit"];

      function findColIdx(candidates: string[]): number {
        for (const c of candidates) {
          const idx = headers.findIndex(h => h === c || h.startsWith(c));
          if (idx !== -1) return idx;
        }
        return -1;
      }

      const skuIdx = findColIdx(skuKeys);
      const priceIdx = findColIdx(priceKeys);
      const nameIdx = findColIdx(nameKeys);
      const unitIdx = findColIdx(unitKeys);

      if (priceIdx === -1) {
        throw new Error(
          `Colonne de prix non trouvée. Lignes d'en-tête détectées (row ${headerIdx}) :\n${headers.filter(Boolean).join(" | ")}`
        );
      }

      // ── 4. Parse data rows ──
      const dataRows = rawRows.slice(headerIdx + 1);
      const parsedRows: { sku?: string; name: string; unitPrice: number; unit?: string }[] = [];

      for (const row of dataRows) {
        if (!Array.isArray(row)) continue;
        const name = nameIdx >= 0 ? String(row[nameIdx] || "").trim() : "";
        const sku = skuIdx >= 0 ? String(row[skuIdx] || "").trim() : undefined;
        const priceRaw = row[priceIdx];
        const unitPrice = typeof priceRaw === "number"
          ? priceRaw
          : parseFloat(String(priceRaw).replace(/[^\d.,-]/g, "").replace(",", "."));
        const unit = unitIdx >= 0 ? String(row[unitIdx] || "").trim() : undefined;

        if (isNaN(unitPrice) || unitPrice <= 0) continue;
        if (!name && !sku) continue;

        parsedRows.push({
          sku: sku || undefined,
          name: name || sku || "",
          unitPrice,
          unit: unit || undefined,
        });
      }

      if (parsedRows.length === 0) {
        throw new Error(
          `Aucune ligne valide trouvée dans « ${chosenSheet} » (row d'en-tête: ${headerIdx}, colonnes: ${headers.filter(Boolean).join(", ")})`
        );
      }

      // ── 5. Send to Convex in batches ──
      const BATCH_SIZE = 200;
      let totalUpdated = 0;
      let totalCreated = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
        const batch = parsedRows.slice(i, i + BATCH_SIZE);
        const result = await bulkUpdateMaterialPrices({ rows: batch });
        totalUpdated += result.updated;
        totalCreated += result.created;
        allErrors.push(...result.errors);
      }

      setImportResult({
        updated: totalUpdated,
        created: totalCreated,
        errors: allErrors,
        total: parsedRows.length,
      });

      if (allErrors.length > 0) {
        toast.warning(`${totalUpdated} mis à jour, ${totalCreated} créés, ${allErrors.length} erreur(s)`);
      } else {
        toast.success(`${totalUpdated} prix mis à jour, ${totalCreated} nouveaux matériaux créés`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'importation du fichier");
      setImportResult(null);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleCreateMaterial = async () => {
    if (!newMaterial.name || !newMaterial.unit || !newMaterial.unitPrice) return;
    await createMaterial({
      ...newMaterial,
      category: newMaterial.category as any,
    });
    setShowNewMaterial(false);
    setNewMaterial({ name: "", category: "ciment", unit: "", unitPrice: 0, currency: "TND" });
  };

  const handleUpdateMaterial = async (id: string) => {
    const vals = editValues[id];
    if (!vals) return;
    await updateMaterial({
      id: id as any,
      unitPrice: vals.unitPrice,
      name: vals.name,
      unit: vals.unit,
    });
    setEditingMaterial(null);
    setEditValues({});
  };

  const filteredMaterials = materialPrices.filter((m: any) =>
    searchQuery ? m.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const categoryLabels: Record<string, string> = {
    // ── Catégories officielles 2026 ──
    terrassement_granulats: "Terrassement et granulats",
    liants_ciments_mortiers: "Liants, ciments et mortiers",
    betons_prefabrication: "Bétons et préfabrication",
    acier_metaux_structure: "Acier et métaux de structure",
    maconnerie_plancher: "Maçonnerie et éléments de plancher",
    bois_panneaux_coffrage: "Bois, panneaux et coffrage",
    etancheite_protection: "Étanchéité et protection",
    isolation_thermique: "Isolation thermique et acoustique",
    cloisons_platre_plafonds: "Cloisons, plâtre et plafonds",
    toitures_bardages_facades: "Toitures, bardages et façades",
    revetements_sols_murs: "Revêtements de sols et murs",
    peintures_enduits_finitions: "Peintures, enduits et finitions",
    menuiseries: "Menuiseries",
    vitrage_verriers: "Vitrage et produits verriers",
    chimie_construction: "Chimie de construction",
    quincaillerie_fixations: "Quincaillerie et fixations",
    eclairage: "Éclairage",
    cvc_chauffage_ventilation: "CVC, chauffage et ventilation",
    energies_renouvelables: "Énergies renouvelables",
    securite_incendie_surete: "Sécurité incendie et sûreté",
    voirie_reseaux_drainage: "Voirie, réseaux divers et drainage",
    amenagements_exterieurs: "Aménagements extérieurs",
    materiaux_durables_biosources: "Matériaux durables et biosourcés",
    plomberie_evacuation: "Plomberie et évacuation",
    sanitaires_robinetterie: "Sanitaires et robinetterie",
    electricite_courants_forts: "Électricité – courants forts",
    equipements: "Équipements (legacy)",
    main_oeuvre: "Main-d'œuvre",
    transport: "Transport",
    location_engins: "Location engins",
    // ── Catégories legacy ──
    ciment: "Ciment (legacy)",
    sable: "Sable (legacy)",
    gravier: "Gravier (legacy)",
    briques: "Briques (legacy)",
    parpaings: "Parpaings (legacy)",
    beton: "Béton (legacy)",
    acier: "Acier (legacy)",
    bois: "Bois (legacy)",
    peinture: "Peinture (legacy)",
    carrelage: "Carrelage (legacy)",
    marbre: "Marbre (legacy)",
    plomberie: "Plomberie (legacy)",
    electricite: "Électricité (legacy)",
    portes: "Portes (legacy)",
    fenetres: "Fenêtres (legacy)",
    toiture: "Toiture (legacy)",
    etancheite: "Étanchéité (legacy)",
    isolation: "Isolation (legacy)",
    revetements: "Revêtements (legacy)",
    terrassement: "Terrassement (legacy)",
    fondations: "Fondations (legacy)",
    finition: "Finition (legacy)",
    divers: "Divers",
  };

  const totalCost = allProjects.reduce((sum: number, p: any) => sum + (p.costEstimate?.totalCost || 0), 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/3 via-background to-background">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-500 to-violet-500/30" />

      {/* Header */}
      <header className="border-b border-border/20 bg-background/60 backdrop-blur-xl shadow-sm shadow-primary/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="gap-1.5 h-9 shrink-0 hover:bg-muted/40" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Retour</span>
            </Button>
            <div className="h-5 w-px bg-border/40 shrink-0" />
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">Administration</h1>
                <p className="text-[10px] text-muted-foreground/60 hidden sm:block">Panneau de gestion batibuild App (v2)</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full border border-border/20">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {allUsers.length} utilisateurs
            </span>
            <Badge className={cn("text-[10px] px-2.5 py-0.5", isModerator ? "bg-amber-500/10 text-amber-600 border-amber-500/25" : "bg-primary/10 text-primary border-primary/20")}>
              <Shield className="h-3 w-3 mr-1" />
              {isModerator ? "Modérateur" : "Admin"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Navigation */}
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-5 sm:mb-6 scrollbar-hide">
            <TabsList className="inline-flex h-auto w-max gap-1 bg-gradient-to-r from-muted/20 to-muted/10 border border-border/20 p-1 rounded-2xl backdrop-blur-sm shadow-sm">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>Utilisateurs</span>
              </TabsTrigger>
              {canSee("projects") && (
              <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>Projets</span>
              </TabsTrigger>
              )}
              {canSee("projects") && (
              <TabsTrigger value="investments" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Landmark className="h-3.5 w-3.5" />
                <span>Investissements</span>
              </TabsTrigger>
              )}
              {canSee("materials") && (
              <TabsTrigger value="materials" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Package className="h-3.5 w-3.5" />
                <span>Matériaux</span>
              </TabsTrigger>
              )}
              {canSee("virements") && (
              <TabsTrigger value="virements" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5 relative">
                <Banknote className="h-3.5 w-3.5" />
                <span>Virements</span>
                {pendingSubs.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm">
                    {pendingSubs.length}
                  </span>
                )}
              </TabsTrigger>
              )}
              <TabsTrigger value="recus" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>Reçus</span>
              </TabsTrigger>
              <TabsTrigger value="recusFournisseurs" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5 relative">
                <Receipt className="h-3.5 w-3.5" />
                <span>Reçus Fournisseurs</span>
                {allSuppliers.filter((s: any) => s.paymentProofUrl && !s.paymentProofVerified).length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white shadow-sm">
                    {allSuppliers.filter((s: any) => s.paymentProofUrl && !s.paymentProofVerified).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="recusExperts" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5 relative">
                <Receipt className="h-3 w-3" />
                <span>Reçus Experts</span>
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Abonnements</span>
              </TabsTrigger>
              {canSee("journal") && (
              <TabsTrigger value="journal" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <NotebookPen className="h-3.5 w-3.5" />
                <span>Journal</span>
              </TabsTrigger>
              )}
              {canSee("paiement") && (
              <TabsTrigger value="paiement" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                <span>Paiement</span>
              </TabsTrigger>
              )}
              {canSee("limites") && (
              <TabsTrigger value="limites" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <HardHat className="h-3.5 w-3.5" />
                <span>Abonnements</span>
              </TabsTrigger>
              )}
              <TabsTrigger value="fournisseurs" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5 relative">
                <Building2 className="h-3.5 w-3.5" />
                <span>Fournisseurs</span>
                {allSuppliers.filter((s: any) => s.subscriptionStatus === "pending").length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white shadow-sm">
                    {allSuppliers.filter((s: any) => s.subscriptionStatus === "pending").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="experts" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5 relative">
                <Briefcase className="h-3.5 w-3.5" />
                <span>Experts</span>
              </TabsTrigger>
              {canSee("seo") && (
              <TabsTrigger value="seo" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                <span>SEO</span>
              </TabsTrigger>
              )}
              {canSee("blog") && (
              <TabsTrigger value="blog" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Newspaper className="h-3.5 w-3.5" />
                <span>Blog</span>
              </TabsTrigger>
              )}
              {canSee("bim") && (
              <TabsTrigger value="bim" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span>BIM</span>
              </TabsTrigger>
              )}
              {canSee("emails") && (
              <TabsTrigger value="emails" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5 relative">
                <Mail className="h-3.5 w-3.5" />
                <span>E-mails</span>
              </TabsTrigger>
              )}
              {canSee("modeles") && (
              <TabsTrigger value="modeles" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>Modèles</span>
              </TabsTrigger>
              )}
              {canSee("historique") && (
              <TabsTrigger value="historique" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                <span>Historique E-mails</span>
              </TabsTrigger>
              )}
              {canSee("annonces") && (
              <TabsTrigger value="annonces" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5 relative">
                <Megaphone className="h-3.5 w-3.5" />
                <span>Communications</span>
              </TabsTrigger>
              )}
              {canSee("analytics") && (
              <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                <span>Analytics</span>
              </TabsTrigger>
              )}
              {canSee("support") && (
              <TabsTrigger value="support" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5 relative">
                <Headset className="h-3.5 w-3.5" />
                <span>Support</span>
                {supportUnread > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm">
                    {supportUnread}
                  </span>
                )}
              </TabsTrigger>
              )}
              {canSee("promarket") && (
              <TabsTrigger value="promarket" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs gap-1.5 relative">
                <Store className="h-3.5 w-3.5" />
                <span>ProMarket</span>
              </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* ── Support ── */}
          {canSee("support") && (
            <TabsContent value="support">
              <SupportAdmin />
            </TabsContent>
          )}

          {/* ── ProMarket ── */}
          {canSee("promarket") && (
            <TabsContent value="promarket">
              <ProMarketAdmin />
            </TabsContent>
          )}

          {/* ── Fournisseurs ── */}
            <TabsContent value="fournisseurs">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <h2 className="text-lg font-semibold">Gestion des fournisseurs (v2)</h2>
                      <p className="text-xs text-muted-foreground">{allSuppliers.length} fournisseur(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="h-9 w-36 sm:w-44 pl-9 text-sm"
                      />
                    </div>
                    {allSuppliers.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs shrink-0"
                        onClick={() => {
                          const headers = ["Société","Contact","Email","Téléphone","Adresse","Spécialités","Régions","Statut","Visibilité","Date inscription"];
                        const rows = allSuppliers.map((p: any) => [
                          p.companyName || "",
                          p.user?.name || "",
                          p.email || "",
                          p.phone || "",
                          p.address || "",
                          (p.specialties || []).join(", "),
                          (p.regions || []).join(", "),
                          p.subscriptionStatus || "",
                          p.isVisible ? "Visible" : "Masqué",
                          p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : "",
                        ]);
                        const csv = [headers.join(","), ...rows.map((r: string[]) => r.map(c => `"${c}"`).join(","))].join("\n");
                        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "fournisseurs_" + new Date().toISOString().split("T")[0] + ".csv";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Fichier CSV exporté");
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                  )}
                  </div>
                </div>

                {allSuppliers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mx-auto mb-4">
                      <Building2 className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-semibold">Aucun fournisseur</p>
                    <p className="text-xs text-muted-foreground mt-1">Les profils fournisseurs apparaîtront ici après inscription.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs">Fournisseur</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Contact</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Spécialités</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Statut</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Visibilité</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Reçu</th>
                          <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSuppliers
                          .filter((profile: any) =>
                            userSearch
                              ? (profile.companyName || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                                (profile.user?.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                                (profile.email || "").toLowerCase().includes(userSearch.toLowerCase())
                              : true
                          )
                          .map((profile: any) => {
                          const statusColors: Record<string, string> = {
                            active: "bg-emerald-500/10 text-emerald-600 border-emerald-200/30",
                            pending: "bg-amber-500/10 text-amber-600 border-amber-200/30",
                            expired: "bg-red-500/10 text-red-600 border-red-200/30",
                            inactive: "bg-muted/30 text-muted-foreground border-muted-foreground/20",
                          };
                          const statusLabels: Record<string, string> = {
                            active: "Actif",
                            pending: "En attente",
                            expired: "Expiré",
                            inactive: "Inactif",
                          };
                          const subStatus = profile.subscriptionStatus || "inactive";

                          const handleDelete = async () => {
                            if (!window.confirm("Supprimer le profil fournisseur " + (profile.companyName || "Sans nom") + " ?\n\nCette action est irréversible.")) return;
                            try {
                              await adminDeleteSupplierProfile({ profileId: profile._id });
                              toast.success("Fournisseur supprimé");
                            } catch (err: any) {
                              toast.error(err.message || "Erreur");
                            }
                          };

                          const handleToggle = async () => {
                            try {
                              await adminToggleSupplierVisibility({ profileId: profile._id });
                              toast.success("Visibilité modifiée");
                            } catch (err: any) {
                              toast.error(err.message || "Erreur");
                            }
                          };

                          return (
                            <tr key={profile._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                                    <AvatarImage src={profile.user?.image || ""} alt="Photo" className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                      {profile.companyName ? profile.companyName.charAt(0).toUpperCase() : "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p
                                      className="font-medium text-xs truncate max-w-[130px] cursor-pointer hover:text-primary transition-colors"
                                      onClick={() => setSelectedSupplier(profile)}
                                    >
                                      {profile.companyName || "Sans nom"}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground truncate max-w-[130px]">
                                      {profile.user?.name || ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 hidden sm:table-cell">
                                <div className="space-y-0.5">
                                  {profile.email && (
                                    <p className="text-xs flex items-center gap-1">
                                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className="truncate max-w-[140px]">{profile.email}</span>
                                    </p>
                                  )}
                                  {profile.phone && (
                                    <p className="text-xs flex items-center gap-1">
                                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span>{profile.phone}</span>
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 hidden md:table-cell">
                                <div className="flex flex-wrap gap-1">
                                  {(profile.specialties?.slice(0, 3) || []).map((s: string) => (
                                    <Badge key={s} className="text-[8px] bg-primary/5 text-primary border-primary/10">
                                      {s}
                                    </Badge>
                                  ))}
                                  {(profile.specialties?.length || 0) > 3 && (
                                    <Badge className="text-[8px] bg-muted/30 text-muted-foreground">
                                      +{profile.specialties.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Badge className={cn("text-[9px]", statusColors[subStatus] || statusColors.inactive)}>
                                  {statusLabels[subStatus] || subStatus}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-center hidden sm:table-cell">
                                <button
                                  type="button"
                                  onClick={handleToggle}
                                  className="inline-flex items-center gap-1 text-xs transition-colors cursor-pointer"
                                >
                                  {profile.isVisible ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200/30 text-[9px] cursor-pointer hover:bg-emerald-500/20">
                                      Visible
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-muted/30 text-muted-foreground border-muted-foreground/20 text-[9px] cursor-pointer hover:bg-muted/50">
                                      Masqué
                                    </Badge>
                                  )}
                                </button>
                              </td>
                              <td className="py-3 px-3 text-center hidden md:table-cell">
                                {profile.paymentProofUrl ? (
                                  <a
                                    href={profile.paymentProofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={profile.paymentProofFileName || "Voir le reçu"}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                                  >
                                    <Banknote className="h-3 w-3" />
                                    Voir
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/50">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {subStatus === "pending" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!window.confirm("Approuver l'abonnement de " + (profile.companyName || "ce fournisseur") + " ?")) return;
                                          try {
                                            await approveSupplierSub({ profileId: profile._id });
                                            toast.success("Abonnement fournisseur approuvé");
                                          } catch (err: any) {
                                            toast.error(err.message || "Erreur");
                                          }
                                        }}
                                        className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                                        title="Approuver le paiement"
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!window.confirm("Refuser l'abonnement de " + (profile.companyName || "ce fournisseur") + " ?")) return;
                                          try {
                                            await rejectSupplierSub({ profileId: profile._id });
                                            toast.success("Abonnement fournisseur refusé");
                                          } catch (err: any) {
                                            toast.error(err.message || "Erreur");
                                          }
                                        }}
                                        className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                        title="Refuser le paiement"
                                      >
                                        <ThumbsDown className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={handleToggle}
                                    className="p-1.5 rounded-md hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                                    title={profile.isVisible ? "Masquer" : "Afficher"}
                                  >
                                    {profile.isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty search result */}
                {allSuppliers.length > 0 && allSuppliers.filter((profile: any) =>
                  userSearch
                    ? (profile.companyName || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                      (profile.user?.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                      (profile.email || "").toLowerCase().includes(userSearch.toLowerCase())
                    : true
                ).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">Aucun fournisseur trouvé pour "{userSearch}"</p>
                  </div>
                )}

                {/* Statistiques */}
                {allSuppliers.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {allSuppliers.filter((s: any) => s.subscriptionStatus === "active").length} actif(s)
                      </span>
                      {allSuppliers.filter((s: any) => s.subscriptionStatus === "pending").length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          {allSuppliers.filter((s: any) => s.subscriptionStatus === "pending").length} en attente
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {allSuppliers.length} fournisseur(s) au total
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Modale Détails Fournisseur ── */}
            <Dialog open={!!selectedSupplier} onOpenChange={(open) => { if (!open) setSelectedSupplier(null); }}>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Détails du fournisseur
                  </DialogTitle>
                  <DialogDescription>
                    Informations complètes du profil fournisseur
                  </DialogDescription>
                </DialogHeader>

                {selectedSupplier && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-border/30">
                      <Avatar className="h-14 w-14 shrink-0 border-2 border-primary/20">
                        <AvatarImage src={selectedSupplier.user?.image || ""} alt="Photo" />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                          {selectedSupplier.companyName ? selectedSupplier.companyName.charAt(0).toUpperCase() : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-sm">{selectedSupplier.companyName || "Sans nom"}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> {selectedSupplier.user?.name || ""}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Coordonnées
                      </h4>
                      {selectedSupplier.email && (
                        <div className="flex items-center gap-2 text-xs">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{selectedSupplier.email}</span>
                        </div>
                      )}
                      {selectedSupplier.phone && (
                        <div className="flex items-center gap-2 text-xs">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{selectedSupplier.phone}</span>
                        </div>
                      )}
                      {selectedSupplier.address && (
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{selectedSupplier.address}</span>
                        </div>
                      )}
                      {selectedSupplier.website && (
                        <div className="flex items-center gap-2 text-xs">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{selectedSupplier.website}</span>
                        </div>
                      )}
                    </div>

                    {selectedSupplier.specialties?.length > 0 && (
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" /> Spécialités ({selectedSupplier.specialties.length})
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSupplier.specialties.map((s: string) => (
                            <Badge key={s} className="text-[9px] bg-primary/5 text-primary border-primary/10">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedSupplier.regions?.length > 0 && (
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                          <MapIcon className="h-3.5 w-3.5" /> Régions d'intervention
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSupplier.regions.map((r: string) => (
                            <Badge key={r} variant="outline" className="text-[9px]">{r}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Abonnement</p>
                        <Badge className={cn("text-[9px] mt-0.5", selectedSupplier.subscriptionStatus === "active" ? "bg-emerald-500/10 text-emerald-600" : selectedSupplier.subscriptionStatus === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-muted/30 text-muted-foreground")}>
                          {({active:"Actif",pending:"En attente",trial:"Inactif",expired:"Expiré",inactive:"Inactif"} as Record<string,string>)[selectedSupplier.subscriptionStatus || "inactive"] || selectedSupplier.subscriptionStatus}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Visibilité</p>
                        <Badge className={cn("text-[9px] mt-0.5", selectedSupplier.isVisible ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/30 text-muted-foreground")}>
                          {selectedSupplier.isVisible ? "Visible" : "Masqué"}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[9px] text-muted-foreground">Inscription</p>
                        <p className="text-xs">{selectedSupplier.createdAt ? new Date(selectedSupplier.createdAt).toLocaleDateString("fr-FR", {day:"numeric", month:"long", year:"numeric"}) : "—"}</p>
                      </div>
                      {selectedSupplier.subscriptionStatus === "pending" && (
                        <>
                          <div className="col-span-2 mt-1">
                            <p className="text-[9px] text-muted-foreground">Moyen de paiement</p>
                            <p className="text-xs capitalize">{selectedSupplier.paymentMethod === "d17" ? "D17 (Poste Tunisienne)" : "Virement bancaire"}{selectedSupplier.paymentAmount ? ` · ${selectedSupplier.paymentAmount} TND` : ""}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[9px] text-muted-foreground">Reçu de paiement</p>
                            {selectedSupplier.paymentProofUrl ? (
                              <a href={selectedSupplier.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                <Banknote className="h-3 w-3" />
                                {selectedSupplier.paymentProofFileName || "Voir le reçu"}
                              </a>
                            ) : (
                              <p className="text-xs text-muted-foreground/70">Non envoyé</p>
                            )}
                          </div>
                          <div className="col-span-2 flex items-center gap-2 pt-1">
                            <Button size="sm" className="h-8 text-xs gap-1" onClick={async () => {
                              try {
                                await approveSupplierSub({ profileId: selectedSupplier._id });
                                toast.success("Abonnement fournisseur approuvé");
                                setSelectedSupplier(null);
                              } catch (err: any) { toast.error(err.message || "Erreur"); }
                            }}>
                              <ThumbsUp className="h-3 w-3" /> Approuver
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-red-500 hover:text-red-600" onClick={async () => {
                              try {
                                await rejectSupplierSub({ profileId: selectedSupplier._id });
                                toast.success("Abonnement fournisseur refusé");
                                setSelectedSupplier(null);
                              } catch (err: any) { toast.error(err.message || "Erreur"); }
                            }}>
                              <ThumbsDown className="h-3 w-3" /> Refuser
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      {selectedSupplier.email && (
                        <a href={`mailto:${selectedSupplier.email}`}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Mail className="h-3.5 w-3.5" /> Contacter
                          </Button>
                        </a>
                      )}
                      <DialogClose asChild>
                        <Button variant="ghost" size="sm">Fermer</Button>
                      </DialogClose>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* ── Modale Profil Utilisateur ── */}
            <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Profil utilisateur
                  </DialogTitle>
                  <DialogDescription>
                    Informations complètes de l'utilisateur
                  </DialogDescription>
                </DialogHeader>

                {selectedUser && (
                  <div className="space-y-4">
                    {/* Avatar + Nom */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-border/30">
                      <Avatar className="h-16 w-16 shrink-0 border-2 border-primary/20">
                        <AvatarImage src={selectedUser.image || ""} alt="Photo" />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                          {(selectedUser.name || selectedUser.email || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm">{selectedUser.name || "Non renseigné"}</h3>
                        <p className="text-xs text-muted-foreground">{selectedUser.email || ""}</p>
                        <Badge className={cn(
                          "mt-1.5 text-[9px]",
                          selectedUser.role === "admin" ? "bg-purple-500/10 text-purple-600" :
                          selectedUser.role === "moderator" ? "bg-amber-500/10 text-amber-600" :
                          selectedUser.status === "disabled" ? "bg-red-500/10 text-red-600" :
                          "bg-emerald-500/10 text-emerald-600"
                        )}>
                          {selectedUser.role === "admin" ? "Admin" : selectedUser.role === "moderator" ? "Modérateur" : selectedUser.status === "disabled" ? "Désactivé" : "Actif"}
                        </Badge>
                      </div>
                    </div>

                    {/* Coordonnées */}
                    <div className="grid grid-cols-1 gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Coordonnées
                      </h4>
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{selectedUser.email || "—"}</span>
                      </div>
                      {selectedUser.phone && (
                        <div className="flex items-center gap-2 text-xs">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span dir="ltr">{selectedUser.phone}</span>
                        </div>
                      )}
                      {selectedUser.company && (
                        <div className="flex items-center gap-2 text-xs">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{selectedUser.company}</span>
                        </div>
                      )}
                    </div>

                    {/* Abonnement */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 col-span-2">
                        <Crown className="h-3.5 w-3.5" /> Abonnement mensuel
                      </h4>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Forfait</p>
                        <Badge className={cn(
                          "text-[9px] mt-0.5",
                          selectedUser.subscriptionPlan === "supplier" ? "bg-amber-400/10 text-amber-600" :
                          selectedUser.subscriptionPlan === "expert" ? "bg-emerald-500/10 text-emerald-600" :
                          "bg-slate-500/10 text-slate-600"
                        )}>
                          {selectedUser.subscriptionPlan === "supplier" ? "Fournisseur" :
                           selectedUser.subscriptionPlan === "expert" ? "Expert" : "Client Pro"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Expiration</p>
                        <p className="text-xs font-medium mt-0.5">
                          {selectedUser.subscriptionEndDate
                            ? new Date(selectedUser.subscriptionEndDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </p>
                      </div>
                    </div>


                    {/* Profil */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 col-span-2">
                        <User className="h-3.5 w-3.5" /> Profil
                      </h4>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Type de compte</p>
                        <Badge className={cn(
                          "text-[9px] mt-0.5",
                          selectedUser.userRole === "supplier" ? "bg-amber-500/10 text-amber-600 border-amber-200/30" :
                          selectedUser.userRole === "expert" ? "bg-blue-500/10 text-blue-600 border-blue-200/30" :
                          "bg-muted/30 text-muted-foreground"
                        )}>
                          {selectedUser.userRole === "supplier" ? "Fournisseur" :
                           selectedUser.userRole === "expert" ? "Expert" : "Client"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Rôle système</p>
                        <Badge className={cn(
                          "text-[9px] mt-0.5",
                          selectedUser.role === "admin" ? "bg-purple-500/10 text-purple-600" :
                          selectedUser.role === "moderator" ? "bg-amber-500/10 text-amber-600" :
                          "bg-muted/30 text-muted-foreground"
                        )}>
                          {selectedUser.role === "admin" ? "Admin" :
                           selectedUser.role === "moderator" ? "Modérateur" : "Utilisateur"}
                        </Badge>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
                      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 col-span-2">
                        <Calendar className="h-3.5 w-3.5" /> Dates
                      </h4>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Inscription</p>
                        <p className="text-xs font-medium mt-0.5">
                          {selectedUser.createdAt
                            ? new Date(selectedUser.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                            : "—"}
                        </p>
                      </div>
                      {selectedUser.subscriptionEndDate && (
                        <div>
                          <p className="text-[9px] text-muted-foreground">Fin abonnement</p>
                          <p className="text-xs font-medium mt-0.5">
                            {new Date(selectedUser.subscriptionEndDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <DialogClose asChild>
                  <Button variant="outline" className="w-full mt-2">Fermer</Button>
                </DialogClose>
              </DialogContent>
            </Dialog>

            {/* ── Reçus de Paiement ── */}
            <TabsContent value="recus">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">Reçus de paiement</h2>
                        {allSubsWithUsers.filter((s: any) => s.paymentProofUrl).length > 0 && (
                          <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
                            {allSubsWithUsers
                              .filter((s: any) => s.paymentProofUrl)
                              .filter((s: any) => {
                                if (recusFilter === "pending") return !s.paymentProofVerified;
                                if (recusFilter === "verified") return s.paymentProofVerified;
                                return true;
                              })
                              .length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Historique des reçus de paiement envoyés par les abonnés</p>
                    </div>
                  </div>
                  {allSubsWithUsers.filter((s: any) => s.paymentProofUrl).length > 0 && (
                    <>
                    {selectedRecuIds.size > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 gap-1.5 text-xs shrink-0"
                              disabled={batchDeletingRecus}
                              onClick={async () => {
                                if (!window.confirm(`Supprimer ${selectedRecuIds.size} reçu(s) ? Cette action est irréversible.`)) return;
                                setBatchDeletingRecus(true);
                                try {
                                  await batchDeleteSubscriptions({ subscriptionIds: Array.from(selectedRecuIds) as any });
                                  toast.success(`${selectedRecuIds.size} reçu(s) supprimé(s)`);
                                  setSelectedRecuIds(new Set());
                                } catch (err: any) {
                                  toast.error(err.message || "Erreur");
                                }
                                setBatchDeletingRecus(false);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{batchDeletingRecus ? "Suppression..." : `Supprimer (${selectedRecuIds.size})`}</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs shrink-0"
                            disabled={purgeRunning}
                            title="Nettoyer les références xyz mortes du stockage (reçus, fichiers, rapports)"
                            onClick={async () => {
                              if (!window.confirm("Lancer le purge du stockage maintenant ?\n\nVérifie tous les fichiers référencés et nettoie les références mortes (reçus, fichiers de projets, rapports dont le fichier n'existe plus).")) return;
                              setPurgeRunning(true);
                              setPurgeResult(null);
                              try {
                                const result = await runStoragePurge();
                                setPurgeResult(result);
                                toast.success(`Purge terminée — ${result.deadReferencesCleaned} référence(s) morte(s) nettoyée(s)`);
                              } catch (err: any) {
                                toast.error(err.message || "Erreur lors du purge");
                              }
                              setPurgeRunning(false);
                            }}
                          >
                            {purgeRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{purgeRunning ? "Purge en cours..." : "Lancer le purge maintenant"}</span>
                          </Button>
                          <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs shrink-0"
                      onClick={() => {
                        const headers = ["Client","Email","Offre","Montant","Statut","Fichier","Date upload"];
                        const rows = allSubsWithUsers
                          .filter((s: any) => s.paymentProofUrl)
                          .map((sub: any) => [
                            sub.user?.name || sub.user?.email || "",
                            sub.user?.email || "",
                            sub.plan || "",
                            sub.amount ? `${sub.amount} TND` : "",
                            sub.paymentProofVerified ? "Vérifié" : "En attente",
                            sub.paymentProofFileName || "",
                            sub.paymentProofUploadedAt
                              ? new Date(sub.paymentProofUploadedAt).toLocaleDateString("fr-FR")
                              : "",
                          ]);
                        const csv = [headers.join(","), ...rows.map((r: string[]) => r.map(c => `"${c}"`).join(","))].join("\n");
                        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "recus_paiement_" + new Date().toISOString().split("T")[0] + ".csv";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Fichier CSV exporté");
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                    </>
                  )}
                </div>

                {/* Filtres */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "all", label: "Tous" },
                    { key: "pending", label: "En attente" },
                    { key: "verified", label: "Vérifiés" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setRecusFilter(f.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        recusFilter === f.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {f.label}
                      {f.key === "pending" && allSubsWithUsers.filter((s: any) => s.paymentProofUrl && !s.paymentProofVerified).length > 0 && (
                        <span className="ml-1.5 text-[9px] opacity-70">
                          ({allSubsWithUsers.filter((s: any) => s.paymentProofUrl && !s.paymentProofVerified).length})
                        </span>
                      )}
                      {f.key === "verified" && allSubsWithUsers.filter((s: any) => s.paymentProofUrl && s.paymentProofVerified).length > 0 && (
                        <span className="ml-1.5 text-[9px] opacity-70">
                          ({allSubsWithUsers.filter((s: any) => s.paymentProofUrl && s.paymentProofVerified).length})
                        </span>
                      )}
                    </button>
                  ))}                  </div>

                {purgeResult && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-emerald-200/40 bg-emerald-50/40">
                    <div className="flex items-center gap-2">
                      <CheckCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-700">Purge du stockage terminée</p>
                        <p className="text-[10px] text-emerald-600/70">
                          {new Date(purgeResult.purgedAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span><strong className="text-emerald-600">{purgeResult.deadReferencesCleaned}</strong> référence(s) morte(s) nettoyée(s)</span>
                      <span>•</span>
                      <span>{purgeResult.checkedSubscriptions} abonnements · {purgeResult.checkedSuppliers} fournisseurs · {purgeResult.checkedProjects} projets · {purgeResult.checkedReports} rapports</span>
                    </div>
                  </div>
                )}

                {allSubsWithUsers.filter((s: any) => s.paymentProofUrl).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mx-auto mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-semibold">Aucun reçu</p>
                    <p className="text-xs text-muted-foreground mt-1">Les reçus de paiement apparaîtront ici après soumission.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                          <th className="w-8 px-2 py-3"><input type="checkbox" className="rounded border-border/40" checked={selectedRecuIds.size === allSubsWithUsers.filter(s => s.paymentProofUrl).length && selectedRecuIds.size > 0} onChange={() => { const all = allSubsWithUsers.filter(s => s.paymentProofUrl).map(s => s._id); if (selectedRecuIds.size === all.length) { setSelectedRecuIds(new Set()); } else { setSelectedRecuIds(new Set(all)); } }} /></th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs">Client</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Offre</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Abonnement</th>
                          <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Montant</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Statut</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Fichier</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Reçu</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Date d'upload</th>
                          <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSubsWithUsers
                          .filter((sub: any) => sub.paymentProofUrl)
                          .filter((sub: any) => {
                            if (recusFilter === "pending") return !sub.paymentProofVerified;
                            if (recusFilter === "verified") return sub.paymentProofVerified;
                            return true;
                          })

                          .map((sub: any) => {
                            const user = sub.user;
                            const uploadDate = sub.paymentProofUploadedAt
                              ? new Date(sub.paymentProofUploadedAt).toLocaleDateString("fr-FR", {
                                  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                                })
                              : sub.updatedAt
                                ? new Date(sub.updatedAt).toLocaleDateString("fr-FR", {
                                    day: "numeric", month: "short", year: "numeric"
                                  })
                                : "—";
                            const fileName = sub.paymentProofFileName || "reçu_paiement";
                            const isVerified = sub.paymentProofVerified;

                            return (
                              <tr key={sub._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150">
                                <td className="py-3 px-2 w-8">
                                  <input type="checkbox" className="rounded border-border/40" checked={selectedRecuIds.has(sub._id)} onChange={() => { const next = new Set(selectedRecuIds); if (next.has(sub._id)) next.delete(sub._id); else next.add(sub._id); setSelectedRecuIds(next); }} />
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                                      <AvatarImage src={user?.image || ""} alt="Photo" className="object-cover" />
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                        {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="font-medium text-xs truncate max-w-[120px] sm:max-w-[180px]">
                                        {user?.name || user?.email || user?.phone || "Non renseigné"}
                                      </p>
                                      <p className="text-[9px] text-muted-foreground truncate">
                                        {user?.email || ""}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 hidden sm:table-cell">
                                  <Badge className={cn(
                                    "text-[9px]",
                                    sub.plan === "pro" ? "bg-blue-500/10 text-blue-600 border-blue-200/30" :
                                    sub.plan === "expert" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/30" :
                                    sub.plan === "supplier" ? "bg-amber-400/10 text-amber-600 border-amber-200/30" :
                                    "bg-muted/30 text-muted-foreground"
                                  )}>
                                    {sub.kind === "investment" ? "Invest. · " : sub.kind === "construction" || !sub.kind ? "Constr. · " : ""}
                                    {sub.plan === "pro" ? "Client Pro" : sub.plan === "expert" ? "Expert" : sub.plan === "supplier" ? "Fournisseur" : sub.plan}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 hidden lg:table-cell">
                                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                                    {sub.startDate && (
                                      <span className="block">
                                        {new Date(sub.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                      </span>
                                    )}
                                    {sub.endDate && (
                                      <span className="block text-[9px]">
                                        <ArrowRight className="h-2.5 w-2.5 inline mr-0.5 text-muted-foreground/50" />
                                        {new Date(sub.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                      </span>
                                    )}
                                    {!sub.startDate && !sub.endDate && <span className="text-[9px]">—</span>}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right hidden sm:table-cell">
                                  <span className="font-mono text-xs font-medium">
                                    {sub.amount ? `${sub.amount.toLocaleString("fr-FR")} TND` : "—"}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isVerified ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200/30 text-[9px]">
                                      <Check className="h-3 w-3 mr-0.5" /> Vérifié
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200/30 text-[9px]">
                                      <Clock className="h-3 w-3 mr-0.5" /> En attente
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-3 px-3 hidden md:table-cell">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-xs truncate max-w-[150px]">{fileName}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewReceipt(sub)}
                                    className="group relative inline-flex items-center justify-center cursor-pointer"
                                    title="Voir le reçu"
                                  >
                                    <div className="h-12 w-12 rounded-lg border border-border/40 bg-muted/20 overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all">
                                      <img
                                        src={sub.paymentProofUrl}
                                        alt="Reçu"
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = "none";
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                        }}
                                      />
                                      <div className="hidden absolute inset-0 flex items-center justify-center bg-muted/50 text-[8px] text-muted-foreground">
                                        PDF
                                      </div>
                                    </div>
                                  </button>
                                </td>
                                <td className="py-3 px-3 hidden md:table-cell">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    <span>{uploadDate}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <a
                                      href={sub.paymentProofUrl}
                                      download={sub.paymentProofFileName || "recu_paiement"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                        <Download className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Télécharger</span>
                                      </Button>
                                    </a>
                                    {isVerified ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                        onClick={async () => {
                                          try {
                                            await markReceiptVerified({ subscriptionId: sub._id, verified: false });
                                            toast.success("Reçu marqué comme non vérifié");
                                          } catch (err: any) {
                                            toast.error(err.message || "Erreur");
                                          }
                                        }}
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Annuler</span>
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                        onClick={async () => {
                                          try {
                                            await markReceiptVerified({ subscriptionId: sub._id, verified: true });
                                            toast.success("Reçu marqué comme vérifié");
                                          } catch (err: any) {
                                            toast.error(err.message || "Erreur");
                                          }
                                        }}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Vérifier</span>
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title="Supprimer définitivement du stockage"
                                      onClick={async () => {
                                        if (!window.confirm("Supprimer définitivement ce reçu du stockage ? Cette action est irréversible.")) return;
                                        try {
                                          await deleteSubscriptionReceipt({ subscriptionId: sub._id });
                                          toast.success("Reçu supprimé définitivement du stockage");
                                        } catch (err: any) {
                                          toast.error(err.message || "Erreur");
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span className="hidden sm:inline">Supprimer</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Résumé */}
                {allSubsWithUsers.filter((s: any) => s.paymentProofUrl).length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {allSubsWithUsers.filter((s: any) => s.paymentProofUrl && s.paymentProofVerified).length} vérifié(s)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        {allSubsWithUsers.filter((s: any) => s.paymentProofUrl && !s.paymentProofVerified).length} en attente
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="font-medium text-foreground">
                        Total : <span className="font-mono font-semibold">
                          {allSubsWithUsers
                            .filter((s: any) => s.paymentProofUrl)
                            .reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
                            .toLocaleString("fr-FR")} TND
                        </span>
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {allSubsWithUsers.filter((s: any) => s.paymentProofUrl).length} reçu(s) au total
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Modale d'aperçu du reçu ── */}
              <Dialog open={!!previewReceipt} onOpenChange={(open) => { if (!open) setPreviewReceipt(null); }}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Reçu de paiement
                    </DialogTitle>
                    <DialogDescription>
                      Détails du reçu soumis par l'abonné
                    </DialogDescription>
                  </DialogHeader>

                  {previewReceipt && (
                    <div className="space-y-4">
                      {/* Infos du reçu */}
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                        <div>
                          <p className="text-[9px] text-muted-foreground">Client</p>
                          <p className="text-xs font-medium truncate">{previewReceipt.user?.name || previewReceipt.user?.email || "Non renseigné"}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{previewReceipt.user?.email || ""}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Offre</p>
                          <Badge className={cn(
                            "text-[9px] mt-0.5",
                            previewReceipt.plan === "pro" ? "bg-blue-500/10 text-blue-600" :
                            previewReceipt.plan === "expert" ? "bg-emerald-500/10 text-emerald-600" :
                            previewReceipt.plan === "supplier" ? "bg-amber-400/10 text-amber-600" :
                            "bg-muted/30 text-muted-foreground"
                          )}>
                            {previewReceipt.plan === "pro" ? "Client Pro" : previewReceipt.plan === "expert" ? "Expert" : previewReceipt.plan === "supplier" ? "Fournisseur" : previewReceipt.plan}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Prix reçu</p>
                          <p className="text-sm font-mono font-bold text-primary">
                            {previewReceipt.amount ? `${previewReceipt.amount.toLocaleString("fr-FR")} TND` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Statut</p>
                          {previewReceipt.paymentProofVerified ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] mt-0.5">
                              <Check className="h-3 w-3 mr-0.5" /> Vérifié
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 text-[9px] mt-0.5">
                              <Clock className="h-3 w-3 mr-0.5" /> En attente
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] text-muted-foreground">Date d'upload</p>
                          <p className="text-xs">
                            {previewReceipt.paymentProofUploadedAt
                              ? new Date(previewReceipt.paymentProofUploadedAt).toLocaleDateString("fr-FR", {
                                  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                                })
                              : "—"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] text-muted-foreground">Fichier</p>
                          <p className="text-xs font-mono truncate">{previewReceipt.paymentProofFileName || "reçu_paiement"}</p>
                        </div>
                      </div>

                      {/* Aperçu du reçu */}
                      <div className="rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
                        {previewReceipt.paymentProofUrl ? (
                          <>
                            <img
                              src={previewReceipt.paymentProofUrl}
                              alt="Reçu"
                              className="w-full h-auto max-h-[50vh] object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                                if (fallback) fallback.classList.remove("hidden");
                              }}
                            />
                            <div className="hidden flex items-center justify-center p-8 text-muted-foreground">
                              <FileText className="h-12 w-12 mr-3" />
                              <div>
                                <p className="text-sm font-medium">Document PDF</p>
                                <p className="text-xs">Cliquez sur le bouton Télécharger pour ouvrir le fichier</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center p-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mr-3" />
                            <p className="text-sm">Aucun fichier disponible</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={previewReceipt.paymentProofUrl}
                          download={previewReceipt.paymentProofFileName || "recu_paiement"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="gap-1.5">
                            <Download className="h-4 w-4" />
                            Télécharger
                          </Button>
                        </a>
                        <DialogClose asChild>
                          <Button variant="ghost" size="sm">
                            Fermer
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* ── Reçus de Paiement Fournisseurs ── */}
            <TabsContent value="recusFournisseurs">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">Reçus Fournisseurs</h2>
                        {allSuppliers.filter((p: any) => p.paymentProofUrl).length > 0 && (
                          <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
                            {allSuppliers
                              .filter((p: any) => p.paymentProofUrl)
                              .filter((p: any) => {
                                if (supplierRecusFilter === "pending") return !p.paymentProofVerified;
                                if (supplierRecusFilter === "verified") return p.paymentProofVerified;
                                return true;
                              })
                              .length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Historique des reçus de paiement envoyés par les fournisseurs</p>
                    </div>
                  </div>
                  {allSuppliers.filter((p: any) => p.paymentProofUrl).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs shrink-0"
                      onClick={() => {
                        const headers = ["Société","Contact","Moyen de paiement","Montant","Statut","Fichier","Date upload"];
                        const rows = allSuppliers
                          .filter((p: any) => p.paymentProofUrl)
                          .map((p: any) => [
                            p.companyName || "",
                            p.user?.name || p.email || "",
                            p.paymentMethod === "d17" ? "D17" : "Virement",
                            p.paymentAmount ? `${p.paymentAmount} TND` : "",
                            p.paymentProofVerified ? "Vérifié" : "En attente",
                            p.paymentProofFileName || "",
                            p.paymentProofUploadedAt
                              ? new Date(p.paymentProofUploadedAt).toLocaleDateString("fr-FR")
                              : "",
                          ]);
                        const csv = [headers.join(","), ...rows.map((r: string[]) => r.map(c => `"${c}"`).join(","))].join("\n");
                        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "recus_fournisseurs_" + new Date().toISOString().split("T")[0] + ".csv";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Fichier CSV exporté");
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                  )}
                </div>

                {/* Filtres */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "all", label: "Tous" },
                    { key: "pending", label: "En attente" },
                    { key: "verified", label: "Vérifiés" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setSupplierRecusFilter(f.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        supplierRecusFilter === f.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      {f.label}
                      {f.key === "pending" && allSuppliers.filter((p: any) => p.paymentProofUrl && !p.paymentProofVerified).length > 0 && (
                        <span className="ml-1.5 text-[9px] opacity-70">
                          ({allSuppliers.filter((p: any) => p.paymentProofUrl && !p.paymentProofVerified).length})
                        </span>
                      )}
                      {f.key === "verified" && allSuppliers.filter((p: any) => p.paymentProofUrl && p.paymentProofVerified).length > 0 && (
                        <span className="ml-1.5 text-[9px] opacity-70">
                          ({allSuppliers.filter((p: any) => p.paymentProofUrl && p.paymentProofVerified).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {allSuppliers.filter((p: any) => p.paymentProofUrl).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mx-auto mb-4">
                      <Receipt className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-semibold">Aucun reçu fournisseur</p>
                    <p className="text-xs text-muted-foreground mt-1">Les reçus de paiement des fournisseurs apparaîtront ici après soumission.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs">Fournisseur</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Moyen de paiement</th>
                          <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Montant</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Statut</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Fichier</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Reçu</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Date d'upload</th>
                          <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSuppliers
                          .filter((p: any) => p.paymentProofUrl)
                          .filter((p: any) => {
                            if (supplierRecusFilter === "pending") return !p.paymentProofVerified;
                            if (supplierRecusFilter === "verified") return p.paymentProofVerified;
                            return true;
                          })
                          .map((p: any) => {
                            const uploadDate = p.paymentProofUploadedAt
                              ? new Date(p.paymentProofUploadedAt).toLocaleDateString("fr-FR", {
                                  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                                })
                              : "—";
                            const fileName = p.paymentProofFileName || "reçu_paiement";
                            const isVerified = p.paymentProofVerified;

                            return (
                              <tr key={p._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150">
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                                      <AvatarImage src={p.logo || p.user?.image || ""} alt="Logo" className="object-cover" />
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                        {p.companyName ? p.companyName.charAt(0).toUpperCase() : "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="font-medium text-xs truncate max-w-[140px] sm:max-w-[200px]">
                                        {p.companyName || "Fournisseur"}
                                      </p>
                                      <p className="text-[9px] text-muted-foreground truncate">
                                        {p.email || p.user?.email || ""}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 hidden sm:table-cell">
                                  <Badge className={cn(
                                    "text-[9px]",
                                    p.paymentMethod === "d17"
                                      ? "bg-amber-400/10 text-amber-600 border-amber-200/30"
                                      : "bg-blue-500/10 text-blue-600 border-blue-200/30"
                                  )}>
                                    {p.paymentMethod === "d17" ? (
                                      <><Smartphone className="h-3 w-3 mr-0.5" /> D17</>
                                    ) : (
                                      <><Landmark className="h-3 w-3 mr-0.5" /> Virement</>
                                    )}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-right hidden sm:table-cell">
                                  <span className="font-mono text-xs font-medium">
                                    {p.paymentAmount ? `${p.paymentAmount.toLocaleString("fr-FR")} TND` : "—"}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isVerified ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200/30 text-[9px]">
                                      <Check className="h-3 w-3 mr-0.5" /> Vérifié
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200/30 text-[9px]">
                                      <Clock className="h-3 w-3 mr-0.5" /> En attente
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-3 px-3 hidden md:table-cell">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-xs truncate max-w-[150px]">{fileName}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewSupplierReceipt(p)}
                                    className="group relative inline-flex items-center justify-center cursor-pointer"
                                    title="Voir le reçu"
                                  >
                                    <div className="h-12 w-12 rounded-lg border border-border/40 bg-muted/20 overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all">
                                      <img
                                        src={p.paymentProofUrl}
                                        alt="Reçu"
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = "none";
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                        }}
                                      />
                                      <div className="hidden absolute inset-0 flex items-center justify-center bg-muted/50 text-[8px] text-muted-foreground">
                                        PDF
                                      </div>
                                    </div>
                                  </button>
                                </td>
                                <td className="py-3 px-3 hidden md:table-cell">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    <span>{uploadDate}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <a
                                      href={p.paymentProofUrl}
                                      download={p.paymentProofFileName || "recu_paiement"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                        <Download className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Télécharger</span>
                                      </Button>
                                    </a>
                                    {isVerified ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                        onClick={async () => {
                                          try {
                                            await verifySupplierReceipt({ profileId: p._id, verified: false });
                                            toast.success("Reçu marqué comme non vérifié");
                                          } catch (err: any) {
                                            toast.error(err.message || "Erreur");
                                          }
                                        }}
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Annuler</span>
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                        onClick={async () => {
                                          try {
                                            await verifySupplierReceipt({ profileId: p._id, verified: true });
                                            toast.success("Reçu marqué comme vérifié");
                                          } catch (err: any) {
                                            toast.error(err.message || "Erreur");
                                          }
                                        }}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Vérifier</span>
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title="Supprimer définitivement du stockage"
                                      onClick={async () => {
                                        if (!window.confirm("Supprimer définitivement ce reçu du stockage ? Cette action est irréversible.")) return;
                                        try {
                                          await deleteSupplierReceipt({ profileId: p._id });
                                          toast.success("Reçu fournisseur supprimé définitivement du stockage");
                                        } catch (err: any) {
                                          toast.error(err.message || "Erreur");
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span className="hidden sm:inline">Supprimer</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Résumé */}
                {allSuppliers.filter((p: any) => p.paymentProofUrl).length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {allSuppliers.filter((p: any) => p.paymentProofUrl && p.paymentProofVerified).length} vérifié(s)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        {allSuppliers.filter((p: any) => p.paymentProofUrl && !p.paymentProofVerified).length} en attente
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="font-medium text-foreground">
                        Total : <span className="font-mono font-semibold">
                          {allSuppliers
                            .filter((p: any) => p.paymentProofUrl)
                            .reduce((sum: number, p: any) => sum + (p.paymentAmount || 0), 0)
                            .toLocaleString("fr-FR")} TND
                        </span>
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {allSuppliers.filter((p: any) => p.paymentProofUrl).length} reçu(s) au total
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Modale d'aperçu du reçu fournisseur ── */}
              <Dialog open={!!previewSupplierReceipt} onOpenChange={(open) => { if (!open) setPreviewSupplierReceipt(null); }}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      Reçu de paiement fournisseur
                    </DialogTitle>
                    <DialogDescription>
                      Détails du reçu soumis par le fournisseur
                    </DialogDescription>
                  </DialogHeader>

                  {previewSupplierReceipt && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                        <div>
                          <p className="text-[9px] text-muted-foreground">Fournisseur</p>
                          <p className="text-xs font-medium truncate">{previewSupplierReceipt.companyName || "Fournisseur"}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{previewSupplierReceipt.email || previewSupplierReceipt.user?.email || ""}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Moyen de paiement</p>
                          <Badge className={cn(
                            "text-[9px] mt-0.5",
                            previewSupplierReceipt.paymentMethod === "d17"
                              ? "bg-amber-400/10 text-amber-600"
                              : "bg-blue-500/10 text-blue-600"
                          )}>
                            {previewSupplierReceipt.paymentMethod === "d17" ? "D17" : "Virement bancaire"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Montant</p>
                          <p className="text-sm font-mono font-bold text-primary">
                            {previewSupplierReceipt.paymentAmount ? `${previewSupplierReceipt.paymentAmount.toLocaleString("fr-FR")} TND` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Statut</p>
                          {previewSupplierReceipt.paymentProofVerified ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] mt-0.5">
                              <Check className="h-3 w-3 mr-0.5" /> Vérifié
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 text-[9px] mt-0.5">
                              <Clock className="h-3 w-3 mr-0.5" /> En attente
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] text-muted-foreground">Date d'upload</p>
                          <p className="text-xs">
                            {previewSupplierReceipt.paymentProofUploadedAt
                              ? new Date(previewSupplierReceipt.paymentProofUploadedAt).toLocaleDateString("fr-FR", {
                                  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                                })
                              : "—"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] text-muted-foreground">Fichier</p>
                          <p className="text-xs font-mono truncate">{previewSupplierReceipt.paymentProofFileName || "reçu_paiement"}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
                        {previewSupplierReceipt.paymentProofUrl ? (
                          <>
                            <img
                              src={previewSupplierReceipt.paymentProofUrl}
                              alt="Reçu"
                              className="w-full h-auto max-h-[50vh] object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                                if (fallback) fallback.classList.remove("hidden");
                              }}
                            />
                            <div className="hidden flex items-center justify-center p-8 text-muted-foreground">
                              <FileText className="h-12 w-12 mr-3" />
                              <div>
                                <p className="text-sm font-medium">Document PDF</p>
                                <p className="text-xs">Cliquez sur le bouton Télécharger pour ouvrir le fichier</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center p-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mr-3" />
                            <p className="text-sm">Aucun fichier disponible</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={previewSupplierReceipt.paymentProofUrl}
                          download={previewSupplierReceipt.paymentProofFileName || "recu_paiement"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="gap-1.5">
                            <Download className="h-4 w-4" />
                            Télécharger
                          </Button>
                        </a>
                        <DialogClose asChild>
                          <Button variant="ghost" size="sm">
                            Fermer
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

          {/* Admin Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <Card className="group relative border border-border/30 bg-background/60 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Utilisateurs</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">{allUsers.length}</p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-600 ring-1 ring-blue-500/10 shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Crown className="h-3 w-3 text-amber-500" />{allUsers.filter((u: any) => u.role === "admin").length} admin</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">{allUsers.filter((u: any) => u.subscriptionPlan === "pro" || !u.subscriptionPlan).length} Client</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="group relative border border-border/30 bg-background/60 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Total projets</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">{allProjects.length}</p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/10 shrink-0">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span>{allProjects.filter((p: any) => p.status === "completed").length} terminés</span>
                    <span>•</span>
                    <span>{allProjects.filter((p: any) => p.status === "draft").length} brouillons</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="group relative border border-border/30 bg-background/60 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Abonnés Pro</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">{allSubsWithUsers.filter((s: any) => s.status === "active").length}</p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-600 ring-1 ring-amber-500/10 shrink-0">
                      <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{pendingSubs.length} en attente</span>
                    <span>•</span>
                    <span>{allSubsWithUsers.filter((s: any) => s.status === "canceled").length} annulés</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="group relative border border-border/30 bg-background/60 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Revenus estimés</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(allSubsWithUsers.filter((s: any) => s.status === "active").length * (planForm?.proPrice ?? 120))}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 ring-1 ring-emerald-500/10 shrink-0">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span>{allSubsWithUsers.filter((s: any) => s.status === "active").length * (planForm?.proPrice ?? 120)} TND</span>
                    <span>•</span>
                    <span>{materialPrices.length} matériaux</span>
                  </div>
                </CardContent>
              </Card>
              {/* Nouveaux ce mois */}
              <Card className="group relative border border-border/30 bg-background/60 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Nouveaux ce mois</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">{(() => { const now = Date.now(); const monthAgo = now - 30 * 24 * 60 * 60 * 1000; return allUsers.filter((u: any) => u._creationTime > monthAgo).length; })()}</p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 text-rose-600 ring-1 ring-rose-500/10 shrink-0">
                      <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">{(() => { const now = Date.now(); const weekAgo = now - 7 * 24 * 60 * 60 * 1000; return allUsers.filter((u: any) => u._creationTime > weekAgo).length; })()} cette semaine</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">{(() => { const now = Date.now(); const dayAgo = now - 24 * 60 * 60 * 1000; return allUsers.filter((u: any) => u._creationTime > dayAgo).length; })()} aujourd'hui</span>
                  </div>
                </CardContent>
              </Card>
              {/* Fournisseurs */}
              <Card className="group relative border border-border/30 bg-background/60 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Fournisseurs</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">{allSuppliers.length}</p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-600 ring-1 ring-cyan-500/10 shrink-0">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">{allSuppliers.filter((s: any) => s.subscriptionStatus === "active").length} actifs</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">{allSuppliers.filter((s: any) => s.isVisible).length} visibles</span>
                  </div>
                </CardContent>
              </Card>
              {/* Payment method breakdown */}
              <Card className="group relative border border-border/30 bg-background/60 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Moyens de paiement</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {allSubsWithUsers.filter((s: any) => s.paymentMethod === "bank_transfer" || s.paymentMethod === "d17").length}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 text-violet-600 ring-1 ring-violet-500/10 shrink-0">
                      <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Banknote className="h-3 w-3" /> Virement: {allSubsWithUsers.filter((s: any) => s.paymentMethod === "bank_transfer").length}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Smartphone className="h-3 w-3" /> D17: {allSubsWithUsers.filter((s: any) => s.paymentMethod === "d17").length}</span>
                  </div>
                </CardContent>
              </Card>
              {/* Projets ce mois */}
              <Card className="group relative border border-border/30 bg-background/60 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Projets ce mois</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">{(() => { const now = Date.now(); const monthAgo = now - 30 * 24 * 60 * 60 * 1000; return allProjects.filter((p: any) => p._creationTime > monthAgo).length; })()}</p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-500/5 text-sky-600 ring-1 ring-sky-500/10 shrink-0">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span>Total: {allProjects.length} projets</span>
                    <span>•</span>
                    <span>Coût total: {new Intl.NumberFormat("fr-FR").format(totalCost)} TND</span>
                  </div>
                </CardContent>
              </Card>
              {/* Activation rate */}
              <Card className="group relative border border-border/30 bg-background/60 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Taux d'activation</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {(() => {
                          const total = allSubsWithUsers.filter((s: any) => s.plan === "pro").length;
                          const active = allSubsWithUsers.filter((s: any) => s.status === "active").length;
                          if (total === 0) return "0%";
                          return Math.round((active / total) * 100) + "%";
                        })()}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 text-orange-600 ring-1 ring-orange-500/10 shrink-0">
                      <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3 text-emerald-500" />{allSubsWithUsers.filter((s: any) => s.status === "active").length} actifs</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3 text-amber-500" />{pendingSubs.length} en attente</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Projets récents</CardTitle>
                  <CardDescription className="text-[10px]">Les 5 derniers projets créés</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-1.5">
                    {allProjects.slice(0, 5).map((p: any) => (
                      <div key={p._id} className="flex items-center justify-between py-1.5 border-b border-border/5 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs truncate max-w-[150px]">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[8px] h-4 px-1.5">
                            {p.status === "completed" ? "Terminé" : p.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Abonnements & Revenus</CardTitle>
                  <CardDescription className="text-[10px]">Client Pro: {planForm?.proPrice ?? 80} TND | Fournisseur: {planForm?.supplierPrice ?? 120} TND | Expert: {planForm?.expertPrice ?? 120} TND</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Actifs", count: allSubsWithUsers.filter((s: any) => s.status === "active").length, color: "text-emerald-600", bg: "bg-emerald-100" },
                      { label: "En attente", count: pendingSubs.length, color: "text-amber-600", bg: "bg-amber-100" },
                      { label: "Annulés", count: allSubsWithUsers.filter((s: any) => s.status === "canceled").length, color: "text-red-500", bg: "bg-red-100" },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-2 rounded-lg bg-muted/20 border border-border/10">
                        <p className={cn("text-lg font-bold", s.color)}>{s.count}</p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {allSubsWithUsers.filter((s: any) => s.status === "active" || s.status === "pending").slice(0, 4).map((sub: any) => (
                      <div key={sub._id} className="flex items-center justify-between py-1 border-b border-border/5 last:border-0">
                        <span className="text-xs truncate max-w-[130px]">{sub.user?.name || sub.user?.email || "Non renseigné"}</span>
                        <Badge variant={sub.status === "active" ? "default" : "outline"} className={cn("text-[8px] h-4 px-1.5", sub.status === "pending" && "border-amber-300 text-amber-600")}>
                          {sub.status === "active" ? "Actif" : "En attente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            </TabsContent>

          {/* Materials Management */}
          <TabsContent value="materials">
            <Card className="border border-border/30 bg-background/60 backdrop-blur-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base">Gestion des prix des matériaux</CardTitle>
                <CardDescription className="text-xs">Base de données des prix du marché tunisien</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-32 sm:w-48 pl-9 text-sm"
                  />
                </div>
                <Button size="sm" className="gap-1.5 h-9 shrink-0" onClick={() => setShowNewMaterial(!showNewMaterial)}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden xs:inline">Ajouter</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                {/* New material form */}
                {showNewMaterial && (
                  <div className="mb-4 p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Nom</label>
                        <Input value={newMaterial.name} onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })} placeholder="Ciment CPJ 42.5" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Catégorie</label>
                        <select
                          value={newMaterial.category}
                          onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
                          className="h-9 w-full rounded-lg border border-border/50 bg-background px-3 text-sm"
                        >
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Unité</label>
                        <Input value={newMaterial.unit} onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })} placeholder="sacs" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Prix unitaire</label>
                        <Input type="number" value={newMaterial.unitPrice} onChange={(e) => setNewMaterial({ ...newMaterial, unitPrice: parseFloat(e.target.value) })} placeholder="12" className="h-9 text-sm" />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button size="sm" onClick={handleCreateMaterial} className="h-9">
                          <Check className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9" onClick={() => setShowNewMaterial(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
            )}
              </div>


              {/* Excel Import Zone */}
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs mb-2"
                  onClick={() => setShowImportZone(!showImportZone)}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importer un fichier Excel (.xlsx)
                </Button>
                {showImportZone && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <label
                          htmlFor="excel-upload"
                          className={cn(
                            "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                            importing
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/40 hover:border-primary/40 hover:bg-muted/20"
                          )}
                        >
                          {importing ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-6 w-6 text-primary animate-spin" />
                              <span className="text-xs text-muted-foreground">Importation en cours...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-6 w-6 text-muted-foreground/50" />
                              <span className="text-xs text-muted-foreground">
                                Cliquez ou glissez un fichier .xlsx ici
                              </span>
                              <span className="text-[10px] text-muted-foreground/60">
                                Colonnes attendues : nom/désignation, prix, unité (optionnel), SKU/ID (optionnel)
                              </span>
                            </div>
                          )}
                          <input
                            id="excel-upload"
                            type="file"
                            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            className="hidden"
                            onChange={handleExcelImport}
                            disabled={importing}
                          />
                        </label>
                      </div>
                    </div>
                    {importResult && (
                      <div className="p-3 rounded-lg bg-background/80 border border-border/20 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <CheckCheck className="h-4 w-4 text-emerald-500" />
                          Résultat de l'importation
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                            <p className="text-lg font-bold text-emerald-600">{importResult.updated}</p>
                            <p className="text-emerald-600/70">Prix mis à jour</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-blue-500/10">
                            <p className="text-lg font-bold text-blue-600">{importResult.created}</p>
                            <p className="text-blue-600/70">Nouveaux créés</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-amber-500/10">
                            <p className="text-lg font-bold text-amber-600">{importResult.errors.length}</p>
                            <p className="text-amber-600/70">Erreurs</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {importResult.total} ligne(s) traitées
                        </p>
                        {importResult.errors.length > 0 && (
                          <div className="mt-2 max-h-24 overflow-y-auto text-[10px] text-destructive/80 space-y-0.5">
                            {importResult.errors.slice(0, 20).map((err, i) => (
                              <p key={i}>• {err}</p>
                            ))}
                            {importResult.errors.length > 20 && (
                              <p className="text-muted-foreground">... et {importResult.errors.length - 20} autre(s)</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Materials table */}
              <div className="overflow-x-auto rounded-xl border border-border/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs">Nom</th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs">Catégorie</th>
                      <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Unité</th>
                      <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Prix (TND)</th>
                      <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map((material: any) => (
                      <tr key={material._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150 group">
                        <td className="py-2.5 px-3">
                          {editingMaterial === material._id ? (
                            <Input
                              value={editValues[material._id]?.name || material.name}
                              onChange={(e) => setEditValues({ ...editValues, [material._id]: { ...editValues[material._id], name: e.target.value } })}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="font-medium">{material.name}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {categoryLabels[material.category] || material.category}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {editingMaterial === material._id ? (
                            <Input
                              value={editValues[material._id]?.unit || material.unit}
                              onChange={(e) => setEditValues({ ...editValues, [material._id]: { ...editValues[material._id], unit: e.target.value } })}
                              className="h-8 text-sm w-20 ml-auto"
                            />
                          ) : (
                            material.unit
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right font-medium">
                          {editingMaterial === material._id ? (
                            <Input
                              type="number"
                              value={editValues[material._id]?.unitPrice ?? material.unitPrice}
                              onChange={(e) => setEditValues({ ...editValues, [material._id]: { ...editValues[material._id], unitPrice: parseFloat(e.target.value) } })}
                              className="h-8 text-sm w-24 ml-auto"
                            />
                          ) : (
                            `${material.unitPrice.toFixed(3)} TND`
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {editingMaterial === material._id ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={() => handleUpdateMaterial(material._id)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMaterial(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMaterial(material._id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={async () => {
                                  if (confirm("Supprimer ce matériau ?")) {
                                    await deleteMaterial({ id: material._id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Management */}
          <TabsContent value="projects">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Gestion des projets</h2>
                  <p className="text-xs text-muted-foreground">{allProjects.length} projet(s)</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedProjectIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs shrink-0"
                      onClick={async () => {
                        if (!window.confirm("Supprimer " + selectedProjectIds.size + " projet(s) ? Cette action est irréversible.")) return;
                        setBatchDeletingProjects(true);
                        try {
                          await batchDeleteProjects({ projectIds: Array.from(selectedProjectIds) as any });
                          toast.success(selectedProjectIds.size + " projet(s) supprimé(s)");
                          setSelectedProjectIds(new Set());
                        } catch (err: any) {
                          toast.error(err.message || "Erreur");
                        } finally {
                          setBatchDeletingProjects(false);
                        }
                      }}
                      disabled={batchDeletingProjects}
                    >
                      {batchDeletingProjects ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Supprimer ({selectedProjectIds.size})
                    </Button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un projet..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-40 sm:w-56 pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs w-8">
                        <input
                          type="checkbox"
                          checked={allProjects.length > 0 && selectedProjectIds.size === allProjects.filter((p: any) =>
                            searchQuery
                              ? (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (p.category || "").toLowerCase().includes(searchQuery.toLowerCase())
                              : true
                          ).length}
                          onChange={() => {
                            const filtered = allProjects.filter((p: any) =>
                              searchQuery
                                ? (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (p.category || "").toLowerCase().includes(searchQuery.toLowerCase())
                                : true
                            );
                            if (selectedProjectIds.size === filtered.length) {
                              setSelectedProjectIds(new Set());
                            } else {
                              setSelectedProjectIds(new Set(filtered.map((p: any) => p._id)));
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Projet</th>
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Utilisateur</th>
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Type</th>
                      <th className="text-center py-2.5 px-2 font-medium text-muted-foreground text-xs">Statut</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Estimation</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProjects
                      .filter((p: any) =>
                        searchQuery
                          ? (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.category || "").toLowerCase().includes(searchQuery.toLowerCase())
                          : true
                      )
                      .map((project: any) => (
                      <tr key={project._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150 group">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={selectedProjectIds.has(project._id)}
                            onChange={() => {
                              const next = new Set(selectedProjectIds);
                              if (next.has(project._id)) next.delete(project._id);
                              else next.add(project._id);
                              setSelectedProjectIds(next);
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-xs">{project.name || "Sans nom"}</p>
                          <p className="text-[9px] text-muted-foreground">{project.region || "—"} · {project.surface ? `${project.surface}m²` : "—"}</p>
                        </td>
                        <td className="py-2.5 px-2 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6 shrink-0 border border-border/30">
                              <AvatarImage src={project.user?.image || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">
                                {project.user?.name?.charAt(0)?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate max-w-[100px]">{project.user?.name || "—"}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[9px] font-normal">{project.category || "—"}</Badge>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Badge variant={project.status === "completed" ? "default" : "secondary"} className={cn("text-[9px] font-normal", project.status === "completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/30" : "")}>
                            {project.status === "completed" ? "Terminé" : project.status === "pending" ? "En cours" : project.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-xs font-medium">
                          {project.costEstimate
                            ? new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(project.costEstimate.totalCost)
                            : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right text-[10px] text-muted-foreground">
                          {new Date(project.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/project/${project._id}`)}
                              className="p-1.5 rounded-md hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                              title="Voir le projet"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm("Supprimer le projet \"" + (project.name || "Sans nom") + "\" ?")) return;
                                try {
                                  // Suppression admin → libère le quota du propriétaire
                                  await batchDeleteProjects({ projectIds: [project._id] as any });
                                  toast.success("Projet supprimé");
                                } catch (err: any) {
                                  toast.error(err.message || "Erreur");
                                }
                              }}
                              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {allProjects.filter((p: any) => searchQuery ? (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (p.category || "").toLowerCase().includes(searchQuery.toLowerCase()) : true).length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-xs text-muted-foreground">Aucun projet trouvé</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {allProjects.length > 0 && (
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">Total estimations: <span className="font-mono">{new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(totalCost)}</span></span>
                  <span>•</span>
                  <span>{allProjects.filter((p: any) => p.status === "completed").length} terminé(s)</span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Investissements Management */}
          <TabsContent value="investments">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Gestion des analyses d'investissement</h2>
                  <p className="text-xs text-muted-foreground">{allAnalyses.length} analyse(s) · les quotas des propriétaires sont libérés à la suppression</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAnalysisIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 text-xs shrink-0"
                      onClick={async () => {
                        if (!window.confirm("Supprimer " + selectedAnalysisIds.size + " analyse(s) ? Cette action est irréversible.")) return;
                        setBatchDeletingAnalyses(true);
                        try {
                          await batchDeleteAnalyses({ analysisIds: Array.from(selectedAnalysisIds) as any });
                          toast.success(selectedAnalysisIds.size + " analyse(s) supprimée(s)");
                          setSelectedAnalysisIds(new Set());
                        } catch (err: any) {
                          toast.error(err.message || "Erreur");
                        } finally {
                          setBatchDeletingAnalyses(false);
                        }
                      }}
                      disabled={batchDeletingAnalyses}
                    >
                      {batchDeletingAnalyses ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Supprimer ({selectedAnalysisIds.size})
                    </Button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher une analyse..."
                      value={investmentSearch}
                      onChange={(e) => setInvestmentSearch(e.target.value)}
                      className="h-9 w-40 sm:w-56 pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs w-8">
                        <input
                          type="checkbox"
                          checked={allAnalyses.length > 0 && selectedAnalysisIds.size === allAnalyses.filter((a: any) =>
                            investmentSearch
                              ? (a.input?.name || "").toLowerCase().includes(investmentSearch.toLowerCase()) ||
                                (a.input?.investmentType || "").toLowerCase().includes(investmentSearch.toLowerCase())
                              : true
                          ).length}
                          onChange={() => {
                            const filtered = allAnalyses.filter((a: any) =>
                              investmentSearch
                                ? (a.input?.name || "").toLowerCase().includes(investmentSearch.toLowerCase()) ||
                                  (a.input?.investmentType || "").toLowerCase().includes(investmentSearch.toLowerCase())
                                : true
                            );
                            if (selectedAnalysisIds.size === filtered.length) {
                              setSelectedAnalysisIds(new Set());
                            } else {
                              setSelectedAnalysisIds(new Set(filtered.map((a: any) => a._id)));
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Analyse</th>
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs hidden sm:table-cell">Utilisateur</th>
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Type</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Prix d'achat</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Rendement</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAnalyses
                      .filter((a: any) =>
                        investmentSearch
                          ? (a.input?.name || "").toLowerCase().includes(investmentSearch.toLowerCase()) ||
                            (a.input?.investmentType || "").toLowerCase().includes(investmentSearch.toLowerCase())
                          : true
                      )
                      .map((analysis: any) => {
                        const invType = analysis.input?.investmentType || "—";
                        const grossYield = analysis.results?.indicators?.grossYieldPct ?? analysis.results?.grossYieldPct;
                        const netYield = analysis.results?.indicators?.netYieldPct ?? analysis.results?.netYieldPct;
                        const rendement = grossYield != null ? grossYield : netYield != null ? netYield : null;
                        return (
                        <tr key={analysis._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150 group">
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={selectedAnalysisIds.has(analysis._id)}
                              onChange={() => {
                                const next = new Set(selectedAnalysisIds);
                                if (next.has(analysis._id)) next.delete(analysis._id);
                                else next.add(analysis._id);
                                setSelectedAnalysisIds(next);
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-xs">{analysis.input?.name || "Analyse sans nom"}</p>
                            <p className="text-[9px] text-muted-foreground">{(analysis.input?.city || "")} {(analysis.input?.region || "")}</p>
                          </td>
                          <td className="py-2.5 px-2 hidden sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-6 w-6 shrink-0 border border-border/30">
                                <AvatarImage src={analysis.user?.image || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">
                                  {analysis.user?.name?.charAt(0)?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate max-w-[100px]">{analysis.user?.name || "—"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-[9px] font-normal">{invType}</Badge>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-xs font-medium">
                            {analysis.input?.purchasePrice
                              ? new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(analysis.input.purchasePrice)
                              : "—"}
                          </td>
                          <td className="py-2.5 px-2 text-right text-xs font-medium">
                            {rendement != null ? `${Number(rendement).toFixed(1)}%` : "—"}
                          </td>
                          <td className="py-2.5 px-2 text-right text-[10px] text-muted-foreground">
                            {new Date(analysis.createdAt).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard/investments/result/${analysis._id}`)}
                                className="p-1.5 rounded-md hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                                title="Voir l'analyse"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm("Supprimer l'analyse \"" + (analysis.input?.name || "Sans nom") + "\" ?")) return;
                                  try {
                                    await deleteAnalysisMutation({ analysisId: analysis._id });
                                    toast.success("Analyse supprimée");
                                  } catch (err: any) {
                                    toast.error(err.message || "Erreur");
                                  }
                                }}
                                className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    {allAnalyses.filter((a: any) => investmentSearch ? (a.input?.name || "").toLowerCase().includes(investmentSearch.toLowerCase()) || (a.input?.investmentType || "").toLowerCase().includes(investmentSearch.toLowerCase()) : true).length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-xs text-muted-foreground">Aucune analyse trouvée</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Gestion des utilisateurs</h2>
                  <p className="text-xs text-muted-foreground">{allUsers.length} utilisateur(s)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs shrink-0"
                    title="Corriger les rôles manquants"
                    onClick={async () => {
                      if (!window.confirm("Corriger les rôles manquants ?\n\nDétecte les utilisateurs ayant un profil Fournisseur/Expert mais userRole non défini, et le corrige automatiquement.")) return;
                      try {
                        const result = await fixUserRoles();
                        if (result.fixed.length > 0) {
                          toast.success(`${result.fixed.length} rôle(s) corrigé(s)`);
                        } else {
                          toast.info("Aucun rôle à corriger");
                        }
                      } catch (err: any) {
                        toast.error(err.message || "Erreur");
                      }
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Corriger les rôles</span>
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="h-9 w-40 sm:w-56 pl-9 text-sm"
                    />
                  </div>
                  {selectedUserIds.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 text-xs shrink-0"
                      onClick={handleBatchDelete}
                      disabled={batchDeleting}
                    >
                      {batchDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Supprimer ({selectedUserIds.size})
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                <table className="w-full min-w-[960px] text-sm">
                      <thead>
                        <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                          <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs w-8">             <input
                          type="checkbox"
                          checked={allUsers.length > 0 && selectedUserIds.size === allUsers.filter((u: any) =>
                            userSearch
                              ? (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                                (u.email || "").toLowerCase().includes(userSearch.toLowerCase())
                              : true
                          ).length}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Utilisateur</th>
                      <th className="text-left py-2.5 px-2 font-medium text-muted-foreground text-xs">Téléphone</th>
                      <th className="text-center py-2.5 px-2 font-medium text-muted-foreground text-xs">Rôle</th>
                      <th className="text-center py-2.5 px-2 font-medium text-muted-foreground text-xs">Profil</th>
                      <th className="text-center py-2.5 px-2 font-medium text-muted-foreground text-xs">Abonnement</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Inscription</th>
                      <th className="text-right py-2.5 px-2 font-medium text-muted-foreground text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers
                      .filter((u: any) =>
                        userSearch
                          ? (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
                            (u.email || "").toLowerCase().includes(userSearch.toLowerCase())
                          : true
                      )
                      .map((u: any) => (
                      <tr key={u._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(u._id)}
                            onChange={() => {
                              const next = new Set(selectedUserIds);
                              if (next.has(u._id)) next.delete(u._id);
                              else next.add(u._id);
                              setSelectedUserIds(next);
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 shrink-0 border border-border/40 cursor-pointer" onClick={() => setSelectedUser(u)}>
                              {u.image ? (
                                <AvatarImage src={u.image} alt="Photo" className="object-cover" />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                  {u.name?.charAt(0)?.toUpperCase() || "?"}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="min-w-0 cursor-pointer" onClick={() => setSelectedUser(u)}>
                              <p className="font-medium text-xs truncate max-w-[120px] sm:max-w-[180px]">
                                {u.name || u.email || "Non renseigné"}
                              </p>
                              <p className="text-[9px] text-muted-foreground truncate max-w-[120px] sm:max-w-[180px]">
                                {u.email || ""}
                              </p>
                            </div>
                          </div>
                          </td>
                        <td className="py-2.5 px-2 text-left">
                          <span className="text-xs">{u.phone || "—"}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Badge className={cn("text-[9px]", u.role === "admin" ? "bg-purple-500/10 text-purple-600 border-purple-200/30" : u.role === "moderator" ? "bg-amber-500/10 text-amber-600 border-amber-200/30" : "bg-muted/30 text-muted-foreground")}>
                            {u.role === "admin" ? "Admin" : u.role === "moderator" ? "Modérateur" : "Utilisateur"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {isModerator ? (
                            <Badge className={cn("text-[9px]", u.userRole === "supplier" ? "bg-amber-500/10 text-amber-600 border-amber-200/30" : u.userRole === "expert" ? "bg-blue-500/10 text-blue-600 border-blue-200/30" : "bg-muted/30 text-muted-foreground")}>
                              {u.userRole === "supplier" ? "Fournisseur" : u.userRole === "expert" ? "Expert" : "Client Pro"}
                            </Badge>
                          ) : (
                            <select
                              value={u.userRole || "client"}
                              onChange={async (e) => {
                                try {
                                  await setUserProfileRole({ userId: u._id, userRole: e.target.value as any });
                                  toast.success("Profil mis à jour");
                                } catch (err: any) {
                                  toast.error(err.message || "Erreur");
                                }
                              }}
                              className={cn(
                                "text-[9px] h-6 rounded-md border border-border/30 bg-background px-1.5 font-medium",
                                u.userRole === "supplier" ? "text-amber-600 bg-amber-400/10" :
                                u.userRole === "expert" ? "text-blue-600 bg-blue-500/5" :
                                "text-muted-foreground"
                              )}
                            >
                              <option value="client">Client Pro</option>
                              <option value="supplier">Fournisseur</option>
                              <option value="expert">Expert</option>
                            </select>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {isModerator ? (
                            <Badge className={cn("text-[9px]", u.subscriptionPlan === "pro" ? "bg-blue-500/10 text-blue-600 border-blue-200/30" : u.subscriptionPlan === "expert" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/30" : u.subscriptionPlan === "supplier" ? "bg-amber-400/10 text-amber-600 border-amber-200/30" : "bg-muted/30 text-muted-foreground")}>
                              {u.subscriptionPlan === "supplier" ? "Fournisseur" : u.subscriptionPlan === "expert" ? "Expert" : u.subscriptionPlan === "pro" ? "Client Pro" : "Aucun"}
                            </Badge>
                          ) : (
                            <select
                              value={u.subscriptionPlan || "free"}
                              onChange={async (e) => {
                                try {
                                  await updateUserPlan({ userId: u._id, plan: e.target.value as any });
                                  toast.success("Plan mis à jour");
                                } catch (err: any) {
                                  toast.error(err.message || "Erreur");
                                }
                              }}
                              className={cn(
                                "text-[9px] h-6 rounded-md border border-border/30 bg-background px-1.5 font-medium",
                                u.subscriptionPlan === "pro" ? "text-blue-600 bg-blue-500/5" :
                                u.subscriptionPlan === "expert" ? "text-emerald-600 bg-emerald-500/5" :
                                u.subscriptionPlan === "supplier" ? "text-amber-600 bg-amber-400/10" :
                                "text-muted-foreground"
                              )}
                            >
                              <option value="pro">Client Pro</option>
                              <option value="expert">Expert</option>
                              <option value="supplier">Fournisseur</option>
                            </select>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right text-[10px] text-muted-foreground">
                          {(u.createdAt ?? (u as any)._creationTime)
                            ? new Date(u.createdAt ?? (u as any)._creationTime).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isModerator ? (
                              <Badge className="text-[9px] bg-muted/30 text-muted-foreground">
                                {u.role === "admin" ? "Admin" : u.role === "moderator" ? "Modérateur" : "Utilisateur"}
                              </Badge>
                            ) : (
                            <select
                              value={u.role || "user"}
                              onChange={async (e) => {
                                try {
                                  await updateUserRole({ userId: u._id, role: e.target.value as any });
                                  toast.success("Rôle mis à jour");
                                } catch (err: any) {
                                  toast.error(err.message || "Erreur");
                                }
                              }}
                              className="text-[9px] h-6 rounded-md border border-border/30 bg-background px-1.5"
                            >
                              <option value="user">Utilisateur</option>
                              <option value="moderator">Modérateur</option>
                              <option value="admin">Admin</option>
                            </select>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await toggleUserStatus({
                                    userId: u._id,
                                    status: u.status === "active" ? "disabled" : "active",
                                  });
                                  toast.success(u.status === "active" ? "Compte désactivé" : "Compte réactivé");
                                } catch (err: any) {
                                  toast.error(err.message || "Erreur");
                                }
                              }}
                              className="p-1.5 rounded-md hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                              title={u.status === "active" ? "Désactiver" : "Activer"}
                            >
                              {u.status === "active" ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingUserId(u._id)}
                              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Virements */}
          <TabsContent value="virements">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">Virements bancaires</h2>
                  <p className="text-xs text-muted-foreground">Abonnements en attente de validation</p>
                </div>
              </div>

              {pendingSubs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mx-auto mb-4">
                    <Banknote className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-semibold">Aucune demande en attente</p>
                  <p className="text-xs text-muted-foreground mt-1">Les demandes de virement apparaîtront ici.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Client</th>
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Téléphone</th>
                        <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Offre</th>
                        <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Montant</th>
                        <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Méthode</th>
                        <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Date</th>
                        <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingSubs.map((sub: any) => (
                        <tr key={sub._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150">
                          <td className="py-2.5 px-2 sm:px-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                                <AvatarImage src={sub.user?.image || ""} alt="Photo" className="object-cover" />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                  {sub.user?.name?.charAt(0)?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-xs truncate max-w-[120px] cursor-pointer hover:text-primary transition-colors" onClick={() => setSelectedUser(sub.user)}>{sub.user?.name || sub.user?.email || "Non renseigné"}</p>
                                <p className="text-[9px] text-muted-foreground truncate max-w-[120px]">{sub.user?.email || ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-left hidden sm:table-cell">
                            <span className="text-[10px] text-muted-foreground">{sub.user?.phone || "—"}</span>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-center">
                            <Badge variant="outline" className="text-[9px] capitalize">
                              {sub.plan}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-center hidden sm:table-cell">
                            <span className="font-mono text-xs font-medium">{sub.amount} TND</span>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-center hidden sm:table-cell">
                            <Badge variant="secondary" className="text-[9px]">
                              {sub.paymentMethod === "bank_transfer" ? "Virement" : sub.paymentMethod === "d17" ? "D17" : sub.paymentMethod}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-right hidden sm:table-cell text-[10px] text-muted-foreground">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("fr-FR") : "—"}
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={async () => {
                                  try {
                                    await approveSub({ subscriptionId: sub._id });
                                    toast.success("Abonnement approuvé");
                                  } catch (err: any) {
                                    toast.error(err.message || "Erreur");
                                  }
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Approuver</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={async () => {
                                  try {
                                    await rejectSub({ subscriptionId: sub._id });
                                    toast.success("Demande rejetée");
                                  } catch (err: any) {
                                    toast.error(err.message || "Erreur");
                                  }
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Rejeter</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals summary */}
              {pendingSubs.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{pendingSubs.length} demande(s) en attente</span>
                  <span>•</span>
                  <span>Total : {pendingSubs.reduce((sum: number, s: any) => sum + (s.amount || 0), 0).toLocaleString("fr-FR")} TND</span>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Subscriptions */}
          <TabsContent value="subscriptions">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold">Gestion des abonnements</h2>
                    <p className="text-xs text-muted-foreground">{allSubsWithUsers.length} abonnement(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={subSearch}
                      onChange={(e) => setSubSearch(e.target.value)}
                      className="h-9 w-40 sm:w-48 pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {allSubsWithUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-semibold">Aucun abonnement</p>
                  <p className="text-xs text-muted-foreground mt-1">Les abonnements apparaîtront ici.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Client</th>
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Téléphone</th>
                        <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Offre</th>
                        <th className="text-center py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Statut</th>
                        <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Montant</th>
                        <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Date</th>
                        <th className="text-right py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSubsWithUsers
                        .filter((sub: any) =>
                          subSearch
                            ? (sub.user?.name || "").toLowerCase().includes(subSearch.toLowerCase()) ||
                              (sub.user?.email || "").toLowerCase().includes(subSearch.toLowerCase()) ||
                              (sub.plan || "").toLowerCase().includes(subSearch.toLowerCase())
                            : true
                        )
                        .map((sub: any) => (
                        <tr key={sub._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150">
                          <td className="py-2.5 px-2 sm:px-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                                <AvatarImage src={sub.user?.image || ""} alt="Photo" className="object-cover" />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                  {sub.user?.name?.charAt(0)?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-xs truncate max-w-[120px]">{sub.user?.name || sub.user?.email || "Non renseigné"}</p>
                                <p className="text-[9px] text-muted-foreground truncate max-w-[120px]">{sub.user?.email || ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-left hidden sm:table-cell">
                            <span className="text-[10px] text-muted-foreground">{sub.user?.phone || "—"}</span>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-center">
                            <Badge className={cn(
                              "text-[9px]",
                              sub.plan === "pro" ? "bg-blue-500/10 text-blue-600 border-blue-200/30" :
                              sub.plan === "expert" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/30" :
                              "bg-muted/30 text-muted-foreground"
                            )}>
                              {sub.plan === "pro" ? "Client Pro" : sub.plan === "expert" ? "Expert" : sub.plan === "supplier" ? "Fournisseur" : sub.plan}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-center">
                            <Badge className={cn("text-[9px]", sub.status === "active" ? "bg-emerald-500/10 text-emerald-600" : sub.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-muted/30 text-muted-foreground")}>
                              {sub.status === "active" ? "Actif" : sub.status === "pending" ? "En attente" : sub.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-right hidden sm:table-cell">
                            <span className="font-mono text-xs font-medium">{sub.amount ? `${sub.amount.toLocaleString("fr-FR")} TND` : "—"}</span>
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-right hidden sm:table-cell text-[10px] text-muted-foreground">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}
                          </td>
                          <td className="py-2.5 px-2 sm:px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {sub.status === "pending" && (
                                <>
                                  <Button variant="outline" size="sm" className="h-7 text-[10px] text-emerald-600" onClick={async () => {
                                    await approveSub({ subscriptionId: sub._id });
                                    toast.success("Approuvé");
                                  }}>
                                    <Check className="h-3 w-3 mr-0.5" /> OK
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-red-600" onClick={async () => {
                                    await rejectSub({ subscriptionId: sub._id });
                                    toast.success("Rejeté");
                                  }}>
                                    <X className="h-3 w-3 mr-0.5" /> Non
                                  </Button>
                                </>
                              )}
                              <button
                                type="button"
                                className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                title="Supprimer"
                                onClick={async () => {
                                  if (!window.confirm("Supprimer cet abonnement ?")) return;
                                  try {
                                    await rejectSub({ subscriptionId: sub._id });
                                    toast.success("Abonnement supprimé");
                                  } catch (err: any) {
                                    toast.error(err.message || "Erreur");
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {allSubsWithUsers.filter((sub: any) => subSearch ? (sub.user?.name || "").toLowerCase().includes(subSearch.toLowerCase()) || (sub.user?.email || "").toLowerCase().includes(subSearch.toLowerCase()) || (sub.plan || "").toLowerCase().includes(subSearch.toLowerCase()) : true).length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">Aucun abonnement trouvé</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Admin Action Logs */}
          <TabsContent value="journal">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <NotebookPen className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">Journal d'activité</h2>
                  <p className="text-xs text-muted-foreground">Actions des administrateurs</p>
                </div>
              </div>

              {adminLogs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mx-auto mb-4">
                    <NotebookPen className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-semibold">Aucune activité</p>
                  <p className="text-xs text-muted-foreground mt-1">Le journal est vide.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Date</th>
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Admin</th>
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Action</th>
                        <th className="text-left py-2.5 px-2 sm:px-3 font-medium text-muted-foreground text-xs">Détails</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminLogs.map((log: any) => {
                        const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
                          delete_user: { label: "Suppression utilisateur", icon: Trash2, color: "text-red-500" },
                          toggle_user_status: { label: "Statut utilisateur", icon: ToggleLeft, color: "text-amber-500" },
                          batch_delete_users: { label: "Suppression groupée", icon: Trash2, color: "text-red-600" },
                          approve_subscription: { label: "Abonnement approuvé", icon: Check, color: "text-emerald-500" },
                          reject_subscription: { label: "Abonnement rejeté", icon: X, color: "text-red-500" },
                          update_user_role: { label: "Rôle modifié", icon: Users, color: "text-blue-500" },
                          update_user_plan: { label: "Plan modifié", icon: CreditCard, color: "text-purple-500" },
                        };
                        const config = actionConfig[log.action] || { label: log.action, icon: Activity, color: "text-muted-foreground" };
                        const Icon = config.icon;

                        return (
                          <tr key={log._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150">
                            <td className="py-2.5 px-2 sm:px-3 text-[10px] text-muted-foreground">
                              {new Date(log.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-2.5 px-2 sm:px-3 text-xs font-medium">{log.adminName || "Admin"}</td>
                            <td className="py-2.5 px-2 sm:px-3">
                              <div className="flex items-center gap-1.5">
                                <Icon className={cn("h-3.5 w-3.5", config.color)} />
                                <span className="text-xs">{config.label}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 sm:px-3 text-xs text-muted-foreground">{log.details || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Payment Configuration */}
          <TabsContent value="paiement">
            <Card className="border border-border/30 bg-background/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Configuration des paiements</CardTitle>
                <CardDescription>Coordonnées bancaires et D17 - Modifiables</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-primary" />
                      Virement bancaire
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Banque</label>
                        <Input
                          value={paymentForm.bankName}
                          onChange={(e) => setPaymentForm({...paymentForm, bankName: e.target.value})}
                          placeholder="Ex: BIAT, Amen Bank..."
                          className="h-9 text-sm mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Titulaire</label>
                        <Input
                          value={paymentForm.bankTitulaire}
                          onChange={(e) => setPaymentForm({...paymentForm, bankTitulaire: e.target.value})}
                          placeholder="Nom du titulaire"
                          className="h-9 text-sm mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">RIB</label>
                        <Input
                          value={paymentForm.bankRib}
                          onChange={(e) => setPaymentForm({...paymentForm, bankRib: e.target.value})}
                          placeholder="RIB bancaire"
                          className="h-9 text-sm font-mono mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">IBAN</label>
                        <Input
                          value={paymentForm.bankIban}
                          onChange={(e) => setPaymentForm({...paymentForm, bankIban: e.target.value})}
                          placeholder="IBAN international"
                          className="h-9 text-sm font-mono mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">SWIFT/BIC</label>
                        <Input
                          value={paymentForm.bankSwift}
                          onChange={(e) => setPaymentForm({...paymentForm, bankSwift: e.target.value})}
                          placeholder="Code SWIFT"
                          className="h-9 text-sm font-mono mt-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      Paiement D17
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Marchand</label>
                        <Input
                          value={paymentForm.d17MerchantName}
                          onChange={(e) => setPaymentForm({...paymentForm, d17MerchantName: e.target.value})}
                          placeholder="Nom du marchand"
                          className="h-9 text-sm mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Téléphone</label>
                        <Input
                          value={paymentForm.d17Phone}
                          onChange={(e) => setPaymentForm({...paymentForm, d17Phone: e.target.value})}
                          placeholder="Numéro D17"
                          className="h-9 text-sm mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Email</label>
                        <Input
                          value={paymentForm.d17Email}
                          onChange={(e) => setPaymentForm({...paymentForm, d17Email: e.target.value})}
                          placeholder="Email D17"
                          className="h-9 text-sm mt-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Notice</label>
                        <Input
                          value={paymentForm.d17Notice}
                          onChange={(e) => setPaymentForm({...paymentForm, d17Notice: e.target.value})}
                          placeholder="Instructions de paiement"
                          className="h-9 text-sm mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/10">
                  {savingPayment ? (
                    <Button disabled className="gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enregistrement...
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        setSavingPayment(true);
                        try {
                          await updatePaymentConfig(paymentForm as any);
                          toast.success("Configuration mise à jour");
                        } catch (err: any) {
                          toast.error(err.message || "Erreur");
                        }
                        setSavingPayment(false);
                      }}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Enregistrer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plan Limits — abonnements mensuels */}
          <TabsContent value="limites">
            <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Abonnements mensuels — prix et configuration</CardTitle>
                <CardDescription className="text-xs">
                  Forfaits mensuels (30 jours). Renouvellement requis à l'échéance. Le client doit passer au paiement dès la création de compte, sauf si l'« Offre gratuite » est activée : dans ce cas, les services (projets de construction, investissements, matériaux IA, plans architecturaux, suivi de A à Z) sont activés automatiquement, sans choix de forfait.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ═══ Forfait Client Pro (Start remplacé par Client Pro) ═══ */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/0 border border-blue-200/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        Forfait Client Pro
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {limitForm.clientProFree ? "Gratuit" : `${limitForm.clientProPrice} TND/mois`} — Estimation complète de vos projets de construction
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {limitForm.clientProFree ? (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200/30">Gratuit</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200/30">Payant</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] bg-blue-500/5">Client Pro</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border/20 p-3 text-[11px] text-muted-foreground space-y-1.5">
                    <p><strong className="text-foreground">Fonctionnalités :</strong> Projets de construction illimités, estimation IA aux prix tunisiens, rapports PDF/Excel/CSV, assistant matériaux IA, analyses de rentabilité immobilière.</p>
                    <p><strong className="text-foreground">Dashboard :</strong> Suivi de la date de début et de fin de validité. Renouvellement mensuel requis à l'échéance.</p>
                    <p><strong className="text-foreground">Règle :</strong> Le client passe au paiement dès la création de compte — aucun essai gratuit.</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="w-40">
                      <label className="text-xs text-muted-foreground">Prix mensuel (TND)</label>
                      <Input
                        type="number"
                        value={limitForm.clientProPrice}
                        disabled={limitForm.clientProFree}
                        onChange={(e) => setLimitForm({ ...limitForm, clientProPrice: parseFloat(e.target.value) })}
                        className="h-8 w-full text-sm mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-0.5">
                      <Switch
                        checked={limitForm.clientProFree}
                        onCheckedChange={(checked) =>
                          setLimitForm((prev) => ({
                            ...prev,
                            clientProFree: checked,
                            clientProPrice: checked ? prev.clientProPrice : prev.clientProPrice || 80,
                          }))
                        }
                      />
                      <span className="text-[11px] text-muted-foreground">Offre gratuite</span>
                    </div>
                  </div>
                </div>

                {/* ═══ Forfait Fournisseur ═══ */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/0 border border-purple-200/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-500" />
                        Forfait Fournisseur
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {limitForm.supplierFree ? "Gratuit" : `${limitForm.supplierPrice} TND/mois`} — Vendez vos matériaux sur la plateforme
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {limitForm.supplierFree ? (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200/30">Gratuit</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-200/30">Payant</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] bg-purple-500/5">Fournisseur</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border/20 p-3 text-[11px] text-muted-foreground space-y-1.5">
                    <p><strong className="text-foreground">Fonctionnalités :</strong> Espace fournisseur complet — profil entreprise, réception des demandes de devis, statistiques, gestion des devis.</p>
                    <p><strong className="text-foreground">Dashboard :</strong> Suivi de la date de début et de fin de validité. Renouvellement mensuel requis à l'échéance.</p>
                    <p><strong className="text-foreground">Règle :</strong> Paiement requis dès l'inscription — aucun essai gratuit.</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="w-40">
                      <label className="text-xs text-muted-foreground">Prix mensuel (TND)</label>
                      <Input
                        type="number"
                        value={limitForm.supplierPrice}
                        disabled={limitForm.supplierFree}
                        onChange={(e) => setLimitForm({ ...limitForm, supplierPrice: parseFloat(e.target.value) })}
                        className="h-8 w-full text-sm mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-0.5">
                      <Switch
                        checked={limitForm.supplierFree}
                        onCheckedChange={(checked) =>
                          setLimitForm((prev) => ({
                            ...prev,
                            supplierFree: checked,
                            supplierPrice: checked ? prev.supplierPrice : prev.supplierPrice || 120,
                          }))
                        }
                      />
                      <span className="text-[11px] text-muted-foreground">Offre gratuite</span>
                    </div>
                  </div>
                </div>

                {/* ═══ Forfait Expert ═══ */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 border border-emerald-200/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Crown className="h-4 w-4 text-emerald-500" />
                        Forfait Expert
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {limitForm.expertFree ? "Gratuit" : `${limitForm.expertPrice} TND/mois`} — Offrez vos services d'expertise
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {limitForm.expertFree ? (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200/30">Gratuit</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200/30">Payant</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/5">Expert</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/60 border border-border/20 p-3 text-[11px] text-muted-foreground space-y-1.5">
                    <p><strong className="text-foreground">Fonctionnalités :</strong> Espace expert complet — profil métier (architecte, ingénieur, bureau d'études, promoteur), réception des demandes de service, statistiques, gestion des prestations.</p>
                    <p><strong className="text-foreground">Dashboard :</strong> Suivi de la date de début et de fin de validité. Renouvellement mensuel requis à l'échéance.</p>
                    <p><strong className="text-foreground">Règle :</strong> Paiement requis dès l'inscription — aucun essai gratuit.</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="w-40">
                      <label className="text-xs text-muted-foreground">Prix mensuel (TND)</label>
                      <Input
                        type="number"
                        value={limitForm.expertPrice}
                        disabled={limitForm.expertFree}
                        onChange={(e) => setLimitForm({ ...limitForm, expertPrice: parseFloat(e.target.value) })}
                        className="h-8 w-full text-sm mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-2 pb-0.5">
                      <Switch
                        checked={limitForm.expertFree}
                        onCheckedChange={(checked) =>
                          setLimitForm((prev) => ({
                            ...prev,
                            expertFree: checked,
                            expertPrice: checked ? prev.expertPrice : prev.expertPrice || 120,
                          }))
                        }
                      />
                      <span className="text-[11px] text-muted-foreground">Offre gratuite</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-500/5 border border-amber-200/20 p-3 text-[11px] text-amber-600 dark:text-amber-400">
                  <p>L'essai gratuit a été <strong>supprimé</strong>. Chaque forfait est soit payant (prix défini ci-dessus), soit gratuit via son bouton « Offre gratuite » — l'activation des services est alors <strong>automatique</strong>, sans que le client ait à choisir un forfait.</p>
                </div>

                {savingLimits ? (
                  <Button disabled className="gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </Button>
                ) : (
                  <Button
                    onClick={async () => {
                      setSavingLimits(true);
                      try {
                        // Client Pro (Start remplacé par Client Pro)
                        await updatePlanPricing({
                          plan: "pro",
                          price: limitForm.clientProFree ? null : limitForm.clientProPrice,
                        });
                        // Fournisseur
                        await updatePlanPricing({
                          plan: "supplier",
                          price: limitForm.supplierFree ? null : limitForm.supplierPrice,
                        });
                        // Expert
                        await updatePlanPricing({
                          plan: "expert",
                          price: limitForm.expertFree ? null : limitForm.expertPrice,
                        });
                        toast.success("Abonnements mis à jour");
                      } catch (err: any) {
                        toast.error(err.message || "Erreur");
                      }
                      setSavingLimits(false);
                    }}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Enregistrer les abonnements
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          {/* SEO Configuration (in full-width outside the scroll container) */}
          <TabsContent value="seo">
            <SeoSettings />
          </TabsContent>

          {/* Blog management */}
          <TabsContent value="blog">
            <BlogAdmin />
          </TabsContent>

          {/* BIM Configuration */}
          <TabsContent value="bim">
            <BIMSettings />
          </TabsContent>

          {/* Email Configuration (SMTP + branding) */}
          <TabsContent value="emails">
            <EmailSettings />
          </TabsContent>

          {/* Email Templates editor */}
          <TabsContent value="modeles">
            <EmailTemplates />
          </TabsContent>

          {/* Email History + stats */}
          <TabsContent value="historique">
            <EmailHistory />
          </TabsContent>
          {/* ── Experts ── */}
            <TabsContent value="experts">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <div>
                      <h2 className="text-lg font-semibold">Gestion des experts</h2>
                      <p className="text-xs text-muted-foreground">{allExperts.length} expert(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={expertSearch}
                        onChange={(e) => setExpertSearch(e.target.value)}
                        className="h-9 w-36 sm:w-44 pl-9 text-sm"
                      />
                    </div>
                    {allExperts.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs shrink-0"
                        onClick={() => {
                          const headers = ["Nom","Métier","Email","Téléphone","Spécialités","Régions","Statut","Visibilité","Date inscription"];
                          const rows = allExperts.map((p: any) => [
                            p.displayName || "",
                            p.profession || "",
                            p.email || "",
                            p.phone || "",
                            (p.specialties || []).join(", "),
                            (p.regions || []).join(", "),
                            p.subscriptionStatus || "",
                            p.isVisible ? "Visible" : "Masqué",
                            p.createdAt ? new Date(p.createdAt).toLocaleDateString("fr-FR") : "",
                          ]);
                          const csv = [headers.join(","), ...rows.map((r: string[]) => r.map(c => `"${c}"`).join(","))].join("\n");
                          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "experts_" + new Date().toISOString().split("T")[0] + ".csv";
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success("Fichier CSV exporté");
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export CSV</span>
                      </Button>
                    )}
                  </div>
                </div>

                {allExperts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mx-auto mb-4">
                      <Briefcase className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-semibold">Aucun expert</p>
                    <p className="text-xs text-muted-foreground mt-1">Les profils experts apparaîtront ici après inscription.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs">Expert</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Métier</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Spécialités</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Statut</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Visibilité</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Reçu</th>
                          <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allExperts
                          .filter((profile: any) =>
                            expertSearch
                              ? (profile.displayName || "").toLowerCase().includes(expertSearch.toLowerCase()) ||
                                (profile.user?.name || "").toLowerCase().includes(expertSearch.toLowerCase()) ||
                                (profile.email || "").toLowerCase().includes(expertSearch.toLowerCase())
                              : true
                          )
                          .map((profile: any) => {
                          const statusColors: Record<string, string> = {
                            active: "bg-emerald-500/10 text-emerald-600 border-emerald-200/30",
                            pending: "bg-amber-500/10 text-amber-600 border-amber-200/30",
                            expired: "bg-red-500/10 text-red-600 border-red-200/30",
                            inactive: "bg-muted/30 text-muted-foreground border-muted-foreground/20",
                          };
                          const statusLabels: Record<string, string> = {
                            active: "Actif",
                            pending: "En attente",
                            expired: "Expiré",
                            inactive: "Inactif",
                          };
                          return (
                            <tr key={profile._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                                    {profile.user?.image ? (
                                      <AvatarImage src={profile.user.image} className="object-cover" />
                                    ) : (
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                        {(profile.displayName || "?").charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium text-xs truncate max-w-[120px] sm:max-w-[180px]">{profile.displayName || "—"}</p>
                                    <p className="text-[9px] text-muted-foreground truncate">{profile.user?.name || profile.email || ""}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 hidden sm:table-cell">
                                <Badge variant="secondary" className="text-[9px]">{profile.profession || "—"}</Badge>
                              </td>
                              <td className="py-2.5 px-3 hidden md:table-cell">
                                <div className="flex flex-wrap gap-1">
                                  {(profile.specialties || []).slice(0, 2).map((s: string) => (
                                    <Badge key={s} variant="secondary" className="text-[8px]">{s}</Badge>
                                  ))}
                                  {(profile.specialties || []).length > 2 && (
                                    <Badge variant="secondary" className="text-[8px]">+{profile.specialties.length - 2}</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <Badge className={cn("text-[9px]", statusColors[profile.subscriptionStatus] || statusColors.inactive)}>
                                  {statusLabels[profile.subscriptionStatus] || profile.subscriptionStatus}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-center hidden sm:table-cell">
                                <Badge variant={profile.isVisible ? "default" : "secondary"} className={cn("text-[9px]", profile.isVisible ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/30")}>
                                  {profile.isVisible ? "Visible" : "Masqué"}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-center hidden md:table-cell">
                                {profile.paymentProofUrl ? (
                                  <Badge className={cn("text-[9px]", profile.paymentProofVerified ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                                    {profile.paymentProofVerified ? "Vérifié" : "En attente"}
                                  </Badge>
                                ) : (
                                  <span className="text-[9px] text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {profile.subscriptionStatus === "pending" && (
                                    <>
                                      <Button
                                        variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={async () => {
                                          try {
                                            await approveExpertSub({ profileId: profile._id });
                                            toast.success("Abonnement expert approuvé");
                                          } catch (err: any) { toast.error(err.message || "Erreur"); }
                                        }}
                                        title="Approuver"
                                      >
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={async () => {
                                          try {
                                            await rejectExpertSub({ profileId: profile._id });
                                            toast.success("Abonnement expert rejeté");
                                          } catch (err: any) { toast.error(err.message || "Erreur"); }
                                        }}
                                        title="Rejeter"
                                      >
                                        <X className="h-3.5 w-3.5 text-red-600" />
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={async () => {
                                      try {
                                        await toggleExpertVisibility({ profileId: profile._id });
                                        toast.success("Visibilité modifiée");
                                      } catch (err: any) { toast.error(err.message || "Erreur"); }
                                    }}
                                    title={profile.isVisible ? "Masquer" : "Rendre visible"}
                                  >
                                    {profile.isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Supprimer">
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Supprimer ce profil expert ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Cette action est irréversible. Le profil de <strong>{profile.displayName}</strong> sera supprimé.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                          className="bg-destructive text-destructive-foreground"
                                          onClick={async () => {
                                            try {
                                              await deleteExpertProfile({ profileId: profile._id });
                                              toast.success("Profil expert supprimé");
                                            } catch (err: any) { toast.error(err.message || "Erreur"); }
                                          }}
                                        >
                                          Supprimer
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

          {/* ── Reçus Experts ── */}
            <TabsContent value="recusExperts">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    <div>
                      <h2 className="text-lg font-semibold">Reçus Experts</h2>
                      <p className="text-xs text-muted-foreground">Historique des reçus de paiement envoyés par les experts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs shrink-0"
                      onClick={() => {
                        const receipts = allExperts.filter((p: any) => p.paymentProofUrl);
                        if (receipts.length === 0) { toast.info("Aucun reçu à exporter"); return; }
                        const headers = ["Expert","Email","Montant","Date","Statut"];
                        const rows = receipts.map((p: any) => [
                          p.displayName || "",
                          p.email || "",
                          p.paymentAmount ? `${p.paymentAmount} TND` : "",
                          p.paymentProofUploadedAt ? new Date(p.paymentProofUploadedAt).toLocaleDateString("fr-FR") : "",
                          p.paymentProofVerified ? "Vérifié" : "En attente",
                        ]);
                        const csv = [headers.join(","), ...rows.map((r: string[]) => r.map(c => `"${c}"`).join(","))].join("\n");
                        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "recus_experts_" + new Date().toISOString().split("T")[0] + ".csv";
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("CSV exporté");
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                  </div>
                </div>

                {allExperts.filter((p: any) => p.paymentProofUrl).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/30 mx-auto mb-4">
                      <Receipt className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-semibold">Aucun reçu</p>
                    <p className="text-xs text-muted-foreground mt-1">Les reçus de paiement des experts apparaîtront ici après soumission.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border/30 bg-background/40 shadow-sm shadow-primary/5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs">Expert</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Montant</th>
                          <th className="text-center py-3 px-3 font-medium text-muted-foreground text-xs">Statut</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Date</th>
                          <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allExperts.filter((p: any) => p.paymentProofUrl).map((profile: any) => (
                          <tr key={profile._id} className="border-b border-border/10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-150">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 shrink-0 border border-border/40">
                                  {profile.user?.image ? (
                                    <AvatarImage src={profile.user.image} className="object-cover" />
                                  ) : (
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                      {(profile.displayName || "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium text-xs truncate">{profile.displayName || "—"}</p>
                                  <p className="text-[9px] text-muted-foreground truncate">{profile.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 hidden sm:table-cell">
                              <span className="text-xs font-medium">{profile.paymentAmount ? `${profile.paymentAmount} TND` : "—"}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge className={cn("text-[9px]", profile.paymentProofVerified ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/30" : "bg-amber-500/10 text-amber-600 border-amber-200/30")}>
                                {profile.paymentProofVerified ? "Vérifié" : "En attente"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 hidden md:table-cell">
                              <span className="text-[9px] text-muted-foreground">
                                {profile.paymentProofUploadedAt ? new Date(profile.paymentProofUploadedAt).toLocaleDateString("fr-FR") : "—"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {profile.paymentProofUrl && (
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => window.open(profile.paymentProofUrl, "_blank")}
                                    title="Voir le reçu"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {!profile.paymentProofVerified && (
                                  <Button
                                    variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={async () => {
                                      try {
                                        await verifyExpertReceipt({ profileId: profile._id });
                                        toast.success("Reçu vérifié");
                                      } catch (err: any) { toast.error(err.message || "Erreur"); }
                                    }}
                                    title="Vérifier"
                                  >
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={async () => {
                                    if (!window.confirm("Supprimer ce reçu ?")) return;
                                    try {
                                      await deleteExpertReceipt({ profileId: profile._id });
                                      toast.success("Reçu supprimé");
                                    } catch (err: any) { toast.error(err.message || "Erreur"); }
                                  }}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

          {/* ── Communications ── */}
          {canSee("annonces") && (
          <TabsContent value="annonces">
            <AnnouncementList />
          </TabsContent>
          )}

          {/* ── Analytics (Real-time geolocation tracking) ── */}
          {canSee("analytics") && (
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
          )}

        </Tabs>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-border/5 text-center">
          <p className="text-[10px] text-muted-foreground/40">
            batibuild App &copy; {new Date().getFullYear()} &mdash; Panneau d'administration v2.0
          </p>
        </div>
    </main>
  );
}