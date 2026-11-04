// ============================================================================
// MODULE OFFRES & CAMPAGNES — catalogue de modèles marketing
// ----------------------------------------------------------------------------
// Modèles prêts à l'emploi par catégorie. Ils sont copiés dans une campagne
// (brouillon modifiable) : modifier un modèle ici ne change jamais une
// campagne déjà créée ni un e-mail déjà envoyé.
// ============================================================================

export type MarketingCategory = "client_pro" | "expert" | "supplier";

export type MarketingTemplate = {
  id: string;
  category: MarketingCategory;
  title: string;
  objective: string;
  subject: string;
  /** Texte d'introduction (premier paragraphe, variables acceptées). */
  intro: string;
  /** Contenu détaillé : paragraphes et puces « - ». */
  body: string;
  ctaLabel: string;
  /** Chemin relatif au site ; l'administrateur peut le remplacer par une URL. */
  ctaPath: string;
  /** La campagne demande une évaluation 1–5 étoiles (page publique). */
  feedback: boolean;
  conditions?: string;
};

export const MARKETING_CATEGORY_LABELS: Record<MarketingCategory, string> = {
  client_pro: "Client Pro",
  expert: "Expert",
  supplier: "Fournisseur",
};

const CLIENT_PRO_TEMPLATES: MarketingTemplate[] = [
  {
    id: "cp-feedback",
    category: "client_pro",
    title: "Évaluation de l'expérience Batibuild",
    objective: "Collecter les avis et évaluations",
    subject: "Votre avis compte : aidons-nous à améliorer Batibuild !",
    intro:
      "Chez Batibuild, nous travaillons chaque jour pour simplifier et améliorer l'expérience de construction en Tunisie.\n\nVotre expérience nous intéresse particulièrement !\n\nNous aimerions connaître votre avis sur notre plateforme afin d'améliorer nos services et de mieux répondre à vos besoins.",
    body: "Évaluez votre expérience sur 5 étoiles et partagez votre commentaire.",
    ctaLabel: "Donner mon avis",
    ctaPath: "/",
    feedback: true,
  },
  {
    id: "cp-budget-reel",
    category: "client_pro",
    title: "Connaissez-vous le vrai coût de votre projet ?",
    objective: "Augmenter les estimations de coût",
    subject: "Votre projet de construction risque-t-il de dépasser votre budget ?",
    intro:
      "Construire une maison est un investissement important. Mais connaissez-vous réellement le coût total de votre projet ?\n\nEntre les matériaux, la main-d'œuvre, le gros œuvre, les finitions et les imprévus, les dépenses peuvent rapidement dépasser votre budget initial.",
    body:
      "Avec Batibuild, vous pouvez :\n\n- Estimer le coût global de votre construction.\n- Consulter un quantitatif détaillé.\n- Comparer plusieurs scénarios budgétaires.\n- Obtenir une meilleure visibilité sur vos dépenses.\n- Anticiper les coûts avant de commencer les travaux.\n\nNe commencez pas votre construction sans connaître votre budget réel !",
    ctaLabel: "Estimer le coût de mon projet",
    ctaPath: "/dashboard/new",
    feedback: false,
  },
  {
    id: "cp-professionnel",
    category: "client_pro",
    title: "Trouver un professionnel ou un expert",
    objective: "Générer des mises en relation",
    subject: "Vous cherchez un professionnel fiable pour votre projet ?",
    intro:
      "Vous recherchez un architecte, un ingénieur, un entrepreneur ou un artisan pour réaliser vos travaux ?\n\nNe perdez plus votre temps à chercher partout !\n\nBatibuild vous accompagne dans la recherche de professionnels et d'experts adaptés à vos besoins.",
    body:
      "Grâce à notre plateforme, vous pouvez :\n\n- Découvrir des professionnels spécialisés.\n- Consulter leurs profils.\n- Comparer les prestations proposées.\n- Trouver des partenaires pour votre chantier.\n\nVotre projet mérite les bonnes compétences !",
    ctaLabel: "Trouver mon professionnel",
    ctaPath: "/dashboard/professionals-directory",
    feedback: false,
  },
  {
    id: "cp-plans",
    category: "client_pro",
    title: "Trouver le bon plan architectural",
    objective: "Encourager les plans architecturaux",
    subject: "Et si vous trouviez le plan idéal pour votre future maison ?",
    intro:
      "Vous avez un terrain, mais vous ne savez pas encore quel plan architectural choisir ?\n\nDécouvrez les possibilités offertes par Batibuild !",
    body:
      "- Explorez des solutions de plans architecturaux.\n- Découvrez des modèles adaptés à votre terrain et à votre surface.\n- Visualisez vos projets en 2D et en 3D lorsque disponibles.\n- Trouvez une inspiration adaptée à votre budget et à vos besoins.\n\nTransformez votre idée en véritable projet architectural !",
    ctaLabel: "Découvrir les plans architecturaux",
    ctaPath: "/dashboard/new",
    feedback: false,
  },
  {
    id: "cp-budget-chantier",
    category: "client_pro",
    title: "Votre budget vous permettra-t-il de terminer votre chantier ?",
    objective: "Encourager l'analyse budgétaire",
    subject: "Votre budget est-il suffisant pour terminer votre construction ?",
    intro:
      "Avez-vous déjà commencé votre chantier sans être certain de pouvoir financer toutes les étapes jusqu'à la fin ?\n\nC'est l'une des principales difficultés rencontrées dans les projets de construction.\n\nAvec Batibuild, vous pouvez mieux anticiper :",
    body:
      "- Les dépenses restantes.\n- Le coût des travaux à réaliser.\n- Les besoins financiers par étape.\n- Les risques de dépassement budgétaire.\n\nPréparez votre budget et avancez avec davantage de visibilité.",
    ctaLabel: "Analyser mon budget avec l'IA",
    ctaPath: "/dashboard",
    feedback: false,
  },
  {
    id: "cp-investissement",
    category: "client_pro",
    title: "Vous avez envie d'investir ?",
    objective: "Promouvoir l'analyse d'investissement",
    subject: "Vous souhaitez investir dans l'immobilier ? Découvrez de nouvelles opportunités !",
    intro:
      "Vous envisagez d'investir dans l'immobilier, mais vous ne savez pas quelle opportunité choisir ?\n\nBatibuild vous accompagne dans votre réflexion grâce à des outils d'analyse et d'aide à la décision.",
    body:
      "Vous pouvez notamment :\n\n- Étudier des projets immobiliers.\n- Évaluer des opportunités.\n- Analyser les budgets et les coûts.\n- Mieux comprendre le potentiel de votre investissement.\n\nPrenez vos décisions avec davantage d'informations et de visibilité.",
    ctaLabel: "Découvrir les opportunités d'investissement",
    ctaPath: "/dashboard/investments",
    feedback: false,
  },
  {
    id: "cp-parrainage",
    category: "client_pro",
    title: "Programme de parrainage Client Pro",
    objective: "Encourager le parrainage",
    subject: "Invitez vos amis sur Batibuild et gagnez jusqu'à 10 cotisations !",
    intro:
      "Et si vous pouviez profiter davantage de Batibuild tout en aidant vos proches à réussir leurs projets de construction ?\n\nNous vous invitons à découvrir notre programme de parrainage.\n\nInvitez vos amis, collègues et connaissances à rejoindre Batibuild.\n\nEn fonction du nombre de parrainages validés, vous pouvez gagner jusqu'à 10 cotisations Client Pro !",
    body:
      "Comment participer ?\n\n1. Accédez à votre espace de parrainage.\n2. Partagez votre lien personnel.\n3. Invitez vos proches à s'inscrire.\n4. Recevez vos récompenses selon les conditions du programme.\n\nPlus vous partagez, plus vous profitez de Batibuild !",
    ctaLabel: "Parrainer mes amis",
    ctaPath: "/dashboard",
    feedback: false,
    conditions:
      "Récompenses attribuées uniquement pour des parrainages validés, dans la limite des conditions du programme de parrainage en vigueur.",
  },
  {
    id: "cp-suivi-chantier",
    category: "client_pro",
    title: "Suivi de chantier de A à Z",
    objective: "Promouvoir le suivi de chantier",
    subject: "Gardez le contrôle de votre chantier du début jusqu'à la fin !",
    intro:
      "Un chantier bien organisé est un chantier mieux maîtrisé.\n\nMais comment suivre les travaux, contrôler les dépenses et anticiper les retards ?\n\nAvec le module Gestion & Suivi de Chantier de Batibuild, vous pouvez centraliser le suivi de votre projet.",
    body:
      "- Suivre l'avancement des travaux.\n- Organiser les différentes étapes.\n- Contrôler les dépenses.\n- Suivre les intervenants.\n- Documenter l'évolution du chantier.\n- Identifier les éventuels retards et dépassements.\n\nGardez une meilleure visibilité sur votre construction, où que vous soyez.",
    ctaLabel: "Découvrir le suivi de chantier",
    ctaPath: "/dashboard/chantiers",
    feedback: false,
  },
];

