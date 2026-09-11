import { describe, expect, test } from "vitest";

import {
  DELETE as dismissNotificationRoute,
  GET as notificationsRoute,
  PATCH as readNotificationRoute,
} from "@/app/api/notifications/route";
import type { UserNotification } from "@/lib/notifications/types";

import { callRoute, callRouteOk } from "./support/routes";
import {
  createAccount,
  followArtist,
  listNotifications,
  findNotification,
  publishArtwork,
} from "./support/accounts";

/**
 * Follower alerts, covered at the dispatch layer.
 *
 * Publishing runs the same index sync and follower fan-out the listing studio
 * triggers, so these assert on the notification a follower is actually given —
 * its kind, wording, and the link it points at — without a browser.
 */
describe("follower notifications", () => {
  test("tells followers when an artist lowers a price", async () => {
    const artist = await createAccount({
      displayName: "Marina Vale",
      uid: "artist-price-alert",
      username: "marina-price-alert",
    });
    const artwork = await publishArtwork({ price: "2400", uid: artist.uid });
    const follower = await createAccount({
      displayName: "Sam Follower",
      uid: "collector-price-watcher",
    });

    await followArtist(follower.uid, artist.username!);

    // Re-publish the same listing at a lower price.
    await publishArtwork({
      itemId: artwork.itemId,
      price: "1800",
      uid: artist.uid,
    });

    const notification = await findNotification(
      follower.uid,
      "followed_artist_price_drop"
    );

    expect(notification.title).toBe('Price drop on "Harbour Light"');
    expect(notification.body).toContain("from $2,400.00 to $1,800.00");
    expect(notification.actionHref).toBe(artwork.href);
    expect(notification.readAt).toBeNull();
  });

  test("tells followers when an artist publishes new work", async () => {
    const artist = await createAccount({
      displayName: "Marina Vale",
      uid: "artist-publish-alert",
      username: "marina-publish-alert",
    });
    const follower = await createAccount({
      displayName: "Sam Follower",
      uid: "collector-follower",
    });

    await followArtist(follower.uid, artist.username!);
    const artwork = await publishArtwork({
      title: "Slate Morning",
      uid: artist.uid,
    });

    const notification = await findNotification(
      follower.uid,
      "followed_artist_listed"
    );

    expect(notification.title).toBe("Marina Vale published new artwork");
    expect(notification.actionHref).toBe(artwork.href);
  });

  test("leaves artwork published before the follow out of the feed", async () => {
    const artist = await createAccount({
      displayName: "Marina Vale",
      uid: "artist-late-follow",
      username: "marina-late-follow",
    });
    await publishArtwork({ title: "Earlier Work", uid: artist.uid });

    const follower = await createAccount({
      displayName: "Sam Follower",
      uid: "collector-late-follower",
    });
    await followArtist(follower.uid, artist.username!);

    const kinds = (await listNotifications(follower.uid)).map(
      (notification) => notification.kind
    );

    expect(kinds).not.toContain("followed_artist_listed");
  });
});

/**
 * The notification centre itself.
 *
 * The unread count and the read/dismiss controls are the same response the page
 * renders, so they are worth pinning here rather than through three clicks.
 */
describe("the notification centre", () => {
  type Centre = { notifications: UserNotification[]; unreadCount: number };

  async function centre(uid: string) {
    return callRouteOk<Centre>(notificationsRoute, {
      as: uid,
      path: "/api/notifications",
    });
  }

  test("reminds a new collector to choose a username", async () => {
    const collector = await createAccount({ uid: "notify-username-user" });

    const { notifications, unreadCount } = await centre(collector.uid);

    expect(unreadCount).toBe(1);
    expect(notifications[0]).toMatchObject({
      kind: "choose_username",
      readAt: null,
      title: "Choose a username",
    });
  });

  test("marks a notification read and then dismisses it", async () => {
    const collector = await createAccount({ uid: "notify-read-user" });
    const [reminder] = (await centre(collector.uid)).notifications;

    const read = await callRouteOk<Centre>(readNotificationRoute, {
      as: collector.uid,
      body: { id: reminder.id, read: true },
      method: "PATCH",
      path: "/api/notifications",
    });

    expect(read.unreadCount).toBe(0);
    expect(read.notifications[0].readAt).not.toBeNull();

    const dismissed = await callRouteOk<Centre>(dismissNotificationRoute, {
      as: collector.uid,
      body: { id: reminder.id },
      method: "DELETE",
      path: "/api/notifications",
    });

    expect(dismissed.notifications).toEqual([]);
  });

  test("is refused without a signed-in account", async () => {
    const result = await callRoute(notificationsRoute, {
      path: "/api/notifications",
    });

    expect(result.status).toBe(401);
  });
});
