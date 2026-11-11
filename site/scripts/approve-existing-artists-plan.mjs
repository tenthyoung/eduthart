/**
 * Pure decision logic for scripts/approve-existing-artists.mjs, kept apart so
 * it can be unit tested without Firestore.
 *
 * "Already selling" means the artist has at least one real listing: an item
 * that was published, or one they gave a title, and that moderation has not
 * taken down. Opening the listing studio once creates a blank starter item,
 * so an item count alone would approve everyone who ever clicked "List your
 * art". Titled drafts count on purpose: it is better to approve someone
 * mid-listing than to cut them off.
 */

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isTakenDown(item) {
  const status = item.moderation?.status;
  return status === "hidden" || status === "removed";
}

export function isRealListing(item) {
  if (typeof item !== "object" || item === null || isTakenDown(item)) {
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

  // Legacy single-listing flow: the item's fields sit at the top level. The
  // app detects it by currentStep + completedSteps (isLegacyFlow).
  if ("artworkDetails" in flow || ("currentStep" in flow && "completedSteps" in flow)) {
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

/** Why an artist is being approved, for the dry-run report. */
export function describeRealListings(flow) {
  return listingItems(flow)
    .filter(isRealListing)
    .map((item) => {
      const title = item.artworkDetails?.title?.trim() || "(untitled)";
      const state = item.salesVisibility?.draft === false ? "published" : "draft";
      return `"${title}" (${state})`;
    })
    .join(", ");
}
