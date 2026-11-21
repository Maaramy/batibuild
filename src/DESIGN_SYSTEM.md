# Batibuild — Material 3 Expressive 2025

Référence du design system appliqué à l’interface web Batibuild.

## 1. Principes

- **Material You / M3 Expressive** : couleurs tonales, formes généreuses, hiérarchie typographique forte, mouvements discrets.
- **Identité Batibuild conservée** : vert forêt, menthe, bleu-vert et chaux/ocre remplacent les gris et violets génériques.
- **Mobile first** : navigation basse adaptative, zones tactiles de 44 px minimum, safe areas iOS/Android WebView, aucun zoom involontaire.
- **Deux thèmes complets** : clair, sombre et mode système via `next-themes` (clé `budgetbati-theme`).
- **Aucune logique métier dans l’UI** : les tokens et primitives changent l’apparence, jamais les calculs, les données Convex, l’auth ou les abonnements.

## 2. Couleurs

Toutes les couleurs sont définies en OKLCH dans `src/index.css` (`:root` et `.dark`) puis exposées à Tailwind via `@theme inline`.

| Rôle | Variables | Usage |
| --- | --- | --- |
| Primaire | `--primary`, `--on-primary`, `--primary-container`, `--on-primary-container` | Actions principales, navigation active, accents |
| Secondaire | `--secondary`, `--secondary-container`, `--on-secondary-container` | Actions secondaires, information |
| Tertiaire | `--tertiary`, `--tertiary-container`, `--on-tertiary-container` | Accents chaux/ocre, badges expressifs |
| Surfaces | `--surface`, `--surface-container-low` → `--surface-container-highest`, `--surface-variant` | Fonds, cartes, menus, feuilles |
| Texte | `--on-surface`, `--on-surface-variant` | Contenu principal et secondaire |
| Contours | `--outline`, `--outline-variant` | Bordures, séparateurs, champs |
| Erreur | `--destructive`, `--error-container`, `--on-error-container` | Erreurs et suppressions |
| Succès | `--success`, `--success-container`, `--success-foreground` | Confirmations |
| Avertissement | `--warning`, `--warning-container`, `--warning-foreground` | Vigilance |
| Info | `--info`, `--info-container`, `--info-foreground` | Information neutre |

Classes Tailwind correspondantes : `bg-primary`, `text-on-primary`, `bg-surface-container`, `border-outline-variant`, `text-error`, `bg-success-container`, etc.

## 3. Typographie

- **Titres** : `Roboto Flex` (`--font-display`), graisses 700–800, interlettrage serré.
- **Texte** : `Roboto` (`--font-sans`), graisses 400–600.
- **Arabe** : `Noto Sans Arabic`.
- **Icônes** : `Material Symbols Rounded`, sous-ensemble local WOFF2 de 44 Ko dans `public/fonts/`.

Échelle utilitaire :

| Classe | Rôle |
| --- | --- |
| `.type-display` | Hero, chiffres marquants |
| `.type-headline` | Titres de page |
| `.type-title` | Titres de section/carte |
| `.label-overline` | Étiquette expressive en majuscules |
| `.type-label` | Libellés de boutons, champs et navigation |

## 4. Formes et élévation

- Cartes : rayon **28 px** (`rounded-[28px]`).
- Champs et zones de saisie : rayon **16 px**.
- Dialogues et bottom sheets : rayon **28 px**, coins supérieurs très arrondis.
- Boutons : pilule complète (`border-radius: 999px`).
- Élévations : `shadow-m3-1`, `shadow-m3-2`, `shadow-m3-3`, plus `.shadow-soft` / `.shadow-soft-lg` pour les compositions marketing.

## 5. Composants

Primitives M3 partagées dans `src/components/ui/material3.tsx` :

- `M3Icon` — icône Material Symbols Rounded, variante remplie.
- `M3Fab` — FAB standard et extended.
- `M3NavigationBar` — navigation basse mobile avec indicateur actif.
- `M3SearchBar` — barre de recherche tonale.
- `M3SegmentedButtons` — sélecteur segmenté (thème, filtres, modes).
- `M3Chip` — puces filtres/statuts.

Primitives shadcn/Radix adaptées :

- `Button` : `filled`, `elevated`, `tonal`, `outline`, `text` + tailles pilule.
- `Card`, `Input`, `Textarea`, `Select`, `Dialog`, `Sheet`, `Tabs`, `Table`, `Switch`, `Slider`, `Progress`, `Badge`, `Skeleton`, `Sonner`.
- `PageHeader`, `Kpi`, `Feedback`, `NotificationCenter`, `HeaderNav`, `Logo`.

## 6. Navigation et layouts

- **Mobile** : barre supérieure compacte, bottom navigation par rôle (client, fournisseur, expert), FAB contextuel, bottom sheets pour les actions secondaires.
- **Desktop** : sidebar rétractable (drawer/rail), top app bar, recherche projet, notifications, menu utilisateur, grille responsive.
- **Routes protégées** : `RequireAuth` conserve le chemin demandé et redirige vers `/auth?returnTo=…`.
- Les tableaux restent défilables horizontalement dans leur conteneur ; les cartes et listes passent en une colonne sur petit écran.

## 7. Mouvement et accessibilité

- Transitions courtes (150–300 ms), entrées douces, états hover/pressed, skeletons.
- `prefers-reduced-motion: reduce` désactive animations, transitions et scroll fluide.
- Focus visible (`outline` primaire), cibles tactiles ≥ 44 px, contrastes tonals on/on-container.
- Safe areas : `env(safe-area-inset-*)`, `viewport-fit=cover`, `interactive-widget=resizes-content`.
- Champs à 16 px minimum sur mobile pour éviter le zoom automatique.

## 8. Vérification

- `bunx tsc -b --noEmit`
- `bunx vitest run`
- `bun convex dev --once` uniquement après une modification sous `src/convex/`.

La suite complète couvre notamment l’auth, les abonnements, les paiements, le DQE, le BIM, les plans, les PDF (dont l’arabe avec Amiri), le suivi de chantier et les gardes de routes.
