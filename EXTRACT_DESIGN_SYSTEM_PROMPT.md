# Prompt : Extraction de Design System depuis une Plateforme Source

> **Utilisation :** Copier ce prompt et le coller dans un agent de code (Codebuff, Cursor, Claude, etc.) en précisant le nom de la plateforme source. L'agent analysera le code source et créera un document `DESIGN_SYSTEM.md` complet et transférable.

---

## Le Prompt

```
MISSION

Analyser la plateforme [NOM_DE_LA_PLATEFORME] comme PROJET SOURCE, extraire son Design System complet de manière méthodique, puis documenter chaque token visuel dans un fichier `DESIGN_SYSTEM.md` prêt à être transféré dans un AUTRE PROJET CIBLE.

La plateforme source est la source de vérité visuelle. Ne JAMAIS inventer de valeurs — uniquement extraire ce qui existe réellement dans le code.

---

CONTRAINTES

- Ne pas modifier la logique fonctionnelle du projet source.
- Ne pas modifier les données, APIs, calculs ou fonctionnalités.
- Extraire uniquement les styles visuels et les tokens.
- Utiliser uniquement les outils de lecture et d'analyse (read_files, code_search, run_terminal_command).
- Aucun fichier du projet source ne doit être modifié.
- Vérifier que tous les tokens extraits existent réellement dans le code avant de les documenter.

---

PHASE 1 — EXPLORATION INITIALE

Avant d'extraire quoi que ce soit, explorer la structure du projet pour comprendre :

1. Lister les fichiers clés de style :
   - `src/index.css` ou `src/globals.css` (variables CSS, thème global)
   - `tailwind.config.ts` ou `tailwind.config.js` (si existe)
   - `src/components/ui/*` (composants UI réutilisables)
   - Fichiers de thème, design tokens, ou constantes de style

2. Identifier le stack technique :
   - Framework (React, Vue, Next.js, etc.)
   - CSS framework (Tailwind, CSS Modules, Styled Components, etc.)
   - Composants UI (shadcn/ui, Radix, Headless UI, etc.)
   - Bibliothèque d'icônes (Lucide, Heroicons, Phosphor, etc.)

3. Grep rapide pour comprendre les patterns :
   - Compter les classes Tailwind les plus utilisées (rounded-*, shadow-*, text-*, gap-*, p-*, px-*, py-*)
   - Identifier les patterns de couleurs dominants
   - Repérer les patterns de responsive (sm:, md:, lg:)

---

PHASE 2 — EXTRACTION PAR CATÉGORIE

Pour chaque catégorie ci-dessous, analyser les fichiers pertinents et extraire les valeurs RÉELLES utilisées.

---

### 2.1 COULEURS

**Fichiers à analyser :**
- `src/index.css` → variables CSS `:root` et `.dark`
- Composants UI → classes de couleur utilisées
- Pages principales → patterns de couleurs dominants

**Extraire :**

a) Variables CSS du thème (light mode + dark mode) :
   - Primary / Primary-foreground
   - Secondary / Secondary-foreground
   - Background / Foreground
   - Card / Card-foreground
   - Popover / Popover-foreground
   - Muted / Muted-foreground
   - Accent / Accent-foreground
   - Destructive
   - Border, Input, Ring
   - Sidebar variants (si existent)
   - Chart colors (si existent)
   - Toute autre variable de couleur custom

b) Couleurs sémantiques (utilisées dans le code) :
   - Success (classes Utilisateur)
   - Warning
   - Error
   - Info
   - Chaque couleur avec sa valeur exacte ET son contexte d'utilisation

c) Couleurs d'accentuation :
   - Couleurs de gradient
   - Couleurs de ombre (shadow-*)
   - Couleurs de focus ring

**Format de sortie :**
```css
/* Light Mode */
--primary: oklch(...);  /* ou hsl(...) ou #hex */
/* Utilisé pour : [description du contexte] */

