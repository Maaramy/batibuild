// ============================================================================
// MODULE PUSH NOTIFICATIONS — catalogue de modèles prêts à l'emploi
// ----------------------------------------------------------------------------
// Les modèles sont copiés dans une campagne (brouillon modifiable) : modifier
// un modèle ici ne change jamais une campagne déjà créée ni une notification
// déjà envoyée. Les textes sont ceux validés par l'administration Batibuild.
// ============================================================================

export type PushCategory = "client_pro" | "expert" | "supplier" | "custom";

/** Limites d'affichage sûres sur Android (titre 1–2 lignes, message 3–4). */
export const PUSH_TITLE_MAX = 65;
export const PUSH_MESSAGE_MAX = 180;

export type PushTemplate = {
  id: string;
  category: PushCategory;
  /** Nom interne de la campagne proposé par défaut. */
  name: string;
  title: string;
  message: string;
  actionLabel?: string;
  /** Route interne de la plateforme (ou URL https). */
  destination?: string;
  /** Icône affichée dans l'éditeur (nom lucide). */
  icon?: string;
  /** Précision affichée à l'administrateur (module indisponible, etc.). */
  note?: string;
};

export const PUSH_CATEGORY_LABELS: Record<PushCategory, string> = {
  client_pro: "Client Pro",
  expert: "Experts",
  supplier: "Fournisseurs",
  custom: "Personnalisée",
};

const CLIENT_PRO_TEMPLATES: PushTemplate[] = [
  {
    id: "cp-review",
    category: "client_pro",
    name: "Client Pro — Évaluation de Batibuild",
    title: "⭐ Votre avis compte !",
    message:
      "Aidez-nous à améliorer Batibuild. Évaluez votre expérience sur 5 étoiles et partagez vos suggestions.",
    actionLabel: "Donner mon avis",
    destination: "/dashboard",
    icon: "Star",
  },
  {
    id: "cp-cost",
    category: "client_pro",
    name: "Client Pro — Estimation du coût",
    title: "🏗️ Connaissez-vous le vrai coût de votre construction ?",
    message:
      "Matériaux, main-d'œuvre, finitions... Découvrez combien coûtera réellement votre projet avec Batibuild.",
    actionLabel: "Estimer mon projet",
    destination: "/dashboard/new",
    icon: "Calculator",
  },
  {
    id: "cp-pro",
    category: "client_pro",
    name: "Client Pro — Recherche de professionnels",
    title: "👷 Besoin d'un professionnel pour vos travaux ?",
    message:
      "Trouvez des experts, entrepreneurs et professionnels adaptés à votre projet de construction.",
    actionLabel: "Trouver un professionnel",
    destination: "/dashboard/professionals-directory",
    icon: "HardHat",
  },
  {
    id: "cp-plans",
    category: "client_pro",
    name: "Client Pro — Plans architecturaux",
    title: "🏡 Vous cherchez le plan idéal pour votre maison ?",
    message:
      "Découvrez des modèles architecturaux adaptés à votre surface, vos besoins et votre projet.",
    actionLabel: "Découvrir les plans",
    destination: "/dashboard/new",
    icon: "House",
  },
  {
    id: "cp-budget",
    category: "client_pro",
    name: "Client Pro — Analyse du budget",
    title: "💰 Votre budget suffit-il pour terminer votre chantier ?",
    message:
      "Anticipez vos dépenses, analysez votre budget et évitez les mauvaises surprises grâce à Batibuild.",
    actionLabel: "Analyser mon budget",
    destination: "/dashboard/projects",
    icon: "Wallet",
  },
  {
    id: "cp-investment",
    category: "client_pro",
    name: "Client Pro — Investissement immobilier",
    title: "📈 Envie d'investir dans l'immobilier ?",
    message:
      "Découvrez les opportunités immobilières et les outils d'analyse pour mieux préparer vos décisions.",
    actionLabel: "Découvrir les opportunités",
    destination: "/dashboard/investments",
    icon: "TrendingUp",
    note: "Le module Investissement immobilier n'est proposé qu'aux utilisateurs qui y ont accès.",
  },
  {
    id: "cp-referral",
    category: "client_pro",
    name: "Client Pro — Parrainage",
    title: "🎁 Invitez vos amis et gagnez jusqu'à 10 cotisations !",
    message:
      "Partagez votre lien de parrainage et profitez des récompenses Batibuild. Découvrez comment gagner jusqu'à 10 cotisations Client Pro.",
    actionLabel: "Parrainer maintenant",
    destination: "/dashboard/pricing",
    icon: "Gift",
    note: "Les règles du programme de parrainage ne sont pas encore définies dans la plateforme : la destination pointe vers les cotisations, à remplacer dès que l'espace Parrainage existe.",
  },
  {
    id: "cp-site",
    category: "client_pro",
    name: "Client Pro — Suivi de chantier",
    title: "🏗️ Suivez votre chantier de A à Z !",
    message:
      "Gardez le contrôle de vos travaux, dépenses et avancement grâce au module Gestion & Suivi de Chantier.",
    actionLabel: "Suivre mon chantier",
    destination: "/dashboard/chantiers",
    icon: "ClipboardList",
  },
  {
    id: "cp-custom",
    category: "custom",
    name: "Offre personnalisée",
    title: "",
    message: "",
    actionLabel: "",
    destination: "/dashboard",
    icon: "Sparkles",
    note: "Notification libre : titre, message, image, bouton, destination et validité.",
  },
];

