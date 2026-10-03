import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Week 7 perf: split vendor chunks so app-code changes don't invalidate
    // the large react/vendor bundle in browser caches.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-router-dom')) {
            return 'react';
          }
          if (id.includes('@slyxup/core') || id.includes('@slyxup/ui')) {
            return 'slyxup';
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    // Monorepo guard: @slyxup/ui may resolve its own nested react copy while
    // web runs a different major. Bundling two Reacts crashes every hook
    // inside kit components — force a single copy from web's node_modules.
    dedupe: ["react", "react-dom"],
    alias: [
      { find: /^react$/, replacement: path.resolve(rootDir, "node_modules/react") },
      {
        find: /^react\/jsx-runtime$/,
        replacement: path.resolve(rootDir, "node_modules/react/jsx-runtime.js"),
      },
      { find: /^react-dom$/, replacement: path.resolve(rootDir, "node_modules/react-dom") },
    ],
  },
})
