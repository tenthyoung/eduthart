export type ArtworkReference = {
  artistUid: string;
  artistUsername: string;
  itemId: string;
};

/**
 * Stable document id for an artwork across every collector collection.
 *
 * Firebase uids and listing ids are alphanumeric, so a double underscore never
 * appears inside either half and the key round-trips cleanly.
 */
export function buildArtworkKey(
  reference: Pick<ArtworkReference, "artistUid" | "itemId">
) {
  return `${reference.artistUid}__${reference.itemId}`;
}

export function parseArtworkKey(
  key: string
): { artistUid: string; itemId: string } | null {
  const [artistUid, itemId] = key.split("__");
  return artistUid && itemId ? { artistUid, itemId } : null;
}
