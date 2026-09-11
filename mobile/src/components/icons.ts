/**
 * Jeu d'icônes UNIQUE de la coque native Android.
 *
 * PÉRIMÈTRE : mobile uniquement.
 *
 * Les icônes de la plateforme Web viennent de **lucide** (`lucide-react`).
 * La coque native utilise donc exactement la même famille (`lucide-react-native`,
 * mêmes tracés, mêmes épaisseurs) afin que la barre supérieure, la barre
 * inférieure et le guide soient visuellement cohérents avec le tableau de bord
 * et le reste de la plateforme — en mode clair comme en mode sombre.
 *
 * Les icônes sont des SVG (aucune police d'icônes à charger) : le rendu est
 * identique dans tous les modes et ne dépend d'aucun téléchargement.
 */

import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  CloudOff,
  Cpu,
  Download,
  FileText,
  HardHat,
  Headset,
  Landmark,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Percent,
  Ruler,
  Settings,
  Sparkles,
  TrendingUp,
  Upload,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";

import type { NavId } from "../config";

/**
 * Icône de chaque section de la barre de navigation inférieure.
 *
 * Correspondance EXACTE avec les icônes du tableau de bord de la plateforme :
 *   User            → « Mon profil »
 *   HardHat         → « Projets »  (construction / logo Batibuild)
 *   LayoutDashboard → « Tableau de bord » (Dashboard)
 *   Landmark        → « Investissements immobiliers »
 *   MessageSquare   → « Messagerie »
 */
export const NAV_ICONS: Record<NavId, LucideIcon> = {
  profile: User,
  projects: HardHat,
  dashboard: LayoutDashboard,
  investments: Landmark,
  messages: MessageSquare,
};

/** Icônes de la barre supérieure — celles de la plateforme (Support, Paramètres). */
export const SUPPORT_ICON: LucideIcon = Headset;
export const SETTINGS_ICON: LucideIcon = Settings;

/** Écran « hors ligne / erreur ». */
export const OFFLINE_ICON: LucideIcon = CloudOff;

/**
 * Épaisseurs de trait. La famille est la même partout ; seuls l'état et le
 * poids varient (jamais de mélange d'icônes pleines et d'icônes contour).
 */
export const STROKE = {
  inactive: 1.9,
  active: 2.4,
} as const;

/**
 * Icônes des cartes du guide (recréations des écrans de la plateforme :
 * `src/components/LandingMockScreens.tsx`) — même famille, mêmes tracés.
 */
export const GUIDE_ICONS = {
  upload: Upload,
  check: Check,
  mapPin: MapPin,
  ruler: Ruler,
  cpu: Cpu,
  loader: LoaderCircle,
  building: Building2,
  layers: Layers,
  sparkles: Sparkles,
  download: Download,
  fileText: FileText,
  percent: Percent,
  wallet: Wallet,
  trending: TrendingUp,
  bot: Bot,
  arrowRight: ArrowRight,
} as const;

export type { LucideIcon };
