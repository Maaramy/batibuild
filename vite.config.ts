import { vlyPlugin } from "@vly-ai/integrations";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vlyPlugin(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force a single copy of React across all packages (including vlyPlugin).
    // Without this, @vly-ai/integrations can resolve its own React copy,
    // which triggers "Invalid hook call" errors at runtime.
    dedupe: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
  },
  build: {
    sourcemap: false,
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
          // shaken). Leaving them to Rollup's default splitting creates a lazy
          // chunk per heavy lib that only loads on the pages that use them:
          //   · three  -> PlanGenerator (3D view)
          //   · xlsx   -> AdminPanel (Excel export)
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
