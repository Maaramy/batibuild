// VLY Integrations Configuration
// See /integrations.md for usage documentation
//
// Ce module est SERVEUR uniquement : `vly` n'est utilisé que par les actions
// Convex « use node » (emailSender, investmentAi). Il vit
// donc dans le projet Convex (`src/convex/tsconfig.json`), typechecké par
// `convex dev`, et non dans le projet frontend — importer `@vly-ai/integrations`
// (SDK AI, zod, @auth/core, ~250 modules) depuis le programme TypeScript du
// navigateur alourdissait inutilement `tsc -b` (pic mémoire du build).

import { createVlyIntegrations } from '@vly-ai/integrations';

export const vly = createVlyIntegrations({
  deploymentToken: process.env.VLY_INTEGRATION_KEY!,
  debug: process.env.NODE_ENV === 'development'
});
