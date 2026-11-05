# Prompt — Cloner le design et le style de Batibuild

> Prompt prêt à coller dans un agent de code (Claude Code, Codex, Cursor, Freebuff…).
> Il reproduit le **langage visuel** de Batibuild, pas ses contenus métier ni ses assets de marque.

---

## Prompt

Tu es ingénieur front-end senior spécialisé dans les design systems SaaS premium. Ta mission : **transposer à l'identique le design system et le style visuel de Batibuild** dans le projet courant, sans copier son logo, ses textes, ses images ni son contenu métier. Le nouveau projet doit donner la même impression : sobre, dense, professionnel, lumineux, avec une identité « construction / terrain » moderne.

### 0. Règles de fidélité

- Ne réinvente pas la direction artistique. Reprends les mêmes tokens, rayons, ombres, typographies, espacements, composants et motifs de mise en page.
- Conserve l'architecture et les fonctionnalités existantes du projet cible. Remplace uniquement l'habillage UI, les composants de présentation et la structure des pages.
- Remplace le nom, le logo, les illustrations et les textes par ceux du nouveau projet. N'utilise aucun asset de Batibuild.
- Si le nouveau projet a une couleur de marque imposée, remplace **uniquement** `--primary`, `--ring`, `--sidebar-primary` et les accents d'icônes, en conservant les mêmes luminosités OKLCH. Tout le reste (neutres, rayons, ombres, typo) reste identique.
- Le rendu doit être crédible en **clair et sombre**, sur mobile et desktop, sans thème « inversé » automatique.

### 1. Stack et prérequis

Le projet de référence utilise :

- React 19 + TypeScript + Vite
- Tailwind CSS **v4** (configuration CSS-first via `@theme inline`, pas de `tailwind.config.ts`)
- Composants shadcn/ui sur primitives Radix, avec `class-variance-authority`, `tailwind-merge`, `cn()`
- `lucide-react` pour les icônes (contour, stroke 2)
- `framer-motion` pour les animations
- `next-themes` pour le thème, `sonner` pour les toasts
- `tw-animate-css` pour les animations d'entrée/sortie

Adapte-toi à la stack du projet cible. Si c'est Tailwind v3, convertis les tokens en variables CSS + `theme.extend` en gardant exactement les mêmes valeurs. N'ajoute pas une seconde bibliothèque UI.

### 2. Fondations à créer en premier

Crée ou remplace `src/index.css` avec cette base (adapte les chemins) :