/* Dark Mode */
--primary: oklch(...);
```

---

### 2.2 TYPOGRAPHIE

**Fichiers à analyser :**
- `src/index.css` → `--font-sans`, `--font-mono`, etc.
- Composants UI → classes `text-*`, `font-*`
- Pages → hiérarchie des titres

**Extraire :**

a) Font Family :
   - Police principale
   - Police alternative (RTL, fallback)
   - Police mono (code)

b) Hiérarchie complète avec Tailwind classes exactes :
   - H1 (hero heading)
   - H2 (section heading)
   - H3 (card heading)
   - H4 (sub-heading)
   - Body / Paragraph
   - Small / Caption
   - Label
   - Button text
   - Navigation text
   - Badge text
   - Code text

c) Font weights utilisés (avec fréquence approximative) :
   - font-normal, font-medium, font-semibold, font-bold, etc.

d) Letter spacing et line height significatifs :
   - tracking-*, leading-*

---

### 2.3 SPACING

**Fichiers à analyser :**
- Composants UI → padding, gap, margin
- Layout components → espacement entre sections

**Extraire :**

a) Padding scale (avec fréquence d'utilisation) :
   - p-*, px-*, py-*, pt-*, pb-*, pl-*, pr-*

b) Gap scale :
   - gap-*, gap-x-*, gap-y-*

c) Margin patterns :
   - m-*, mx-*, my-*, mt-*, mb-*, ml-*, mr-*

d) Section spacing :
   - Espacement typique entre sections (py-* values)
   - Espacement dans les cartes
   - Espacement dans les formulaires
   - Espacement dans les boutons

e) Container widths :
   - max-w-* utilisés
   - mx-auto patterns

---

### 2.4 BORDER-RADIUS

**Fichiers à analyser :**
- `src/index.css` → `--radius`, `--radius-sm/md/lg/xl`
- Composants UI → classes `rounded-*`
- Tailwind config (si existe)

**Extraire :**

a) Tokens CSS de border-radius :
   - Valeur de base `--radius`
   - Calcul de sm, md, lg, xl

b) Utilisation par composant (avec classes Tailwind exactes) :
   - Buttons
   - Cards
   - Inputs / Textarea
   - Modals / Dialogs
   - Dropdowns
   - Badges
   - Tables
   - Avatars
   - Images
   - Code blocks

c) Fréquence d'utilisation de chaque valeur `rounded-*`

---

### 2.5 SHADOWS

**Fichiers à analyser :**
- `src/index.css` → classes custom de shadow
- Composants UI → classes `shadow-*`

**Extraire :**

a) Shadows Tailwind standard utilisées :
   - shadow-xs, shadow-sm, shadow-md, shadow-lg, shadow-xl, shadow-2xl
   - shadow-primary (si existent)
   - shadow-none

b) Shadows custom définies en CSS :
   - Extraire la valeur CSS exacte
   - Décrire le contexte d'utilisation

c) Utilisation par composant :
   - Card shadows
   - Button shadows
   - Modal/Dialog shadows
   - Dropdown shadows
   - Floating element shadows
   - Hover shadows (changement de shadow au survol)

d) Colored shadows (ombres teintées avec des couleurs)

---

### 2.6 BUTTON STYLES

**Fichiers à analyser :**
- `src/components/ui/button.tsx` (ou équivalent)
- Pages → utilisation des boutons

**Extraire :**

a) Chaque variante avec ses classes complètes :
   - Default (primary)
   - Secondary
   - Outline
   - Ghost
   - Destructive / Danger
   - Link
   - Gradient (si custom)
   - Variante avec icône

b) Chaque taille avec ses dimensions :
   - Height (h-*)
   - Padding (px-*, py-*)
   - Font size (text-*)
   - Icon size (h-* w-*)
   - Border radius

c) États avec leurs styles :
   - Default
   - Hover
   - Active / Pressed
   - Focus-visible
   - Disabled
   - Loading (si existant)

d) Ombres et effets visuels des boutons

---

### 2.7 CARD STYLES

**Fichiers à analyser :**
- `src/components/ui/card.tsx`
- Pages principales → patterns de cards

**Extraire :**

a) Composant Card de base :
   - Background
   - Border
   - Border radius
   - Shadow
   - Padding (card, header, content, footer)

b) Variantes de cards identifiées dans le code :
   - Standard card
   - Stat card
   - Feature card
   - Hover card (avec animation)
   - Glass card (glassmorphism)
   - Interactive card (clickable)
   - Dashboard card

c) Pour chaque variante, documenter :
   - Classes Tailwind complètes
   - Effet hover
   - Espacement interne
   - Hiérarchie du contenu (titre, description, image, actions)

---

### 2.8 INPUT / FORM STYLES

**Fichiers à analyser :**
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/label.tsx`
- Pages de formulaires

