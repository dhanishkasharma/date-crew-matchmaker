import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 45000,
  use: { baseURL: "http://127.0.0.1:5174", screenshot: "only-on-failure" },
  webServer: [
    {
      command: "node node_modules/tsx/dist/cli.mjs tests/e2e/start-server.ts",
      url: "http://127.0.0.1:4100/api/health",
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      env: { API_PROXY_TARGET: "http://127.0.0.1:4100" },
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
