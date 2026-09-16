import {
  defaultEmailPreferences,
  EMAIL_CATEGORIES,
  emailCategoryForKind,
  type EmailPreferences,
} from "@/lib/notifications/email-categories";
import { getUserDocument, saveUserDocument } from "@/lib/store/document-store";

import type { NotificationKind } from "@/lib/notifications/types";

/**
 * Reading and writing a person's email preferences.
 *
 * Server only — this reaches the document store. The categories themselves,
 * and the copy describing them, live in `email-categories.ts` so the account
 * UI can import them without dragging `firebase-admin` into the browser.
 */

const PREFERENCES_COLLECTION = "settings";
const EMAIL_PREFERENCES_ID = "email-preferences";

function toEmailPreferences(
  document: Record<string, unknown> | null
): EmailPreferences {
  const defaults = defaultEmailPreferences();

  if (!document) {
    return defaults;
  }

  // Read each category individually: a stored document written before a
  // category existed is missing that key, and it should fall back to the
  // default rather than to `false`.
  return EMAIL_CATEGORIES.reduce((preferences, category) => {
    preferences[category] =
      typeof document[category] === "boolean"
        ? (document[category] as boolean)
        : defaults[category];

    return preferences;
  }, {} as EmailPreferences);
}

export async function loadEmailPreferences(
  uid: string
): Promise<EmailPreferences> {
  const document = await getUserDocument(
    uid,
    PREFERENCES_COLLECTION,
    EMAIL_PREFERENCES_ID
  );

  return toEmailPreferences(document);
}

/**
 * Merge a partial update over what is stored. The account UI sends one
 * category at a time, so a full replace would let two quick toggles race and
 * lose the first one.
 */
export async function saveEmailPreferences(
  uid: string,
  update: Partial<EmailPreferences>
): Promise<EmailPreferences> {
  const changes = EMAIL_CATEGORIES.reduce<Record<string, boolean>>(
    (accumulated, category) => {
      const value = update[category];

      if (typeof value === "boolean") {
        accumulated[category] = value;
      }

      return accumulated;
    },
    {}
  );

  const saved = await saveUserDocument(
    uid,
    PREFERENCES_COLLECTION,
    EMAIL_PREFERENCES_ID,
    changes
  );

  return toEmailPreferences(saved);
}

/**
 * Whether a notification of this kind may be emailed to this person.
 *
 * Errors resolve to sending. A preference read that fails should not quietly
 * swallow an order confirmation — the louder failure is the safer one here.
 */
export async function isEmailAllowed(uid: string, kind: NotificationKind) {
  const category = emailCategoryForKind(kind);

  if (!category) {
    return true;
  }

  try {
    const preferences = await loadEmailPreferences(uid);
    return preferences[category];
  } catch (error) {
    console.error("Unable to read email preferences", error);
    return true;
  }
}