```css
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --shadow-elev-1: var(--elev-1);
  --shadow-elev-2: var(--elev-2);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
}

:root {
  --radius: 1rem;
  --background: oklch(0.985 0.002 250);
  --foreground: oklch(0.145 0.015 260);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0.015 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0.015 260);
  --primary: oklch(0.596 0.145 163.2);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.968 0.002 248);
  --secondary-foreground: oklch(0.208 0.042 265);
  --muted: oklch(0.968 0.002 248);
  --muted-foreground: oklch(0.556 0.02 257);
  --accent: oklch(0.968 0.002 248);
  --accent-foreground: oklch(0.208 0.042 265);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.918 0.004 248);
  --input: oklch(0.918 0.004 248);
  --ring: oklch(0.596 0.145 163.2);
  --success: oklch(0.577 0.145 155);
  --success-foreground: oklch(0.99 0 0);
  --warning: oklch(0.75 0.15 60);
  --warning-foreground: oklch(0.25 0.045 55);
  --info: oklch(0.58 0.14 250);
  --info-foreground: oklch(0.99 0 0);
  --elev-1: 0 1px 2px oklch(0.145 0.015 260 / 0.05);
  --elev-2: 0 8px 24px -12px oklch(0.145 0.015 260 / 0.18);
  --chart-1: oklch(0.596 0.145 163.2);
  --chart-2: oklch(0.545 0.175 252);
  --chart-3: oklch(0.769 0.12 83);
  --chart-4: oklch(0.627 0.15 229);
  --chart-5: oklch(0.69 0.16 300);
  --sidebar: oklch(0.992 0.001 250);
  --sidebar-foreground: oklch(0.145 0.015 260);
  --sidebar-primary: oklch(0.596 0.145 163.2);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.96 0.004 248);
  --sidebar-accent-foreground: oklch(0.208 0.042 265);
  --sidebar-border: oklch(0.92 0.004 248);
  --sidebar-ring: oklch(0.596 0.145 163.2);
}

.dark {
  --background: oklch(0.145 0.012 258);
  --foreground: oklch(0.985 0.002 250);
  --card: oklch(0.185 0.014 258);
  --card-foreground: oklch(0.985 0.002 250);
  --popover: oklch(0.185 0.014 258);
  --popover-foreground: oklch(0.985 0.002 250);
  --primary: oklch(0.696 0.17 162.5);
  --primary-foreground: oklch(0.145 0.012 258);
  --secondary: oklch(0.26 0.016 258);
  --secondary-foreground: oklch(0.985 0.002 250);
  --muted: oklch(0.26 0.016 258);
  --muted-foreground: oklch(0.708 0.02 256);
  --accent: oklch(0.26 0.016 258);
  --accent-foreground: oklch(0.985 0.002 250);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.696 0.17 162.5);
  --success: oklch(0.72 0.15 155);
  --success-foreground: oklch(0.15 0.02 155);
  --warning: oklch(0.8 0.14 70);
  --warning-foreground: oklch(0.2 0.035 60);
  --info: oklch(0.72 0.12 250);
  --info-foreground: oklch(0.15 0.03 250);
  --elev-1: 0 1px 2px oklch(0 0 0 / 0.35);
  --elev-2: 0 10px 28px -14px oklch(0 0 0 / 0.6);
  --chart-1: oklch(0.696 0.17 162.5);
  --chart-2: oklch(0.623 0.19 253);
  --chart-3: oklch(0.769 0.12 83);
  --chart-4: oklch(0.627 0.15 229);
  --chart-5: oklch(0.69 0.16 300);
  --sidebar: oklch(0.185 0.014 258);
  --sidebar-foreground: oklch(0.985 0.002 250);
  --sidebar-primary: oklch(0.696 0.17 162.5);
  --sidebar-primary-foreground: oklch(0.145 0.012 258);
  --sidebar-accent: oklch(0.26 0.016 258);
  --sidebar-accent-foreground: oklch(0.985 0.002 250);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.696 0.17 162.5);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body {
    @apply bg-background text-foreground;
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  button:not([disabled]),
  [role="button"]:not([disabled]) { cursor: pointer; }
}
```

Avec `--radius: 1rem`, les rayons effectifs sont : `rounded-sm` 12 px, `rounded-md` 14 px, `rounded-lg` 16 px, `rounded-xl` 20 px. **Utilise les noms de tokens, pas des valeurs arbitraires.** Les cartes utilisent `rounded-xl`; les boutons, inputs et menus `rounded-md`; les badges et pastilles `rounded-full`.

Charge **Inter** (`opsz,wght@14..32,300..800`) et, si l'arabe est supporté, **Noto Sans Arabic**. Une seule famille : pas de titre décoratif séparé.

### 3. Utilitaires globaux à reproduire

