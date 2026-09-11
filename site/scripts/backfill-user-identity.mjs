import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Backfill missing identity and legal fields on `users` profile documents.
 *
 * A profile document recreated by a PATCH after its original was deleted
 * carries only the edited fields (see the izzytenth incident). The PATCH
 * route now heals `uid`, `email`, and `authProviders` on every edit, but
 * `createdAt`, `lastLoginAt`, and the legal acceptance record only exist on
 * the Firebase Auth record and at signup, so old documents need this
 * one-time repair.
 *
 * Merge-only: a field that already has a value is never touched. The legal
 * record is stamped with the account's Auth creation time and the current
 * legal version — appropriate for test accounts, not for real collectors
 * (a real collector's lost acceptance should be re-collected, not invented).
 *
 *   node scripts/backfill-user-identity.mjs           # report + write
 *   node scripts/backfill-user-identity.mjs --dry-run # report only
 */
const LEGAL_VERSION = "2026-07-07";
const TERMS_PATH = "/legal/terms-of-service";
const PRIVACY_PATH = "/legal/privacy-policy";

// --- credentials -----------------------------------------------------------

const scriptDir = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(join(scriptDir, "..", ".env.local"), "utf8");
  } catch {
    return;
  }

  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = value.replace(/^["']|["']$/g, "");
  }
}

loadEnvLocal();

function getAdminApp() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }

  return getApps()[0];
}

// --- backfill --------------------------------------------------------------

const dryRun = process.argv.includes("--dry-run");

const app = getAdminApp();
const db = getFirestore(app);
const auth = getAuth(app);

const snapshot = await db.collection("users").get();
let updated = 0;
let alreadyComplete = 0;
let fakeSeedsSkipped = 0;
let missingAuthRecord = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();

  // Fake seeded artists have no Auth records and belong to the seed script.
  if (data.fake === true) {
    fakeSeedsSkipped += 1;
    continue;
  }

  let authUser;
  try {
    authUser = await auth.getUser(doc.id);
  } catch {
    missingAuthRecord += 1;
    console.warn(`no auth record for users/${doc.id}; skipped`);
    continue;
  }

  const createdAt = new Date(authUser.metadata.creationTime).toISOString();
  const patch = {};

  if (!data.uid) {
    patch.uid = doc.id;
  }

  if (!data.email && authUser.email) {
    patch.email = authUser.email.trim().toLowerCase();
  }

  if (!Array.isArray(data.authProviders) || data.authProviders.length === 0) {
    patch.authProviders = authUser.providerData
      .map((provider) => provider.providerId)
      .filter(Boolean);
  }

  if (!data.createdAt) {
    patch.createdAt = createdAt;
  }

  if (!data.lastLoginAt && authUser.metadata.lastSignInTime) {
    patch.lastLoginAt = new Date(
      authUser.metadata.lastSignInTime
    ).toISOString();
  }

  if (!data.legal?.acceptedAt) {
    const acceptedVia = authUser.providerData.some(
      (provider) => provider.providerId === "google.com"
    )
      ? "google"
      : "email_password";

    patch.legal = {
      acceptedAt: createdAt,
      acceptedVersion: LEGAL_VERSION,
      acceptedVia,
      privacyPolicyAcceptedAt: createdAt,
      privacyPolicyPath: PRIVACY_PATH,
      termsOfServiceAcceptedAt: createdAt,
      termsOfServicePath: TERMS_PATH,
    };
  }

  if (Object.keys(patch).length === 0) {
    alreadyComplete += 1;
    continue;
  }

  if (!dryRun) {
    await doc.ref.set(patch, { merge: true });
  }

  updated += 1;
  console.log(
    `${dryRun ? "would backfill" : "backfilled"} users/${doc.id} -> ${Object.keys(patch).join(", ")}`
  );
}

console.log("---");
console.log(
  `${snapshot.size} docs | ${updated} ${dryRun ? "need backfill" : "updated"} | ${alreadyComplete} already complete | ${fakeSeedsSkipped} fake seeds skipped | ${missingAuthRecord} without auth records`
);
