# BatiBuild Design System

> Système de design centralisé — Token unique pour toute la plateforme BatiBuild.
> Basé sur l'analyse complète du code existant (shadcn/ui + Tailwind CSS + OKLCH tokens).

---

## 1. COULEURS

### Palette Principale (Light)

| Token | Valeur OKLCH | Rôle |
|---|---|---|
| `--primary` | `oklch(0.596 0.145 163.2)` | Vert principal — actions, liens, accents forts |
| `--primary-foreground` | `oklch(0.985 0 0)` | Texte sur fond primary |
| `--secondary` | `oklch(0.968 0.002 248)` | Gris très clair — boutons secondaires, fonds subtils |
| `--secondary-foreground` | `oklch(0.208 0.042 265)` | Texte sur fond secondary |
| `--accent` | `oklch(0.968 0.002 248)` | Même que secondary — hover states, highlights |
| `--accent-foreground` | `oklch(0.208 0.042 265)` | Texte sur fond accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Rouge — suppressions, erreurs critiques |
| `--muted` | `oklch(0.968 0.002 248)` | Fond gris très clair — labels, badges secondaires |
| `--muted-foreground` | `oklch(0.556 0.02 257)` | Texte secondaire / descriptions |
| `--background` | `oklch(0.985 0.002 250)` | Fond de page — blanc très légèrement froid |
| `--foreground` | `oklch(0.145 0.015 260)` | Texte principal — presque noir froid |
| `--card` | `oklch(1 0 0)` | Fond des cartes — blanc pur |
| `--card-foreground` | `oklch(0.145 0.015 260)` | Texte dans les cartes |
| `--popover` | `oklch(1 0 0)` | Fond des menus déroulants |
| `--popover-foreground` | `oklch(0.145 0.015 260)` | Texte des menus déroulants |
| `--border` | `oklch(0.918 0.004 248)` | Bordures — subtilement froid |
| `--input` | `oklch(0.918 0.004 248)` | Bordures des champs de formulaire |
| `--ring` | `oklch(0.596 0.145 163.2)` | Couleur du focus ring = primary |

### Palette Principale (Dark)

