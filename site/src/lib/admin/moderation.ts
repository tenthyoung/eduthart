import { AdminRouteError } from "@/lib/admin/server";
import type {
  ArtworkModerationAction,
  ArtworkModerationDetail,
  ArtworkReportRecord,
  ModerationQueueItem,
} from "@/lib/admin/types";
import { syncArtworkIndex } from "@/lib/artists/artwork-index";
import type { ListingItemDraft } from "@/lib/artists/listing-flow";
import {
  isPubliclyListed,
  setListingModeration,
} from "@/lib/artists/listing-store";
import {
  buildArtworkHref,
  getPublicArtworkByUid,
  type PublicArtworkRecord,
} from "@/lib/artists/public-artwork";
import { loadAccountProfile } from "@/lib/auth/profile-store";
import { parseArtworkKey } from "@/lib/collectors/artwork-reference";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { listingModeratedNotification } from "@/lib/notifications/templates";
import {
  listArtworkReports,
  listOpenArtworkReports,
  resolveArtworkReports,
  type ArtworkReport,
} from "@/lib/reporting";
import { createDocumentId, saveRootDocument } from "@/lib/store/document-store";

/**
 * The moderation console, built on artwork reports.
 *
 * Reports arrive from the DMCA form (see `lib/reporting.ts`) and are grouped
 * here by artwork. Acting on one writes the decision onto the listing itself,
 * re-syncs the public index so the piece leaves or rejoins browse at once,
 * resolves the open reports, and tells the artist what happened and why.
 */

const MODERATION_EVENTS_COLLECTION = "artwork_moderation_events";

const ACTIONS: ReadonlySet<ArtworkModerationAction> = new Set([
  "dismiss",
  "hide",
  "remove",
  "restore",
  "warn",
]);

function isModerationAction(value: string): value is ArtworkModerationAction {
  return ACTIONS.has(value as ArtworkModerationAction);
}

function toReportRecord(report: ArtworkReport): ArtworkReportRecord {
  return {
    createdAt: report.createdAt,
    details: report.details,
    id: report.id,
    reason: report.reason,
    reportSource: report.reportSource,
    reportSubcategory: report.reportSubcategory,
    reportType: report.reportType,
    reporterEmail: report.reporterEmail,
    resolutionAction: report.resolutionAction,
    resolvedAt: report.resolvedAt,
    status: report.status,
  };
}

function formatPrice(item: ListingItemDraft) {
  const price = Number(item.pricingInventory.price);

  if (!Number.isFinite(price) || price <= 0) return "Price on request";

  return new Intl.NumberFormat("en-US", {
    currency: item.pricingInventory.currency || "USD",
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
    style: "currency",
  }).format(price);
}

async function loadArtwork(artworkKey: string) {
  const reference = parseArtworkKey(artworkKey);

  if (!reference) {
    return null;
  }

  return getPublicArtworkByUid(reference.artistUid, reference.itemId);
}

/** Open reports grouped by artwork, newest report first. */
export async function listModerationQueue(): Promise<ModerationQueueItem[]> {
  const reports = await listOpenArtworkReports();
  const grouped = new Map<string, ArtworkReport[]>();

  for (const report of reports) {
    const group = grouped.get(report.artworkKey);
    if (group) {
      group.push(report);
    } else {
      grouped.set(report.artworkKey, [report]);
    }
  }

  return Promise.all(
    Array.from(grouped.entries()).map(async ([artworkKey, group]) => {
      const latest = group[0];
      const artwork = await loadArtwork(artworkKey);

      return {
        artistName: artwork?.artistName ?? latest.artistName,
        artistUid: latest.artistUid,
        artistUsername: artwork?.artistUsername ?? latest.artistUsername,
        artworkKey,
        href: latest.artworkHref,
        imageUrl: artwork?.item.media.mainImageUrl ?? latest.imageUrl,
        latestReason: latest.reason,
        latestReportType: latest.reportType,
        latestReportedAt: latest.createdAt,
        listed: artwork ? isPubliclyListed(artwork.item) : false,
        moderationStatus: artwork?.item.moderation?.status ?? null,
        openReportCount: group.length,
        title: artwork?.item.artworkDetails.title || latest.artworkTitle,
      };
    })
  );
}

