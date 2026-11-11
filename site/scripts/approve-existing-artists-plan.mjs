/**
 * Pure decision logic for scripts/approve-existing-artists.mjs, kept apart so
 * it can be unit tested without Firestore.
 *
 * "Already selling" means the artist has at least one real listing: an item
 * that was published, or one they gave a title. Opening the listing studio
 * once creates a blank starter item, so an item count alone would approve
 * everyone who ever clicked "List your art".
 */

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isRealListing(item) {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const published = item.salesVisibility?.draft === false;
  const titled = hasText(item.artworkDetails?.title);
  return published || titled;
}

/** Items from a `seller/listing_flow` document, current or legacy shape. */
export function listingItems(flow) {
  if (typeof flow !== "object" || flow === null) {
    return [];
  }

  if (Array.isArray(flow.items)) {
    return flow.items;
  }

  // Legacy single-listing flow: the item's fields sit at the top level.
  if ("artworkDetails" in flow) {
    return [flow];
  }

  return [];
}

/**
 * @param {{ uid: string, user: Record<string, unknown>, flow: unknown }} input
 * @returns {"approve" | "already-approved" | "no-listings"}
 */
export function planApproval({ user, flow }) {
  if (user?.artistApproved === true) {
    return "already-approved";
  }

  return listingItems(flow).some(isRealListing) ? "approve" : "no-listings";
}
