import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";

const apiOrigin = process.env.AI_TRACK_WEB_API_ORIGIN ?? "http://127.0.0.1:4317";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": apiOrigin,
      "/events": apiOrigin,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
