import { loadAccountProfile } from "@/lib/auth/profile-store";
import {
  deleteRootDocument,
  deleteUserDocument,
  getUserDocument,
  listRootDocuments,
  listUserDocuments,
  saveRootDocument,
  saveUserDocument,
} from "@/lib/store/document-store";

const FOLLOWING_COLLECTION = "following";
const FOLLOWERS_COLLECTION = "artist_followers";

export type FollowedArtist = {
  artistName: string;
  artistUid: string;
  artistUsername: string;
  followedAt: string;
};

/**
 * Followers are written to a root collection as well as the follower's own
 * subcollection. The artist-side lookup ("who do I notify about this listing")
 * has no other way to run without reading every collector.
 */
function buildFollowerKey(artistUid: string, followerUid: string) {
  return `${artistUid}__${followerUid}`;
}

export async function listFollowedArtists(
  uid: string
): Promise<FollowedArtist[]> {
  const documents = await listUserDocuments(uid, FOLLOWING_COLLECTION);

  return documents
    .map((document) => ({
      artistName:
        typeof document.artistName === "string" ? document.artistName : "",
      artistUid: document.id,
      artistUsername:
        typeof document.artistUsername === "string"
          ? document.artistUsername
          : "",
      followedAt:
        typeof document.followedAt === "string" ? document.followedAt : "",
    }))
    .sort((first, second) => second.followedAt.localeCompare(first.followedAt));
}

export async function isFollowingArtist(uid: string, artistUid: string) {
  return (await getUserDocument(uid, FOLLOWING_COLLECTION, artistUid)) !== null;
}

export async function followArtist(uid: string, artistUid: string) {
  if (uid === artistUid) {
    throw new Error("You cannot follow your own artist page.");
  }

  const artist = await loadAccountProfile(artistUid);

  if (!artist?.username) {
    throw new Error("That artist page could not be found.");
  }

  const followedAt = new Date().toISOString();

  await saveUserDocument(uid, FOLLOWING_COLLECTION, artistUid, {
    artistName: artist.displayName ?? `@${artist.username}`,
    artistUid,
    artistUsername: artist.username,
    followedAt,
  });

  await saveRootDocument(
    FOLLOWERS_COLLECTION,
    buildFollowerKey(artistUid, uid),
    {
      artistUid,
      followedAt,
      followerUid: uid,
    }
  );
}

export async function unfollowArtist(uid: string, artistUid: string) {
  await deleteUserDocument(uid, FOLLOWING_COLLECTION, artistUid);
  await deleteRootDocument(
    FOLLOWERS_COLLECTION,
    buildFollowerKey(artistUid, uid)
  );
}

export async function listArtistFollowerUids(artistUid: string) {
  const documents = await listRootDocuments(FOLLOWERS_COLLECTION, [
    { field: "artistUid", value: artistUid },
  ]);

  return documents
    .map((document) =>
      typeof document.followerUid === "string" ? document.followerUid : null
    )
    .filter((followerUid): followerUid is string => followerUid !== null);
}

export async function countArtistFollowers(artistUid: string) {
  return (await listArtistFollowerUids(artistUid)).length;
}

export async function removeAllFollowsForUser(uid: string) {
  const following = await listFollowedArtists(uid);
  await Promise.all(
    following.map((artist) => unfollowArtist(uid, artist.artistUid))
  );
}
