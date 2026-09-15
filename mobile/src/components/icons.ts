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
  ArrowUpRight,
  BadgeCheck,
  Blocks,
  Bot,
  Building2,
  Calendar,
  ChartLine,
  Check,
  CircleCheck,
  Clock,
  CloudOff,
  Coins,
  Cpu,
  Download,
  FileText,
  Globe,
  Hammer,
  HardHat,
  Headset,
  Image,
  ImagePlus,
  Landmark,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  MessageSquare,
  MessagesSquare,
  Package,
  PencilRuler,
  PenLine,
  Percent,
  Ruler,
  Satellite,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Upload,
  User,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";

import type { NavId } from "../config";

/**
 * Icône de chaque section de la barre de navigation inférieure.
 *
 * Correspondance EXACTE avec les icônes du tableau de bord de la plateforme :
 *   User            → « Profile »
 *   HardHat         → « Projets »  (construction / logo Batibuild)
 *   LayoutDashboard → « Home » (accueil de l'espace connecté)
 *   TrendingUp      → « ROI » — MÊME icône que l'action « Return on Investment »
 *                     de la page Résultats coût de construction
 *                     (`ProjectDetail.tsx`, lucide `TrendingUp`)
 *   MessageSquare   → « Message »
 */
export const NAV_ICONS: Record<NavId, LucideIcon> = {
  profile: User,
  projects: HardHat,
  dashboard: LayoutDashboard,
  investments: TrendingUp,
  messages: MessageSquare,
};

/** Icônes de la barre supérieure — celles de la plateforme (Support, Paramètres). */
export const SUPPORT_ICON: LucideIcon = Headset;
export const SETTINGS_ICON: LucideIcon = Settings;

/**
 * Forum d'Assistance — icône de l'en-tête natif.
 *
 * Même famille (lucide) que le reste de l'application ; `MessagesSquare` est
 * l'icône de discussion/forum, distincte de `MessageSquare` utilisée par
 * l'onglet « Message » de la barre inférieure (messagerie interne).
 */
export const FORUM_ICON: LucideIcon = MessagesSquare;

/**
 * ProMarket — icône de l'en-tête natif.
 *
 * `Store` est exactement l'icône utilisée par la plateforme Web pour ProMarket
 * (en-tête du tableau de bord, menu principal, accès rapides des projets) :
 * l'utilisateur retrouve le même repère visuel sur mobile et sur le Web.
 */
export const PROMARKET_ICON: LucideIcon = Store;

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
 * Icônes de la barre de navigation inférieure : trait contour, légèrement
 * épaissi sur l'élément actif (teinté en émeraude de marque).
 */
export const NAV_STROKE = {
  inactive: 1.8,
  active: 2.1,
} as const;

/**
 * Icônes des guides de première visite et de leurs illustrations — toujours la
 * même famille (lucide), jamais d'icône d'un autre style.
 */
export const GUIDE_ICONS = {
  /* actions & états */
  check: Check,
  circleCheck: CircleCheck,
  badgeCheck: BadgeCheck,
  shieldCheck: ShieldCheck,
  star: Star,
  search: Search,
  arrowRight: ArrowRight,
  arrowUpRight: ArrowUpRight,
  upload: Upload,
  download: Download,
  loader: LoaderCircle,
  clock: Clock,
  calendar: Calendar,
  /* documents & médias */
  fileText: FileText,
  image: Image,
  imagePlus: ImagePlus,
  globe: Globe,
  satellite: Satellite,
  pencilRuler: PencilRuler,
  penLine: PenLine,
  /* construction & matériaux */
  hardHat: HardHat,
  hammer: Hammer,
  wrench: Wrench,
  blocks: Blocks,
  package: Package,
  layers: Layers,
  building: Building2,
  ruler: Ruler,
  mapPin: MapPin,
  /* données & IA */
  cpu: Cpu,
  sparkles: Sparkles,
  bot: Bot,
  chartLine: ChartLine,
  trending: TrendingUp,
  percent: Percent,
  coins: Coins,
  wallet: Wallet,
  landmark: Landmark,
  users: Users,
  user: User,
  messageSquare: MessageSquare,
} as const;

export type { LucideIcon };
