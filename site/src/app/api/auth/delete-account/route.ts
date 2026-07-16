import { NextResponse } from "next/server";

import { deleteE2EAccountProfile } from "@/lib/auth/e2e-store";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";

async function deleteUserSubcollectionDocuments(uid: string, subcollection: string) {
  const db = getFirebaseAdminDb();
  const documents = await db.collection("users").doc(uid).collection(subcollection).listDocuments();

  await Promise.all(documents.map((documentRef) => documentRef.delete()));
}

async function deleteUserNotifications(uid: string) {
  const db = getFirebaseAdminDb();
  const notifications = await db
    .collection("user_notifications")
    .where("userUid", "==", uid)
    .get();

  if (notifications.empty) {
    return;
  }

  const batch = db.batch();
  notifications.docs.forEach((document) => {
    batch.delete(document.ref);
  });
  await batch.commit();
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);

    if (session.authType === "e2e") {
      await deleteE2EAccountProfile(session.uid);
      return NextResponse.json({ success: true });
    }

    // Keep the v1 cleanup targeted to user-owned data we can see in this repo today.
    await Promise.allSettled([
      deleteUserSubcollectionDocuments(session.uid, "settings"),
      deleteUserSubcollectionDocuments(session.uid, "decks"),
      deleteUserNotifications(session.uid),
    ]);

    const db = getFirebaseAdminDb();
    await db.collection("users").doc(session.uid).delete().catch(() => undefined);

    const auth = getFirebaseAdminAuth();
    await auth.deleteUser(session.uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: {
          code: "internal",
          message: "Unable to delete your account right now.",
        },
      },
      { status: 500 },
    );
  }
}
