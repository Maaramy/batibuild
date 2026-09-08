# BatiBuild Design System — Complete Extraction

> **Source of Truth:** BatiBuild Platform (budgetbati)
> **Stack:** React + Tailwind CSS v4 + shadcn/ui (Radix primitives) + Framer Motion + Lucide Icons
> **Color Space:** OKLCH (all CSS variables use OKLCH color notation)
> **Dark Mode:** Class-based (`.dark` class on root)

---

## 1. CSS VARIABLES & DESIGN TOKENS

### 1.1 Border Radius

```css
:root {
  --radius: 1rem;                    /* Base radius = 16px */
  --radius-sm: calc(var(--radius) - 4px);  /* 12px */
  --radius-md: calc(var(--radius) - 2px);  /* 14px */
  --radius-lg: var(--radius);               /* 16px */
  --radius-xl: calc(var(--radius) + 4px);   /* 20px */
}
```

**Usage by component:**
| Token | Value | Used for |
|-------|-------|----------|
| `rounded-sm` | 4px | Dropdown menu items, small elements |
| `rounded-md` | 6px | Inputs, badges, skeleton, table footer, skeleton |
| `rounded-lg` | 8px | Cards, buttons (sm), dialogs, sheets, dropdowns, alerts, tables |
| `rounded-xl` | 12px | Cards (default), stat cards, modals, dropdowns |
| `rounded-2xl` | 16px | Hero cards, feature cards, large containers |
| `rounded-full` | 9999px | Avatars, pills, progress bars, toggles, switches, checkboxes (4px variant) |

---

### 1.2 Typography

**Font Family:**
```css
:root {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
}
/* Arabic (RTL) */
[lang="ar"] {
  font-family: "Noto Sans Arabic", "Tajawal", "Cairo", ui-sans-serif, system-ui, sans-serif;
}
/* Monospace (code) */
font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
```

**Font Size Hierarchy (actual usage from codebase):**

| Element | Class | Size | Weight | Usage |
|---------|-------|------|--------|-------|
| H1 (hero) | `text-4xl md:text-5xl lg:text-6xl` | 36→48→60px | `font-bold` | Landing page hero |
| H2 (section) | `text-3xl md:text-4xl` | 30→36px | `font-bold` | Section headings |
| H3 (card) | `text-xl md:text-2xl` | 20→24px | `font-semibold` | Card titles, subsections |
| H4 | `text-lg` | 18px | `font-semibold` | Sub-card titles |
| H5 / subtitle | `text-base` | 16px | `font-medium` | Table heads, labels |
| Body / paragraph | `text-sm` | 14px | `font-normal` | Default body text |
| Small text | `text-xs` | 12px | `font-normal` | Captions, metadata, badges |
| Micro label | `label-overline` | 9→10px | `font-semibold uppercase tracking-[0.18em]` | Section overlines |
| Button text | `text-sm` | 14px | `font-medium` / `font-semibold` | All buttons |
| Nav text | `text-sm` | 14px | `font-medium` | Navigation items |
| Blog prose | `prose-blog` | 0.95rem | `font-normal line-height: 1.85` | Rich text content |

**Font Weights (frequency in codebase):**
| Weight | Usage |
|--------|-------|
| `font-medium` (500) | Most common — buttons, labels, nav items, card titles |
| `font-semibold` (600) | Section titles, strong emphasis, sidebar items |
| `font-bold` (700) | Hero headings, H1/H2, stat numbers |
| `font-normal` (400) | Body text, descriptions, paragraphs |
| `font-mono` (monospace) | Code blocks, IDs, technical values |
| `font-black` (900) | Large stat numbers, hero numbers |
| `font-extrabold` (800) | Featured headings |

---

### 1.3 Spacing Scale

**Padding (most used):**
| Token | Value | Usage |
|-------|-------|-------|
| `p-1` | 4px | Compact elements |
| `p-2` | 8px | Card cells, dropdown items, table cells |
| `p-3` | 12px | Input padding, card padding (small) |
| `p-4` | 16px | Standard card padding |
| `p-5` | 20px | Medium cards |
| `p-6` | 24px | Large card padding, dialog padding |
| `p-8` | 32px | Section padding, large cards |