const EXPERT_TEMPLATES: MarketingTemplate[] = [
  {
    id: "ex-feedback",
    category: "expert",
    title: "Évaluation de l'expérience",
    objective: "Collecter les avis des experts",
    subject: "Experts Batibuild : votre avis nous aide à progresser !",
    intro:
      "Vous faites partie de notre réseau de professionnels et votre expérience est essentielle pour améliorer Batibuild.\n\nNous souhaitons connaître votre niveau de satisfaction et recueillir vos suggestions.",
    body: "Évaluez notre plateforme de 1 à 5 étoiles et laissez-nous un commentaire.",
    ctaLabel: "Donner mon avis",
    ctaPath: "/",
    feedback: true,
  },
  {
    id: "ex-developper-clientele",
    category: "expert",
    title: "Développez votre clientèle et trouvez de nouveaux marchés",
    objective: "Développer le réseau des experts",
    subject: "Vous cherchez plus de clients et de nouvelles opportunités professionnelles ?",
    intro:
      "Vous êtes architecte, ingénieur, entrepreneur ou professionnel du bâtiment ?\n\nVous souhaitez développer votre activité, obtenir davantage de demandes et élargir votre portefeuille de clients ?\n\nBatibuild vous aide à renforcer votre visibilité auprès des particuliers et des porteurs de projets de construction.",
    body:
      "Grâce à votre présence sur notre plateforme, vous pouvez :\n\n- Présenter vos compétences et vos services.\n- Développer votre visibilité professionnelle.\n- Recevoir des opportunités de mise en relation.\n- Trouver de nouveaux clients.\n- Développer votre réseau professionnel.\n\nNe laissez pas passer de nouvelles opportunités !",
    ctaLabel: "Développer mon activité sur Batibuild",
    ctaPath: "/dashboard/expert",
    feedback: false,
  },
  {
    id: "ex-parrainage",
    category: "expert",
    title: "Programme de parrainage Experts",
    objective: "Encourager le parrainage professionnel",
    subject: "Parrainez des professionnels et gagnez jusqu'à 6 mois gratuits !",
    intro:
      "Vous connaissez des architectes, ingénieurs, entrepreneurs ou autres professionnels du bâtiment qui souhaitent développer leur activité ?\n\nInvitez-les à rejoindre Batibuild et profitez de notre programme de parrainage.\n\nVous pouvez gagner jusqu'à 6 mois d'abonnement gratuits en fonction de vos parrainages validés.",
    body:
      "Comment participer ?\n\n1. Connectez-vous à votre espace.\n2. Partagez votre lien de parrainage.\n3. Invitez vos collègues professionnels.\n4. Recevez vos mois gratuits selon les conditions du programme.\n\nDéveloppez votre réseau et profitez pleinement de Batibuild !",
    ctaLabel: "Inviter des professionnels",
    ctaPath: "/dashboard",
    feedback: false,
    conditions:
      "Mois gratuits attribués uniquement pour des parrainages validés, selon les conditions du programme de parrainage en vigueur.",
  },
];

