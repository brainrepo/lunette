import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          mermaid: ["mermaid"],
          excalidraw: ["@excalidraw/excalidraw"],
          katex: ["katex"],
          markdown: ["marked", "highlight.js"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
}));