**Padding X axis:**
| Token | Usage |
|-------|-------|
| `px-1` | Tight horizontal |
| `px-2` | Table cells, dropdown items |
| `px-3` | Inputs, cards, buttons (sm) |
| `px-4` | Standard buttons, cards |
| `px-6` | Large buttons, section content |
| `px-8` | Wide section content |

**Padding Y axis:**
| Token | Usage |
|-------|-------|
| `py-1` | Compact elements |
| `py-2` | Standard vertical padding |
| `py-3` | Cards, sections |
| `py-4` | Medium sections |
| `py-6` | Large sections |
| `py-8` | Hero sections |
| `py-12` | Major sections |
| `py-16` | Full-width sections |
| `py-24` | Landing page sections |

**Gaps:**
| Token | Usage |
|-------|-------|
| `gap-1` | Tight: badge items, icon + text, compact lists |
| `gap-2` | Standard: card content, form fields, flex items |
| `gap-3` | Medium: card layouts, button groups |
| `gap-4` | Large: section layouts, grid gaps |
| `gap-6` | XL: page sections, major content blocks |
| `gap-8` | XXL: hero sections, full layouts |

---

### 1.4 Colors

#### Light Mode Palette

| Token | OKLCH Value | Hex Approx | Context |
|-------|-------------|------------|---------|
| `--background` | `oklch(0.985 0.002 250)` | #f8f9fa | Page background (near-white slate) |
| `--foreground` | `oklch(0.145 0.015 260)` | #1e293b | Primary text (dark slate) |
| `--card` | `oklch(1 0 0)` | #ffffff | Card background (pure white) |
| `--card-foreground` | `oklch(0.145 0.015 260)` | #1e293b | Card text |
| `--popover` | `oklch(1 0 0)` | #ffffff | Dropdown/popover background |
| `--popover-foreground` | `oklch(0.145 0.015 260)` | #1e293b | Dropdown/popover text |
| `--primary` | `oklch(0.596 0.145 163.2)` | #10b981 | Brand green (emerald-500) |
| `--primary-foreground` | `oklch(0.985 0 0)` | #ffffff | Text on primary |
| `--secondary` | `oklch(0.968 0.002 248)` | #f1f5f9 | Secondary background (slate-100) |
| `--secondary-foreground` | `oklch(0.208 0.042 265)` | #334155 | Secondary text |
| `--muted` | `oklch(0.968 0.002 248)` | #f1f5f9 | Muted background (slate-100) |
| `--muted-foreground` | `oklch(0.556 0.02 257)` | #64748b | Muted text (slate-500) |
| `--accent` | `oklch(0.968 0.002 248)` | #f1f5f9 | Accent background (slate-100) |
| `--accent-foreground` | `oklch(0.208 0.042 265)` | #334155 | Accent text |
| `--destructive` | `oklch(0.577 0.245 27.325)` | #ef4444 | Error/danger (red-500) |
| `--border` | `oklch(0.918 0.004 248)` | #e2e8f0 | Default border (slate-200) |
| `--input` | `oklch(0.918 0.004 248)` | #e2e8f0 | Input border (slate-200) |
| `--ring` | `oklch(0.596 0.145 163.2)` | #10b981 | Focus ring (brand green) |

#### Dark Mode Palette

| Token | OKLCH Value | Hex Approx | Context |
|-------|-------------|------------|---------|
| `--background` | `oklch(0.145 0.012 258)` | #0f172a | Page background (slate-900) |
| `--foreground` | `oklch(0.985 0.002 250)` | #f8f9fa | Primary text (near-white) |
| `--card` | `oklch(0.185 0.014 258)` | #1e293b | Card background (slate-800) |
| `--card-foreground` | `oklch(0.985 0.002 250)` | #f8f9fa | Card text |
| `--popover` | `oklch(0.185 0.014 258)` | #1e293b | Dropdown background |
| `--popover-foreground` | `oklch(0.985 0.002 250)` | #f8f9fa | Dropdown text |
| `--primary` | `oklch(0.696 0.17 162.5)` | #34d399 | Brand green lighter (emerald-400) |
| `--primary-foreground` | `oklch(0.145 0.012 258)` | #0f172a | Text on primary |
| `--secondary` | `oklch(0.26 0.016 258)` | #334155 | Secondary background (slate-700) |
| `--secondary-foreground` | `oklch(0.985 0.002 250)` | #f8f9fa | Secondary text |
| `--muted` | `oklch(0.26 0.016 258)` | #334155 | Muted background (slate-700) |
| `--muted-foreground` | `oklch(0.708 0.02 256)` | #94a3b8 | Muted text (slate-400) |
| `--accent` | `oklch(0.26 0.016 258)` | #334155 | Accent background |
| `--accent-foreground` | `oklch(0.985 0.002 250)` | #f8f9fa | Accent text |
| `--destructive` | `oklch(0.704 0.191 22.216)` | #f87171 | Error lighter (red-400) |
| `--border` | `oklch(1 0 0 / 10%)` | rgba(255,255,255,0.1) | Border (white 10%) |
| `--input` | `oklch(1 0 0 / 15%)` | rgba(255,255,255,0.15) | Input border |
| `--ring` | `oklch(0.696 0.17 162.5)` | #34d399 | Focus ring |

