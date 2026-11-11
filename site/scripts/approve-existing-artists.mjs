import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { planApproval } from "./approve-existing-artists-plan.mjs";

/**
 * Approve every artist who is already selling (EDUTHA-137).
 *
 * Listing artwork now needs `artistApproved: true` on the `users` document.
 * Run this once when that gate ships, so nobody with a real listing is cut
 * off. "Real listing" is defined in approve-existing-artists-plan.mjs.
 *
 * Dry run is the default; nothing is written without --write.
 *
 *   node scripts/approve-existing-artists.mjs           # report only
 *   node scripts/approve-existing-artists.mjs --write   # approve them
 *
 * Merge-only and idempotent: it sets artistApproved, artistApprovedAt and
 * artistApprovedBy ("grandfathered") and never touches anyone already
 * approved or anyone without a real listing.
 */

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

// --- approve ---------------------------------------------------------------

const write = process.argv.includes("--write");
const db = getFirestore(getAdminApp());

console.log(
  `project: ${process.env.FIREBASE_ADMIN_PROJECT_ID ?? "(application default)"}`
);
console.log(write ? "mode: WRITE" : "mode: dry run (pass --write to apply)");
console.log("---");

const snapshot = await db.collection("users").get();
const counts = { approve: 0, "already-approved": 0, "no-listings": 0 };
const now = new Date().toISOString();

for (const doc of snapshot.docs) {
  const user = doc.data();
  const flowSnap = await doc.ref.collection("seller").doc("listing_flow").get();
  const decision = planApproval({
    flow: flowSnap.exists ? flowSnap.data() : null,
    uid: doc.id,
    user,
  });
  counts[decision] += 1;

  if (decision !== "approve") {
    continue;
  }

  if (write) {
    await doc.ref.set(
      {
        artistApproved: true,
        artistApprovedAt: now,
        artistApprovedBy: "grandfathered",
      },
      { merge: true }
    );
  }

  console.log(
    `${write ? "approved" : "would approve"} users/${doc.id} (@${user.username ?? "no-username"})`
  );
}

console.log("---");
console.log(
  `${snapshot.size} users | ${counts.approve} ${write ? "approved" : "to approve"} | ${counts["already-approved"]} already approved | ${counts["no-listings"]} without a real listing`
);
