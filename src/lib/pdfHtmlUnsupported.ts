// ============================================================================
// Stub des dépendances OPTIONNELLES de jsPDF : `html2canvas`, `canvg`,
// `dompurify`.
//
// Ces trois paquets ne sont importés par jsPDF que depuis `doc.html()`
// (conversion HTML → PDF). Batibuild n'appelle JAMAIS `doc.html()` : tous les
// rapports PDF sont construits programmatiquement — texte, tableaux
// (`jspdf-autotable`), images PNG (`addImage`) — comme le documente
// `src/lib/projectPdf.ts` (« no html2canvas »).
//
// Pourquoi ce stub : jsPDF ne charge ces paquets que par `import()`
// dynamique, donc Rollup les transforme et les rend malgré tout.
// `canvg` embarquait à lui seul ~206 modules `core-js` (+ `html2canvas`,
// `dompurify`, `rgbcolor`, `stackblur-canvas`, `svg-pathdata`, `raf`) — soit
// ~216 modules morts dans le graphe de build, et un pic mémoire de bundling
// nettement plus élevé dans la sandbox de build à mémoire limitée.
//
// Ce stub n'est atteint QUE si quelqu'un appelle `doc.html()` : dans ce cas
// l'erreur ci-dessous est explicite (jamais un échec silencieux). Si un jour
// `doc.html()` est réellement utilisé, il faut retirer les alias
// `html2canvas` / `canvg` / `dompurify` de `vite.config.ts` — le garde-fou
// `src/lib/clientBundleGuards.test.ts` échoue alors pour le rappeler.
// ============================================================================

const MESSAGE =
  "Le rendu HTML → PDF (jsPDF `doc.html()`) n'est pas embarqué dans Batibuild. " +
  "Utilisez les helpers PDF programmatiques (src/lib/*Pdf.ts) ou retirez les " +
  "alias html2canvas/canvg/dompurify de vite.config.ts.";

function unsupported(): never {
  throw new Error(MESSAGE);
}

// jsPDF consomme ces modules de façons différentes :
//   · `html2canvas` → `.default ? .default : ns` puis appel direct
//   · `dompurify`   → `.default ? .default : ns` puis `.sanitize(...)`
//   · `canvg`       → `.default ? .default : ns` puis `.fromString(...)`
// On couvre donc TOUS ces points d'entrée pour que chaque chemin produise le
// message explicite plutôt qu'un « x is not a function ».
(unsupported as unknown as Record<string, unknown>).default = unsupported;
(unsupported as unknown as Record<string, unknown>).sanitize = unsupported;
(unsupported as unknown as Record<string, unknown>).fromString = unsupported;

export default unsupported;

/** `await import("canvg")` → `{ Canvg }` (export nommé du paquet). */
export const Canvg = unsupported;

/** `await import("dompurify")` → `{ sanitize }` (accès par espace de noms). */
export const sanitize = unsupported;