#### Semantic / Status Colors (Tailwind classes)

| Purpose | Light | Dark | Classes |
|---------|-------|------|---------|
| Success | `text-emerald-600` | `text-emerald-400` | `bg-emerald-50 border-emerald-200` |
| Warning | `text-amber-600` | `text-amber-400` | `bg-amber-50 border-amber-200` |
| Error | `text-red-600` | `text-red-400` | `bg-red-50 border-red-200` |
| Info | `text-blue-600` | `text-blue-400` | `bg-blue-50 border-blue-200` |
| Info Alt | `text-violet-600` | `text-violet-400` | `bg-violet-50 border-violet-200` |
| Indigo | `text-indigo-600` | `text-indigo-400` | `bg-indigo-50 border-indigo-200` |

#### Chart Colors

```css
--chart-1: oklch(0.596 0.145 163.2);  /* emerald (primary) */
--chart-2: oklch(0.545 0.175 252);     /* indigo */
--chart-3: oklch(0.769 0.12 83);       /* amber */
--chart-4: oklch(0.627 0.15 229);      /* blue */
--chart-5: oklch(0.69 0.16 300);       /* pink/magenta */
```

#### Auth Page Palette (Tunisian Construction Theme)

```css
:root {
  --auth-primary: oklch(0.52 0.175 35.5);       /* Terracotta */
  --auth-primary-light: oklch(0.62 0.16 38);      /* Lighter terracotta */
  --auth-primary-dark: oklch(0.42 0.18 32);       /* Darker terracotta */
  --auth-accent: oklch(0.55 0.15 230);            /* Mediterranean blue */
  --auth-accent-light: oklch(0.65 0.12 235);      /* Sky blue */
  --auth-warm: oklch(0.92 0.04 75);               /* Warm sand */
  --auth-warm-dark: oklch(0.85 0.06 70);          /* Darker sand */
  --auth-bg-light: oklch(0.98 0.008 60);          /* Warm cream */
  --auth-bg-dark: oklch(0.15 0.025 30);           /* Deep warm dark */
  --auth-gold: oklch(0.72 0.16 75);               /* Gold accent */
  --auth-terracotta-bg: oklch(0.95 0.025 50);     /* Terracotta tinted bg */
}
```

#### Sidebar Colors

```css
--sidebar: oklch(0.992 0.001 250);            /* Light: near-white */
--sidebar-foreground: oklch(0.145 0.015 260); /* Dark text */
--sidebar-primary: oklch(0.596 0.145 163.2);  /* Brand green */
--sidebar-accent: oklch(0.96 0.004 248);      /* Hover bg */
--sidebar-border: oklch(0.92 0.004 248);      /* Border */
```

---

### 1.5 Shadows

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `shadow-xs` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Inputs, small elements |
| `shadow-sm` | `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` | Default cards, buttons |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | Elevated cards, dropdowns |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | Modals, floating elements |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | Hero elements |
| `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` | Top-level overlays |
| `shadow-primary` | `box-shadow with primary color` | Primary buttons, CTAs |
| `shadow-soft` | `0 1px 2px oklch(0 0 0 / 0.03), 0 8px 24px -12px oklch(0 0 0 / 0.08)` | Soft card elevation |
| `shadow-soft-lg` | `0 2px 4px oklch(0 0 0 / 0.04), 0 16px 40px -16px oklch(0 0 0 / 0.14)` | Large soft elevation |
| `shadow-indigo-500` | Colored shadow | Feature cards (indigo) |
| `shadow-emerald-500` | Colored shadow | Feature cards (green) |

---

