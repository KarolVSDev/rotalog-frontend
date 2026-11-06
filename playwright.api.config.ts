import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e-api",
    use: { baseURL: "http://localhost:5175", channel: "msedge", headless: true },
    webServer: {
        command: "node node_modules/vite/bin/vite.js --host localhost --port 5175 --strictPort",
        url: "http://localhost:5175", reuseExistingServer: false,
        env: { VITE_AUTH_MODE: "api", VITE_API_URL: "http://localhost:8000" },
    },
});
