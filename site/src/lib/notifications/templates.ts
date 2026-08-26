import { formatMinorUnits } from "@/lib/commerce/money";
import type { NotificationTemplate } from "@/lib/notifications/types";

export function passwordChangedNotification({
  changedAt,
}: {
  changedAt: Date;
}): NotificationTemplate {
  const when = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(changedAt);

  return {
    actionHref: "/account",
    actionLabel: "Review your account",
    body: `The password for your EduthArt account was changed on ${when} UTC.\n\nIf this was you, no action is needed. If you did not make this change, reset your password immediately and contact support.`,
    emailSubject: "Your EduthArt password was changed",
    imageUrl: null,
    kind: "password_changed",
    title: "Your password was changed",
  };
}

export function emailChangedNotification({
  nextEmail,
}: {
  nextEmail: string;
}): NotificationTemplate {
  return {
    actionHref: "/account",
    actionLabel: "Review your account",
    body: `A request was made to change the email address on your EduthArt account to ${nextEmail}. The change takes effect once the new address is confirmed.\n\nIf you did not request this, reset your password and contact support.`,
    emailSubject: "Your EduthArt email address is changing",
    imageUrl: null,
    kind: "email_changed",
    title: "Your email address is changing",
  };
}

export function chooseUsernameNotification(): NotificationTemplate {
  return {
    actionHref: "/account",
    actionLabel: "Choose a username",
    body: "Choose your username so people can visit your gallery page and you can start building your public presence on EduthArt.",
    emailSubject: null,
    imageUrl: null,
    kind: "choose_username",
    title: "Choose a username",
  };
}

export function orderConfirmedNotification({
  currency,
  orderId,
  orderNumber,
  totalMinor,
}: {
  currency: string;
  orderId: string;
  orderNumber: string;
  totalMinor: number;
}): NotificationTemplate {
  return {
    actionHref: `/account/orders/${orderId}`,
    actionLabel: "View your order",
    body: `Thank you for your purchase. Order ${orderNumber} for ${formatMinorUnits(totalMinor, currency)} is confirmed, and the artist has been notified to prepare your artwork for shipping.`,
    emailSubject: `Your EduthArt order ${orderNumber} is confirmed`,
    imageUrl: null,
    kind: "order_confirmed",
    title: "Your order is confirmed",
  };
}

export function artworkSoldNotification({
  artworkTitle,
  currency,
  imageUrl,
  orderId,
  orderNumber,
  totalMinor,
}: {
  artworkTitle: string;
  currency: string;
  imageUrl: string | null;
  orderId: string;
  orderNumber: string;
  totalMinor: number;
}): NotificationTemplate {
  return {
    actionHref: `/account/orders/${orderId}`,
    actionLabel: "View the order",
    body: `"${artworkTitle}" sold for ${formatMinorUnits(totalMinor, currency)} on order ${orderNumber}. Prepare the piece for shipping and the collector's delivery details are on the order.`,
    emailSubject: `"${artworkTitle}" just sold on EduthArt`,
    imageUrl,
    kind: "artwork_sold",
    title: `"${artworkTitle}" sold`,
  };
}

export function savedArtworkSoldNotification({
  artistName,
  artworkHref,
  artworkTitle,
  imageUrl,
}: {
  artistName: string;
  artworkHref: string;
  artworkTitle: string;
  imageUrl: string | null;
}): NotificationTemplate {
  return {
    actionHref: artworkHref,
    actionLabel: "See the artwork",
    body: `"${artworkTitle}" by ${artistName}, which you saved to your favorites, has been sold. Follow ${artistName} to hear first when new originals are listed.`,
    emailSubject: `"${artworkTitle}" has been sold`,
    imageUrl,
    kind: "saved_artwork_sold",
    title: "An artwork you saved has sold",
  };
}

export function followedArtistListedNotification({
  artistName,
  artworkHref,
  artworkTitle,
  imageUrl,
}: {
  artistName: string;
  artworkHref: string;
  artworkTitle: string;
  imageUrl: string | null;
}): NotificationTemplate {
  return {
    actionHref: artworkHref,
    actionLabel: "View the artwork",
    body: `${artistName} just published "${artworkTitle}". You are seeing this because you follow ${artistName} on EduthArt.`,
    emailSubject: `${artistName} published new artwork`,
    imageUrl,
    kind: "followed_artist_listed",
    title: `${artistName} published new artwork`,
  };
}

export function followedArtistPriceDropNotification({
  artistName,
  artworkHref,
  artworkTitle,
  currency,
  imageUrl,
  nextPriceMinor,
  previousPriceMinor,
}: {
  artistName: string;
  artworkHref: string;
  artworkTitle: string;
  currency: string;
  imageUrl: string | null;
  nextPriceMinor: number;
  previousPriceMinor: number;
}): NotificationTemplate {
  return {
    actionHref: artworkHref,
    actionLabel: "View the artwork",
    body: `${artistName} lowered the price of "${artworkTitle}" from ${formatMinorUnits(previousPriceMinor, currency)} to ${formatMinorUnits(nextPriceMinor, currency)}.`,
    emailSubject: `${artistName} lowered the price of "${artworkTitle}"`,
    imageUrl,
    kind: "followed_artist_price_drop",
    title: `Price drop on "${artworkTitle}"`,
  };
}
