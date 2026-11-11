import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Two suites. The integration suite exercises the API route handlers and the domain modules
 * behind them directly, in-process, with no browser and no Next.js server.
 *
 * It runs against the same file-backed store the Playwright suite uses, so what
 * it asserts on is the real persistence and notification path rather than a
 * mock. The browser suite is left to cover what only a browser can: rendering,
 * navigation, and the forms a person actually fills in.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  // Lets a test render a server component, as Next.js's own compiler would.
  esbuild: { jsx: "automatic" },
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["./tests/integration/support/setup.ts"],
          // Each file gets its own store directory, so the suite is safe to run
          // in parallel and tests do not have to invent unique ids to avoid
          // each other.
          isolate: true,
        },
      },
      // Client components that only make sense with a DOM: the shared form
      // system's behaviour (errors keep values, controls disable while
      // submitting, API failures show the callout).
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["tests/components/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/components/setup.ts"],
        },
      },
    ],
  },
});
