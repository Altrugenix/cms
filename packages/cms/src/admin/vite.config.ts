import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:3500";

export default defineConfig(({ mode: _mode }) => ({
  build: {
    emptyOutDir: true,
    outDir: path.resolve(__dirname, "../../dist/admin"),
    sourcemap: true,
  },
  define: { "import.meta.env.VITE_API_URL": '""' },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  root: __dirname,
  server: {
    port: 5173,
    proxy: {
      "/api": proxyTarget,
      "/docs": proxyTarget,
      "/graphiql": proxyTarget,
      "/graphql": proxyTarget,
      "/health": proxyTarget,
    },
  },
}));