**Extraire :**

a) Pour chaque composant de formulaire :
   - Height
   - Padding
   - Background
   - Border (couleur et taille)
   - Border radius
   - Font size
   - Placeholder color
   - Icon (si applicable)

b) États :
   - Default
   - Focus (ring, border change)
   - Error / Invalid (aria-invalid)
   - Disabled
   - Hover (si applicable)

c) Labels :
   - Font size
   - Font weight
   - Color
   - Spacing (gap avec l'input)
   - Required indicator

d) Messages d'aide et d'erreur :
   - Font size
   - Color
   - Spacing

---

### 2.9 ICON SIZES

**Fichiers à analyser :**
- Bibliothèque d'icônes utilisée (lucide-react, heroicons, etc.)
- Composants UI → tailles d'icônes
- Shim ou barrel exports (si existent)

**Extraire :**

a) Bibliothèque et style :
   - Nom du package
   - Style (outline, filled, duotone, etc.)
   - Stroke width (si outline)

b) Échelle de tailles utilisée :
   - xs (12px)
   - sm (14px)
   - md (16px) — taille par défaut
   - lg (20px)
   - xl (24px)
   - 2xl (32px)
   - 3xl (40px)
   - 4xl (48px)

c) Tailles par contexte d'utilisation :
   - Navigation icons
   - Button icons
   - Form field icons
   - Card/feature icons
   - Badge indicators
   - Avatar fallback icons
   - Hero/section icons

d) Couleurs des icônes :
   - Par défaut (currentColor)
   - Couleurs sémantiques (primary, success, warning, error, muted)

e) Espacement icône-texte :
   - gap-* utilisé entre icône et texte adjacent

---

### 2.10 TRANSITIONS

**Fichiers à analyser :**
- `src/index.css` → animations custom
- Composants UI → classes `transition-*`
- Framer Motion (si utilisé)

**Extraire :**

a) Transitions CSS standard :
   - transition-all
   - transition-colors
   - transition-transform
   - transition-opacity
   - transition-shadow
   - transition-* (autres)

b) Durées utilisées :
   - transition-duration-150 (fast)
   - transition-duration-200 (normal)
   - transition-duration-300 (slow)
   - Autres durées

c) Timing functions :
   - ease (défaut Tailwind)
   - ease-in
   - ease-out
   - ease-in-out
   - cubic-bezier custom (si existant)

d) Animations CSS keyframes (si existantes) :
   - Nom de l'animation
   - Keyframes
   - Utilisation

e) Transitions par contexte :
   - Button hover
   - Card hover
   - Input focus
   - Modal/Dialog ouverture/fermeture
   - Dropdown animation
   - Sidebar toggle
   - Navigation transitions
   - Tab switching
   - Tooltip appear/disappear
   - Page transitions (si Framer Motion)

f) Framer Motion (si utilisé) :
   - Patterns d'animation réutilisés (fade-in, slide-up, scale, etc.)
   - Durées typiques
   - Viewport triggers

---

### 2.11 EFFETS VISUELS SUPPLÉMENTAIRES

**Fichiers à analyser :**
- `src/index.css` → utilities custom
- Pages → glassmorphism, gradients, patterns

**Extraire :**

a) Glassmorphism :
   - Opacity values
   - Blur values
   - Border opacity
   - Utilisation (header, cards, etc.)

b) Gradients :
   - Background gradients
   - Text gradients
   - Button gradients
   - Body/page gradients

c) Patterns décoratifs :
   - Dotted patterns
   - Grid patterns
   - Blueprint patterns
   - Tout pattern custom

d) Backdrop effects :
   - backdrop-filter: blur()
   - backdrop-filter: brightness()

e) Focus visible global :
   - outline color
   - outline offset
   - outline width

---

### 2.12 LAYOUT & RESPONSIVE

