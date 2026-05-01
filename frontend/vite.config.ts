import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/analytics": "http://127.0.0.1:8000",
      "/access": "http://127.0.0.1:8000",
      "/billing": "http://127.0.0.1:8000",
      "/cases": "http://127.0.0.1:8000",
      "/clients": "http://127.0.0.1:8000",
      "/documents": "http://127.0.0.1:8000",
      "/dbms": "http://127.0.0.1:8000",
      "/employees": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
      "/overview": "http://127.0.0.1:8000",
      "/roles": "http://127.0.0.1:8000",
      "/tickets": "http://127.0.0.1:8000",
      "/upload-document": "http://127.0.0.1:8000",
      "/uploads": "http://127.0.0.1:8000",
    },
  },
});
