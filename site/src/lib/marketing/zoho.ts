import { isE2EAuthEnabled } from "@/lib/auth/e2e-store";

/**
 * The Zoho Campaigns calls the site makes, in one place.
 *
 * Server only. The footer signup and the account's marketing toggle both go
 * through here, so they share a token cache and talk to the same list.
 */

type CachedToken = { access_token: string; expires_at: number };

// Held in module memory. A Worker isolate is reused across requests until the
// platform recycles it, so this saves most refreshes without needing a
// writable filesystem (Workers have none). A cold isolate just refreshes.
let cachedToken: CachedToken | null = null;

/**
 * An address the E2E stand-in refuses, so the suites can exercise the path
 * where Zoho is down without reaching the network.
 */
export const E2E_FAILING_EMAIL_MARKER = "+zoho-fails@";

function campaignsBase() {
  return `https://campaigns.zoho.${process.env.ZOHO_DC}/api/v1.1`;
}

/** A valid access token, cached for about an hour per isolate. */
export async function getZohoAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() / 1000 + 300) {
    return cachedToken.access_token;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    client_id: process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
  });

  const res = await fetch(
    `https://accounts.zoho.${process.env.ZOHO_DC}/oauth/v2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  cachedToken = {
    access_token: data.access_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  };

  return data.access_token;
}

export type ZohoResult = { ok: true } | { details: unknown; ok: false };

async function callContactEndpoint(
  endpoint: "listsubscribe" | "listunsubscribe",
  listKey: string,
  email: string
): Promise<ZohoResult> {
  // The Playwright and integration suites never reach Zoho.
  if (isE2EAuthEnabled()) {
    return email.includes(E2E_FAILING_EMAIL_MARKER)
      ? { details: { code: "e2e-failure" }, ok: false }
      : { ok: true };
  }

  const accessToken = await getZohoAccessToken();
  const params = new URLSearchParams({
    contactinfo: JSON.stringify({ "Contact Email": email }),
    listkey: listKey,
    resfmt: "JSON",
  });

  const response = await fetch(
    `${campaignsBase()}/json/${endpoint}?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  const data = (await response.json().catch(() => null)) as {
    code?: string;
  } | null;

  return response.ok && data?.code === "0"
    ? { ok: true }
    : { details: data, ok: false };
}

/**
 * Add one person to a list. Unlike the bulk add, this also brings back someone
 * who unsubscribed earlier, which is what an explicit opt-in has to do.
 */
export function subscribeContact(listKey: string, email: string) {
  return callContactEndpoint("listsubscribe", listKey, email);
}

export function unsubscribeContact(listKey: string, email: string) {
  return callContactEndpoint("listunsubscribe", listKey, email);
}

/** The footer's bulk add, unchanged in behaviour from before it moved here. */
export async function addSubscribersInBulk(
  listKey: string,
  emails: string[]
): Promise<ZohoResult & { status?: number }> {
  if (isE2EAuthEnabled()) {
    return emails.some((email) => email.includes(E2E_FAILING_EMAIL_MARKER))
      ? { details: { code: "e2e-failure" }, ok: false, status: 500 }
      : { ok: true };
  }

  const accessToken = await getZohoAccessToken();
  const url = `${campaignsBase()}/addlistsubscribersinbulk?listkey=${listKey}&emailids=${encodeURIComponent(
    emails.join(",")
  )}&resfmt=JSON`;

  const zohoRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const zohoData = await zohoRes.json();

  return zohoRes.ok && zohoData.code === "0"
    ? { ok: true }
    : { details: zohoData, ok: false, status: zohoRes.status || 500 };
}