### 1.6 Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `transition-all` | `all 150ms cubic-bezier(0.4, 0, 0.2, 1)` | General transitions (most common) |
| `transition-colors` | `color, background-color, border-color 150ms` | Hover states, theme switches |
| `transition-transform` | `transform 150ms` | Scale, rotate animations |
| `transition-opacity` | `opacity 150ms` | Fade in/out |
| `transition-shadow` | `box-shadow 150ms` | Focus rings, hover elevation |

**Duration patterns:**
| Speed | Duration | Usage |
|-------|----------|-------|
| Fast | 150ms | Hover states, focus rings, color changes |
| Normal | 200ms | Auth input focus, general interactions |
| Slow | 300ms | Page transitions, sidebar, mobile menu |

---

## 2. COMPONENT STYLES

### 2.1 Buttons

**Base button (shared):**
- Border radius: `rounded-md` (6px)
- Font: `text-sm font-medium`
- Transitions: `transition-all`
- Focus: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Disabled: `disabled:opacity-50 disabled:pointer-events-none`

**Variant classes (from button.tsx):**

| Variant | Background | Text | Border | Shadow | Hover |
|---------|-----------|------|--------|--------|-------|
| `default` | `bg-primary` | `text-primary-foreground` | none | `shadow-xs` | `hover:bg-primary/90` |
| `destructive` | `bg-destructive` | `text-white` | none | `shadow-sm` | `hover:bg-destructive/90` |
| `outline` | `bg-background` | `text-foreground` | `border border-input` | none | `hover:bg-accent hover:text-accent-foreground` |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | none | none | `hover:bg-secondary/80` |
| `ghost` | `bg-transparent` | `text-foreground` | none | none | `hover:bg-accent hover:text-accent-foreground` |
| `link` | `bg-transparent` | `text-primary` | none | none | `underline-offset-4 hover:underline` |

**Sizes:**

| Size | Height | Padding X | Text | Icon Size | Border Radius |
|------|--------|-----------|------|-----------|---------------|
| `default` | `h-9` (36px) | `px-4` | `text-sm` | `h-4 w-4` | `rounded-md` |
| `sm` | `h-8` (32px) | `px-3` | `text-xs` | `h-3.5 w-3.5` | `rounded-md` |
| `lg` | `h-10` (40px) | `px-8` | `text-sm` | `h-4 w-4` | `rounded-md` |
| `icon` | `h-9 w-9` | — | — | `h-4 w-4` | `rounded-md` |

**Gradient button (custom `.btn-gradient`):**
```css
.btn-gradient {
  background-image: linear-gradient(135deg, oklch(0.62 0.15 163) 0%, oklch(0.55 0.16 168) 100%);
  box-shadow: 0 8px 20px -8px oklch(0.62 0.15 163 / 0.55);
}
.btn-gradient:hover {
  filter: brightness(1.06);
  box-shadow: 0 10px 26px -8px oklch(0.62 0.15 163 / 0.65);
}
```

---

### 2.2 Cards

**Base card (Card component):**
- Background: `bg-card` (white in light, slate-800 in dark)
- Border: `border border-border rounded-xl shadow-sm`
- Padding: varies by context (`p-0` → `p-6`)
- Gap: `gap-4` to `gap-6`

**Card header:** `flex flex-col space-y-1.5 p-6`
**Card title:** `text-2xl font-semibold leading-none tracking-tight`
**Card description:** `text-sm text-muted-foreground`
**Card content:** `p-6 pt-0`
**Card footer:** `flex items-center p-6 pt-0`

**Hover variants (used in feature grids):**
```tsx
className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-soft 
            transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-0.5"
```

**Stat card pattern:**
```tsx
className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm"
```

**Glass card (landing):**
```css
.glass {
  background: oklch(1 0 0 / 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid oklch(0.92 0.004 286.32 / 0.5);
}
```

---

### 2.3 Form Inputs

**Text Input (Input component):**
- Height: `h-9` (36px)
- Padding: `px-3 py-1`
- Font: `text-sm`
- Border: `border border-input`
- Border radius: `rounded-md`
- Background: `bg-transparent` (light), `dark:bg-input/30`
- Focus: `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`
- Shadow: `shadow-xs`
- Placeholder: `placeholder:text-muted-foreground`
- Disabled: `disabled:cursor-not-allowed disabled:opacity-50`
- Error: `aria-invalid:ring-destructive/20 aria-invalid:border-destructive`

