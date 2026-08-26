import type { ArtworkIndexChange } from "@/lib/artists/artwork-index";
import { loadAccountProfile } from "@/lib/auth/profile-store";
import { listArtistFollowerUids } from "@/lib/collectors/follows";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import {
  followedArtistListedNotification,
  followedArtistPriceDropNotification,
} from "@/lib/notifications/templates";

/**
 * Tell an artist's followers about new listings and price reductions.
 *
 * Only the two changes a collector asked to hear about are announced; ordinary
 * edits to a listing are not. Dedupe keys are derived from the artwork and the
 * new price so re-saving a studio cannot send the same alert twice.
 */
export async function notifyFollowersOfListingChanges(
  artistUid: string,
  artistName: string,
  changes: ArtworkIndexChange[],
) {
  const announceable = changes.filter(
    (change) => change.type === "listed" || change.type === "price_drop",
  );

  if (announceable.length === 0) {
    return;
  }

  const followerUids = await listArtistFollowerUids(artistUid);

  if (followerUids.length === 0) {
    return;
  }

  const followers = await Promise.all(
    followerUids.map(async (uid) => ({ email: (await loadAccountProfile(uid))?.email ?? null, uid })),
  );

  for (const change of announceable) {
    const { entry } = change;

    const template =
      change.type === "listed"
        ? followedArtistListedNotification({
            artistName,
            artworkHref: entry.href,
            artworkTitle: entry.title,
            imageUrl: entry.imageUrl,
          })
        : followedArtistPriceDropNotification({
            artistName,
            artworkHref: entry.href,
            artworkTitle: entry.title,
            currency: entry.currency,
            imageUrl: entry.imageUrl,
            nextPriceMinor: entry.priceMinor,
            previousPriceMinor: change.previousPriceMinor ?? entry.priceMinor,
          });

    const dedupeKey =
      change.type === "listed"
        ? `ntf_listed_${entry.key}`
        : `ntf_drop_${entry.key}_${entry.priceMinor}`;

    await Promise.all(
      followers.map((follower) => dispatchNotification(follower, template, { dedupeKey })),
    );
  }
}