| Token | Valeur OKLCH |
|---|---|
| `--primary` | `oklch(0.696 0.17 162.5)` |
| `--primary-foreground` | `oklch(0.145 0.012 258)` |
| `--secondary` | `oklch(0.26 0.016 258)` |
| `--secondary-foreground` | `oklch(0.985 0.002 250)` |
| `--accent` | `oklch(0.26 0.016 258)` |
| `--accent-foreground` | `oklch(0.985 0.002 250)` |
| `--destructive` | `oklch(0.704 0.191 22.216)` |
| `--muted` | `oklch(0.26 0.016 258)` |
| `--muted-foreground` | `oklch(0.708 0.02 256)` |
| `--background` | `oklch(0.145 0.012 258)` |
| `--foreground` | `oklch(0.985 0.002 250)` |
| `--card` | `oklch(0.185 0.014 258)` |
| `--card-foreground` | `oklch(0.985 0.002 250)` |
| `--popover` | `oklch(0.185 0.014 258)` |
| `--popover-foreground` | `oklch(0.985 0.002 250)` |
| `--border` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.696 0.17 162.5)` |

### Couleurs sémantiques (utilisées dans les composants)

| Contexte | Light | Dark | Classes Tailwind |
|---|---|---|---|
| Succès | `oklch(0.65 0.19 160)` | `oklch(0.72 0.19 155)` | `text-emerald-600` / `text-emerald-400` |
| Avertissement | `oklch(0.75 0.16 75)` | `oklch(0.80 0.14 80)` | `text-amber-600` / `text-amber-400` |
| Erreur | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | `text-red-600` / `text-red-400` |
| Info | `oklch(0.627 0.15 229)` | `oklch(0.70 0.13 235)` | `text-sky-600` / `text-sky-400` |

### Palette Auth (Terracotta tunisienne)

| Token | Light | Dark |
|---|---|---|
| `--auth-primary` | `oklch(0.52 0.175 35.5)` | `oklch(0.65 0.16 38)` |
| `--auth-accent` | `oklch(0.55 0.15 230)` | `oklch(0.58 0.14 235)` |
| `--auth-warm` | `oklch(0.92 0.04 75)` | `oklch(0.25 0.03 40)` |
| `--auth-bg-light` | `oklch(0.98 0.008 60)` | `oklch(0.12 0.02 30)` |
| `--auth-gold` | `oklch(0.72 0.16 75)` | `oklch(0.65 0.14 75)` |

### Chartes

| Token | Light | Dark |
|---|---|---|
| `--chart-1` | `oklch(0.596 0.145 163.2)` | `oklch(0.696 0.17 162.5)` |
| `--chart-2` | `oklch(0.545 0.175 252)` | `oklch(0.623 0.19 253)` |
| `--chart-3` | `oklch(0.769 0.12 83)` | `oklch(0.769 0.12 83)` |
| `--chart-4` | `oklch(0.627 0.15 229)` | `oklch(0.627 0.15 229)` |
| `--chart-5` | `oklch(0.69 0.16 300)` | `oklch(0.69 0.16 300)` |

---

## 2. TYPOGRAPHIE

### Police de caractères

```
font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
```

### Hiérarchie des textes

| Rôle | Taille | Poids | Line-height | Tracking | Classes Tailwind |
|---|---|---|---|---|---|
| H1 (hero) | `text-4xl` → `text-5xl` → `text-6xl` | `font-black` (900) | `leading-[1.08]` | `tracking-tight` | `text-4xl sm:text-5xl md:text-6xl font-black tracking-tight` |
| H2 (section) | `text-2xl` → `text-3xl` | `font-bold` (700) | `leading-[1.15]` | `tracking-tight` | `text-2xl sm:text-3xl font-bold tracking-tight` |
| H3 (sous-titre) | `text-lg` → `text-xl` | `font-semibold` (600) | `leading-tight` | — | `text-lg sm:text-xl font-semibold` |
| H4 (card title) | `text-sm` → `text-base` | `font-semibold` (600) | `leading-none` | `tracking-tight` | `text-sm font-semibold tracking-tight` |
| Paragraphe | `text-sm` → `text-base` | `font-normal` (400) | `leading-relaxed` | — | `text-sm sm:text-base leading-relaxed` |
| Label | `text-xs` | `font-medium` (500) | — | — | `text-xs font-medium` |
| Description / muted | `text-xs` → `text-sm` | `font-normal` (400) | `leading-relaxed` | — | `text-xs text-muted-foreground` |
| Micro-label (overline) | `text-[9px]` → `text-[10px]` | `font-semibold` (600) | — | `tracking-[0.18em]` | `.label-overline` ou `text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground` |
| Caption / tag | `text-[10px]` → `text-[11px]` | `font-medium` (500) | — | — | `text-[10px] font-medium` |
| Badge | `text-xs` | `font-medium` (500) | — | — | `text-xs font-medium` |

### Gradient text (titres hero uniquement)

```css
.gradient-text {
  background: linear-gradient(135deg, var(--primary) 0%, oklch(0.72 0.15 175) 55%, var(--primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

Utilisation : `<span className="gradient-text">copilote IA</span>`

---

## 3. ESPACEMENT & LAYOUT

### Système d'espacement (4px base)

| Token | Valeur | Usage |
|---|---|---|
| `1` | 4px | Gap minimal (icônes, inline elements) |
| `2` | 8px | Gap items internes, padding compact |
| `3` | 12px | Gap sections légères, padding cards mobile |
| `4` | 16px | Padding standard, gap sections |
| `5` | 20px | Gap between major cards |
| `6` | 24px | Padding cards desktop (px-6, py-6) |
| `8` | 32px | Gap entre nav items desktop |
| `10` | 40px | Section spacing |
| `14` | 56px | Hero top padding |
| `20` | 80px | Hero padding desktop |

### Max width containers

| Contexte | Classe |
|---|---|
| Contenu standard | `max-w-7xl` (1280px) |
| Contenu étroit (forms) | `max-w-2xl` (672px) |
| Contenu large (hero) | `max-w-5xl` (1024px) |
| Contenu extra-large | `max-w-6xl` (1152px) |

### Grille responsive

| Contexte | Classes |
|---|---|
| Cards 2 colonnes | `grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5` |
| Stats 4 colonnes | `grid grid-cols-2 sm:grid-cols-4 gap-3` |
| Forms 2 colonnes | `grid grid-cols-1 sm:grid-cols-2 gap-4` |
| Sidebar + main | `flex flex-col lg:flex-row gap-6` |
| Nav items mobile | `space-y-3` |

### Padding body

```css
/* Mobile : px-4 (16px) */
/* Tablet : px-6 (24px) */
/* Desktop : px-4 sm:px-6 lg:px-8 */
```

---

## 4. BORDER RADIUS

| Token | Valeur | Classes | Usage |
|---|---|---|---|
| `--radius` | `1rem` (16px) | `rounded-xl` | Cards principales |
| `--radius-sm` | `12px` | `rounded-lg` | Tabs, badges overlay, nav items |
| `--radius-md` | `14px` | `rounded-md` | Buttons, inputs, selects, badges, tables |
| `--radius-lg` | `16px` | `rounded-xl` | Cards |
| `--radius-xl` | `20px` | `rounded-2xl` | Popups grandes, panels |

| Contexte | Rayon | Exemple |
|---|---|---|
| Button | `rounded-md` (6px) | `<Button>` |
| Input / Textarea / Select | `rounded-md` (6px) | `<Input>`, `<Textarea>` |
| Card | `rounded-xl` (8px) | `<Card>` |
| Badge | `rounded-full` | `<Badge>` |
| Dialog / Sheet | `rounded-lg` (8px) | `<DialogContent>` |
| Tabs trigger | `rounded-md` (6px) | `<TabsTrigger>` |
| Tabs list | `rounded-lg` (12px) | `<TabsList>` |
| Avatar | `rounded-full` | — |
| Hero card | `rounded-2xl` (16px) | Cards hero landing |
| Table rows | `rounded-none` | Tableaux de données |

---

## 5. OMBRES

### Shadows existantes

| Nom | Valeur | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Cards par défaut, inputs |
| `shadow-soft` | `0 1px 2px oklch(0 0 0 / 0.03), 0 8px 24px -12px oklch(0 0 0 / 0.08)` | Cards subtils (ne pas utiliser de bordures dures) |
| `shadow-soft-lg` | `0 2px 4px oklch(0 0 0 / 0.04), 0 16px 40px -16px oklch(0 0 0 / 0.14)` | Hero cards, grand contenu surélevé |
| `shadow-lg` | — | Dialogs, Sheets |
| `btn-gradient` shadow | `0 8px 20px -8px oklch(0.62 0.15 163 / 0.55)` | Bouton gradient (primary CTA) |

### Principes d'ombres
- **Jamais de bordures dures** pour l'élévation — utiliser des ombres diffuses
- **shadow-soft** pour les cartes en state normal
- **shadow-soft-lg** pour les hero cards et éléments surélevés
- Les ombres primary gradient (`btn-gradient`) sont réservées au CTA principal

---

## 6. BOUTONS

### Variants (CVA)

| Variant | Classes | Usage |
|---|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` | Action principale (vert) |
| `destructive` | `bg-destructive text-white hover:bg-destructive/90` | Suppression, danger |
| `outline` | `border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground` | Actions secondaires |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` | Alternatives neutres |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` | Actions discrètes (navigation, toggle) |
| `link` | `text-primary underline-offset-4 hover:underline` | Liens stylés |

### Tailles

| Size | Hauteur | Padding horizontal | Gap | Classes |
|---|---|---|---|---|
| `default` | `h-9` (36px) | `px-4` (16px) | `gap-2` | `h-9 px-4 py-2 has-[>svg]:px-3` |
| `sm` | `h-8` (32px) | `px-3` (12px) | `gap-1.5` | `h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5` |
| `lg` | `h-10` (40px) | `px-6` (24px) | `gap-2` | `h-10 rounded-md px-6 has-[>svg]:px-4` |
| `icon` | `size-9` (36px) | — | — | `size-9` |
| `icon-sm` | `size-8` (32px) | — | — | `size-8` |
| `icon-lg` | `size-10` (40px) | — | — | `size-10` |

### Bouton Gradient (CTA hero uniquement)

```html
<Button size="lg" className="btn-gradient h-12 px-8 text-base gap-2 w-full sm:w-auto text-white border-0">
  Action <ArrowRight className="h-4 w-4" />
</Button>
```

Classes :
- `btn-gradient` : gradient vert + ombre colorée
- `h-12 px-8 text-base` : taille plus grande pour CTA principal
- `w-full sm:w-auto` : pleine largeur mobile, auto desktop
- `text-white border-0` : texte blanc, pas de bordure

### États des boutons

| État | Style |
|---|---|
| Normal | Variant tel quel |
| Hover | `hover:bg-primary/90` (lighten ou dark par variant) |
| Active | `active:scale-95` (sur boutons icon/ghost) |
| Focus | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` |

### Patterns de boutons fréquents

**Bouton icône + texte :**
```html
<Button size="sm" className="gap-1.5">
  <Icon className="h-3.5 w-3.5" />
  Label
</Button>
```

**Bouton toggle (sélectionnable) :**
```html
<Button
  variant={active ? "default" : "outline"}
  size="sm"
  className={cn("text-xs", active && "border-primary")}
>
  Label
</Button>
```

---

## 7. CARDS

### Card standard (shadcn)

```
bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm
```

| Propriété | Valeur |
|---|---|
| Background | `bg-card` (= blanc pur) |
| Texte | `text-card-foreground` |
| Border-radius | `rounded-xl` (8px) |
| Border | `border` (1px, color `--border`) |
| Shadow | `shadow-sm` |
| Padding vertical | `py-6` (24px) |
| Padding horizontal | via CardContent : `px-6` |
| Gap interne | `gap-6` (24px) |

### Card Header pattern

```
px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]
```

### Hero Card (landing)

```html
<div className="relative overflow-hidden rounded-2xl border border-border/40 bg-background/80 backdrop-blur-xl shadow-soft-lg">
```

| Propriété | Valeur |
|---|---|
| Border-radius | `rounded-2xl` (16px) |
| Border | `border-border/40` (bordure subtile) |
| Background | `bg-background/80` (semi-transparent + backdrop) |
| Backdrop | `backdrop-blur-xl` |
| Shadow | `shadow-soft-lg` |

### Feature Card (landing)

```html
<div className="group relative h-full p-6 border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 bg-background/50 backdrop-blur-sm cursor-pointer">
```

### Card stat / métrique

```html
<div className="rounded-md border bg-background/70 px-2 py-1.5">
  <p className="text-[9px] text-muted-foreground uppercase tracking-wide truncate">Label</p>
  <p className="text-xs font-semibold tabular-nums">Valeur</p>
</div>
```

### Card admin / tableau

```html
<div className="rounded-lg border overflow-hidden">
  <div className="px-3 py-1.5 bg-muted/50 flex items-center gap-1.5">
    <!-- En-tête -->
  </div>
  <!-- Contenu -->
</div>
```

### Card support / info

```html
<div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5">
  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Label</p>
  <p className="text-[11px] leading-relaxed text-muted-foreground">Contenu</p>
</div>
```

---

## 8. FORMULAIRES

### Input

```
border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base
shadow-xs transition-[color,box-shadow] outline-none
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
aria-invalid:ring-destructive/20 aria-invalid:border-destructive
dark:bg-input/30 md:text-sm
```

| Propriété | Valeur |
|---|---|
| Hauteur | `h-9` (36px) |
| Border-radius | `rounded-md` (6px) |
| Border | 1px `border-input` |
| Background | transparent (light), `bg-input/30` (dark) |
| Padding | `px-3 py-1` |
| Focus | `border-ring` + `ring-[3px] ring-ring/50` |
| Erreur | `ring-destructive/20 border-destructive` |

### Textarea

```
border-input placeholder:text-muted-foreground min-h-16 w-full rounded-md border
bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none
focus-visible:border-ring focus-visible:ring-ring/50
dark:bg-input/30 md:text-sm
```

| Propriété | Valeur |
|---|---|
| Hauteur min | `min-h-16` (64px) |
| Padding | `px-3 py-2` |
| Auto-sizing | `field-sizing-content` |

### Select (Trigger)

```
border-input flex w-fit items-center justify-between gap-2 rounded-md border
bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs
transition-[color,box-shadow] outline-none
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
data-[size=default]:h-9 data-[size=sm]:h-8
dark:bg-input/30 dark:hover:bg-input/50
```

### Checkbox

```
border-input size-4 shrink-0 rounded-[4px] border shadow-xs
data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground
data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
dark:bg-input/30 dark:data-[state=checked]:bg-primary
```

### Switch

```
peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input
inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full
border border-transparent shadow-xs transition-all outline-none
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
dark:data-[state=unchecked]:bg-input/80
```

### Label pattern

```html
<label className="text-sm font-medium leading-none">
  Label
</label>
<!-- Avec description -->
<p className="text-xs text-muted-foreground mt-1">Description</p>
```

### Focus ring global

```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

---

## 9. ICÔNES

### Bibliothèque

**lucide-react** — icônes outline/stroke uniquement.

### Tailles par contexte

| Contexte | Taille icône | Classe |
|---|---|---|
| Inline texte | 14px | `h-3.5 w-3.5` |
| Bouton | 16px | `h-4 w-4` |
| Icône seule (button icon) | 18px | `h-[18px] w-[18px]` ou `size-4` |
| Badge / tag | 12px | `h-3 w-3` ou `[&_svg]:size-3` |
| Card header icon | 16px | `h-4 w-4` |
| Navigation | 16px | `h-4 w-4` |
| Hero badge | 12px | `h-3 w-3` |
| Micro / inline tag | 10-12px | `h-2.5 w-2.5` ou `h-3 w-3` |
| Avatar fallback | — | `size-4` (check icon in checkbox) |

### Couleurs d'icônes

| Contexte | Classe |
|---|---|
| Icône sur primary | `text-primary` ou `text-emerald-600` |
| Icône secondaire | `text-muted-foreground` |
| Icône sur fond colored | `text-violet-600`, `text-sky-600`, `text-amber-600` |
| Icône succès | `text-emerald-600` |
| Icône warning | `text-amber-600` |
| Icône erreur | `text-red-600` |

### Espacement icône-texte

| Contexte | Gap | Classes |
|---|---|---|
| Bouton | 8px | `gap-2` |
| Bouton compact | 6px | `gap-1.5` |
| Badge | 4px | `gap-1` |
| Inline label | 4px | `gap-1` |
| Nav item | 8px | `gap-2` |
| List item | 8-12px | `gap-2` ou `gap-3` |

### Patterns d'icônes dans les boutons

```html
<!-- Icône à gauche -->
<Button><Icon className="h-3.5 w-3.5" /> Label</Button>

<!-- Icône à droite (navigation) -->
<Button>Label <ArrowRight className="h-3.5 w-3.5" /></Button>

<!-- Icône seule -->
<Button size="icon"><Icon className="h-4 w-4" /></Button>
```

---

## 10. GLASS / TRANSPARENCE / BACKDROP

### Classes utilitaires existantes

| Classe | Background | Backdrop | Border | Usage |
|---|---|---|---|---|
| `.glass` | `oklch(1 0 0 / 0.7)` | `blur(12px)` | `oklch(0.92 0.004 286.32 / 0.5)` | Panels légers |
| `.glass-strong` | `oklch(1 0 0 / 0.85)` | `blur(16px)` | `oklch(0.92 0.004 286.32 / 0.6)` | Navbar scrolée, menus |
| `.glass-header` | `oklch(1 0 0 / 0.72)` | `blur(20px)` | `oklch(0.92 0.004 248 / 0.6)` | Sticky headers |

### Dark mode variants

| Classe | Background |
|---|---|
| `.dark .glass` | `oklch(0.18 0.034 261.692 / 0.7)` |
| `.dark .glass-strong` | `oklch(0.18 0.034 261.692 / 0.85)` |
| `.dark .glass-header` | `oklch(0.145 0.012 258 / 0.72)` |

### Règles d'utilisation
- **Navbar** : `bg-transparent` au top, `glass-strong shadow-sm` au scroll ou menu ouvert
- **Hero cards** : `bg-background/80 backdrop-blur-xl`
- **Panels / sidebars** : `glass-strong` ou `bg-background` opaque selon le contexte
- **Overlay dialogs** : `bg-black/50` (pas de glass sur l'overlay)

---

## 11. TRANSITIONS & ANIMATIONS

### Transitions standard

| Contexte | Duration | Easing | Classes |
|---|---|---|---|
| Couleurs / opacity | 150-200ms | ease | `transition-colors` ou `transition-all` |
| Hover states | 200ms | ease | `transition-all duration-200` |
| Transform (scale, slide) | 200ms | ease | `transition-all` ou `active:scale-95` |
| Menu / dropdown | 300ms | ease-out | `transition-all duration-300` |
| Page enter | 500ms | ease-out | framer-motion `transition={{ duration: 0.5, ease: "easeOut" }}` |

### Animations (tw-animate-css)

| Animation | Usage | Classes |
|---|---|---|
| Fade in | Dialogs, sheets | `animate-in fade-in-0` |
| Fade out | Close dialogs | `animate-out fade-out-0` |
| Scale in | Dialogs | `animate-in zoom-in-95` |
| Scale out | Dialogs | `animate-out zoom-out-95` |
| Slide from right | Sheets | `animate-in slide-in-from-right` |
| Slide from left | Sheets | `animate-in slide-in-from-left` |
| Pulse | Loading | `animate-ping` |

### Framer Motion patterns

```tsx
// Stagger entry (cards, list items)
initial={{ opacity: 0, y: 14 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.04, duration: 0.3 }}

// Hero entrance
initial={{ opacity: 0, y: 20, scale: 0.98 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}

// Navbar slide-down
initial={{ y: -20, opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
transition={{ duration: 0.5, ease: "easeOut" }}
```

---

## 12. PATTERNS DE NAVIGATION

### Navbar (landing)

- **Fixed** : `fixed top-0 left-0 right-0 z-50`
- **Hauteur** : `h-16` (64px)
- **Background** : `bg-transparent` → `glass-strong shadow-sm` au scroll
- **Contenu** : `max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8`

### Sidebar (dashboard)

- **Largeur** : 260px desktop, overlay mobile
- **Background** : `bg-sidebar`
- **Items** : `gap-1` entre les items, `rounded-lg` par item
- **Item actif** : `bg-sidebar-accent text-sidebar-accent-foreground font-medium`

### Bottom Nav Bar (mobile)

- **Background** : `bg-background/95 backdrop-blur-xl border-t border-border/50`
- **Items** : `text-xs font-medium`
- **Actif** : `text-primary`
- **Inactif** : `text-muted-foreground`

---

## 13. TABS

### Tabs List

```
bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]
```

### Tabs Trigger

```
text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center
justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium
data-[state=active]:bg-background data-[state=active]:shadow-sm
dark:data-[state=active]:text-foreground dark:data-[state=active]:border-input
dark:data-[state=active]:bg-input/30
```

---

## 14. TABLES

### Pattern de base

```html
<table className="w-full text-[11px]">
  <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
    <tr>
      <th className="px-3 py-1.5 text-left">Colonne</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-t border-border/50">
      <td className="px-3 py-1.5">Cellule</td>
    </tr>
  </tbody>
</table>
```

### Table Zebra

```css
.table-zebra tbody tr:nth-child(odd) {
  background: var(--muted);
}
```

### Taille de police dans les tableaux
- En-tête : `text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`
- Corps : `text-[11px]`
- Chiffres : `tabular-nums font-medium`

---

## 15. BADGES & TAGS

### Badge (shadcn)

```
inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium
```

### Badge avec couleur contextuelle

```html
<!-- Succès -->
<Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-600 border-transparent">
  <CircleCheck className="h-3 w-3" /> Résolu
</Badge>

<!-- Warning -->
<span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
  En cours
</span>
```

### Badge statut (tickets support)

| Statut | Classes |
|---|---|
| Ouvert | `border-yellow-500/25 bg-yellow-500/10 text-yellow-700` |
| En cours | `border-blue-500/25 bg-blue-500/10 text-blue-700` |
| Résolu | `border-emerald-500/25 bg-emerald-500/10 text-emerald-700` |
| Fermé | `border-gray-500/25 bg-gray-500/10 text-gray-600` |

---

## 16. DIALOGS & SHEETS

### Dialog Content (desktop)

```
bg-background data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%]
gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg
```

### Sheet Content (side panel)

```
bg-background fixed z-50 flex flex-col gap-4 shadow-lg
transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500
```

Side variants :
- Right: `inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm`
- Left: `inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm`
- Top: `inset-x-0 top-0 border-b`
- Bottom: `inset-x-0 bottom-0 border-t`

### Overlay

```
fixed inset-0 z-50 bg-black/50
```

---

## 17. EFFETS SPÉCIAUX

### Body background gradient

```css
body {
  background-image: linear-gradient(180deg, oklch(0.985 0.002 250), oklch(1 0 0) 32%, oklch(0.985 0.002 250));
  background-attachment: fixed;
}
```

### Dotted watermark (hero cards)

```css
.dotted-watermark {
  background-image: radial-gradient(oklch(1 0 0 / 0.18) 1px, transparent 1px);
  background-size: 18px 18px;
}
```

### Blueprint grid (construction pages)

```css
.blueprint-grid {
  background-image:
    linear-gradient(to right, oklch(0.5 0.15 230 / 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(0.5 0.15 230 / 0.06) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### Auth background pattern

```css
.auth-bg-pattern {
  background-color: var(--auth-bg-light);
  background-image:
    linear-gradient(var(--auth-warm) 1px, transparent 1px),
    linear-gradient(90deg, var(--auth-warm) 1px, transparent 1px);
  background-size: 60px 60px;
}
```

---

## 18. RÈGLES GÉNÉRALES

### Hiérarchie des textes
- **Titres** : `tracking-tight` pour les titres de taille ≥ `text-lg`
- **Texte muted** : toujours `text-muted-foreground`
- **Nombres / données** : `tabular-nums font-medium` ou `font-semibold`
- **Overlines / labels catégoriels** : `text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground`

### Bordures
- Bordures légères : `border-border/50` (50% opacity)
- Bordures contextuelles : `border-{color}-500/25` (pour badges colored)
- Pas de bordures dures — utiliser les ombres diffuses pour l'élévation

### Transparence & opacité
- `bg-background/80` : cartes semi-transparentes
- `bg-background/50` : cartes légères avec backdrop-blur
- `text-foreground/90` : texte légèrement estompé
- `text-muted-foreground/80` : descriptions très légères

### Responsive patterns
- **Mobile first** : styles de base = mobile
- **Breakpoints** : `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- **Padding mobile** : `px-4` (16px)
- **Cards mobile** : pleine largeur, `gap-4` réduit
- **Typography mobile** : `text-sm sm:text-base`, `text-2xl sm:text-3xl`
- **Actions mobile** : `w-full sm:w-auto` pour les boutons CTA

### Focus & accessibilité
- **Focus visible** : `2px solid var(--ring)` + `outline-offset: 2px`
- **Ring focus** : `ring-[3px] ring-ring/50` (3px opacity 50%)
- **ARIA invalid** : `ring-destructive/20 border-destructive`

### Scrollbar
- Hidden scrollbar pour scrollers horizontaux : `.scrollbar-none`
- iOS zoom prevention : `font-size: 16px` sur les inputs mobile

### Taille des polices mobile
```css
@media (max-width: 767px) {
  input, textarea, select { font-size: 16px; }
}
```

---

## 19. UTILISATION PAR COMPOSANT

### Dashboard Layout

```tsx
<div className="min-h-screen bg-background">
  <Sidebar />
  <main className="lg:pl-[260px]">
    <header className="sticky top-0 z-30 glass-header border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center">
        <!-- Contenu header -->
      </div>
    </header>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <!-- Contenu page -->
    </div>
  </main>
</div>
```

### Admin Panel

```tsx
<div className="space-y-6">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">Titre</h1>
    <p className="text-sm text-muted-foreground mt-1">Description</p>
  </div>
  <Tabs defaultValue="tab1">
    <TabsList>
      <TabsTrigger>Tab 1</TabsTrigger>
      <TabsTrigger>Tab 2</TabsTrigger>
    </TabsList>
    <TabsContent>
      <!-- Contenu -->
    </TabsContent>
  </Tabs>
</div>
```

### Card Grid Pattern

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
  {items.map(item => (
    <Card key={item.id} className="hover:shadow-soft transition-all duration-200">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-tight">{item.title}</CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <!-- Contenu -->
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 20. DOSSIER DE COMPOSANTS

```
src/
├── components/
│   ├── ui/                    # Composants de base (shadcn/ui)
│   │   ├── button.tsx         # Button + buttonVariants
│   │   ├── card.tsx           # Card, CardHeader, CardTitle, CardContent, CardFooter
│   │   ├── input.tsx          # Input
│   │   ├── textarea.tsx       # Textarea
│   │   ├── select.tsx         # Select, SelectTrigger, SelectContent
│   │   ├── badge.tsx          # Badge + badgeVariants
│   │   ├── tabs.tsx           # Tabs, TabsList, TabsTrigger, TabsContent
│   │   ├── dialog.tsx         # Dialog, DialogContent, DialogOverlay
│   │   ├── sheet.tsx          # Sheet, SheetContent
│   │   ├── checkbox.tsx       # Checkbox
│   │   ├── switch.tsx         # Switch
│   │   ├── scroll-area.tsx    # ScrollArea
│   │   ├── separator.tsx      # Separator
│   │   ├── skeleton.tsx       # Skeleton
│   │   ├── avatar.tsx         # Avatar
│   │   ├── dropdown-menu.tsx  # DropdownMenu
│   │   ├── alert-dialog.tsx   # AlertDialog
│   │   ├── progress.tsx       # Progress
│   │   ├── slider.tsx         # Slider
│   │   ├── spinner.tsx        # Spinner
│   │   └── label.tsx          # Label
│   ├── admin/                 # Composants admin
│   └── announcements/         # Module communications
├── lib/
│   └── utils.ts               # cn() helper (tailwind-merge + clsx)
├── index.css                  # Design tokens + utilities
└── DESIGN_SYSTEM.md           # Ce document
```

---

> **Note :** Ce document est la source de vérité unique pour le design BatiBuild.
> Toute nouvelle interface doit reproduire fidèlement ces tokens, patterns et conventions.
> Ne jamais introduire de nouvelles couleurs, ombres ou styles qui ne figurent pas dans ce document.
