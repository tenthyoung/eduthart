import { NextResponse } from "next/server";

import { COLLECTOR_LIST_KEY } from "@/constants/newsletter.constants";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import { recordMarketingConsent } from "@/lib/notifications/preferences";
import { addSubscribersInBulk } from "@/lib/marketing/zoho";

/**
 * The newsletter signup behind the footer.
 *
 * Anyone may post here; a signed-in caller who subscribes their own account
 * address also has it recorded against the account, so the marketing toggle in
 * account settings shows what they just did.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { emails, listKey } = body;

    // ---------- validation ----------
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Emails array is required and must not be empty" },
        { status: 400 }
      );
    }
    if (!listKey) {
      return NextResponse.json(
        { error: "List key is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emails.filter((e: string) => !emailRegex.test(e));
    if (invalid.length) {
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }

    if (emails.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 emails per request" },
        { status: 400 }
      );
    }

    const result = await addSubscribersInBulk(listKey, emails);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Failed to add contacts to Zoho Campaigns",
          details: result.details,
        },
        // Zoho's own status (401 for an expired token, 400 for a bad list
        // key) describes our setup, not the visitor's request, so answer as a
        // failed upstream rather than let the form blame them for it.
        { status: 502 }
      );
    }

    if (listKey === COLLECTOR_LIST_KEY) {
      await recordSignupAgainstAccount(req, emails);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${emails.length} email(s) to list`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Zoho bulk API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Mark the account as opted in when its owner signs up with their own address.
 *
 * Only their own address: subscribing a friend from your account must not
 * change your preference. Best effort — the subscription already succeeded, so
 * a failure here is logged rather than turned into an error the person sees.
 */
async function recordSignupAgainstAccount(req: Request, emails: string[]) {
  if (!req.headers.get("authorization")) {
    return;
  }

  try {
    const session = await getAuthenticatedSession(req);
    const accountEmail = session.user.email?.trim().toLowerCase();

    if (
      accountEmail &&
      emails.some((email) => email.trim().toLowerCase() === accountEmail)
    ) {
      await recordMarketingConsent(session.uid, true);
    }
  } catch (error) {
    console.error("Unable to record the newsletter signup", error);
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