export async function getArtworkModerationDetail(
  artworkKey: string
): Promise<ArtworkModerationDetail | null> {
  const artwork = await loadArtwork(artworkKey);

  if (!artwork) {
    return null;
  }

  const reports = await listArtworkReports(artworkKey);
  const { item } = artwork;

  return {
    artistName: artwork.artistName,
    artistUid: artwork.artistUid,
    artistUsername: artwork.artistUsername,
    artworkKey,
    availability: item.pricingInventory.availability,
    href: buildArtworkHref(artwork.artistUsername, item.id),
    imageUrl: item.media.mainImageUrl,
    itemId: item.id,
    listed: isPubliclyListed(item),
    moderation: item.moderation,
    openReports: reports
      .filter((report) => report.status === "open")
      .map(toReportRecord),
    priceDisplay: formatPrice(item),
    resolvedReports: reports
      .filter((report) => report.status === "resolved")
      .map(toReportRecord),
    title: item.artworkDetails.title || "Untitled artwork",
  };
}

async function notifyArtist(
  artwork: PublicArtworkRecord,
  action: Exclude<ArtworkModerationAction, "dismiss">,
  reason: string
) {
  const email = (await loadAccountProfile(artwork.artistUid))?.email ?? null;

  await dispatchNotification(
    { email, uid: artwork.artistUid },
    listingModeratedNotification({
      action,
      artworkHref: buildArtworkHref(artwork.artistUsername, artwork.item.id),
      artworkTitle: artwork.item.artworkDetails.title || "Untitled artwork",
      listingHref: `/artists/${artwork.artistUsername}/listings/${artwork.item.id}`,
      reason,
    })
  );
}

/**
 * Apply one decision to an artwork.
 *
 * - `warn` records a warning but leaves the piece listed.
 * - `hide` and `remove` take it off the site: the listing keeps the artist's
 *   own visibility flags, but `isPubliclyListed` is false until an admin
 *   restores it, and the index sync drops it from browse right away.
 * - `restore` clears the decision and re-syncs, so the piece is back if the
 *   artist still has it marked public.
 * - `dismiss` closes the open reports and changes nothing else, for a notice
 *   that turned out to be unfounded.
 *
 * Every action resolves the artwork's open reports, and every one but
 * `dismiss` is explained to the artist.
 */
export async function moderateArtwork({
  action,
  artworkKey,
  moderatorUid,
  reason,
}: {
  action: string;
  artworkKey: string;
  moderatorUid: string;
  reason: string;
}) {
  if (!artworkKey || !action || !reason) {
    throw new AdminRouteError(
      "invalid-argument",
      "artworkKey, action, and reason are required.",
      400
    );
  }
  if (!isModerationAction(action)) {
    throw new AdminRouteError(
      "invalid-argument",
      "Unsupported moderation action.",
      400
    );
  }

  const artwork = await loadArtwork(artworkKey);
  if (!artwork) {
    throw new AdminRouteError("not-found", "Artwork not found.", 404);
  }

  const now = new Date().toISOString();

  if (action !== "dismiss") {
    const moderation =
      action === "restore"
        ? null
        : {
            moderatedAt: now,
            moderatedBy: moderatorUid,
            reason,
            status:
              action === "warn"
                ? ("warned" as const)
                : action === "hide"
                  ? ("hidden" as const)
                  : ("removed" as const),
          };

    const studio = await setListingModeration(
      artwork.artistUid,
      artwork.item.id,
      moderation
    );

    if (studio && action !== "warn") {
      await syncArtworkIndex(
        {
          artistName: artwork.artistName,
          artistUid: artwork.artistUid,
          artistUsername: artwork.artistUsername,
        },
        studio
      );
    }
  }

  const resolvedCount = await resolveArtworkReports(artworkKey, {
    action,
    resolvedBy: moderatorUid,
  });

  await saveRootDocument(
    MODERATION_EVENTS_COLLECTION,
    createDocumentId("mod"),
    {
      action,
      artistUid: artwork.artistUid,
      artworkKey,
      createdAt: now,
      itemId: artwork.item.id,
      moderatedBy: moderatorUid,
      reason,
      resolvedReportCount: resolvedCount,
    }
  );

  if (action !== "dismiss") {
    await notifyArtist(artwork, action, reason);
  }

  return { success: true as const };
}
