/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // Trace HTML is evidence, not an app entry. Keep dependency discovery scoped
  // to the real entry so saving a Playwright trace cannot trigger a re-bundle.
  optimizeDeps: {
    entries: ["index.html"],
    include: ["react", "react-dom/client", "@emotion/react", "@emotion/styled"],
  },
  server: {
    host: "127.0.0.1",
    port: 8501,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:8001" },
    watch: { ignored: ["**/e2e/**", "**/test-results/**", "**/playwright-report/**"] },
  },
  // Playwright specs live in e2e/ and run against the live app, not in vitest.
  test: { include: ["src/**/*.test.ts"] },
  preview: { host: "127.0.0.1", port: 8501, strictPort: true },
});
