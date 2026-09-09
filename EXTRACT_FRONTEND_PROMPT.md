# Prompt — Réutiliser le frontend (design) de BatiBuild

Copiez le bloc ci-dessous (entre les ``` et ```) et collez-le dans votre agent de code ouvert sur le projet cible.

---

```
MISSION

Transférer le frontend (design + structure visuelle) de la plateforme BatiBuild (budgetbati) vers le projet cible [NOM_DU_PROJET_CIBLE], afin que ce dernier hérite du même langage visuel : même design system, mêmes composants, mêmes patterns d'interface.

La plateforme source BatiBuild est la SOURCE DE VÉRITÉ VISUELLE. Ne rien inventer — reprendre fidèlement ce qui existe.

---

ÉTAPE 1 — LIRE LES DOCUMENTS SOURCE

Lire intégralement ces fichiers dans le projet source BatiBuild :

1. `src/DESIGN_SYSTEM.md` — tokens complets (couleurs, typographie, spacing, radius, shadows, transitions)
2. `src/lib/lucide-shim.js` — liste exacte des icônes Lucide utilisées
3. `src/index.css` — variables CSS du thème, classes utilitaires custom

---

ÉTAPE 2 — COPIER LE FONDATION DU DESIGN DANS LE PROJET CIBLE

### 2.1 CSS Variables (thème)

Copier dans `src/index.css` du projet cible (adapter si Tailwind v4 avec `@theme inline`) :

a) Thème light (`:root`) et dark (`.dark`) : toutes les variables
   `--background, --foreground, --card, --card-foreground, --popover, --popover-foreground,
   --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground,
   --accent, --accent-foreground, --destructive, --destructive-foreground, --border, --input, --ring,
   --chart-*, --sidebar-*` (+ variables auth `--auth-*` si présentes)

b) Font family : Inter (latin + arabe si support RTL nécessaire)

c) Border-radius tokens : `--radius-sm, --radius-md, --radius-lg, --radius-xl`

### 2.2 Classes utilitaires custom

Copier depuis `src/index.css` de BatiBuild toutes les classes utilitaires :
- `glass`, `glass-strong`, `glass-header` (verre dépoli)
- `gradient-text` (texte en dégradé)
- `shadow-soft`, `shadow-soft-lg` (ombres douces)
- `label-overline` (petites étiquettes majuscules espacées)
- `table-zebra` (tableaux zébrés)
- `scrollbar-none` (masquer les scrollbars)
- `blueprint-grid` (grille de fond technique)
- `dotted-watermark` (motif de points)
- Focus visible global et dégradé de fond body (light + dark)

### 2.3 Icônes

- Installer `lucide-react` dans le projet cible.
- Reproduire le shim d'icônes de BatiBuild (`src/lib/lucide-shim.js`) : re-export des seules icônes utilisées, ou importer directement les icônes depuis `lucide-react` si le build le permet.
- Règle d'or : icônes en style OUTLINE (stroke 2px par défaut Lucide), jamais de filled.
- Échelle de tailles : `size-4` (16px) par défaut dans boutons/inputs/nav, `size-3` (12px) metadata, `size-5` (20px) features, `size-6` (24px) titres de section.
- Couleur par défaut `currentColor` (héritée du texte parent), coloration sémantique via `text-muted-foreground`, `text-primary`, `text-emerald-*`, `text-amber-*`, `text-red-*`, `text-blue-*`.

---

ÉTAPE 3 — COPIER LES COMPOSANTS UI

Copier dans `src/components/ui/` du projet cible (adapter les imports `@/lib/utils` et `cn`) :

1. **button.tsx** — variantes : default (primary), secondary, outline, ghost, destructive, link.
   Tailles : default (h-10), sm (h-9), lg (h-11), icon (size-10). États hover/active/focus/disabled inclus.
2. **card.tsx** — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter.
3. **input.tsx** — hauteur h-10, focus ring `ring-ring/50 ring-offset-2`.
4. **textarea.tsx, select.tsx, checkbox.tsx, switch.tsx, label.tsx** — états focus/disabled inclus.
5. **badge.tsx** — variantes default, secondary, destructive, outline.
6. **dialog.tsx** — avec le pattern mobile responsive de BatiBuild :
   `w-[calc(100%-1.5rem)] max-h-[calc(100dvh-1.5rem)] top-3 translate-y-0 rounded-2xl` mobile → modal centré `sm:`.
7. **dropdown-menu.tsx, tabs.tsx, table.tsx, avatar.tsx, separator.tsx, skeleton.tsx, progress.tsx, tooltip.tsx, scroll-area.tsx** — copier tels quels.

---

ÉTAPE 4 — COPIER LES COMPOSANTS DE PAGES

Reproduire les composants fonctionnels de BatiBuild en copiant leur structure JSX et leurs classes Tailwind :

1. `src/pages/Landing.tsx` — page d'accueil : header fixe (transparent → glass au scroll, menu mobile 100% opaque `bg-background`), hero avec dégradé, sections features, CTA.
2. `src/pages/Dashboard.tsx` — layout dashboard : sidebar, header, cartes statistiques, carousel communications.
3. `src/pages/ProjectDetail.tsx` — fiche projet : bandeau coûts, onglets, tableaux, cartes de détail, BottomNavBar.
4. `src/components/BottomNavBar.tsx` — barre de navigation inférieure sticky : boutons icône + label, `text-black dark:text-white font-bold`, `active:scale-95`.
5. `src/pages/AiMaterials.tsx` / `AiMaterialsResult.tsx` — assistant IA : formulaires, résultats, cartes matériaux.

Pour chaque composant : copier les classes Tailwind EXACTES. Ne pas reformuler ni « moderniser » le style.

---

ÉTAPE 5 — LAYOUT ET RESPONSIVE

Reproduire les règles de mise en page :
- Conteneur principal : `mx-auto max-w-5xl` / `max-w-7xl` selon la page.
- Espacements dominants : `p-4`/`p-6` (cards), `gap-3`/`gap-4` (grilles), `space-y-6` (sections), `py-16`/`py-24` (sections hero).
- Grilles : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` pour les cards, `grid-cols-1 lg:grid-cols-2` pour les panneaux.
- Breakpoints : mobile-first (`sm:`, `md:`, `lg:`).
- Toucher mobile : boutons ≥ 44px (`h-10`/`h-11`), inputs `h-10`.
- Barre de navigation inférieure sticky avec `safe-area-bottom` (iPhone).