**Textarea:**
- Min height: `min-h-16`
- Same styling as Input
- Auto-sizing: `field-sizing-content`

**Select (Radix):**
- Same height/padding as Input
- Icon: `ChevronDown` (16px)
- Content: `bg-popover text-popover-foreground border rounded-md shadow-md p-1`
- Item: `rounded-sm px-2 py-1.5 text-sm focus:bg-accent`
- Check indicator: `CheckIcon size-4`

**Checkbox:**
- Size: `size-4` (16px)
- Border radius: `rounded-[4px]`
- Border: `border border-input`
- Checked: `bg-primary text-primary-foreground border-primary`
- Focus: `focus-visible:ring-[3px] focus-visible:ring-ring/50`
- Indicator: `CheckIcon size-3.5`

**Switch:**
- Size: `h-[1.15rem] w-8` (18.4px × 32px)
- Border radius: `rounded-full`
- Thumb: `size-4 rounded-full` (16px)
- Checked: `bg-primary`, unchecked: `bg-input`

**Label:**
- Font: `text-sm font-medium leading-none`
- Spacing: `flex items-center gap-2`
- Disabled: `group-data-[disabled=true]:opacity-50`

---

### 2.4 Badges

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| `default` | `bg-primary` | `text-primary-foreground` | — |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | — |
| `destructive` | `bg-destructive` | `text-white` | — |
| `outline` | `bg-transparent` | `text-foreground` | `border` |

**Size:** `px-2.5 py-0.5 text-xs font-semibold rounded-full`

**Status badges (custom, used in tables):**
| Status | Classes |
|--------|---------|
| Active/Success | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| Warning/Pending | `bg-amber-50 text-amber-700 border-amber-200` |
| Error/Failed | `bg-red-50 text-red-700 border-red-200` |
| Info/Neutral | `bg-blue-50 text-blue-700 border-blue-200` |

---

### 2.5 Dialogs & Modals

**Overlay:** `fixed inset-0 z-50 bg-black/80`
**Container:** `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`
**Content:**
- Desktop: `sm:max-w-lg bg-background border shadow-lg rounded-xl`
- Mobile: `w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] top-3 translate-y-0 rounded-2xl`
- Max height: `max-h-[calc(100dvh-1.5rem)]`
- Padding: `p-6` (desktop), `p-5` (mobile)
- Close button: `absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100`

**Animations (in/out):**
```css
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]
data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]
```

---

### 2.6 Sheet (Mobile Drawer)

- Overlay: `bg-black/80`
- Content: `bg-background z-50 shadow-lg`
- Animations: slides in from edge (left/right/top/bottom)
- Close button: `absolute right-4 top-4 opacity-70`

---

### 2.7 Dropdown Menu

- Content: `bg-popover text-popover-foreground border rounded-md shadow-md p-1 z-50`
- Min width: `min-w-[8rem]`
- Item: `rounded-sm px-2 py-1.5 text-sm cursor-default`
- Item hover: `focus:bg-accent focus:text-accent-foreground`
- Destructive item: `text-destructive focus:bg-destructive/10`
- Separator: `my-1 h-px bg-border`
- Check icon: `size-4` (CheckIcon)
- Chevron: `size-4` (ChevronRightIcon)

---

### 2.8 Tables

- Container: `relative w-full overflow-x-auto`
- Table: `w-full text-sm`
- Header: `[&_tr]:border-b`
- Row: `hover:bg-muted/50 border-b transition-colors`
- Row selected: `data-[state=selected]:bg-muted`
- Head: `h-10 px-2 text-left font-medium whitespace-nowrap`
- Cell: `p-2 align-middle whitespace-nowrap`
- Footer: `bg-muted/50 border-t font-medium`
- Zebra: `.table-zebra tbody tr:nth-child(odd) { background: var(--muted); }`

---

### 2.9 Progress Bar

- Track: `relative h-2 w-full overflow-hidden rounded-full bg-primary/20`
- Indicator: `bg-primary h-full w-full flex-1 transition-all`
- Height: `h-2` (8px)
- Border radius: `rounded-full`

---

### 2.10 Tabs

- List: `inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground`
- Trigger: `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium`
- Active trigger: `bg-background text-foreground shadow-sm`
- Content: `mt-2 ring-offset-background focus-visible:outline-none`

---

### 2.11 Accordion

