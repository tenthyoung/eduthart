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
 * Categories are the coarse control; EDUTHA-40 added per-kind overrides on
 * top, so a category now acts as the default for the kinds beneath it rather
 * than the last word. See `EmailKindOverrides`.
 */
export type EmailCategory =
  "followed_artists" | "orders" | "saved_artwork" | "sales";

export type EmailPreferences = Record<EmailCategory, boolean>;

/**
 * The kinds a person is allowed to switch off.
 *
 * Derived by exclusion rather than listed, so a notification kind added later
 * is controllable by default and fails to compile until it has copy and a
 * category. Making it opt-out is the safer default: the alternative silently
 * ships an unswitchable email.
 */
export type ControllableEmailKind = Exclude<
  NotificationKind,
  "choose_username" | "email_changed" | "password_changed"
>;

/**
 * Per-kind exceptions to the category preference.
 *
 * Deliberately partial. A kind with no entry follows its category, which is
 * what makes the categories that shipped in EDUTHA-34 keep working untouched:
 * someone who switched off "Artists you follow" still has both follow kinds
 * off, and can now switch just one of them back on.
 */
export type EmailKindOverrides = Partial<
  Record<ControllableEmailKind, boolean>
>;

export type NotificationSettings = {
  categories: EmailPreferences;
  kinds: EmailKindOverrides;
};

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

/**
 * The kinds a person can control, grouped under the category they belong to.
 *
 * Order matters — it is the order the account section renders — so orders read
 * in the sequence they actually happen rather than alphabetically.
 */
export const EMAIL_KINDS_BY_CATEGORY: Record<
  EmailCategory,
  readonly ControllableEmailKind[]
> = {
  followed_artists: ["followed_artist_listed", "followed_artist_price_drop"],
  orders: ["order_confirmed", "order_shipped", "order_delivered"],
  saved_artwork: ["saved_artwork_sold"],
  sales: ["artwork_sold"],
};

export const CONTROLLABLE_EMAIL_KINDS: readonly ControllableEmailKind[] =
  EMAIL_CATEGORIES.flatMap((category) => EMAIL_KINDS_BY_CATEGORY[category]);

/**
 * Wording for one row in the account section.
 *
 * Each line says what arrives, in the recipient's terms. `artwork_sold` and
 * `saved_artwork_sold` both concern a sale but reach different people — the
 * seller and someone who favorited the piece — so their wording has to make
 * clear which one you are.
 */
export const EMAIL_KIND_COPY: Record<
  ControllableEmailKind,
  { description: string; title: string }
> = {
  artwork_sold: {
    description: "One of your own pieces sold.",
    title: "Your artwork sells",
  },
  followed_artist_listed: {
    description: "An artist you follow published something new.",
    title: "New work from artists you follow",
  },
  followed_artist_price_drop: {
    description: "An artist you follow lowered a price.",
    title: "Price drops from artists you follow",
  },
  order_confirmed: {
    description: "Your order went through.",
    title: "Order confirmed",
  },
  order_delivered: {
    description: "Your order arrived.",
    title: "Order delivered",
  },
  order_shipped: {
    description: "Your order is on its way, with tracking.",
    title: "Order shipped",
  },
  saved_artwork_sold: {
    description: "A piece you saved to your favorites sold to someone else.",
    title: "Saved artwork sells",
  },
};

export function isControllableEmailKind(
  value: unknown
): value is ControllableEmailKind {
  return (
    typeof value === "string" &&
    CONTROLLABLE_EMAIL_KINDS.includes(value as ControllableEmailKind)
  );
}

/**
 * Whether this kind's email is switched on, given both levels.
 *
 * A per-kind entry wins; with none, the kind follows its category. Kinds with
 * no category at all — security mail — never reach here, because callers check
 * `emailCategoryForKind` first.
 */
export function resolveKindEnabled(
  settings: NotificationSettings,
  kind: NotificationKind
) {
  if (isControllableEmailKind(kind)) {
    const override = settings.kinds[kind];

    if (typeof override === "boolean") {
      return override;
    }
  }

  const category = emailCategoryForKind(kind);

  return category ? settings.categories[category] : true;
}
