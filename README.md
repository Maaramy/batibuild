## Overview

This project uses the following tech stack:
- Vite
- Typescript
- React Router v7 (all imports from `react-router` instead of `react-router-dom`)
- React 19 (for frontend components)
- Tailwind v4 (for styling)
- Shadcn UI (for UI components library)
- Lucide Icons (for icons)
- Convex (for backend & database)
- Convex Auth (for authentication)
- Framer Motion (for animations)
- Three js (for 3d models)

All relevant files live in the 'src' directory.

Use bun for the package manager.

## Setup

This project is set up already and running on a cloud environment, as well as a convex development in the sandbox.

## Environment Variables

The project is set up with project specific CONVEX_DEPLOYMENT and VITE_CONVEX_URL environment variables on the client side.

The convex server has a separate set of environment variables that are accessible by the convex backend.

Currently, these variables include auth-specific keys: JWKS, JWT_PRIVATE_KEY, and SITE_URL.


# Using Authentication (Important!)

You must follow these conventions when using authentication.

## Auth is already set up.

All convex authentication functions are already set up. The auth currently uses email OTP and anonymous users, but can support more.

The email OTP configuration is defined in `src/convex/auth/emailOtp.ts`. DO NOT MODIFY THIS FILE.

Also, DO NOT MODIFY `src/convex/auth.config.ts`. In `src/convex/auth.ts`, the
`Password` provider is configured with `verify: emailOtp`, so any new password
sign-up (and any not-yet-verified sign-in) requires validating the e-mail with
the 6-digit OTP code sent through the same relay as the quick login — the
account stays locked until the code is verified (flow `"email-verification"`).

## Using Convex Auth on the backend

On the `src/convex/users.ts` file, you can use the `getCurrentUser` function to get the current user's data.

## Using Convex Auth on the frontend

The `/auth` page is already set up to use auth. Navigate to `/auth` for all log in / sign up sequences.

