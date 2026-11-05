import { SignJWT, importPKCS8 } from "jose";

/**
 * OAuth access tokens for Google's REST APIs, minted from the service account.
 *
 * `firebase-admin` does this inside google-auth-library, which needs Node-only
 * machinery. This is the same exchange — sign a short-lived JWT with the
 * service account key, trade it at the token endpoint — written against Web
 * Crypto so it runs on Cloudflare Workers as well as Node.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";
// Refresh a little early so a token never expires mid-request.
const EXPIRY_SKEW_MS = 120_000;

export type ServiceAccount = {
  clientEmail: string;
  privateKey: string;
  projectId: string;
};

type CachedToken = { token: string; expiresAt: number; key: string };

// Module memory: reused for the life of the isolate / server process.
let cached: CachedToken | null = null;

export function resetAccessTokenCache() {
  cached = null;
}

export async function getAccessToken(
  account: ServiceAccount,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const key = `${account.clientEmail}:${account.projectId}`;

  if (cached && cached.key === key && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const signingKey = await importPKCS8(account.privateKey, "RS256");
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.clientEmail)
    .setSubject(account.clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(signingKey);

  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!response.ok || !body.access_token) {
    throw new Error(
      `Could not get a Google access token (${response.status}): ${
        body.error_description ?? "no detail"
      }`
    );
  }

  cached = {
    key,
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 - EXPIRY_SKEW_MS,
  };

  return cached.token;
}
