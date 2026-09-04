import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
