import {
  CONTROLLABLE_EMAIL_KINDS,
  defaultEmailPreferences,
  EMAIL_CATEGORIES,
  emailCategoryForKind,
  resolveKindEnabled,
  type EmailKindOverrides,
  type EmailPreferences,
  type NotificationSettings,
} from "@/lib/notifications/email-categories";
import { getUserDocument, saveUserDocument } from "@/lib/store/document-store";

import type { NotificationKind } from "@/lib/notifications/types";

/**
 * Reading and writing a person's notification settings.
 *
 * Server only — this reaches the document store. The categories, kinds and
 * copy live in `email-categories.ts` so the account UI can import them without
 * dragging `firebase-admin` into the browser.
 */

const PREFERENCES_COLLECTION = "settings";
const EMAIL_PREFERENCES_ID = "email-preferences";

/**
 * Per-kind overrides are stored as flat, prefixed fields rather than a nested
 * map.
 *
 * The two stores merge differently: Firestore's `set(..., { merge: true })`
 * deep-merges a nested object, while the E2E store spreads one level and would
 * replace the whole map. Flat keys behave identically under both, so a single
 * toggle cannot silently wipe the others in one environment and not the other.
 */
const KIND_FIELD_PREFIX = "kind__";

function kindField(kind: NotificationKind) {
  return `${KIND_FIELD_PREFIX}${kind}`;
}

function toCategories(
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

function toKindOverrides(
  document: Record<string, unknown> | null
): EmailKindOverrides {
  if (!document) {
    return {};
  }

  // Absent stays absent: an override is only recorded once someone sets one,
  // which is what lets an untouched kind keep following its category.
  return CONTROLLABLE_EMAIL_KINDS.reduce<EmailKindOverrides>(
    (overrides, kind) => {
      const value = document[kindField(kind)];

      if (typeof value === "boolean") {
        overrides[kind] = value;
      }

      return overrides;
    },
    {}
  );
}

function toSettings(
  document: Record<string, unknown> | null
): NotificationSettings {
  return {
    categories: toCategories(document),
    kinds: toKindOverrides(document),
  };
}

export async function loadNotificationSettings(
  uid: string
): Promise<NotificationSettings> {
  const document = await getUserDocument(
    uid,
    PREFERENCES_COLLECTION,
    EMAIL_PREFERENCES_ID
  );

  return toSettings(document);
}

/**
 * Merge a partial update over what is stored. The account UI sends one control
 * at a time, so a full replace would let two quick toggles race and lose the
 * first one.
 *
 * Switching a category also clears the per-kind overrides beneath it. Without
 * that, turning "Order updates" back on would leave a kind someone switched
 * off still switched off, and the category control would look broken.
 *
 * "Clears" writes `null` rather than deleting the field. Reading treats any
 * non-boolean as absent, so null and missing behave the same — and unlike
 * Firestore's `FieldValue.delete()`, null means the same thing in both stores.
 */
export async function saveNotificationSettings(
  uid: string,
  update: {
    categories?: Partial<EmailPreferences>;
    kinds?: EmailKindOverrides;
  }
): Promise<NotificationSettings> {
  const changes: Record<string, boolean | null> = {};

  for (const category of EMAIL_CATEGORIES) {
    const value = update.categories?.[category];

    if (typeof value === "boolean") {
      changes[category] = value;

      for (const kind of CONTROLLABLE_EMAIL_KINDS) {
        if (emailCategoryForKind(kind) === category) {
          changes[kindField(kind)] = null;
        }
      }
    }
  }

  for (const kind of CONTROLLABLE_EMAIL_KINDS) {
    const value = update.kinds?.[kind];

    if (typeof value === "boolean") {
      changes[kindField(kind)] = value;
    }
  }

  const saved = await saveUserDocument(
    uid,
    PREFERENCES_COLLECTION,
    EMAIL_PREFERENCES_ID,
    changes
  );

  return toSettings(saved);
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
    return resolveKindEnabled(await loadNotificationSettings(uid), kind);
  } catch (error) {
    console.error("Unable to read notification settings", error);
    return true;
  }
}
