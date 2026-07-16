import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig(({ mode: _mode }) => ({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../../dist/admin"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": proxyTarget,
      "/graphql": proxyTarget,
      "/graphiql": proxyTarget,
      "/health": proxyTarget,
      "/docs": proxyTarget,
    },
  },
  define: { "import.meta.env.VITE_API_URL": '""' },
}));
