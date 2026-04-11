import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const localApiTarget =
  process.env.VITE_LOCAL_API_PROXY ?? "http://127.0.0.1:3000";

function proxyApiErrorHandler(proxy) {
  proxy.on("error", (_err, _req, res) => {
    if (!res || res.writableEnded) {
      return;
    }
    if (typeof res.writeHead === "function") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          detail:
            "API unreachable. From the repository root run `npm run dev:vercel`, or set VITE_LOCAL_API_PROXY to your API URL.",
        }),
      );
    }
  });
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Full stack: run `npm run dev:vercel` at repo root (not `npm run dev`; that is Vite only).
    // Frontend-only: run this workspace dev server and point the proxy at your API.
    proxy: {
      "/api": {
        target: localApiTarget,
        changeOrigin: true,
        configure: proxyApiErrorHandler,
      },
      "/uploads": {
        target: localApiTarget,
        changeOrigin: true,
        configure: proxyApiErrorHandler,
      },
    },
  },
});
