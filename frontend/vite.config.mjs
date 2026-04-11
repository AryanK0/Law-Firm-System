import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Full stack: run `npm run dev` at repo root (`vercel dev`, usually http://localhost:3000).
    // Frontend-only: run this workspace dev server and point the proxy at your API.
    proxy: {
      "/api": {
        target: process.env.VITE_LOCAL_API_PROXY ?? "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      "/uploads": {
        target: process.env.VITE_LOCAL_API_PROXY ?? "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
