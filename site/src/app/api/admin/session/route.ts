import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createAdminSessionCookie,
  getAdminAccessStatus,
  getAdminSessionCookieMaxAgeMs,
  getAdminSessionCookieName,
  verifyAdminIdToken,
} from "@/lib/admin/server";
import { handleAdminRouteError } from "@/lib/admin/route";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = body?.idToken?.toString();
    if (!idToken) {
      return NextResponse.json(
        { error: { code: "invalid-argument", message: "idToken is required." } },
        { status: 400 },
      );
    }

    const decodedToken = await verifyAdminIdToken(idToken);
    const access = await getAdminAccessStatus(decodedToken);
    const sessionCookie = await createAdminSessionCookie(idToken);
    const cookieStore = await cookies();
    cookieStore.set(getAdminSessionCookieName(), sessionCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(getAdminSessionCookieMaxAgeMs() / 1000),
    });

    return NextResponse.json({ access });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(getAdminSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return NextResponse.json({ success: true });
}
