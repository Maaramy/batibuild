import { vlyPlugin } from "@vly-ai/integrations";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type Plugin } from "vite";

// vlyPlugin() injects a <script type="module">import '@vly-ai/integrations';</script>
// into the built HTML. Vite treats HTML module scripts as bundle entries, so
// that server-side package (Vercel `ai` SDK, @auth/core, zod, @ai-sdk/* —
// ~1.6 MB / ~250 modules) gets force-included in the CLIENT bundle graph,
// where it is never used (it is only called from Convex actions). That dead
// weight was a major driver of the production build getting OOM-killed in the
// memory-limited platform build sandbox ("Killed" after "rendering chunks").
// This plugin strips only that one injected tag and keeps the rest of
// vlyPlugin's behavior (HMR/runtime error reporting scripts).
function stripVlyIntegrationsEntry(): Plugin {
  return {
    name: "strip-vly-integrations-entry",
    // Must be "pre" (and this plugin must be listed after vlyPlugin()): in the
    // production build only PRE hooks run before Vite parses HTML module
    // scripts into bundle entries — a "post" hook strips the tag from the
    // emitted HTML but AFTER the package already entered the build graph.
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace(
          /<script[^>]*type=["']module["'][^>]*>\s*import\s+["']@vly-ai\/integrations["'];\s*<\/script>/i,
          "",
        );
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vlyPlugin(), tailwindcss(), stripVlyIntegrationsEntry()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Importing from the "lucide-react" barrel pulls ~1,900 icon modules
      // into the build graph and made the production build OOM-kill in
      // memory-limited sandboxes. Alias the bare package specifier (string
      // form, same as "@", which the build pipeline preserves) to a shim that
      // re-exports only the icons actually used. The shim imports its icons
      // via RELATIVE paths into node_modules so this prefix alias never
      // rewrites its own imports.
      "lucide-react": path.resolve(__dirname, "./src/lib/lucide-shim.js"),
      // jsPDF's optional peer dependencies (`html2canvas`, `canvg`,
      // `dompurify`) are ONLY loaded from `doc.html()` via dynamic import().
      // Batibuild never calls `doc.html()` — every PDF is built
      // programmatically (text, jspdf-autotable tables, addImage PNG). Rollup
      // still follows those dynamic imports, so `canvg` dragged ~206 core-js
      // modules (+ html2canvas, dompurify, rgbcolor, stackblur-canvas,
      // svg-pathdata, raf) into the graph, i.e. ~216 dead modules that
      // inflated peak bundling memory in the memory-limited build sandbox.
      // Aliasing them to an explicit throwing stub removes them from the
      // graph; `src/lib/clientBundleGuards.test.ts` fails if `doc.html()` ever
      // starts being used, so the stub can never hide a real feature.
      html2canvas: path.resolve(__dirname, "./src/lib/pdfHtmlUnsupported.ts"),
      canvg: path.resolve(__dirname, "./src/lib/pdfHtmlUnsupported.ts"),
      dompurify: path.resolve(__dirname, "./src/lib/pdfHtmlUnsupported.ts"),
    },
    // Force a single copy of React across all packages (including vlyPlugin).
    // Without this, @vly-ai/integrations can resolve its own React copy,
    // which triggers "Invalid hook call" errors at runtime.
    dedupe: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
  },
  build: {
    sourcemap: false,
    // Skip the per-chunk gzip/brotli size pass: it holds every rendered
    // chunk in memory at once and was a peak-memory driver in memory-limited
    // build sandboxes (see comment below on manualChunks).
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Manual chunks keep Rollup's peak memory bounded during the
        // gzip-computation phase while heavy libs stay on their own lazy chunk.
        manualChunks: {
          // Core framework (small, stable). Kept explicit so Rollup's peak
          // memory stays bounded during the gzip-computation phase.
          'vendor-core': ['react', 'react-dom', 'react-router', 'convex'],
          // UI component library (single chunk, tree-shaken). Only packages
          // that are actually imported are listed here.
          'vendor-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
          ],
          // three / xlsx / recharts / framer-motion are deliberately NOT
          // grouped into a single vendor chunk: grouping them forced the whole
          // package onto every page that touched motion (before it is tree-
          // shaken). Giving three and xlsx their OWN manual chunks (instead of
          // letting Rollup merge them into the page chunk) keeps them on their
          // lazy chunk AND splits the two largest rendered chunks, which
          // bounds esbuild's per-chunk minification peak memory:
          //   · three -> PlanGenerator (3D view)
          //   · xlsx  -> AdminPanel (Excel export)
          'vendor-3d': ['three'],
          'vendor-xlsx': ['xlsx'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'esbuild',
  },
  optimizeDeps: {
    entries: ['index.html'],
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-router',
      '@convex-dev/auth/react',
      'framer-motion',
    ],
  },
  server: {
    host: true,
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
});