**Fichiers à analyser :**
- Layout components
- Pages principales
- CSS responsive breakpoints

**Extraire :**

a) Breakpoints :
   - sm, md, lg, xl, 2xl (valeurs ou Tailwind defaults)

b) Container patterns :
   - max-w-* utilisés
   - mx-auto patterns
   - padding responsive

c) Grid patterns fréquents :
   - grid-cols-1/2/3/4/6
   - Responsive grid transitions
   - gap values

d) Layout patterns :
   - Sidebar + main content
   - Header + content
   - Footer patterns
   - Card grid layouts

e) Mobile-specific :
   - Touch target minimum sizes
   - Mobile padding adjustments
   - Mobile typography adjustments

---

PHASE 3 — CRÉATION DU DOCUMENT

Créer le fichier `src/DESIGN_SYSTEM.md` avec la structure suivante :

```
# [Nom de la Plateforme] Design System — Complete Extraction

> Source of Truth: [Nom]
> Stack: [technologies identifiées]
> Color Space: [OKLCH, HSL, etc.]

---

## 1. CSS VARIABLES & DESIGN TOKENS
### 1.1 Border Radius
### 1.2 Typography
### 1.3 Spacing
### 1.4 Colors (Light + Dark + Semantic + Chart + Sidebar)
### 1.5 Shadows
### 1.6 Transitions

## 2. COMPONENT STYLES
### 2.1 Buttons (variants × sizes × states)
### 2.2 Cards (types × hover effects)
### 2.3 Form Inputs (all form elements × states)
### 2.4 Badges (variants)
### 2.5 Dialogs & Modals
### 2.6 Dropdowns
### 2.7 Tables
### 2.8 Tabs
### 2.9 Progress bars
### 2.10 Avatars
### 2.11 Skeleton / Loading states
### 2.12 Scroll Area
### 2.13 Separator

## 3. LAYOUT & RESPONSIVE
### 3.1 Container widths
### 3.2 Section spacing
### 3.3 Grid patterns
### 3.4 Breakpoints
### 3.5 Mobile touch targets

## 4. GLASSMORPHISM & VISUAL EFFECTS
### 4.1 Glass effects
### 4.2 Gradients
### 4.3 Patterns
### 4.4 Focus visible

## 5. ICON SYSTEM
### 5.1 Library & style
### 5.2 Size scale
### 5.3 Colors
### 5.4 Spacing

## 6. ANIMATIONS
### 6.1 CSS animations
### 6.2 Framer Motion patterns

## 7. EXPORTABLE CSS VARIABLES (Copy-Paste Ready)

## 8. KEY DESIGN PRINCIPLES
```

---

PHASE 4 — VÉRIFICATION

1. Relire le document et vérifier que chaque valeur mentionnée existe dans le code source.
2. Supprimer toute valeur inventée ou non vérifiée.
3. S'assurer que les exemples de code sont copiables directement.
4. Vérifier que le document est complet et cohérent.
5. Confirmer qu'aucun fichier du projet source n'a été modifié.

---

FORMAT DE SORTIE ATTENDU

Un fichier `DESIGN_SYSTEM.md` contenant :
- Toutes les valeurs en format lisible (OKLCH, HSL, ou Hex selon ce qui est utilisé)
- Des exemples de classes Tailwind copiables
- Des CSS variables prêtes à copier-coller
- Des descriptions de contexte pour chaque token
- Une section "Exportable" avec tout le CSS nécessaire à transférer dans un nouveau projet

Le document doit permettre à un développeur de recréer fidèlement le design de la plateforme source dans un nouveau projet, simplement en suivant les tokens documentés.
```

---

## Comment utiliser ce prompt

1. **Copier** le prompt ci-dessus
2. **Coller** dans votre agent de code (Codebuff, Cursor, Claude, Copilot, etc.)
3. **Remplacer** `[NOM_DE_LA_PLATEFORME]` par le nom réel de votre projet
4. **Exécuter** — l'agent analysera votre code et créera `DESIGN_SYSTEM.md`
5. **Copier** la section "Exportable CSS Variables" dans votre nouveau projet

Le document généré contient tout ce qu'il faut pour reproduire fidèlement le design source dans n'importe quel autre projet React/Tailwind.
