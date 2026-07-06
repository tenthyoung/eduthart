// app/api/zoho-bulk/route.ts
import { existsSync, readFileSync, writeFileSync } from "fs";
import { NextResponse } from "next/server";
import path from "path";

const CACHE_PATH = path.join("/tmp", "zoho_access_token.json");

/**
 * Get a valid access token.
 * Cached in /tmp for ~59 min (Vercel serverless functions are stateless).
 */
async function getAccessToken(): Promise<string> {
  // 1. Try cache
  if (existsSync(CACHE_PATH)) {
    try {
      const cached = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
      if (cached.access_token && cached.expires_at > Date.now() / 1000 + 300) {
        return cached.access_token;
      }
    } catch (_) {}
  }

  // 2. Refresh
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
    },
  );

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  // Cache for ~59 min
  data.expires_at = Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600);
  writeFileSync(CACHE_PATH, JSON.stringify(data));

  return data.access_token;
}

/* ------------------------------------------------------------------ */
/* --------------------------- POST HANDLER -------------------------- */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { emails, listKey } = body;

    // ---------- validation ----------
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Emails array is required and must not be empty" },
        { status: 400 },
      );
    }
    if (!listKey) {
      return NextResponse.json(
        { error: "List key is required" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emails.filter((e: string) => !emailRegex.test(e));
    if (invalid.length) {
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }

    if (emails.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 emails per request" },
        { status: 400 },
      );
    }

    // ---------- get fresh token ----------
    const accessToken = await getAccessToken();

    // ---------- call Zoho ----------
    const emailIds = emails.join(",");
    const url = `https://campaigns.zoho.${process.env.ZOHO_DC}/api/v1.1/addlistsubscribersinbulk?listkey=${listKey}&emailids=${encodeURIComponent(
      emailIds,
    )}&resfmt=JSON`;

    const zohoRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const zohoData = await zohoRes.json();

    if (!zohoRes.ok || zohoData.code !== "0") {
      return NextResponse.json(
        {
          error: "Failed to add contacts to Zoho Campaigns",
          details: zohoData,
        },
        { status: zohoRes.status || 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${emails.length} email(s) to list`,
        listkey: zohoData.listkey,
        listname: zohoData.listname,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Zoho bulk API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