const SUPPLIER_TEMPLATES: MarketingTemplate[] = [
  {
    id: "su-feedback",
    category: "supplier",
    title: "Évaluation de l'expérience",
    objective: "Collecter les avis des fournisseurs",
    subject: "Votre avis compte pour améliorer votre expérience fournisseur sur Batibuild !",
    intro:
      "Votre présence sur Batibuild contribue au développement de notre réseau de fournisseurs.\n\nNous souhaitons améliorer continuellement nos services et vous offrir une meilleure expérience.\n\nDites-nous ce que vous pensez de notre plateforme.",
    body: "Évaluez votre expérience de 1 à 5 étoiles et laissez-nous votre commentaire.",
    ctaLabel: "Évaluer mon expérience",
    ctaPath: "/",
    feedback: true,
  },
  {
    id: "su-developper-ventes",
    category: "supplier",
    title: "Trouvez davantage de clients et développez vos ventes",
    objective: "Augmenter les ventes",
    subject: "Vous souhaitez vendre davantage de matériaux de construction ?",
    intro:
      "Vous êtes fournisseur de matériaux ou d'équipements de construction ?\n\nVous cherchez à augmenter votre visibilité et à toucher de nouveaux clients ?\n\nBatibuild vous permet de présenter vos produits et services à une audience intéressée par la construction et la rénovation.",
    body:
      "Profitez de notre plateforme pour :\n\n- Améliorer votre visibilité commerciale.\n- Présenter vos matériaux et équipements.\n- Toucher de nouveaux porteurs de projets.\n- Développer votre réseau professionnel.\n- Recevoir de nouvelles opportunités commerciales.\n\nFaites connaître votre offre aux personnes qui construisent réellement !",
    ctaLabel: "Développer mes ventes sur Batibuild",
    ctaPath: "/dashboard/supplier",
    feedback: false,
  },
  {
    id: "su-parrainage",
    category: "supplier",
    title: "Programme de parrainage Fournisseurs",
    objective: "Développer le réseau des fournisseurs",
    subject: "Invitez des fournisseurs et profitez de jusqu'à 6 mois gratuits !",
    intro:
      "Vous connaissez d'autres fournisseurs de matériaux ou d'équipements de construction ?\n\nInvitez-les à rejoindre Batibuild et profitez de notre programme de parrainage.\n\nVous pouvez gagner jusqu'à 6 mois d'abonnement gratuits selon le nombre de parrainages validés.",
    body: "Partagez votre lien de parrainage depuis votre espace personnel.",
    ctaLabel: "Parrainer un fournisseur",
    ctaPath: "/dashboard",
    feedback: false,
    conditions:
      "Mois gratuits attribués uniquement pour des parrainages validés, selon les conditions du programme de parrainage en vigueur.",
  },
];

export const MARKETING_TEMPLATES: MarketingTemplate[] = [
  ...CLIENT_PRO_TEMPLATES,
  ...EXPERT_TEMPLATES,
  ...SUPPLIER_TEMPLATES,
];

export function templatesForCategory(category: MarketingCategory): MarketingTemplate[] {
  return MARKETING_TEMPLATES.filter((t) => t.category === category);
}

export function getMarketingTemplate(id: string | undefined | null): MarketingTemplate | null {
  if (!id) return null;
  return MARKETING_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Champs pré-remplis par un modèle (utilisé par l'éditeur admin). */
export function templateDefaults(template: MarketingTemplate) {
  return {
    templateId: template.id,
    category: template.category,
    name: template.title,
    subject: template.subject,
    intro: template.intro,
    body: template.body,
    ctaLabel: template.ctaLabel,
    ctaUrl: template.ctaPath,
    feedbackEnabled: template.feedback,
    conditions: template.conditions ?? "",
  };
}
