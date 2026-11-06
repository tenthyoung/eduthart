import { NextResponse } from "next/server";

import { apiError, withSession } from "@/lib/api/handler";
import {
  isControllableEmailKind,
  isEmailCategory,
  type EmailKindOverrides,
  type EmailPreferences,
} from "@/lib/notifications/email-categories";
import {
  loadNotificationSettings,
  saveNotificationSettings,
  setMarketingEmails,
} from "@/lib/notifications/preferences";

type PreferencesBody = {
  categories?: Record<string, unknown>;
  kinds?: Record<string, unknown>;
  marketing?: unknown;
};

export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({
      settings: await loadNotificationSettings(session.uid),
    })
  );
}

export function PATCH(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json()) as PreferencesBody;
    const categories: Partial<EmailPreferences> = {};
    const kinds: EmailKindOverrides = {};

    for (const [key, value] of Object.entries(body.categories ?? {})) {
      if (isEmailCategory(key) && typeof value === "boolean") {
        categories[key] = value;
      }
    }

    for (const [key, value] of Object.entries(body.kinds ?? {})) {
      if (isControllableEmailKind(key) && typeof value === "boolean") {
        kinds[key] = value;
      }
    }

    // The newsletter goes through Zoho and can fail on its own, so it is saved
    // on its own rather than alongside the activity settings: a failed
    // unsubscribe must not take a category change down with it, or the other
    // way round.
    if (typeof body.marketing === "boolean") {
      if (Object.keys(categories).length || Object.keys(kinds).length) {
        return apiError(
          "Change the newsletter on its own, not with other settings.",
          400,
          "invalid-argument"
        );
      }

      if (!session.user.email) {
        return apiError(
          "Your account has no email address, so it cannot receive the newsletter.",
          400,
          "failed-precondition"
        );
      }

      try {
        return NextResponse.json({
          settings: await setMarketingEmails(
            session.uid,
            session.user.email,
            body.marketing
          ),
        });
      } catch (error) {
        return apiError(
          error instanceof Error
            ? error.message
            : "That change could not be saved.",
          502,
          "unavailable"
        );
      }
    }

    // Reject an empty update rather than accepting it as a no-op: it means the
    // caller sent a category or kind we do not know, and answering 200 would
    // let a renamed key fail silently in the UI.
    if (
      Object.keys(categories).length === 0 &&
      Object.keys(kinds).length === 0
    ) {
      return apiError(
        "No recognised notification settings were provided.",
        400,
        "invalid-argument"
      );
    }

    return NextResponse.json({
      settings: await saveNotificationSettings(session.uid, {
        categories,
        kinds,
      }),
    });
  });
}