You MUST use this hook to get user data. Never do this yourself without the hook:
```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

## Protected Routes

The starter `/dashboard` route is protected with `RequireAuth`, which sends
signed-out users to `/auth?returnTo=<current route>`. Extend that page for the
product's authenticated experience, and reuse `RequireAuth` when adding another
protected route.

## Auth Page

The auth page is defined in `src/pages/Auth.tsx`. Send sign-in and sign-up actions
to `/auth`.

## Authorization

You can perform authorization checks on the frontend and backend.

On the frontend, you can use the `useAuth` hook to get the current user's data and authentication state.

You should also be protecting queries, mutations, and actions at the base level, checking for authorization securely.

## Adding a redirect after auth

The `/auth` route in `src/main.tsx` redirects to `/dashboard` by default. If the
product's main authenticated route is different, update `redirectAfterAuth` to
that route. A validated same-origin `returnTo` query parameter takes priority so
users can resume the protected page they originally requested. Never leave an
authenticated product redirecting back to the public landing page.

## Complete authenticated products

When the requested product implies accounts, a workspace, a dashboard, or other
signed-in functionality, the task is not complete with only a landing page and
auth form. Build the main authenticated experience, protect its route, and verify
that signing in reaches it.

# Frontend Conventions

You will be using the Vite frontend with React 19, Tailwind v4, and Shadcn UI.

Generally, pages should be in the `src/pages` folder, and components should be in the `src/components` folder.

Shadcn primitives are located in the `src/components/ui` folder and should be used by default.

## Page routing

Your page component should go under the `src/pages` folder.

When adding a page, update the react router configuration in `src/main.tsx` to include the new route you just added.

## Shad CN conventions

Follow these conventions when using Shad CN components, which you should use by default.
- Remember to use "cursor-pointer" to make the element clickable
- For title text, use the "tracking-tight font-bold" class to make the text more readable
- Always make apps MOBILE RESPONSIVE. This is important
- AVOID NESTED CARDS. Try and not to nest cards, borders, components, etc. Nested cards add clutter and make the app look messy.
- AVOID SHADOWS. Avoid adding any shadows to components. stick with a thin border without the shadow.
- Avoid skeletons; instead, use the loader2 component to show a spinning loading state when loading data.


## Landing Pages

You must always create good-looking designer-level styles to your application. 
- Make it well animated and fit a certain "theme", ie neo brutalist, retro, neumorphism, glass morphism, etc

Use known images and emojis from online.

If the user is logged in already, show the get started button to say "Dashboard" or "Profile" instead to take them there.

## Responsiveness and formatting

Make sure pages are wrapped in a container to prevent the width stretching out on wide screens. Always make sure they are centered aligned and not off-center.

Always make sure that your designs are mobile responsive. Verify the formatting to ensure it has correct max and min widths as well as mobile responsiveness.

- Always create sidebars for protected dashboard pages and navigate between pages
- Always create navbars for landing pages
- On these bars, the created logo should be clickable and redirect to the index page

## Animating with Framer Motion

You must add animations to components using Framer Motion. It is already installed and configured in the project.

To use it, import the `motion` component from `framer-motion` and use it to wrap the component you want to animate.


### Other Items to animate
- Fade in and Fade Out
- Slide in and Slide Out animations
- Rendering animations
- Button clicks and UI elements

Animate for all components, including on landing page and app pages.

## Three JS Graphics

Your app comes with three js by default. You can use it to create 3D graphics for landing pages, games, etc.


## Colors

You can override colors in: `src/index.css`

This uses the oklch color format for tailwind v4.

Always use these color variable names.

Make sure all ui components are set up to be mobile responsive and compatible with both light and dark mode.

Set theme using `dark` or `light` variables at the parent className.

## Styling and Theming

When changing the theme, always change the underlying theme of the shad cn components app-wide under `src/components/ui` and the colors in the index.css file.

Avoid hardcoding in colors unless necessary for a use case, and properly implement themes through the underlying shad cn ui components.

When styling, ensure buttons and clickable items have pointer-click on them (don't by default).

Always follow a set theme style and ensure it is tuned to the user's liking.

## Toasts

You should always use toasts to display results to the user, such as confirmations, results, errors, etc.

Use the shad cn Sonner component as the toaster. For example:

```
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  )
}
```

Remember to import { toast } from "sonner". Usage: `toast("Event has been created.")`

## Dialogs

Always ensure your larger dialogs have a scroll in its content to ensure that its content fits the screen size. Make sure that the content is not cut off from the screen.

Ideally, instead of using a new page, use a Dialog instead. 

# Using the Convex backend

You will be implementing the convex backend. Follow your knowledge of convex and the documentation to implement the backend.

## The Convex Schema

You must correctly follow the convex schema implementation.

The schema is defined in `src/convex/schema.ts`.

Do not include the `_id` and `_creationTime` fields in your queries (it is included by default for each table).
Do not index `_creationTime` as it is indexed for you. Never have duplicate indexes.


## Convex Actions: Using CRUD operations

When running anything that involves external connections, you must use a convex action with "use node" at the top of the file.

You cannot have queries or mutations in the same file as a "use node" action file. Thus, you must use pre-built queries and mutations in other files.

You can also use the pre-installed internal crud functions for the database:

```ts
// in convex/users.ts
import { crud } from "convex-helpers/server/crud";
import schema from "./schema.ts";

export const { create, read, update, destroy } = crud(schema, "users");

// in some file, in an action:
const user = await ctx.runQuery(internal.users.read, { id: userId });

