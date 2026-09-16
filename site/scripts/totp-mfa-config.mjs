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

/**
 * Report or set the project's TOTP multi-factor configuration.
 *
 * TOTP MFA cannot be switched on from the Firebase console — unlike most auth
 * settings it is only reachable through the Admin SDK or the Identity Toolkit
 * REST API, which is why this script exists rather than a line in a runbook.
 *
 * It also requires the project to be on Firebase Authentication with Identity
 * Platform. Note that reading the config does NOT prove the upgrade has
 * happened — the legacy tier answers reads perfectly happily and only refuses
 * the write, with "MFA can only be enabled in GCIP or Firebase Auth upgraded
 * to aligned product". So the report below tells you whether TOTP is on; only
 * attempting --enable tells you whether the project can have it.
 *
 *   node scripts/totp-mfa-config.mjs           # report only, changes nothing
 *   node scripts/totp-mfa-config.mjs --enable  # turn TOTP MFA on
 *   node scripts/totp-mfa-config.mjs --disable # turn it off again
 */

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Load .env.local the way Next.js would.
 *
 * Deliberately does not overwrite a variable already in the environment, so
 * running this against a different project is a matter of exporting the
 * service account rather than editing a file.
 */
function loadEnvLocal() {
  let contents;

  try {
    contents = readFileSync(join(projectRoot, ".env.local"), "utf8");
  } catch {
    return;
  }

  for (const line of contents.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;

    if (process.env[name] !== undefined) {
      continue;
    }

    process.env[name] = rawValue
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n");
  }
}

function initialise() {
  if (getApps().length > 0) {
    return;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    return;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in " +
        ".env.local, or point GOOGLE_APPLICATION_CREDENTIALS at a key file."
    );
  }

  initializeApp({ credential: applicationDefault(), projectId });
}

function describe(config) {
  if (!config) {
    return "not configured";
  }

  const totp = config.providerConfigs?.find(
    (entry) => entry.totpProviderConfig
  );

  return [
    `multi-factor state: ${config.state ?? "unset"}`,
    `TOTP provider: ${totp ? totp.state : "not present"}`,
    totp?.totpProviderConfig?.adjacentIntervals !== undefined
      ? `adjacent intervals: ${totp.totpProviderConfig.adjacentIntervals}`
      : null,
  ]
    .filter(Boolean)
    .join("\n  ");
}

async function main() {
  const enable = process.argv.includes("--enable");
  const disable = process.argv.includes("--disable");

  if (enable && disable) {
    throw new Error("Pass one of --enable or --disable, not both.");
  }

  loadEnvLocal();
  initialise();

  const manager = getAuth().projectConfigManager();

  let current;

  try {
    current = await getAuth().projectConfigManager().getProjectConfig();
  } catch (error) {
    console.error("Could not read the project config.");
    console.error(`\nUnderlying error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log("Current configuration:");
  console.log(`  ${describe(current.multiFactorConfig)}`);

  if (!enable && !disable) {
    console.log("\nReport only. Pass --enable or --disable to change it.");
    return;
  }

  const state = enable ? "ENABLED" : "DISABLED";
  let updated;

  try {
    updated = await manager.updateProjectConfig({
      multiFactorConfig: {
        state,
        providerConfigs: [
          {
            state,
            totpProviderConfig: { adjacentIntervals: 5 },
          },
        ],
      },
    });
  } catch (error) {
    // This is where a legacy-tier project actually fails, having answered the
    // read above without complaint.
    if (/aligned product|GCIP/i.test(error.message ?? "")) {
      console.error(
        "\nThis project is still on the legacy Firebase Authentication tier, " +
          "so multi-factor auth cannot be turned on.\n\n" +
          "Upgrade it first: Firebase console > Authentication > Settings, " +
          "then look for the Identity Platform upgrade.\n\n" +
          "Check the pricing before you do. After upgrading, a Spark project " +
          "is capped at 3,000 daily active users, and a Blaze project is " +
          "billed beyond 50,000 monthly active users."
      );
      process.exitCode = 1;
      return;
    }

    throw error;
  }

  console.log(`\nUpdated configuration (${state}):`);
  console.log(`  ${describe(updated.multiFactorConfig)}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