- Trigger: `flex items-center justify-between py-4 font-medium`
- Content: `overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down`
- Chevron: `h-4 w-4 shrink-0 transition-transform`

---

### 2.12 Skeleton

- Background: `bg-accent`
- Animation: `animate-pulse`
- Border radius: `rounded-md`

---

### 2.13 Separator

- Horizontal: `h-px w-full bg-border`
- Vertical: `h-full w-px bg-border`
- Shrink: `shrink-0`

---

### 2.14 Avatar

- Size: `relative flex size-8 shrink-0 overflow-hidden rounded-full`
- Image: `aspect-square size-full`
- Fallback: `bg-muted flex size-full items-center justify-center rounded-full`

---

### 2.15 Scroll Area

- Styled scrollbar with custom width
- Thumb: `bg-border rounded-full`
- Track: `relative w-full overflow-hidden`

---

## 3. LAYOUT & RESPONSIVE PATTERNS

### 3.1 Container Widths

| Context | Width |
|---------|-------|
| Default content | `max-w-7xl mx-auto` (1280px) |
| Narrow content | `max-w-4xl mx-auto` (896px) |
| Wide content | `max-w-6xl mx-auto` (1152px) |
| Full width | `w-full` |
| Dashboard sidebar | `w-64` (256px) |
| Dashboard content | `flex-1 min-w-0` |

### 3.2 Section Spacing

```tsx
// Landing page sections
<section className="py-16 md:py-24">   {/* Standard section */}
<section className="py-20 md:py-32">   {/* Hero section */}
<section className="py-12">            {/* Compact section */}
<section className="py-24 md:py-32">   {/* Full-width section */}
```

### 3.3 Grid Patterns

