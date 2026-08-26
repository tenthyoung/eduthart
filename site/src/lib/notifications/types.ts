export type NotificationKind =
  | "artwork_sold"
  | "choose_username"
  | "email_changed"
  | "followed_artist_listed"
  | "followed_artist_price_drop"
  | "order_confirmed"
  | "password_changed"
  | "saved_artwork_sold";

export type UserNotification = {
  actionHref: string | null;
  actionLabel: string | null;
  body: string;
  createdAt: string;
  id: string;
  imageUrl: string | null;
  kind: NotificationKind;
  readAt: string | null;
  title: string;
};

/**
 * A notification's content, before it is addressed to anyone.
 *
 * The in-app centre and the email both render from this, so a kind's wording
 * only has to be written once.
 */
export type NotificationTemplate = {
  actionHref: string | null;
  actionLabel: string | null;
  body: string;
  /** Null keeps the notification in-app only. */
  emailSubject: string | null;
  imageUrl: string | null;
  kind: NotificationKind;
  title: string;
};
