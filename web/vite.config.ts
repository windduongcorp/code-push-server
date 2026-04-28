import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev-only reverse proxy so browser avoids backend CORS issues.
      "/__cp": {
        target: process.env.VITE_DEV_PROXY_TARGET || "https://codepush.windduong.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/__cp/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
