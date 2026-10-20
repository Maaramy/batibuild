// ============================================================================
// PROJET #23 « Ma maison » — RELEVÉ INITIAL DES 23 ARTICLES
// ----------------------------------------------------------------------------
// Valeurs de référence des articles matériaux du projet avant audit
// (maison 100 m², Tunis, scénario Standard). Total initial : 110 182,44 TND.
// Ce fichier sert de référence au rapport et aux tests de non-régression.
// ============================================================================

export interface Project23MaterialBaselineLine {
  article: string;
  quantity: number;
  unit: string;
  unitPriceTTC: number;
  totalTTC: number;
}

export const PROJECT_23_MATERIAL_BASELINE: Project23MaterialBaselineLine[] = [
  { article: "Béton prêt à l'emploi 300 kg/m³", quantity: 75.6, unit: "m³", unitPriceTTC: 248.4, totalTTC: 18779.04 },
  { article: "Acier à béton T12 (tonne)", quantity: 6.1, unit: "tonne", unitPriceTTC: 2853.16, totalTTC: 17404.28 },
  { article: "Ciment CPJ 42.5 (sac 50 kg)", quantity: 1059.1, unit: "sac", unitPriceTTC: 14.72, totalTTC: 15589.95 },
  { article: "Parpaing creux 20 cm", quantity: 4538.9, unit: "pièce", unitPriceTTC: 2.03, totalTTC: 9213.97 },
  { article: "Bois de coffrage (m³)", quantity: 12.1, unit: "m³", unitPriceTTC: 588.22, totalTTC: 7117.46 },
  { article: "Brique creuse 10 cm", quantity: 17020.7, unit: "pièce", unitPriceTTC: 0.38, totalTTC: 6467.87 },
  { article: "Ciment CPJ 32.5 (sac 50 kg)", quantity: 302.6, unit: "sac", unitPriceTTC: 11.42, totalTTC: 3455.69 },
  { article: "Sable de construction 0/4", quantity: 75.6, unit: "m³", unitPriceTTC: 33.64, totalTTC: 2543.18 },
  { article: "Hourdis 16×50", quantity: 2118.1, unit: "pièce", unitPriceTTC: 1.02, totalTTC: 2160.46 },
  { article: "Gravier concassé 15/25", quantity: 45.4, unit: "m³", unitPriceTTC: 41.6, totalTTC: 1888.64 },
  { article: "Fouilles en rigole", quantity: 30.3, unit: "m³", unitPriceTTC: 14.53, totalTTC: 440.26 },
  { article: "Treillis soudé ST25 (panneau)", quantity: 6.1, unit: "panneau", unitPriceTTC: 31.53, totalTTC: 192.33 },
  { article: "Peinture intérieure mate (L)", quantity: 68.7, unit: "seau", unitPriceTTC: 81.78, totalTTC: 5618.29 },
  { article: "Porte intérieure bois pleine", quantity: 6, unit: "pièce", unitPriceTTC: 759.49, totalTTC: 4556.94 },
  { article: "Carrelage sol 40×40 (m²)", quantity: 148.8, unit: "m²", unitPriceTTC: 17.75, totalTTC: 2641.2 },
  { article: "Fenêtre aluminium 90×120", quantity: 8, unit: "pièce", unitPriceTTC: 249.92, totalTTC: 1999.36 },
  { article: "Porte d'entrée métallique", quantity: 2, unit: "pièce", unitPriceTTC: 930.64, totalTTC: 1861.28 },
  { article: "Enduit de lissage (kg)", quantity: 30, unit: "seau", unitPriceTTC: 60.56, totalTTC: 1816.8 },
  { article: "Faïence 20×30 (m²)", quantity: 36.6, unit: "m²", unitPriceTTC: 48.05, totalTTC: 1758.63 },
  { article: "Peinture extérieure acrylique (L)", quantity: 13.7, unit: "seau", unitPriceTTC: 106.47, totalTTC: 1458.64 },
  { article: "Grille de protection métallique", quantity: 8, unit: "pièce", unitPriceTTC: 178.18, totalTTC: 1425.44 },
  { article: "Étanchéité liquide bitumeuse", quantity: 57.2, unit: "m²", unitPriceTTC: 17.73, totalTTC: 1014.16 },
  { article: "Plinthe céramique (ml)", quantity: 80.1, unit: "ml", unitPriceTTC: 9.72, totalTTC: 778.57 },
];

export const PROJECT_23_INITIAL_TOTAL = 110182.44;
