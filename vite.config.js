import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The portal runs on its own port (5174) alongside the Admin Panel's 5173,
// because they are two separate apps — but they proxy to the SAME backend
// on :5000 and therefore the same MySQL database. Nothing is duplicated
// server-side.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
