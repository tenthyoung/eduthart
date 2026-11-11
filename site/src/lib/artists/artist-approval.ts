import type { AccountProfile } from "@/lib/auth/account-profile";

/**
 * Only approved artists can list artwork (EDUTHA-122, decision 1).
 *
 * Approval lives on the `users` profile document as `artistApproved`. It is
 * written only by the server: the admin console's "Approve as artist" and the
 * one-off `scripts/approve-existing-artists.mjs` that grandfathered everyone
 * who was already selling. The profile API never copies it from a request.
 * There is no revoke yet: EDUTHA-138 decides what removing an artist means.
 */

export const ARTIST_NOT_APPROVED_CODE = "artist-not-approved";

export const ARTIST_NOT_APPROVED_MESSAGE =
  "Only approved artists can list artwork on EduthArt. Apply to be an artist and we'll review your work.";

export const ARTIST_APPLICATION_PATH = "/apply-to-be-an-artist";

export function isApprovedArtist(
  profile: Pick<AccountProfile, "artistApproved"> | null | undefined
) {
  return profile?.artistApproved === true;
}

export function artistNotApprovedBody() {
  return {
    error: {
      code: ARTIST_NOT_APPROVED_CODE,
      message: ARTIST_NOT_APPROVED_MESSAGE,
    },
  };
}

/** True when a listing API response says the caller is not an approved artist. */
export async function isArtistNotApprovedResponse(response: Response) {
  if (response.status !== 403) {
    return false;
  }

  try {
    const body = (await response.clone().json()) as {
      error?: { code?: unknown };
    };
    return body?.error?.code === ARTIST_NOT_APPROVED_CODE;
  } catch {
    return false;
  }
}
