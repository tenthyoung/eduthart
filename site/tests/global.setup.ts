import { expect, test } from "@playwright/test";

/**
 * Clear the file-backed E2E store before the suite runs.
 *
 * It lives in the OS temp directory and outlives a test run, so without this a
 * previous run's follows, favorites, and orders are still there and tests that
 * assert on an empty state fail.
 */
test("resets the end-to-end store", async ({ request }) => {
  const response = await request.delete("/api/test/e2e-auth");
  expect(response.ok()).toBeTruthy();
});