```css
body {
  background-image: linear-gradient(180deg, oklch(0.985 0.002 250), oklch(1 0 0) 32%, oklch(0.985 0.002 250));
  background-attachment: fixed;
}
.dark body {
  background-image: linear-gradient(180deg, oklch(0.13 0.012 258), oklch(0.15 0.014 258) 40%, oklch(0.13 0.012 258));
}

.label-overline {
  @apply text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground;
}
.shadow-soft { box-shadow: 0 1px 2px oklch(0 0 0 / .03), 0 8px 24px -12px oklch(0 0 0 / .08); }
.shadow-soft-lg { box-shadow: 0 2px 4px oklch(0 0 0 / .04), 0 16px 40px -16px oklch(0 0 0 / .14); }

.glass {
  background: oklch(1 0 0 / .7);
  backdrop-filter: blur(12px);
  border: 1px solid oklch(0.92 0.004 286.32 / .5);
}
.dark .glass {
  background: oklch(0.18 0.034 261.692 / .7);
  border-color: oklch(1 0 0 / .08);
}
.glass-strong {
  background: oklch(1 0 0 / .85);
  backdrop-filter: blur(16px);
  border: 1px solid oklch(0.92 0.004 286.32 / .6);
}
.dark .glass-strong {
  background: oklch(0.18 0.034 261.692 / .85);
  border-color: oklch(1 0 0 / .1);
}
.glass-header {
  background: oklch(1 0 0 / .72);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid oklch(0.92 0.004 248 / .6);
}
.dark .glass-header {
  background: oklch(0.145 0.012 258 / .72);
  border-bottom-color: oklch(1 0 0 / .08);
}

.gradient-text {
  background: linear-gradient(135deg, var(--primary) 0%, oklch(0.72 0.15 175) 55%, var(--primary) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.btn-gradient {
  background-image: linear-gradient(135deg, oklch(0.62 0.15 163) 0%, oklch(0.55 0.16 168) 100%);
  box-shadow: 0 8px 20px -8px oklch(0.62 0.15 163 / .55);
}
.btn-gradient:hover {
  filter: brightness(1.06);
  box-shadow: 0 10px 26px -8px oklch(0.62 0.15 163 / .65);
}

.dotted-watermark {
  background-image: radial-gradient(oklch(1 0 0 / .18) 1px, transparent 1px);
  background-size: 18px 18px;
}
.blueprint-grid {
  background-image:
    linear-gradient(to right, oklch(0.5 0.15 230 / .06) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(0.5 0.15 230 / .06) 1px, transparent 1px);
  background-size: 40px 40px;
}

:where(button, a, input, select, textarea, [role="button"], [tabindex]):focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
html { scroll-behavior: smooth; }

/* Pas de barre horizontale visible, mais le scroll reste possible. */
.overflow-x-auto, .scrollbar-none { scrollbar-width: none; }
.overflow-x-auto::-webkit-scrollbar, .scrollbar-none::-webkit-scrollbar { display: none; }

/* Évite le zoom iOS au focus. */
@media (max-width: 767px) {
  input:not([type="checkbox"]):not([type="radio"]), textarea, select { font-size: 16px; }
}
```

Respecte `prefers-reduced-motion: reduce` : coupe translations, scales et animations d'entrée, garde les changements d'état instantanés.

### 4. Composants de base

**Button** (`components/ui/button.tsx`) : `inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-[3px] focus-visible:ring-ring/50`.
- `default` : `bg-primary text-primary-foreground hover:bg-primary/90`
- `outline` : `border bg-background shadow-xs hover:bg-accent`
- `ghost` : `hover:bg-accent`
- `secondary` : `bg-secondary text-secondary-foreground`
- `destructive`, `link`
- Tailles : `default` `h-9 px-4`, `sm` `h-8 px-3`, `lg` `h-10 px-6`, `icon` `size-9`.
- Icônes 16 px par défaut, jamais plus grandes que le texte du bouton.

**Card** : `bg-card text-card-foreground flex flex-col gap-4 rounded-xl border border-border/60 py-4 shadow-elev-1`. En-tête `grid gap-2 px-6`, contenu `px-6`. **Jamais de carte dans une carte.** Pas de bordure lourde, pas d'ombre noire marquée.

**KPI** : carte compacte `rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-elev-1`; label `text-[10px] font-medium uppercase tracking-wider text-muted-foreground`; valeur `text-lg sm:text-xl font-semibold tabular-nums`; indice `text-[11px] text-muted-foreground`; ton `success | warning | danger | info` uniquement pour signaler.

