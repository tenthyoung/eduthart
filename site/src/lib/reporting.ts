import { getPublicArtwork } from "@/lib/artists/public-artwork";
import {
  buildProfileDisplayName,
  findAccountProfileByUsername,
} from "@/lib/auth/profile-store";
import { buildArtworkKey } from "@/lib/collectors/artwork-reference";
import { SITE_URL } from "@/lib/site-url";
import {
  createDocumentId,
  listRootDocuments,
  saveRootDocument,
  type StoredDocument,
} from "@/lib/store/document-store";

/**
 * Reports against listed artwork, filed from the public DMCA form.
 *
 * A notice names pages by URL. The ones that point at a listing become a
 * report against that artwork, which is what the admin moderation queue is
 * built from; the notice itself is kept whole in its own collection so nothing
 * the claimant wrote is lost when a URL does not match.
 */

export const ARTWORK_REPORTS_COLLECTION = "artwork_reports";

export type ReportedPage =
  | { itemId: string; kind: "artwork"; username: string }
  | { kind: "artist"; username: string };

const EDUTHART_HOSTS = new Set([
  "eduthart.com",
  "www.eduthart.com",
  new URL(SITE_URL).host.toLowerCase(),
]);

/**
 * Pick out the EduthArt artwork and artist pages from a list of URLs.
 *
 * Anything else — search results, other sites, malformed text — is dropped
 * rather than rejected, so one stray line does not block a notice that also
 * names a real listing. Duplicates collapse to one entry.
 */
export function parseReportedPages(rawUrls: string[]): ReportedPage[] {
  const pages = new Map<string, ReportedPage>();

  for (const rawUrl of rawUrls) {
    const value = rawUrl.trim();
    if (!value) continue;

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      continue;
    }

    if (!EDUTHART_HOSTS.has(url.host.toLowerCase())) continue;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] !== "artists" || !segments[1]) continue;

    const username = decodeURIComponent(segments[1]).trim().toLowerCase();
    if (!username) continue;

    if (segments.length === 2) {
      pages.set(`artist:${username}`, { kind: "artist", username });
      continue;
    }

    if (segments.length === 4 && segments[2] === "art" && segments[3]) {
      const itemId = decodeURIComponent(segments[3]);
      pages.set(`artwork:${username}:${itemId}`, {
        itemId,
        kind: "artwork",
        username,
      });
    }
  }

  return Array.from(pages.values());
}

export type ArtworkReportStatus = "open" | "resolved";

export type ArtworkReport = {
  artistName: string;
  artistUid: string;
  artistUsername: string;
  artworkHref: string;
  artworkKey: string;
  artworkTitle: string;
  createdAt: string;
  details: string;
  id: string;
  imageUrl: string | null;
  itemId: string;
  reason: string;
  reportSource: "web_form";
  reportSubcategory: string | null;
  reportType: "copyright";
  reporterEmail: string | null;
  resolutionAction: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  status: ArtworkReportStatus;
  submissionCollection: string;
  submissionId: string;
};

function readString(document: StoredDocument, field: string) {
  return typeof document[field] === "string" ? (document[field] as string) : "";
}

function readNullableString(document: StoredDocument, field: string) {
  return typeof document[field] === "string"
    ? (document[field] as string)
    : null;
}

export function toArtworkReport(document: StoredDocument): ArtworkReport {
  return {
    artistName: readString(document, "artistName"),
    artistUid: readString(document, "artistUid"),
    artistUsername: readString(document, "artistUsername"),
    artworkHref: readString(document, "artworkHref"),
    artworkKey: readString(document, "artworkKey"),
    artworkTitle: readString(document, "artworkTitle"),
    createdAt: readString(document, "createdAt"),
    details: readString(document, "details"),
    id: document.id,
    imageUrl: readNullableString(document, "imageUrl"),
    itemId: readString(document, "itemId"),
    reason: readString(document, "reason"),
    reportSource: "web_form",
    reportSubcategory: readNullableString(document, "reportSubcategory"),
    reportType: "copyright",
    reporterEmail: readNullableString(document, "reporterEmail"),
    resolutionAction: readNullableString(document, "resolutionAction"),
    resolvedAt: readNullableString(document, "resolvedAt"),
    resolvedBy: readNullableString(document, "resolvedBy"),
    status: document.status === "resolved" ? "resolved" : "open",
    submissionCollection: readString(document, "submissionCollection"),
    submissionId: readString(document, "submissionId"),
  };
}

