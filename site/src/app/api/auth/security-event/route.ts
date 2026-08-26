import { NextResponse } from "next/server";

import { isE2EAuthEnabled } from "@/lib/auth/e2e-store";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import {
  emailChangedNotification,
  passwordChangedNotification,
} from "@/lib/notifications/templates";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

/**
 * How recently a password must have changed for the signed-out path to notify.
 *
 * A password reset finishes while the visitor is signed out, so the only thing
 * the page can hand us is an email address. Rather than trust that, we ask
 * Firebase when the account's tokens were last invalidated: a password change
 * bumps that timestamp, so a recent value is proof the change really happened
 * and an arbitrary address cannot be used to mail someone.
 */
const RECENT_PASSWORD_CHANGE_MS = 5 * 60 * 1000;

type SecurityEventBody = {
  email?: string;
  nextEmail?: string;
  type?: "email_changed" | "password_changed";
};

function readRecentPasswordChange(tokensValidAfterTime: string | undefined) {
  if (!tokensValidAfterTime) {
    return null;
  }

  const changedAt = new Date(tokensValidAfterTime);
  const elapsed = Date.now() - changedAt.getTime();

  if (Number.isNaN(changedAt.getTime()) || elapsed > RECENT_PASSWORD_CHANGE_MS) {
    return null;
  }

  return changedAt;
}

export async function POST(request: Request) {
  const notified = NextResponse.json({ notified: true });
  // Never reveal whether an address belongs to an account.
  const quiet = () => NextResponse.json({ notified: false });

  try {
    const body = (await request.json().catch(() => ({}))) as SecurityEventBody;
    const type = body.type ?? "password_changed";

    if (request.headers.get("authorization")) {
      const session = await getAuthenticatedSession(request);
      const recipient = { email: session.user.email, uid: session.uid };

      await dispatchNotification(
        recipient,
        type === "email_changed"
          ? emailChangedNotification({ nextEmail: body.nextEmail?.trim() ?? "a new address" })
          : passwordChangedNotification({ changedAt: new Date() }),
      );

      return notified;
    }

    const email = body.email?.trim().toLowerCase();

    if (type !== "password_changed" || !email || isE2EAuthEnabled()) {
      return quiet();
    }

    const user = await getFirebaseAdminAuth()
      .getUserByEmail(email)
      .catch(() => null);
    const changedAt = user ? readRecentPasswordChange(user.tokensValidAfterTime) : null;

    if (!user || !changedAt) {
      return quiet();
    }

    await dispatchNotification(
      { email: user.email ?? email, uid: user.uid },
      passwordChangedNotification({ changedAt }),
    );

    return notified;
  } catch (error) {
    console.error("Unable to record a security event", error);
    return quiet();
  }
}
