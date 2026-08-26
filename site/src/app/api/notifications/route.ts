import { NextResponse } from "next/server";

import { loadAccountProfile } from "@/lib/auth/profile-store";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import { chooseUsernameNotification } from "@/lib/notifications/templates";
import {
  createNotification,
  deleteAllNotifications,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  setNotificationRead,
} from "@/lib/notifications/store";

const CHOOSE_USERNAME_ID = "ntf_choose_username";

/**
 * Keep the onboarding reminder in step with the profile.
 *
 * The reminder is a real stored notification rather than something the page
 * synthesises, so marking it read behaves like every other notification. It is
 * removed once the collector picks a username and there is nothing left to do.
 */
async function syncOnboardingNotifications(uid: string) {
  const profile = await loadAccountProfile(uid);

  if (profile?.username) {
    await deleteNotification(uid, CHOOSE_USERNAME_ID);
    return;
  }

  await createNotification(uid, chooseUsernameNotification(), {
    dedupeKey: CHOOSE_USERNAME_ID,
  });
}

async function respond(uid: string) {
  const notifications = await listNotifications(uid);

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter(
      (notification) => notification.readAt === null
    ).length,
  });
}

function unauthorized(error: unknown) {
  return NextResponse.json(
    {
      error: {
        code: "unauthenticated",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load your notifications.",
      },
    },
    { status: 401 }
  );
}

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    await syncOnboardingNotifications(session.uid);
    return respond(session.uid);
  } catch (error) {
    return unauthorized(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    const body = (await request.json()) as {
      id?: string;
      markAllRead?: boolean;
      read?: boolean;
    };

    if (body.markAllRead) {
      await markAllNotificationsRead(session.uid);
      return respond(session.uid);
    }

    if (!body.id) {
      return NextResponse.json(
        {
          error: {
            code: "invalid-argument",
            message: "A notification id is required.",
          },
        },
        { status: 400 }
      );
    }

    await setNotificationRead(session.uid, body.id, body.read !== false);
    return respond(session.uid);
  } catch (error) {
    return unauthorized(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    const body = (await request.json().catch(() => ({}))) as {
      all?: boolean;
      id?: string;
    };

    if (body.all) {
      await deleteAllNotifications(session.uid);
      return respond(session.uid);
    }

    if (!body.id) {
      return NextResponse.json(
        {
          error: {
            code: "invalid-argument",
            message: "A notification id is required.",
          },
        },
        { status: 400 }
      );
    }

    await deleteNotification(session.uid, body.id);
    return respond(session.uid);
  } catch (error) {
    return unauthorized(error);
  }
}
