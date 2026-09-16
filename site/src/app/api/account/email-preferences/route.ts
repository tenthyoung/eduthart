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
} from "@/lib/notifications/preferences";

type PreferencesBody = {
  categories?: Record<string, unknown>;
  kinds?: Record<string, unknown>;
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
