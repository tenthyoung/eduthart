import {
  getApp,
  getApps,
  initializeApp,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const SERVICE_ACCOUNT_VARS = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

/**
 * Read the environment on each call rather than once at import.
 *
 * Capturing at module scope means anything that sets a variable after this
 * module is first imported is silently ignored, which is a hard failure to
 * explain. It also makes the behaviour testable.
 *
 * GOOGLE_CLOUD_PROJECT and GCLOUD_PROJECT are the names Google's own tooling
 * sets, so honour them rather than making a GCP environment repeat itself.
 */
function readServiceAccount() {
  return {
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    projectId:
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT,
  };
}

/**
 * Whether application default credentials stand any chance of resolving.
 *
 * ADC works on Google infrastructure, where the platform sets one of these, or
 * locally when someone points GOOGLE_APPLICATION_CREDENTIALS at a key file.
 * Anywhere else it reaches for the GCE metadata server, which does not exist —
 * so without one of these signals, falling back to ADC only buys a confusing
 * failure later instead of an accurate one now.
 */
function canUseApplicationDefault() {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.K_SERVICE ||
    process.env.FUNCTION_TARGET ||
    process.env.GAE_ENV
  );
}

function describeMissingCredentials() {
  const missing = SERVICE_ACCOUNT_VARS.filter((name) => !process.env[name]);
  const subject =
    missing.length === 1 ? `${missing[0]} is` : `${missing.join(", ")} are`;

  return (
    `Firebase Admin is not configured: ${subject} missing. ` +
    `Set the service account values from .env.example in this environment, ` +
    `or point GOOGLE_APPLICATION_CREDENTIALS at a service account key file.`
  );
}

/**
 * The initialised Firebase Admin app.
 *
 * Resolve this lazily. Calling it at module scope makes an unconfigured
 * environment fail at import time, which takes `next build` down with it — and
 * the build has no business needing production credentials.
 */
function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const { clientEmail, privateKey, projectId } = readServiceAccount();

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  // Fail here, naming what is missing. Left to itself the Google auth library
  // fails much later and blames a symptom instead — "Unable to detect a
  // Project Id", "Could not load the default credentials", or a DNS error for
  // metadata.google.internal, depending on how much happens to be set. None of
  // those say "nobody configured the service account", which is the one thing
  // the reader needs to know.
  if (!canUseApplicationDefault()) {
    throw new Error(describeMissingCredentials());
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

/** Whether admin credentials are configured, without initialising anything. */
export function isFirebaseAdminConfigured() {
  const { clientEmail, privateKey, projectId } = readServiceAccount();

  return Boolean(
    (projectId && clientEmail && privateKey) || canUseApplicationDefault()
  );
}