await ctx.runMutation(internal.users.update, {
  id: userId,
  patch: {
    status: "inactive",
  },
});
```


## Common Convex Mistakes To Avoid

When using convex, make sure:
- Document IDs are referenced as `_id` field, not `id`.
- Document ID types are referenced as `Id<"TableName">`, not `string`.
- Document object types are referenced as `Doc<"TableName">`.
- Keep schemaValidation to false in the schema file.
- You must correctly type your code so that it passes the type checker.
- You must handle null / undefined cases of your convex queries for both frontend and backend, or else it will throw an error that your data could be null or undefined.
- Always use the `@/folder` path, with `@/convex/folder/file.ts` syntax for importing convex files.
- This includes importing generated files like `@/convex/_generated/server`, `@/convex/_generated/api`
- Remember to import functions like useQuery, useMutation, useAction, etc. from `convex/react`
- NEVER have return type validators.


# Build de production

```bash
bun run build   # équivaut à : tsc -b && vite build
```

## Pourquoi le heap V8 est plafonné

Le build tourne dans le **même cgroup de 2 Go** que le serveur de dev Vite et
`convex dev` (≈ 750 Mo à eux deux sur cet environnement). Sans plafond, V8
laisse son tas grandir bien au-delà du jeu de données vivant et le pic du
bundling dépasse la limite : l'OOM killer du cgroup termine alors le processus
(« Killed », **sans** message de V8 — « JavaScript heap out of memory » serait,
lui, un abandon de V8) :

```
rendering chunks...
Killed
✖ 'tsc -b && vite build' failed
```

Mesuré dans cette sandbox sur la commande exacte que la plateforme exécute
(`tsc -b && vite build`, les deux phases l'une après l'autre) :

| | pic du build |
| --- | --- |
| sans plafond, avant les optimisations de graphe | ≈ 1 413 Mo → « Killed » |
| plafonné à 800 Mo, avant les optimisations de graphe | ≈ 1 152 Mo → passe, mais sans marge |
| plafonné à 800 Mo, **avec** les optimisations de graphe (actuel) | ≈ 900 Mo → passe avec ≈ 350 Mo de marge |

Détail du dernier point, chaque phase mesurée séparément sous le plafond (2026-09-28) :

| étape | pic RSS | durée |
| --- | --- | --- |
| `tsc -b` | 882 Mo | ~35 s |
| `vite build` | 898 Mo | ~25 s |

Le plafond est donc appliqué à **deux endroits**, parce que la commande de mise
en production n'est pas celle de `package.json` :

1. **`scripts/build.sh`**, utilisé par `bun run build` (donc aussi par Vercel) :
   `--max-old-space-size=800` exporté pour les deux phases. Le poser dans la
   ligne `build` de `package.json` ne suffirait pas : les plateformes qui
   recopient la commande de build en retirent les préfixes d'environnement.
2. **`scripts/harden-build-bins.mjs`**, lancé par le `postinstall` : la mise en
   production est déployée par la plateforme avec la commande du gabarit Vite
   (`- Running 'tsc -b && vite build' with environment variables …`), qu'elle
   fournit elle-même et qui ne lit donc jamais `package.json`. Le seul point de
   contact qui reste est `node_modules/.bin` : le script y remplace les liens
   `tsc` et `vite` par de petites enveloppes `sh` qui relancent le vrai binaire
   sous le plafond. `vite` n'est plafonné **que** pour la sous-commande
   `build` : le serveur de développement (l'aperçu) garde tout son tas.

Pour mesurer ou ajuster (même variable pour les deux mécanismes) :

```bash
BB_BUILD_HEAP_MB=900 bun run build
```

En dessous de ~700 Mo, V8 abandonne sur « JavaScript heap out of memory » : le
jeu de données vivant du bundling fait ≈ 650-800 Mo. Si un environnement installe
les dépendances avec `--ignore-scripts` (donc sans `postinstall`), le plafond
peut être posé à la main avec `NODE_OPTIONS=--max-old-space-size=800` — à garder
proche du passage, car cette variable s'applique alors à **tous** les processus
Node de la sandbox (serveur de dev, tests), pas seulement au build.

### Périmètre du typecheck frontend

`tsconfig.app.json` exclut `src/convex/**` : le backend a son propre projet
TypeScript (`src/convex/tsconfig.json`), typé à chaque push Convex, et le
laisser dans le programme du navigateur faisait compiler du code serveur
(bcryptjs, nodemailer, SDK tiers) pour ~50 Mo de mémoire en plus. Les modules
donnés au serveur (ex. `src/convex/vlyIntegrations.ts`) vivent dans le projet
Convex pour la même raison : importer `@vly-ai/integrations` depuis le frontend
tirait ~250 modules supplémentaires (SDK AI, zod, @auth/core).

## Ce qui garde le graphe de modules léger

Le pic mémoire du build suit les **octets de source que Rollup doit analyser**,
et les fichiers **minifiés** en coûtent le plus par kilo-octet : un fichier
minifié contient autant de nœuds d'AST qu'un fichier lisible, mais dans beaucoup
moins d'octets. Mesuré sur cette sandbox : environ **240 Mo de pic par méga-octet
de source** pour `xlsx`, environ **145 Mo/Mo** pour `three`. Six optimisations
sont verrouillées par `src/lib/clientBundleGuards.test.ts` :

| Optimisation | Fichier | Effet mesuré |
| --- | --- | --- |
| Vendeurs feuilles **hors du graphe** (`three`, `xlsx`) | `scripts/vendor-externals-plugin.ts` | **−207 Mo** : copiés tels quels dans `dist/vendor/` et résolus par une carte d'importation, ils ne sont plus analysés par Rollup |
| Plafond d'opérations de fichier Rollup | `vite.config.ts` (`maxParallelFileOps: 4`) | **−30 Mo** pendant l'écriture des chunks |
| Icônes lucide : alias `lucide-react` → shim | `vite.config.ts` → `src/lib/lucide-shim.js` | évite de parser les ~1 900 modules du barrel (219 icônes utilisées seulement) |
| Dépendances optionnelles de jsPDF aliasées vers un stub explicite | `vite.config.ts` → `src/lib/pdfHtmlUnsupported.ts` | `html2canvas` / `canvg` / `dompurify` ne servent qu'à `doc.html()`, jamais utilisé (~216 modules morts, dont 206 `core-js`) |
| Constantes fournisseurs hors du schéma Convex | `src/lib/supplierSpecialties.ts` (réexporté par `src/convex/schema.ts`) | importait sinon tout l'arbre serveur (`@convex-dev/auth/server`) depuis 6 fichiers client |
| Routes en `React.lazy` | `src/main.tsx` | garde `three`, `xlsx`, `jspdf`, `recharts` hors du chunk d'entrée |

### Vendeurs servis hors bundle (carte d'importation)

`three` (vue de plan 3D) et `xlsx` (export/import Excel de l'administration) sont
**marqués externes** : Rollup conserve `import … from "three"` dans les chunks au
lieu de charger et d'analyser le paquet, et la plateforme de build n'a donc plus
ces 2,9 Mo de source à parser. Les fichiers officiels minifiés sont recopiés dans
`dist/vendor/` et une **carte d'importation** (`<script type="importmap">`,
injectée en tête de `<head>`, donc avant tout script `type="module"`) indique au
navigateur où les trouver. Le chargement reste **différé** : `three` n'est
téléchargé que lorsque l'utilisateur ouvre la vue 3D, `xlsx` que lorsqu'il lance
un export ou un import Excel.

Pourquoi seulement ces deux-là, alors que `jspdf` (−118 Mo) et `recharts`
(−156 Mo) coûtent plus cher encore ?

- **`jspdf`** a été essayé et **abandonné** : un vendeur hors bundle ne peut plus
  compter sur Rollup pour résoudre ses propres imports, et sa cascade
  (`fflate`, `fast-png` → `iobuffer` + `pako`, plus deux helpers
  `@babel/runtime`) utilise des imports **relatifs sans extension** — convention
  de bundler, invalide dans un navigateur. L'externaliser exigerait de réécrire
  du code tiers au moment de la copie, pour un gain dont le build n'a plus
  besoin ;
- **`recharts`** et **`framer-motion`** dépendent de React : une seconde instance
  casserait les hooks au runtime (même raison que `resolve.dedupe` dans
  `vite.config.ts`).

Le test « chaque import d'un vendeur émis est résolu par un fichier émis ou par
la carte » échoue si l'un de ces cas est introduit : c'est lui qui a révélé la
cascade de `jspdf` décrite ci-dessus, au lieu de la supposer absente.

**Si un vendeur est mis à jour** et que ses fichiers changent de nom, les tests
de `clientBundleGuards.test.ts` échouent (fichier source absent, entrée de carte
sans cible émise, import non résolu) — le build casse AVANT la production, jamais
en silence dans le navigateur.

⚠️ Si `doc.html()` devient nécessaire un jour, il faut retirer les alias
`html2canvas` / `canvg` / `dompurify` de `vite.config.ts` : le stub lève une
erreur explicite et les tests ci-dessus échouent pour le rappeler.
