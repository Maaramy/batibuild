// ============================================================================
// ICÔNE DES TRAVAUX COMPLÉMENTAIRES PERSONNALISÉS — source unique.
// ----------------------------------------------------------------------------
// Les travaux complémentaires (Piscine, Garage, Cuisine extérieure, Jardin,
// Panneaux solaires et tous les futurs travaux) partagent EXACTEMENT le même
// langage visuel que le reste de batibuild :
//   • même bibliothèque d'icônes que toute l'interface (lucide-react) ;
//   • même style de tracé, même épaisseur de trait (réglage par défaut de la
//     bibliothèque), même couleur héritée (`currentColor`) ;
//   • même taille que les autres icônes de contenu (`h-4 w-4`, ajustable par
//     `className` comme partout ailleurs).
//
// Le catalogue (`src/lib/customWorksCatalog.ts`) ne porte qu'un NOM d'icône :
// la correspondance nom → composant vit ICI et nulle part ailleurs. Changer
// l'icône d'un travail, ou en ajouter une, se fait donc à un seul endroit :
//
//     customWorkType → iconName → CUSTOM_WORK_ICONS → <CustomWorkIcon />
// ============================================================================

import { Car, CookingPot, Hammer, Sun, TreePine, Waves, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CustomWorkIconName } from "@/lib/customWorksCatalog";

/**
 * Nom d'icône (donnée du catalogue) → composant lucide-react.
 * SEUL endroit à modifier pour changer l'icône d'un travail.
 */
const CUSTOM_WORK_ICONS: Record<CustomWorkIconName, LucideIcon> = {
  Waves, // Piscine — même icône que la catégorie « Matériaux pour piscine ».
  Car, // Garage.
  CookingPot, // Cuisine extérieure — même icône que « Rénovation Cuisine ».
  TreePine, // Jardin — même icône que la catégorie « Aménagement extérieur ».
  Sun, // Panneaux solaires — même icône que la catégorie « Panneaux solaires ».
};

export interface CustomWorkIconProps {
  /**
   * Nom d'icône du travail (champ `icon` du catalogue / de l'estimation).
   * Une valeur inconnue retombe sur l'icône « travaux » de la plateforme — le
   * composant ne rend jamais `undefined` (aucun écran blanc possible).
   */
  icon?: string | null;
  /** Classes de taille / couleur — mêmes conventions que les autres icônes. */
  className?: string;
}

/** Icône d'un travail complémentaire personnalisé (composant partagé). */
export function CustomWorkIcon({ icon, className }: CustomWorkIconProps) {
  const Icon = (icon && CUSTOM_WORK_ICONS[icon as CustomWorkIconName]) || Hammer;
  return <Icon aria-hidden className={cn("h-4 w-4 shrink-0", className)} />;
}

export default CustomWorkIcon;
