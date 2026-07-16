import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  AdminRouteError,
  getAdminSessionCookieName,
  verifyAdminSessionCookie,
} from "@/lib/admin/server";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getAdminSessionCookieName())?.value;
  if (!sessionCookie) {
    throw new AdminRouteError(
      "auth/session-missing",
      "Please sign in to the admin console again.",
      401,
    );
  }

  return verifyAdminSessionCookie(sessionCookie);
}

export function handleAdminRouteError(error: unknown) {
  if (error instanceof AdminRouteError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json(
    {
      error: {
        code: "internal",
        message: "Unexpected admin server error.",
      },
    },
    { status: 500 },
  );
}
