import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeEach } from "vitest";

/**
 * Give every test file its own copy of the file-backed store, emptied between
 * tests.
 *
 * The store modules resolve their directories from os.tmpdir() when they are
 * first imported, and os.tmpdir() reads TMPDIR on every call, so pointing TMPDIR
 * somewhere unique here — before the test file imports anything — isolates the
 * whole store. That, plus the reset below, is what lets a test assert on totals
 * ("one notification", "these two artworks") instead of hunting for the rows it
 * happens to own, which is the compromise the shared Playwright store forces on
 * the browser suite.
 */
const storeRoot = join(tmpdir(), `eduthart-integration-${randomUUID()}`);

process.env.TMPDIR = storeRoot;
// The store and the payment stand-in both branch on this, exactly as they do
// under Playwright. Nothing here talks to Firebase or Stripe.
process.env.E2E_AUTH = "1";
process.env.NEXT_PUBLIC_E2E_AUTH = "1";

await fs.mkdir(storeRoot, { recursive: true });

beforeEach(async () => {
  // Imported lazily: a top-level import would be evaluated before TMPDIR is set
  // above, and the store would latch onto the shared temp directory instead.
  const { DELETE } = await import("@/app/api/test/e2e-auth/route");
  await DELETE();
});

afterAll(async () => {
  await fs.rm(storeRoot, { force: true, recursive: true });
});
