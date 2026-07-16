import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/admin";

const db = getFirebaseAdminDb();

const memdojoHosts = new Set([
  "app.eduthart.com",
  "eduthart.com",
  "www.eduthart.com",
]);

export function parsePublicDeckIds(rawUrls: string[]): string[] {
  const ids = new Set<string>();

  for (const rawUrl of rawUrls) {
    const value = rawUrl.trim();
    if (!value) continue;

    try {
      const url = new URL(value);
      if (!memdojoHosts.has(url.host.toLowerCase())) continue;

      const segments = url.pathname.split("/").filter(Boolean);
      if (
        segments.length >= 2 &&
        segments[0] === "public-decks" &&
        segments[1]
      ) {
        ids.add(segments[1]);
      }
    } catch {
      continue;
    }
  }

  return Array.from(ids);
}

export async function createExternalDeckReports({
  urls,
  reportType,
  reportSubcategory,
  reason,
  details,
  reporterEmail,
  submissionCollection,
  submissionId,
}: {
  urls: string[];
  reportType: "academic_integrity" | "copyright";
  reportSubcategory: string | null;
  reason: string;
  details: string;
  reporterEmail: string;
  submissionCollection: string;
  submissionId: string;
}) {
  const publicDeckIds = parsePublicDeckIds(urls);

  await Promise.all(
    publicDeckIds.map(async (publicDeckId) => {
      const publicDeckRef = db.collection("public_decks").doc(publicDeckId);
      const publicDeckSnap = await publicDeckRef.get();
      if (!publicDeckSnap.exists) {
        return;
      }

      const publicDeck = publicDeckSnap.data() as Record<string, unknown>;
      await db.collection("deck_reports").add({
        publicDeckId,
        reporterUid: null,
        reporterEmail,
        reason,
        details,
        reportType,
        reportSubcategory,
        reportSource: "web_form",
        externalSubmissionCollection: submissionCollection,
        externalSubmissionId: submissionId,
        status: "open",
        createdAt: Timestamp.now(),
      });

      await publicDeckRef.set(
        {
          reportCount: FieldValue.increment(1),
          moderationStatus:
            publicDeck.moderationStatus === "none"
              ? "underReview"
              : publicDeck.moderationStatus,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }),
  );

  return publicDeckIds;
}
