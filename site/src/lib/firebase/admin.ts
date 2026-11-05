import { Auth } from "./auth-rest";
import { Firestore } from "./firestore-rest";
import { getAccessToken } from "./google-auth";

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
 * sets; they supply the project id (notably for the emulators).
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

function describeMissingCredentials() {
  const missing = SERVICE_ACCOUNT_VARS.filter((name) => !process.env[name]);
  const subject =
    missing.length === 1 ? `${missing[0]} is` : `${missing.join(", ")} are`;

  return (
    `Firebase Admin is not configured: ${subject} missing. ` +
    `Set the service account values from .env.example in this environment ` +
    `(application default credentials are not supported on Cloudflare Workers).`
  );
}

type Credentials = {
  clientEmail: string;
  privateKey: string;
  projectId: string;
};

/**
 * Resolve credentials lazily. Doing it at module scope makes an unconfigured
 * environment fail at import time, which takes `next build` down with it — and
 * the build has no business needing production credentials.
 *
 * Only an explicit service account is supported: application default
 * credentials need Node-only machinery that Cloudflare Workers do not have.
 * The Firebase emulators are the exception and need no credentials at all.
 */
function resolveCredentials(): Credentials | null {
  const { clientEmail, privateKey, projectId } = readServiceAccount();

  if (projectId && clientEmail && privateKey) {
    return { clientEmail, privateKey, projectId };
  }

  if (emulatorConfigured() && projectId) {
    return null;
  }

  // Fail here, naming what is missing, rather than letting a later request
  // blame a symptom.
  throw new Error(describeMissingCredentials());
}

function emulatorConfigured() {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
}

function tokenSource(credentials: Credentials | null) {
  return async () => (credentials ? getAccessToken(credentials) : null);
}

export function getFirebaseAdminAuth() {
  const credentials = resolveCredentials();
  const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  return new Auth({
    projectId: credentials?.projectId ?? readServiceAccount().projectId!,
    getToken: async () => (authEmulator ? "owner" : tokenSource(credentials)()),
    identityHost: authEmulator
      ? `http://${authEmulator}/identitytoolkit.googleapis.com`
      : undefined,
    serviceAccount: credentials
      ? {
          clientEmail: credentials.clientEmail,
          privateKey: credentials.privateKey,
        }
      : undefined,
  });
}

export function getFirebaseAdminDb() {
  const credentials = resolveCredentials();
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;

  return new Firestore({
    projectId: credentials?.projectId ?? readServiceAccount().projectId!,
    getToken: async () => (emulator ? "owner" : tokenSource(credentials)()),
    emulatorHost: emulator ? `http://${emulator}` : undefined,
  });
}

/** Whether admin credentials are configured, without initialising anything. */
export function isFirebaseAdminConfigured() {
  const { clientEmail, privateKey, projectId } = readServiceAccount();

  return Boolean(
    projectId && ((clientEmail && privateKey) || emulatorConfigured())
  );
}
