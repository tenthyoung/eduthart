import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "on-first-retry",
  },
  webServer: {
    command:
      "HOSTNAME=127.0.0.1 E2E_AUTH=1 NEXT_PUBLIC_E2E_AUTH=1 npm run dev -- --hostname 127.0.0.1 --port 3005",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:3005",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