---

ÉTAPE 6 — EFFETS VISUELS

Reproduire :
- Ombres : `shadow-sm` (subtile), `shadow-md`, `shadow-lg`, `shadow-soft` (douce custom).
- Transitions : `transition-all duration-200` (hover), `duration-300` (menus/dropdowns).
- Hover cards : `hover:shadow-md hover:border-border/60 hover:-translate-y-0.5`.
- Verre dépoli : `backdrop-blur-md bg-background/80`.
- Dégradés : texte `bg-gradient-to-r from-... to-... bg-clip-text text-transparent` (pattern de BatiBuild).

---

ÉTAPE 7 — VÉRIFICATION

1. Chaque valeur/token provient de BatiBuild — aucune valeur inventée.
2. Les composants copiés sont fonctionnels (props identiques, imports résolus).
3. `lucide-react` est installé et les imports d'icônes fonctionnent.
4. Le CSS global est importé (`import "./index.css"` dans `main.tsx`).
5. La page est responsive sur mobile, tablette, desktop (tester visuellement).
6. Typecheck : `bun tsc -b --noEmit` passe sans erreur.
7. Aucune fonctionnalité métier de BatiBuild (Convex, API, calculs) n'a été copiée — uniquement la couche visuelle et les composants d'interface.

---

FORMAT DE SORTIE ATTENDU

- `src/index.css` du projet cible mis à jour (tokens + utilitaires).
- Composants UI copiés dans `src/components/ui/`.
- Composants de pages adaptés avec le design BatiBuild.
- Un court rapport listant : ce qui a été copié, ce qui a été adapté, et ce qui n'était pas applicable (avec justification).
```