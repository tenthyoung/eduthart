import { afterEach, describe, expect, test, vi } from "vitest";

import {
  getFirebaseAdminDb,
  isFirebaseAdminConfigured,
} from "@/lib/firebase/admin";

/**
 * How an unconfigured environment fails.
 *
 * Left to itself, the Google auth library blames a symptom — "Unable to detect
 * a Project Id", "Could not load the default credentials", or a DNS failure
 * for metadata.google.internal — long after initialisation, and none of those
 * say that nobody set the service account. These assert on the message a
 * person actually gets, which is the whole point of the change.
 *
 * Nothing here initialises Firebase: every case either throws before that or
 * only reads the environment.
 */

const CREDENTIAL_VARS = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_CLOUD_PROJECT",
  "GCLOUD_PROJECT",
  "K_SERVICE",
  "FUNCTION_TARGET",
  "GAE_ENV",
];

function withEnv(values: Record<string, string>) {
  for (const name of CREDENTIAL_VARS) {
    vi.stubEnv(name, values[name] ?? "");
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("firebase admin credentials", () => {
  test("names every missing variable when nothing is configured", () => {
    withEnv({});

    expect(isFirebaseAdminConfigured()).toBe(false);
    expect(() => getFirebaseAdminDb()).toThrow(
      /FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY are missing/
    );
  });

  test("names only what is missing when the project id is set", () => {
    // The shape someone lands in by copying .env.example, which ships the
    // project id filled in and the other two blank.
    withEnv({ FIREBASE_ADMIN_PROJECT_ID: "eduthart-5dd68" });

    const error = (() => {
      try {
        getFirebaseAdminDb();
        return null;
      } catch (thrown) {
        return thrown as Error;
      }
    })();

    expect(error).not.toBeNull();
    expect(error?.message).toContain(
      "FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY are missing"
    );
    // The one that is set must not be named, or the reader goes looking for a
    // problem that is not there.
    expect(error?.message).not.toContain("FIREBASE_ADMIN_PROJECT_ID");
  });

  test("points at the fix rather than at the symptom", () => {
    withEnv({});

    const message = (() => {
      try {
        getFirebaseAdminDb();
        return "";
      } catch (thrown) {
        return (thrown as Error).message;
      }
    })();

    expect(message).toContain(".env.example");
    expect(message).toContain("GOOGLE_APPLICATION_CREDENTIALS");
    // The failures this replaces, none of which named the actual cause.
    expect(message).not.toContain("metadata.google.internal");
    expect(message).not.toContain("Unable to detect a Project Id");
  });

  test("treats a Google runtime as configured, so ADC still works there", () => {
    // Cloud Run and friends supply credentials through the metadata server,
    // which is the case the fallback exists for. Throwing here would break a
    // deployment that was working.
    withEnv({ GOOGLE_CLOUD_PROJECT: "eduthart-5dd68", K_SERVICE: "site" });

    expect(isFirebaseAdminConfigured()).toBe(true);
  });

  test("treats an explicit credentials file as configured", () => {
    withEnv({ GOOGLE_APPLICATION_CREDENTIALS: "/tmp/service-account.json" });

    expect(isFirebaseAdminConfigured()).toBe(true);
  });

  test("accepts a full service account", () => {
    withEnv({
      FIREBASE_ADMIN_CLIENT_EMAIL:
        "admin@eduthart-5dd68.iam.gserviceaccount.com",
      FIREBASE_ADMIN_PRIVATE_KEY:
        "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
      FIREBASE_ADMIN_PROJECT_ID: "eduthart-5dd68",
    });

    expect(isFirebaseAdminConfigured()).toBe(true);
  });

  test("accepts the project id under Google's own variable names", () => {
    withEnv({
      FIREBASE_ADMIN_CLIENT_EMAIL:
        "admin@eduthart-5dd68.iam.gserviceaccount.com",
      FIREBASE_ADMIN_PRIVATE_KEY:
        "-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----\\n",
      GCLOUD_PROJECT: "eduthart-5dd68",
    });

    expect(isFirebaseAdminConfigured()).toBe(true);
  });
});
