import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { orbitApiPlugin } from "./server/apiPlugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), orbitApiPlugin()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: { port: 5173, host: true },
});
