import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  // The suite runs against `next dev`, so the first hit on a route pays for a
  // cold compile. The defaults are tuned for a prebuilt app and time out on it.
  timeout: 90_000,
  expect: { timeout: 15_000 },
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
      name: "reset",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["reset"],
      testIgnore: /global\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
