import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  /*
   * Les fichiers `.tsx` sont transformés par esbuild, qui ne lit pas
   * `jsx: "react-jsx"` de tsconfig.app.json : sans cette ligne il applique le
   * runtime CLASSIQUE et tout composant rendu échoue en « React is not
   * defined » (mesuré : 46 tests, 12 fichiers). Le runtime automatique est
   * celui de l'application compilée (Vite + plugin React) : les tests
   * exécutent donc exactement le même code JSX.
   */
  esbuild: { jsx: "automatic" },
  test: {
    globals: true,
    environment: "node",
    /*
     * Le sandbox fait 2 Go et les serveurs de développement (Vite, esbuild,
     * Convex) en occupent déjà ~1,1 Go. Le pool par défaut lance un worker par
     * cœur et chargeait 171 fichiers de test en parallèle : le cgroup saturait
     * et la suite dépassait plusieurs minutes. Deux workers suffisent (mesuré :
     * suite complète en ~1 min 45 au lieu d'un dépassement de délai) et
     * laissent au reste du sandbox la mémoire dont il a besoin.
     */
    maxWorkers: 2,
    minWorkers: 1,
    include: [
      "src/convex/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    exclude: ["node_modules", "dist"],
    // convex-test needs longer timeout for in-memory DB operations
    testTimeout: 30000,
  },
});