**PageHeader** : `flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/50 pb-3`; titre `text-base sm:text-lg font-semibold`; sous-titre `text-xs text-muted-foreground`; une seule action principale à droite. Très compact, pas de gros bandeau marketing dans l'app.

**Section** : titre `text-[13px] sm:text-sm font-semibold`; description `text-xs text-muted-foreground`; option surface `rounded-xl border border-border/60 bg-card shadow-elev-1`.

**Badge** : `rounded-full border px-2 py-0.5 text-xs font-medium`. Statuts : succès `bg-emerald-50 text-emerald-700 border-emerald-200`, attention `bg-amber-50 text-amber-700 border-amber-200`, erreur `bg-red-50 text-red-700 border-red-200`, info `bg-blue-50 text-blue-700 border-blue-200` (équivalents `/10` + `400` en sombre).

**Inputs / Select / Textarea** : `h-9 rounded-md border border-input bg-transparent text-sm shadow-xs`, focus `ring-[3px] ring-ring/50 border-ring`, placeholder `text-muted-foreground`. Label `text-sm font-medium`. Switch et checkbox arrondis, coche verte.

**Tableaux** : `w-full text-sm`, entêtes `h-10 px-2 text-left font-medium text-muted-foreground`, lignes `border-b hover:bg-muted/50`, cellules `p-2 align-middle`, conteneur scrollable horizontalement sans barre visible. Zebra optionnel avec `--muted`.

**Dialog / Sheet / Dropdown** : overlay `bg-black/80`, contenu `bg-background border rounded-xl shadow-lg p-6`, animations fade + zoom 95 % (150–200 ms). Sur mobile, dialogues en bas de type sheet, largeur viewport moins 1,5 rem.

### 5. Landing page — structure exacte à transposer

Ordre des sections : **Navbar → Hero → bandeau cycle de vie / preuve → bénéfices chiffrés → comment ça marche → fonctionnalités → témoignages → CTA final → footer**.

**Navbar** : fixe, transparente au départ, `glass-strong shadow-sm` après 20 px de scroll, hauteur 64 px, `max-w-7xl`, logo + nom, 5 liens `text-sm text-muted-foreground hover:text-foreground`, bascule thème, « Connexion » ghost et CTA primaire. Menu mobile en panneau déroulant.

**Hero** :
- fond : dégradé `from-primary/[0.06] via-transparent to-background` + 2–3 halos flous (`bg-emerald-500/10`, `bg-sky-400/10`, `bg-violet-500/5`);
- overline en pill violette (`border-violet-500/30 bg-violet-500/10 text-violet-700`) avec petite icône `Sparkles` dans une pastille gradient ;
- H1 `text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08]`, avec **un seul groupe de mots en `gradient-text`** ;
- 3 pills de bénéfices (émeraude / violet / bleu ciel) avec icônes Lucide, hover discret ;
- paragraphe `text-base sm:text-lg text-muted-foreground/80` avec mots-clés en `font-medium text-foreground/90` ;
- CTA principal `h-12 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25`, icône + flèche qui glisse au hover ;
- mockup produit : cadre navigateur en verre (`rounded-2xl border-border/40 bg-background/80 backdrop-blur-xl shadow-soft-lg`), pastilles macOS, URL factice, puis un aperçu d'interface réel (KPI, badge vert, mini-graphique) — pas une illustration abstraite.

**Sections** : `py-24 lg:py-32`, conteneur `max-w-7xl px-4 sm:px-6 lg:px-8`, en-tête centré `max-w-2xl`, overline `.label-overline`, H2 `text-3xl sm:text-4xl font-black tracking-tight` avec un mot en `gradient-text`, sous-titre `text-muted-foreground`.