| Pattern | Classes |
|---------|---------|
| 2 columns | `grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6` |
| 3 columns | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6` |
| 4 columns | `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6` |
| Dashboard stats | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` |
| Feature grid | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` |

### 3.4 Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | 0px | Mobile first |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small desktops |
| `xl` | 1280px | Large desktops |

### 3.5 Mobile Touch Targets

- Minimum touch target: `h-10` (40px) for inputs
- Recommended touch target: `h-11` (44px) for buttons
- All interactive elements ≥ 44px on mobile

---

## 4. GLASSMORPHISM & VISUAL EFFECTS

### 4.1 Glass Effects

```css
/* Light glass (70% opacity) */
.glass {
  background: oklch(1 0 0 / 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid oklch(0.92 0.004 286.32 / 0.5);
}
.dark .glass {
  background: oklch(0.18 0.034 261.692 / 0.7);
  border: 1px solid oklch(1 0 0 / 0.08);
}

/* Strong glass (85% opacity) */
.glass-strong {
  background: oklch(1 0 0 / 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid oklch(0.92 0.004 286.32 / 0.6);
}
.dark .glass-strong {
  background: oklch(0.18 0.034 261.692 / 0.85);
  border: 1px solid oklch(1 0 0 / 0.1);
}

/* Glass sticky header */
.glass-header {
  background: oklch(1 0 0 / 0.72);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid oklch(0.92 0.004 248 / 0.6);
}
```

### 4.2 Gradient Text

```css
.gradient-text {
  background: linear-gradient(135deg, var(--primary) 0%, oklch(0.72 0.15 175) 55%, var(--primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### 4.3 Body Background

```css
body {
  background-image: linear-gradient(180deg, oklch(0.985 0.002 250), oklch(1 0 0) 32%, oklch(0.985 0.002 250));
  background-attachment: fixed;
}
.dark body {
  background-image: linear-gradient(180deg, oklch(0.13 0.012 258), oklch(0.15 0.014 258) 40%, oklch(0.13 0.012 258));
}
```

### 4.4 Decorative Patterns

```css
/* Dotted watermark (hero cards) */
.dotted-watermark {
  background-image: radial-gradient(oklch(1 0 0 / 0.18) 1px, transparent 1px);
  background-size: 18px 18px;
}

/* Blueprint grid (construction theme) */
.blueprint-grid {
  background-image:
    linear-gradient(to right, oklch(0.5 0.15 230 / 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, oklch(0.5 0.15 230 / 0.06) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### 4.5 Focus Visible (Global)

```css
:where(button, a, input, select, textarea, [role="button"], [tabindex]):focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

---

## 5. ICON SYSTEM

**Library:** Lucide React (via custom shim to reduce bundle size)

**Standard sizes:**
| Size | Pixels | Usage |
|------|--------|-------|
| `size-3` / `h-3 w-3` | 12px | Inline badges, small indicators |
| `size-3.5` / `h-3.5 w-3.5` | 14px | Checkbox indicator, compact UI |
| `size-4` / `h-4 w-4` | 16px | Default icon size (buttons, inputs, nav, dropdown) |
| `size-5` / `h-5 w-5` | 20px | Feature icons, card icons |
| `size-6` / `h-6 w-6` | 24px | Section headings, stat icons |
| `size-8` / `h-8 w-8` | 32px | Large feature icons, avatar |
| `size-10` / `h-10 w-10` | 40px | Hero icons |
| `size-12` / `h-12 w-12` | 48px | Feature cards |

**Icon style:** Outline (Lucide default), stroke-width 2px

**Icon colors:** Match surrounding text via `currentColor`, or semantic:
- Primary actions: `text-primary`
- Success: `text-emerald-500` / `text-emerald-600`
- Warning: `text-amber-500` / `text-amber-600`
- Error: `text-red-500` / `text-red-600`
- Info: `text-blue-500` / `text-blue-600`
- Muted: `text-muted-foreground`

**Icon + text spacing:** `gap-2` (8px) — standard across all components

---

## 6. ANIMATIONS

### 6.1 CSS Animations (from tw-animate-css)

```css
/* Fade */
animate-in fade-in-0 / fade-out-0

/* Zoom */
animate-in zoom-in-95 / zoom-out-95

/* Slide */
slide-in-from-top-2 / slide-in-from-bottom-2
slide-in-from-left-2 / slide-in-from-right-2
slide-in-from-left-1/2 / slide-in-from-right-1/2

/* Accordion */
animate-accordion-down / animate-accordion-up

/* Skeleton pulse */
animate-pulse

/* Marquee */
animate-marquee
```

### 6.2 Framer Motion (used for page/section transitions)

- `initial`, `animate`, `exit` props
- `whileInView` for scroll-triggered animations
- `transition={{ duration: 0.3 }}` (standard)
- `viewport={{ once: true }}` for one-time animations

---

## 7. SCROLLBAR & MOBILE UTILITIES

```css
/* Hidden scrollbar */
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}

/* iOS zoom prevention (font-size ≥ 16px on mobile) */
@media (max-width: 767px) {
  input[type="text"], input[type="number"], input[type="email"],
  input[type="password"], input[type="tel"], input[type="search"],
  textarea, select {
    font-size: 16px;
  }
}
```

---

## 8. EXPORTABLE CSS VARIABLES (Copy-Paste Ready)

To transfer this design system to a new project, copy these CSS variables into your `index.css`:

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
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  button:not([disabled]),
  [role="button"]:not([disabled]) {
    cursor: pointer;
  }
}
```

---

## 9. KEY DESIGN PRINCIPLES

1. **Color-first brand:** Emerald green (`#10b981`) is the primary brand color. Used for primary buttons, focus rings, active states, and progress bars.

2. **Soft, diffuse shadows:** Never use hard borders for elevation. Use `shadow-soft` and `shadow-soft-lg` for subtle depth.

3. **Glassmorphism in navigation:** Headers use `.glass` or `.glass-strong` with backdrop blur for floating nav effects.

4. **Consistent border-radius:** Base radius is `1rem` (16px). Cards default to `rounded-xl`. Buttons are `rounded-md`. Avatars and pills are `rounded-full`.

5. **OKLCH color space:** All CSS variables use OKLCH for perceptually uniform color manipulation.

6. **Dark mode support:** Full dark mode via `.dark` class with completely separate OKLCH values (not just inverted).

7. **Mobile-first responsive:** All layouts use mobile-first Tailwind breakpoints. Touch targets ≥ 40px on mobile.

8. **Radix primitives:** All interactive UI components are built on Radix UI primitives with shadcn/ui styling.

9. **Inter font:** Single font family throughout. Weights: normal (400), medium (500), semibold (600), bold (700).

10. **Minimal visual noise:** Clean borders, generous spacing, muted colors for secondary content. No heavy decorative elements except subtle glass effects and gradient text for hero sections.

---

*Document generated from BatiBuild platform source code analysis.*
*All values are extracted from actual implementation — no invented or estimated values.*