export type ReportedArtworkMatch = {
  artistName: string;
  artworkKey: string;
  href: string;
  title: string;
};

/**
 * What a notice resolved to: the listings it named, and the artist pages it
 * named without pointing at a particular piece.
 */
export type ReportResolution = {
  artists: Array<{ artistName: string; username: string }>;
  artworks: ReportedArtworkMatch[];
};

/**
 * File one report per listing a notice names, and flag each for admin review.
 *
 * A URL whose artwork is not publicly listed (a typo, or a piece already
 * taken down) is skipped: there is nothing for an admin to act on, and the
 * full URL list is still on the saved notice and in the team email.
 */
export async function createArtworkReports({
  details,
  pages,
  reason,
  reportSubcategory,
  reporterEmail,
  submissionCollection,
  submissionId,
}: {
  details: string;
  pages: ReportedPage[];
  reason: string;
  reportSubcategory: string | null;
  reporterEmail: string;
  submissionCollection: string;
  submissionId: string;
}): Promise<ReportResolution> {
  const resolution: ReportResolution = { artists: [], artworks: [] };

  for (const page of pages) {
    if (page.kind === "artist") {
      const profile = await findAccountProfileByUsername(page.username);
      if (profile?.username) {
        resolution.artists.push({
          artistName: buildProfileDisplayName(profile),
          username: profile.username,
        });
      }
      continue;
    }

    const artwork = await getPublicArtwork(page.username, page.itemId);
    if (!artwork) continue;

    const artworkKey = buildArtworkKey({
      artistUid: artwork.artistUid,
      itemId: artwork.item.id,
    });
    const title = artwork.item.artworkDetails.title || "Untitled artwork";
    const href = `/artists/${artwork.artistUsername}/art/${artwork.item.id}`;

    await saveRootDocument(
      ARTWORK_REPORTS_COLLECTION,
      createDocumentId("rpt"),
      {
        artistName: artwork.artistName,
        artistUid: artwork.artistUid,
        artistUsername: artwork.artistUsername,
        artworkHref: href,
        artworkKey,
        artworkTitle: title,
        createdAt: new Date().toISOString(),
        details,
        imageUrl: artwork.item.media.mainImageUrl,
        itemId: artwork.item.id,
        reason,
        reportSource: "web_form",
        reportSubcategory,
        reportType: "copyright",
        reporterEmail,
        resolutionAction: null,
        resolvedAt: null,
        resolvedBy: null,
        status: "open",
        submissionCollection,
        submissionId,
      }
    );

    resolution.artworks.push({
      artistName: artwork.artistName,
      artworkKey,
      href,
      title,
    });
  }

  return resolution;
}

function newestFirst(a: ArtworkReport, b: ArtworkReport) {
  return b.createdAt.localeCompare(a.createdAt);
}

export async function listOpenArtworkReports(): Promise<ArtworkReport[]> {
  const documents = await listRootDocuments(ARTWORK_REPORTS_COLLECTION, [
    { field: "status", value: "open" },
  ]);
  return documents.map(toArtworkReport).sort(newestFirst);
}

export async function listArtworkReports(
  artworkKey: string
): Promise<ArtworkReport[]> {
  const documents = await listRootDocuments(ARTWORK_REPORTS_COLLECTION, [
    { field: "artworkKey", value: artworkKey },
  ]);
  return documents.map(toArtworkReport).sort(newestFirst);
}

export async function resolveArtworkReports(
  artworkKey: string,
  resolution: { action: string; resolvedBy: string }
) {
  const open = (await listArtworkReports(artworkKey)).filter(
    (report) => report.status === "open"
  );
  const resolvedAt = new Date().toISOString();

  await Promise.all(
    open.map((report) =>
      saveRootDocument(ARTWORK_REPORTS_COLLECTION, report.id, {
        resolutionAction: resolution.action,
        resolvedAt,
        resolvedBy: resolution.resolvedBy,
        status: "resolved",
      })
    )
  );

  return open.length;
}