**Comment ça marche** : 2 colonnes (liste d'étapes à gauche, aperçu à droite), étape active avec `border-primary/30 bg-primary/5`, pastille d'icône gradient, transitions douces.

**Fonctionnalités** : grille 1 / 2 / 3 colonnes, cartes `rounded-2xl border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg`, tuile d'icône `h-10 w-10 rounded-xl` avec gradient pastel propre à chaque fonction, titre `text-base font-semibold`, description `text-sm text-muted-foreground`.

**Bénéfices** : 3–4 gros chiffres `text-4xl sm:text-5xl font-black gradient-text` + libellé + phrase courte.

**Témoignages** : 3 cartes sobres, avatar rond, étoiles ambre, citation courte, auteur + rôle, pas de carrousel compliqué.

**CTA final** : panneau `rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-green-900 p-8 sm:p-12 lg:p-16 text-center shadow-soft-lg`, motif `.dotted-watermark` à 30 %, halos blancs/bleus, overline en pill `bg-white/15`, H2 blanc `text-3xl sm:text-4xl lg:text-5xl font-black`, bouton blanc `text-emerald-800`.

**Footer** : `border-t border-border/50 py-12`, 4 colonnes, titres `text-sm font-semibold`, liens `text-xs text-muted-foreground hover:text-foreground`, mention légale discrète.

### 6. Application connectée — shell et densité

Le style « produit » est plus dense que la landing, mais garde exactement les mêmes tokens.

- **Sidebar desktop** : fixe, largeur `w-56 lg:w-64`, repliable en `w-14` (icônes seules), `border-r border-border/40 bg-background/80 backdrop-blur-sm`. Items `rounded-lg px-3 py-2.5 text-xs sm:text-sm`, icône 16 px, état actif `bg-primary/10 text-primary`, hover `bg-muted/50`. Section Paramètres / Déconnexion en bas.
- **Header** : `glass-header sticky top-0 z-30`, hauteur `h-12 sm:h-14 lg:h-16`, `px-3 sm:px-5 lg:px-6`. À gauche : menu mobile, H1 `text-sm sm:text-base font-semibold` + badge de rôle. À droite : notifications, bascule thème, avatar menu.
- **Contenu** : KPI en grille 2 colonnes mobile → 4 desktop, cartes compactes, sections avec `PageHeader`, listes et tableaux denses. Les actions rapides peuvent être des cartes sans bordure ni ombre, seules les pastilles d'icônes structurent la rangée.
- **Mobile** : sidebar en overlay `bg-black/40 backdrop-blur-sm`, panneau `w-64 sm:w-72 animate-in slide-in-from-left`; cibles tactiles confortables ; aucun scroll horizontal de page.

### 7. Authentification

La page d'authentification a sa propre palette chaude « Tunisie » : terracotta `--auth-primary: oklch(0.52 0.175 35.5)`, bleu méditerranéen `oklch(0.55 0.15 230)`, sable `oklch(0.92 0.04 75)`, crème `oklch(0.98 0.008 60)`, or `oklch(0.72 0.16 75)`. Reproduis :
- split screen desktop : panneau gauche illustratif / argumentaire, panneau droit formulaire sur fond `.auth-bg-pattern` (grille 60 px ton sable) ;
- carte de formulaire `rounded-2xl border auth-card-border bg-background/70 backdrop-blur`, champs avec `auth-input-focus` (bordure terracotta + halo 15 %) ;
- bouton principal `auth-gradient` (terracotta → bleu), texte `auth-gradient-text` pour les mots forts ;
- bascule clair/sombre et langue discrètes, mentions légales en bas.

Si le projet n'a pas d'authentification, applique simplement cette chaleur aux écrans d'entrée / onboarding.

### 8. Typographie et ton

- Inter partout ; titres marketing `font-black tracking-tight`, titres produit `font-semibold`, corps `text-sm`, métadonnées `text-xs`, micro-labels `.label-overline`.
- Chiffres : `tabular-nums` pour les KPI, montants et tableaux.
- Français : phrases courtes, verbes d'action, bénéfice concret avant fonctionnalité. Pas de lorem ipsum, pas de jargon creux.
- Adapter les exemples, devises et références géographiques au domaine du nouveau projet.
- Un seul niveau d'emphase par écran : soit un grand titre, soit un KPI, pas les deux en concurrence.

### 9. Motion

- Framer Motion pour l'entrée des sections : `initial={{ opacity: 0, y: 16–30 }}`, `whileInView`, `viewport={{ once: true }}`, `duration: 0.5–0.6`, `ease: "easeOut"`.
- Héros : délais échelonnés de 0,05 à 0,07 s entre overline, H1, pills, sous-titre, CTA, mockup.
- Hover : `-translate-y-0.5`, ombre légèrement plus profonde, flèche `translate-x-0.5` ; actif : `scale-[0.97]`.
- Durées 150–300 ms, jamais d'animation permanente, de parallaxe lourde ou de rebond excessif.

### 10. À ne pas faire

- Pas de dégradés violet/rose plein écran, pas de néons, pas de « glassmorphism » partout.
- Pas de coins `rounded-full` sur les cartes, pas de cartes imbriquées, pas de bordures épaisses.
- Pas de plus d'une famille de polices, pas d'icônes pleines mélangées aux icônes contour.
- Pas de noir pur ni de blanc pur en mode sombre : utiliser les neutres OKLCH ci-dessus.
- Pas de gros blocs vides « aérés » sans contenu ; la densité maîtrisée fait partie du style.
- Ne pas copier le logo, les photos, les témoignages ou les textes de Batibuild.

### 11. Méthode de travail

1. Audite la stack et les écrans existants ; liste les fichiers à modifier sans casser routes, auth ni données.
2. Installe / vérifie les dépendances, charge les polices, applique les tokens et utilitaires.
3. Porte les primitives shadcn (`button`, `card`, `badge`, `input`, `select`, `dialog`, `tabs`, `table`) en respectant les classes ci-dessus.
4. Construis le shell connecté, puis la landing page complète.
5. Applique le style aux écrans métier : formulaires, tableaux, états vides, erreurs, chargements (skeletons `bg-accent animate-pulse`).
6. Vérifie en clair et sombre, à 390 px, 768 px et 1440 px, au clavier, avec `prefers-reduced-motion`.
7. Lance le typecheck / lint / build du projet et corrige les erreurs.

### 12. Critères d'acceptation

- Les tokens, rayons, ombres et la typo sont identiques (aux valeurs près) à ceux fournis.
- La landing reprend la hiérarchie : navbar glass, hero avec overline + H1 à mot gradient + pills + CTA gradient + mockup en verre, sections `py-24`, CTA final émeraude.
- Le dashboard reprend la sidebar fixe, le header glass, les KPI compacts et la densité produit.
- Le mode sombre est complet, sans inversion brute, et le thème ne clignote pas au chargement.
- Aucun scroll horizontal à 360 px ; les focus sont visibles ; le contraste texte/fond est conforme.
- Aucun texte, logo ou asset de Batibuild n'est réutilisé.
- Le rendu donne la même impression de marque que Batibuild : émeraude, neutres froids, surfaces blanches, ombres diffuses, verre discret, Inter, chiffres nets.

### 13. Références (si le dépôt Batibuild est accessible)

Lis ces fichiers avant d'implémenter, dans cet ordre :
`src/index.css`, `src/DESIGN_SYSTEM.md`, `src/components/ui/{button,card,kpi,section,badge}.tsx`, `src/pages/Landing.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Auth.tsx`, `src/components/Logo.tsx`.

Ne copie que les décisions de style ; adapte le contenu et les composants au projet cible.

---

## Utilisation

1. Colle tout ce qui précède dans l'agent du nouveau projet.
2. Précise au début : le nom du projet, son domaine, sa couleur de marque éventuelle, ses pages existantes et sa stack exacte.
3. Demande d'abord les fondations + le shell + une page de référence, valide visuellement, puis généralise.
