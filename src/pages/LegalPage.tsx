import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Lock,
  Mail,
  MapPin,
  Phone,
  ScrollText,
  Shield,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router";
import { usePageSEO } from "@/hooks/use-page-seo";

type LegalKind = "terms" | "privacy";

interface Section {
  icon: React.ElementType;
  title: string;
  paragraphs: (string | React.ReactNode)[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function LegalSection({ icon: Icon, title, paragraphs, index }: Section & { index: number }) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: 0.05 * index }}
      className="rounded-2xl border bg-card/60 backdrop-blur-sm p-5 sm:p-6"
      style={{ borderColor: "color-mix(in srgb, var(--auth-primary) 12%, transparent)" }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "color-mix(in srgb, var(--auth-primary) 10%, transparent)", color: "var(--auth-primary)" }}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h2 className="text-base font-semibold leading-snug pt-1" style={{ color: "var(--foreground)" }}>{title}</h2>
      </div>
      <div className="space-y-2.5">
        {paragraphs.map((p, i) => (
          <div key={i} className="text-sm leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.72 }}>
            {p}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function TermsContent() {
  const sections: Section[] = [
    {
      icon: ScrollText,
      title: "1. Objet du service",
      paragraphs: [
        "BudgetBati est une plateforme SaaS tunisienne qui utilise l'intelligence artificielle pour estimer les coûts de projets de construction, d'aménagement ou de rénovation en Tunisie.",
        "À partir d'une photo de terrain ou de chantier, d'une image satellite, d'un plan architectural (PDF, JPG, PNG, aperçu DWG), d'un croquis dessiné à la main ou de dimensions saisies manuellement, la plateforme identifie le type de projet, estime les dimensions réelles, calcule les surfaces construites, détermine les matériaux nécessaires et produit une estimation du coût selon les prix du marché tunisien.",
      ],
    },
    {
      icon: CheckCircle2,
      title: "2. Acceptation des conditions",
      paragraphs: [
        "En créant un compte et en utilisant la plateforme, vous acceptez sans réserve les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser la plateforme.",
        "Les présentes conditions s'appliquent à tous les utilisateurs : particuliers, professionnels de la construction et fournisseurs de matériaux.",
      ],
    },
    {
      icon: User,
      title: "3. Création de compte",
      paragraphs: [
        "La création d'un compte nécessite la fourniture d'informations exactes : nom complet, adresse e-mail valide et, facultativement, numéro de téléphone.",
        "Vous êtes responsable de la confidentialité de vos identifiants. Toute activité réalisée depuis votre compte vous est imputable.",
      ],
    },
    {
      icon: CreditCard,
      title: "4. Abonnements et paiements",
      paragraphs: [
        "La plateforme propose plusieurs forfaits : Start (gratuit), Pro et Expert. Les tarifs sont exprimés en dinars tunisiens (TND) et peuvent être modifiés par l'éditeur, avec préavis raisonnable.",
        "Les paiements s'effectuent par virement bancaire ou par D17, selon les coordonnées communiquées par la plateforme. L'activation du forfait intervient après vérification du reçu de paiement par l'administration.",
        "Les fournisseurs disposent également d'un forfait dédié activé selon la même procédure de vérification.",
      ],
    },
    {
      icon: FileText,
      title: "5. Propriété intellectuelle",
      paragraphs: [
        "La plateforme, son design, son contenu, ses algorithmes d'estimation et ses modèles d'intelligence artificielle sont la propriété exclusive de l'éditeur. Toute reproduction ou exploitation sans autorisation est interdite.",
        "Vous conservez la propriété des documents (plans, photos, croquis) que vous téléversez, tout en concédant à la plateforme une licence d'utilisation limitée à la fourniture du service.",
      ],
    },
    {
      icon: Shield,
      title: "6. Obligations de l'utilisateur",
      paragraphs: [
        "Vous vous engagez à : ne pas utiliser la plateforme à des fins illicites, ne pas tenter d'accéder aux systèmes ou données d'autres utilisateurs, et ne pas détourner les estimations à des fins frauduleuses.",
        "Les estimations fournies sont indicatives et ne constituent pas un devis engageant. La vérification par un professionnel qualifié reste recommandée avant toute décision de construction.",
      ],
    },
    {
      icon: Lock,
      title: "7. Limitation de responsabilité",
      paragraphs: [
        "Les estimations de coûts sont générées automatiquement par intelligence artificielle sur la base des informations fournies et des prix du marché tunisien. Elles ne peuvent en aucun cas se substituer à l'avis d'un expert, d'un architecte ou d'un ingénieur.",
        "La plateforme ne saurait être tenue responsable des écarts entre les estimations et les coûts réels, ni des décisions prises sur la base de celles-ci.",
      ],
    },
    {
      icon: Trash2,
      title: "8. Suspension et résiliation",
      paragraphs: [
        "L'éditeur se réserve le droit de suspendre ou de supprimer tout compte en cas de violation des présentes conditions, de fraude ou d'utilisation abusive de la plateforme.",
        "Vous pouvez à tout moment demander la suppression de votre compte et de vos données personnelles, conformément à la politique de confidentialité.",
      ],
    },
    {
      icon: MapPin,
      title: "9. Droit applicable",
      paragraphs: [
        "Les présentes conditions sont régies par le droit tunisien. Tout litige relatif à leur interprétation ou exécution relève de la compétence des tribunaux tunisiens.",
      ],
    },
  ];
  return (
    <div className="grid gap-4">
      {sections.map((s, i) => <LegalSection key={s.title} {...s} index={i} />)}
    </div>
  );
}

function PrivacyContent() {
  const sections: Section[] = [
    {
      icon: User,
      title: "1. Données collectées",
      paragraphs: [
        "Lors de la création de votre compte, nous collectons : votre nom complet, votre adresse e-mail et, facultativement, votre numéro de téléphone. Pour les fournisseurs, nous collectons également les informations de l'entreprise (raison sociale, spécialités, régions d'intervention, adresse, site web).",
        "Lors de l'utilisation du service, nous collectons : les documents téléversés (plans, photos, croquis, images satellite), les dimensions saisies, les projets créés et les estimations générées.",
      ],
    },
    {
      icon: CheckCircle2,
      title: "2. Finalités du traitement",
      paragraphs: [
        "Vos données sont utilisées exclusivement pour :",
        <ul key="list" className="space-y-1.5 list-disc pl-5">
          <li>Créer et gérer votre compte et vos abonnements ;</li>
          <li>Générer des estimations de coûts par intelligence artificielle ;</li>
          <li>Activer vos forfaits après vérification des paiements ;</li>
          <li>Vous informer par e-mail des événements liés à votre abonnement (activation, renouvellement, expiration, paiement) ;</li>
          <li>Améliorer la qualité de nos modèles d'estimation.</li>
        </ul>,
      ],
    },
    {
      icon: Shield,
      title: "3. Base légale",
      paragraphs: [
        "Le traitement de vos données repose sur votre consentement exprès (case à cocher à l'inscription), l'exécution du contrat de service et nos obligations légales, conformément à la loi tunisienne n° 2004-63 relative à la protection des données à caractère personnel.",
      ],
    },
    {
      icon: Lock,
      title: "4. Conservation des données",
      paragraphs: [
        "Vos données sont conservées pendant la durée de votre compte, puis supprimées ou anonymisées après résiliation, dans un délai maximal de 90 jours, sauf obligation légale de conservation.",
        "Les reçus de paiement sont conservés le temps de la vérification puis supprimés sur demande ou par notre purgeur automatique.",
      ],
    },
    {
      icon: Users,
      title: "5. Partage des données",
      paragraphs: [
        "Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées uniquement : avec les prestataires techniques assurant l'hébergement et l'envoi d'e-mails, avec les autorités compétentes lorsqu'une obligation légale l'exige, et les informations publiques des fournisseurs (profil professionnel) sont visibles par les autres utilisateurs de la plateforme.",
      ],
    },
    {
      icon: CheckCircle2,
      title: "6. Vos droits",
      paragraphs: [
        "Conformément à la loi n° 2004-63, vous disposez des droits suivants : droit d'accès, de rectification, de mise à jour et de suppression de vos données personnelles, droit d'opposition et droit de retirer votre consentement à tout moment.",
        "Vous pouvez exercer ces droits depuis la page « Mon profil » ou en nous contactant à l'adresse indiquée en bas de cette page. Une réponse vous sera apportée dans un délai maximum de 30 jours.",
      ],
    },
    {
      icon: Lock,
      title: "7. Sécurité",
      paragraphs: [
        "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées : chiffrement des transmissions (HTTPS), accès restreint aux données, protection des mots de passe et journalisation des actions administratives.",
      ],
    },
    {
      icon: Mail,
      title: "8. Contact et responsable du traitement",
      paragraphs: [
        "Pour toute question relative à vos données personnelles, contactez-nous via la page « Contact » de la plateforme ou à l'adresse e-mail indiquée dans le pied de page.",
      ],
    },
  ];
  return (
    <div className="grid gap-4">
      {sections.map((s, i) => <LegalSection key={s.title} {...s} index={i} />)}
    </div>
  );
}

export default function LegalPage({ kind = "terms" }: { kind?: LegalKind }) {
  const isTerms = kind === "terms";
  usePageSEO({
    title: `${isTerms ? "Conditions d'utilisation" : "Données personnelles"} - BudgetBati`,
    description: isTerms
      ? "Conditions d'utilisation de la plateforme BudgetBati d'estimation des coûts de construction en Tunisie."
      : "Politique de confidentialité et protection des données personnelles sur BudgetBati.",
  });

  return (
    <div className="min-h-screen auth-bg-pattern relative">
      {/* Decorative pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: "var(--auth-primary)", opacity: 0.07 }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full" style={{ background: "var(--auth-accent)", opacity: 0.06 }} />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <div className="flex items-center gap-2">
              <img src={logo} alt="BudgetBati" width={34} height={34} className="rounded-lg" />
              <span className="font-bold text-base" style={{ color: "var(--foreground)" }}>BudgetBati</span>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 transition-all hover:opacity-80"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </Link>
        </div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "color-mix(in srgb, var(--auth-primary) 12%, transparent)", color: "var(--auth-primary)" }}>
            {isTerms ? <ScrollText className="h-8 w-8" /> : <Shield className="h-8 w-8" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
            {isTerms ? "Conditions d'utilisation" : "Données personnelles"}
          </h1>
          <p className="text-sm max-w-xl mx-auto" style={{ color: "var(--foreground)", opacity: 0.6 }}>
            {isTerms
              ? "Les conditions qui régissent votre utilisation de la plateforme BudgetBati d'estimation des coûts de construction."
              : "Comment BudgetBati collecte, utilise et protège vos données personnelles, conformément à la loi tunisienne n° 2004-63."}
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mt-4"
            style={{ background: "color-mix(in srgb, var(--auth-gold) 16%, transparent)", color: "var(--auth-gold)" }}>
            <MapPin className="h-3 w-3" /> Dernière mise à jour : août 2026
          </div>
        </motion.div>

        {/* Tab switcher between the two documents */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: "color-mix(in srgb, var(--auth-primary) 8%, transparent)" }}>
          <Link
            to="/terms"
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isTerms ? "bg-white dark:bg-card shadow-sm" : "hover:opacity-80"}`}
            style={isTerms ? { color: "var(--foreground)" } : { color: "var(--foreground)", opacity: 0.6 }}
          >
            <FileText className="h-4 w-4" /> Conditions d'utilisation
          </Link>
          <Link
            to="/privacy"
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${!isTerms ? "bg-white dark:bg-card shadow-sm" : "hover:opacity-80"}`}
            style={!isTerms ? { color: "var(--foreground)" } : { color: "var(--foreground)", opacity: 0.6 }}
          >
            <Shield className="h-4 w-4" /> Données personnelles
          </Link>
        </div>

        {/* Content */}
        {isTerms ? <TermsContent /> : <PrivacyContent />}

        {/* CTA back to registration */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-8 text-center">
          <p className="text-xs mb-4" style={{ color: "var(--foreground)", opacity: 0.55 }}>
            En continuant vers l'inscription, vous acceptez les documents ci-dessus.
          </p>
          <Button
            asChild
            className="h-11 px-6 text-white border-0 shadow-lg transition-all duration-200 hover:brightness-110"
            style={{ background: "linear-gradient(135deg, var(--auth-primary), var(--auth-primary-light))", boxShadow: "0 4px 14px color-mix(in srgb, var(--auth-primary) 30%, transparent)" }}
          >
            <Link to="/auth">
              Créer mon compte <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t text-center text-xs"
          style={{ borderColor: "color-mix(in srgb, var(--auth-primary) 12%, transparent)", color: "var(--foreground)", opacity: 0.5 }}>
          &copy; {new Date().getFullYear()} GALISKON PROJECT. Tous droits réservés.
        </div>
      </div>
    </div>
  );
}
