import { NextResponse } from "next/server";

import { apiError, withSession } from "@/lib/api/handler";
import {
  isEmailCategory,
  type EmailPreferences,
} from "@/lib/notifications/email-categories";
import {
  loadEmailPreferences,
  saveEmailPreferences,
} from "@/lib/notifications/preferences";

type PreferencesBody = Record<string, unknown>;

export function GET(request: Request) {
  return withSession(request, async (session) =>
    NextResponse.json({
      preferences: await loadEmailPreferences(session.uid),
    })
  );
}

export function PATCH(request: Request) {
  return withSession(request, async (session) => {
    const body = (await request.json()) as PreferencesBody;
    const update: Partial<EmailPreferences> = {};

    for (const [key, value] of Object.entries(body)) {
      if (isEmailCategory(key) && typeof value === "boolean") {
        update[key] = value;
      }
    }

    // Reject an empty update rather than accepting it as a no-op: it means the
    // caller sent a category we do not know, and answering 200 would let a
    // renamed key fail silently in the UI.
    if (Object.keys(update).length === 0) {
      return apiError(
        "No recognised email preferences were provided.",
        400,
        "invalid-argument"
      );
    }

    return NextResponse.json({
      preferences: await saveEmailPreferences(session.uid, update),
    });
  });
}
