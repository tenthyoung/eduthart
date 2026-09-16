import type { NotificationKind } from "@/lib/notifications/types";

/**
 * The shape and wording of email preferences, with no storage behind it.
 *
 * Kept apart from `preferences.ts` because the account section that renders
 * these is a client component. Importing the store from there would pull
 * `firebase-admin` into the browser bundle, which fails the build outright —
 * so anything the client needs lives here, and only here.
 */

/**
 * The groups a person can switch off.
 *
 * Categories rather than individual kinds: someone who does not want to hear
 * about price drops almost never wants price drops from one artist and not
 * another. EDUTHA-40 covers per-kind control if that turns out to be wrong,
 * and can layer overrides on top of these without changing the storage shape.
 */
export type EmailCategory =
  "followed_artists" | "orders" | "saved_artwork" | "sales";

export type EmailPreferences = Record<EmailCategory, boolean>;

export const EMAIL_CATEGORIES: readonly EmailCategory[] = [
  "orders",
  "sales",
  "saved_artwork",
  "followed_artists",
];

/**
 * Which category governs a notification kind.
 *
 * `null` means the email is not the user's to switch off. Two different
 * reasons land there:
 *
 * - Security mail (`password_changed`, `email_changed`) always sends. An
 *   attacker who has taken an account should not be able to silence the one
 *   message that tells the owner it happened, and a preference toggle is
 *   exactly that silencer.
 * - `choose_username` carries no `emailSubject`, so it never emails anyway.
 */
const CATEGORY_BY_KIND: Record<NotificationKind, EmailCategory | null> = {
  artwork_sold: "sales",
  choose_username: null,
  email_changed: null,
  followed_artist_listed: "followed_artists",
  followed_artist_price_drop: "followed_artists",
  order_confirmed: "orders",
  order_delivered: "orders",
  order_shipped: "orders",
  password_changed: null,
  saved_artwork_sold: "saved_artwork",
};

export const EMAIL_CATEGORY_COPY: Record<
  EmailCategory,
  { description: string; title: string }
> = {
  followed_artists: {
    description:
      "New work and price drops from artists you follow. Turning this off does not unfollow anyone.",
    title: "Artists you follow",
  },
  orders: {
    description:
      "Confirmations, shipping updates and delivery notices for your orders.",
    title: "Order updates",
  },
  saved_artwork: {
    description: "When a piece you saved to your favorites sells.",
    title: "Saved artwork",
  },
  sales: {
    description: "When one of your own pieces sells on EduthArt.",
    title: "Your sales",
  },
};

/**
 * Everything on.
 *
 * Opt-out rather than opt-in, so the accounts that existed before this shipped
 * keep receiving exactly what they received yesterday. A default of `false`
 * would silently cut off order and shipping mail for every current user.
 */
export function defaultEmailPreferences(): EmailPreferences {
  return {
    followed_artists: true,
    orders: true,
    saved_artwork: true,
    sales: true,
  };
}

export function isEmailCategory(value: unknown): value is EmailCategory {
  return (
    typeof value === "string" &&
    EMAIL_CATEGORIES.includes(value as EmailCategory)
  );
}

export function emailCategoryForKind(kind: NotificationKind) {
  return CATEGORY_BY_KIND[kind] ?? null;
}