const EXPERT_TEMPLATES: PushTemplate[] = [
  {
    id: "ex-review",
    category: "expert",
    name: "Expert — Évaluation",
    title: "⭐ Experts Batibuild, votre avis nous intéresse !",
    message:
      "Aidez-nous à améliorer votre expérience professionnelle. Évaluez Batibuild sur 5 étoiles et partagez vos suggestions.",
    actionLabel: "Évaluer Batibuild",
    destination: "/dashboard",
    icon: "Star",
  },
  {
    id: "ex-growth",
    category: "expert",
    name: "Expert — Développement commercial",
    title: "🚀 Vous cherchez plus de clients et de marchés ?",
    message:
      "Développez votre visibilité, présentez vos compétences et découvrez de nouvelles opportunités professionnelles avec Batibuild.",
    actionLabel: "Développer mon activité",
    destination: "/dashboard/expert",
    icon: "Rocket",
  },
  {
    id: "ex-referral",
    category: "expert",
    name: "Expert — Parrainage",
    title: "🎁 Parrainez et gagnez jusqu'à 6 mois gratuits !",
    message:
      "Invitez vos collègues professionnels à rejoindre Batibuild et profitez de mois d'abonnement gratuits selon les conditions du programme.",
    actionLabel: "Parrainer maintenant",
    destination: "/dashboard/pricing",
    icon: "Gift",
    note: "Programme de parrainage à définir : destination provisoire vers les cotisations.",
  },
];

const SUPPLIER_TEMPLATES: PushTemplate[] = [
  {
    id: "su-review",
    category: "supplier",
    name: "Fournisseur — Évaluation",
    title: "⭐ Votre expérience nous intéresse !",
    message:
      "Aidez-nous à améliorer Batibuild. Donnez votre avis et évaluez notre plateforme sur 5 étoiles.",
    actionLabel: "Donner mon avis",
    destination: "/dashboard",
    icon: "Star",
  },
  {
    id: "su-sales",
    category: "supplier",
    name: "Fournisseur — Développement des ventes",
    title: "📦 Vous souhaitez trouver plus de clients ?",
    message:
      "Augmentez votre visibilité et faites découvrir vos matériaux et équipements aux porteurs de projets de construction.",
    actionLabel: "Développer mes ventes",
    destination: "/dashboard/supplier",
    icon: "Package",
  },
  {
    id: "su-referral",
    category: "supplier",
    name: "Fournisseur — Parrainage",
    title: "🎁 Gagnez jusqu'à 6 mois gratuits !",
    message:
      "Invitez d'autres fournisseurs à rejoindre Batibuild et bénéficiez des récompenses de notre programme de parrainage.",
    actionLabel: "Inviter un fournisseur",
    destination: "/dashboard/pricing",
    icon: "Gift",
    note: "Programme de parrainage à définir : destination provisoire vers les cotisations.",
  },
];

export const PUSH_TEMPLATES: PushTemplate[] = [
  ...CLIENT_PRO_TEMPLATES,
  ...EXPERT_TEMPLATES,
  ...SUPPLIER_TEMPLATES,
];

export function pushTemplatesForCategory(category: PushCategory): PushTemplate[] {
  if (category === "custom") return PUSH_TEMPLATES.filter((t) => t.category === "custom");
  return PUSH_TEMPLATES.filter((t) => t.category === category);
}

export function getPushTemplate(id: string | undefined | null): PushTemplate | null {
  if (!id) return null;
  return PUSH_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function templateDefaults(template: PushTemplate) {
  return {
    templateId: template.id,
    category: template.category,
    campaignName: template.name,
    title: template.title,
    message: template.message,
    actionLabel: template.actionLabel ?? "",
    destination: template.destination ?? "",
    icon: template.icon ?? "Bell",
  };
}
