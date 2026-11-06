import {
  listIndexedArtworks,
  type IndexedArtwork,
} from "@/lib/artists/artwork-index";
import {
  ADVISORY_BUDGETS,
  ADVISORY_ROOMS,
  ADVISORY_SIZES,
  ADVISORY_TIMELINES,
  MAX_ADVISORY_NAME_LENGTH,
  MAX_ADVISORY_NOTES_LENGTH,
  MAX_ADVISORY_STYLE_LENGTH,
  labelFor,
  type AdvisoryOption,
} from "@/lib/advisory/options";
import { getAdvisoryInboxEmail, sendAdvisoryEmail } from "@/lib/advisory/email";
import {
  addArtworkToCollection,
  createCollection,
  MAX_COLLECTION_NAME_LENGTH,
  setCollectionVisibility,
} from "@/lib/collectors/collections";
import { listFavorites } from "@/lib/collectors/favorites";
import {
  createDocumentId,
  getRootDocument,
  listRootDocuments,
  saveRootDocument,
  type StoredDocument,
} from "@/lib/store/document-store";

/**
 * The "Help me choose" art advisory service.
 *
 * A buyer describes what they are looking for; the request lands in the admin
 * inbox next to anything they have saved; an advisor answers with a shortlist,
 * which is an ordinary collection in the advisor's account published as a
 * link-only share. Nothing here is a new kind of list: the shortlist is the
 * same collection a collector would build, so the share page already exists.
 */

const ADVISORY_REQUESTS_COLLECTION = "advisory_requests";

export const ADVISORY_STATUSES = ["new", "shortlist_sent", "closed"] as const;
export type AdvisoryStatus = (typeof ADVISORY_STATUSES)[number];

export class AdvisoryInputError extends Error {
  constructor(
    message: string,
    readonly field: string | null = null
  ) {
    super(message);
    this.name = "AdvisoryInputError";
  }
}

export type AdvisoryRequestInput = {
  budget: string;
  email: string;
  name: string;
  notes: string;
  room: string;
  size: string;
  style: string;
  timeline: string;
};

export type AdvisoryShortlist = {
  artworkCount: number;
  collectionId: string;
  message: string;
  ownerUid: string;
  sentAt: string;
  shareId: string;
  sharePath: string;
};

export type AdvisoryRequest = AdvisoryRequestInput & {
  createdAt: string;
  id: string;
  shortlist: AdvisoryShortlist | null;
  status: AdvisoryStatus;
  uid: string | null;
  updatedAt: string;
};

export type AdvisorySavedItem = {
  artwork: IndexedArtwork;
  savedAt: string;
};

export type AdvisoryInboxItem = AdvisoryRequest & {
  savedItems: AdvisorySavedItem[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requireOption(
  options: readonly AdvisoryOption[],
  value: unknown,
  field: string,
  message: string
) {
  const chosen = readString(value);

  if (!options.some((option) => option.value === chosen)) {
    throw new AdvisoryInputError(message, field);
  }

  return chosen;
}

/**
 * Check a submitted form and return the values to store.
 *
 * Throws on the first problem, naming the field so the form can put the
 * message beside it. The form keeps everything the buyer typed either way.
 */
export function parseAdvisoryRequestInput(
  raw: Record<string, unknown>
): AdvisoryRequestInput {
  const name = readString(raw.name);
  const email = readString(raw.email).toLowerCase();
  const style = readString(raw.style);
  const notes = readString(raw.notes);

  if (!name) {
    throw new AdvisoryInputError("Tell us your name.", "name");
  }

  if (name.length > MAX_ADVISORY_NAME_LENGTH) {
    throw new AdvisoryInputError("That name is too long.", "name");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new AdvisoryInputError(
      "Enter an email address we can reply to.",
      "email"
    );
  }

  const budget = requireOption(
    ADVISORY_BUDGETS,
    raw.budget,
    "budget",
    "Choose a budget."
  );
  const room = requireOption(
    ADVISORY_ROOMS,
    raw.room,
    "room",
    "Choose where the work will hang."
  );
  const size = requireOption(
    ADVISORY_SIZES,
    raw.size,
    "size",
    "Choose a size."
  );
  const timeline = requireOption(
    ADVISORY_TIMELINES,
    raw.timeline,
    "timeline",
    "Choose a timeline."
  );

  if (!style) {
    throw new AdvisoryInputError(
      "Describe the style you like, even in a few words.",
      "style"
    );
  }

  if (style.length > MAX_ADVISORY_STYLE_LENGTH) {
    throw new AdvisoryInputError(
      `Keep the style to ${MAX_ADVISORY_STYLE_LENGTH} characters or fewer.`,
      "style"
    );
  }

  if (notes.length > MAX_ADVISORY_NOTES_LENGTH) {
    throw new AdvisoryInputError(
      `Keep your notes to ${MAX_ADVISORY_NOTES_LENGTH} characters or fewer.`,
      "notes"
    );
  }

  return { budget, email, name, notes, room, size, style, timeline };
}

function toShortlist(value: unknown): AdvisoryShortlist | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.shareId !== "string" || !record.shareId) {
    return null;
  }

  return {
    artworkCount:
      typeof record.artworkCount === "number" ? record.artworkCount : 0,
    collectionId: readString(record.collectionId),
    message: readString(record.message),
    ownerUid: readString(record.ownerUid),
    sentAt: readString(record.sentAt),
    shareId: record.shareId,
    sharePath: `/collections/${record.shareId}`,
  };
}

function toAdvisoryRequest(document: StoredDocument): AdvisoryRequest {
  const status = ADVISORY_STATUSES.includes(document.status as AdvisoryStatus)
    ? (document.status as AdvisoryStatus)
    : "new";

  return {
    budget: readString(document.budget),
    createdAt: readString(document.createdAt),
    email: readString(document.email),
    id: document.id,
    name: readString(document.name),
    notes: readString(document.notes),
    room: readString(document.room),
    shortlist: toShortlist(document.shortlist),
    size: readString(document.size),
    status,
    style: readString(document.style),
    timeline: readString(document.timeline),
    uid: typeof document.uid === "string" && document.uid ? document.uid : null,
    updatedAt: readString(document.updatedAt),
  };
}

export function describeAdvisoryBrief(request: AdvisoryRequestInput) {
  return [
    `Budget: ${labelFor(ADVISORY_BUDGETS, request.budget)}`,
    `Room: ${labelFor(ADVISORY_ROOMS, request.room)}`,
    `Size: ${labelFor(ADVISORY_SIZES, request.size)}`,
    `Timeline: ${labelFor(ADVISORY_TIMELINES, request.timeline)}`,
    `Style: ${request.style}`,
    request.notes ? `Notes: ${request.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name.trim();
}

export async function getAdvisoryRequest(id: string) {
  const document = await getRootDocument(ADVISORY_REQUESTS_COLLECTION, id);
  return document ? toAdvisoryRequest(document) : null;
}

/**
 * Store a request, confirm it to the buyer, and tell the gallery.
 *
 * One request is one document, so a buyer who submits twice gets two inbox
 * items rather than a silently merged one. Email failures do not undo the
 * request; the caller learns whether the confirmation went out.
 */
export async function createAdvisoryRequest(
  input: AdvisoryRequestInput,
  uid: string | null
) {
  const now = new Date().toISOString();
  const id = createDocumentId("adv");

  await saveRootDocument(ADVISORY_REQUESTS_COLLECTION, id, {
    ...input,
    createdAt: now,
    shortlist: null,
    status: "new",
    uid,
    updatedAt: now,
  });

  const brief = describeAdvisoryBrief(input);

  const [confirmationSent] = await Promise.all([
    sendAdvisoryEmail({
      body: `Thank you for asking us to help you choose. A curator will read your brief and reply to this address with a shortlist of works to consider.\n\nWhat you told us:\n${brief}`,
      subject: "We have your art advisory request",
      title: `Thanks, ${firstName(input.name)}. We have your request.`,
      to: input.email,
    }),
    sendAdvisoryEmail({
      actionHref: "/admin/advisory",
      actionLabel: "Open the advisory inbox",
      body: `${input.name} <${input.email}>${uid ? " (signed in)" : " (guest)"}\n\n${brief}`,
      replyTo: input.email,
      subject: `New advisory request from ${input.name}`,
      title: "New art advisory request",
      to: getAdvisoryInboxEmail(),
    }),
  ]);

  return { confirmationSent, id };
}

async function listSavedItems(uid: string): Promise<AdvisorySavedItem[]> {
  const favorites = await listFavorites(uid);

  return favorites.flatMap((favorite) =>
    favorite.artwork
      ? [{ artwork: favorite.artwork, savedAt: favorite.savedAt }]
      : []
  );
}

/** Every request, newest first, with the buyer's saved items beside it. */
export async function listAdvisoryInbox(): Promise<AdvisoryInboxItem[]> {
  const documents = await listRootDocuments(ADVISORY_REQUESTS_COLLECTION);
  const requests = documents
    .map(toAdvisoryRequest)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  const savedByUid = new Map<string, AdvisorySavedItem[]>();

  await Promise.all(
    [...new Set(requests.flatMap((request) => request.uid ?? []))].map(
      async (uid) => savedByUid.set(uid, await listSavedItems(uid))
    )
  );

  return requests.map((request) => ({
    ...request,
    savedItems: request.uid ? (savedByUid.get(request.uid) ?? []) : [],
  }));
}

export async function setAdvisoryRequestStatus(
  id: string,
  status: string
): Promise<AdvisoryRequest> {
  if (!ADVISORY_STATUSES.includes(status as AdvisoryStatus)) {
    throw new AdvisoryInputError("That status is not recognised.", "status");
  }

  const existing = await getAdvisoryRequest(id);

  if (!existing) {
    throw new AdvisoryInputError("That request could not be found.");
  }

  await saveRootDocument(ADVISORY_REQUESTS_COLLECTION, id, {
    status,
    updatedAt: new Date().toISOString(),
  });

  return (await getAdvisoryRequest(id))!;
}

/**
 * Turn the advisor's picks into artworks from the public index.
 *
 * Picks are artwork keys (from the buyer's saved items) or links to artwork
 * pages pasted by the advisor. Only works that are publicly listed right now
 * can go on a shortlist, so anything else is reported back rather than
 * silently dropped.
 */
export async function resolveShortlistPicks(picks: string[]) {
  const index = await listIndexedArtworks();
  const byKey = new Map(index.map((artwork) => [artwork.key, artwork]));
  const byHref = new Map(index.map((artwork) => [artwork.href, artwork]));
  const found = new Map<string, IndexedArtwork>();
  const unknown: string[] = [];

  for (const raw of picks) {
    const pick = raw.trim();

    if (!pick) {
      continue;
    }

    let artwork = byKey.get(pick);

    if (!artwork) {
      let path = pick;

      try {
        path = new URL(pick, "https://eduthart.invalid").pathname;
      } catch {
        // Not a URL; fall through with the raw text.
      }

      artwork = byHref.get(path.replace(/\/+$/, ""));
    }

    if (artwork) {
      found.set(artwork.key, artwork);
    } else {
      unknown.push(pick);
    }
  }

  return { artworks: [...found.values()], unknown };
}

export type SendShortlistInput = {
  message: string;
  picks: string[];
};

/**
 * Build the shortlist as a link-only collection and email it to the buyer.
 *
 * The collection belongs to the advisor, so the share page reads "Curated by"
 * them. It is published so the link works, but nothing on the site lists
 * shared collections, so only someone holding the link can open it.
 */
export async function sendAdvisoryShortlist(
  advisorUid: string,
  requestId: string,
  input: SendShortlistInput
) {
  const request = await getAdvisoryRequest(requestId);

  if (!request) {
    throw new AdvisoryInputError("That request could not be found.");
  }

  const { artworks, unknown } = await resolveShortlistPicks(input.picks);

  if (unknown.length > 0) {
    throw new AdvisoryInputError(
      `These are not listed artworks: ${unknown.join(", ")}`,
      "picks"
    );
  }

  if (artworks.length === 0) {
    throw new AdvisoryInputError(
      "Pick at least one artwork for the shortlist.",
      "picks"
    );
  }

  const message = input.message.trim();
  const name = `Shortlist for ${request.name}`.slice(
    0,
    MAX_COLLECTION_NAME_LENGTH
  );
  const collection = await createCollection(advisorUid, name, message || null);

  if (!collection) {
    throw new Error("The shortlist could not be created.");
  }

  for (const artwork of artworks) {
    await addArtworkToCollection(advisorUid, collection.id, {
      artistUid: artwork.artistUid,
      artistUsername: artwork.artistUsername,
      itemId: artwork.itemId,
    });
  }

  const published = await setCollectionVisibility(
    advisorUid,
    collection.id,
    true
  );

  if (!published?.shareId) {
    throw new Error("The shortlist could not be shared.");
  }

  const sentAt = new Date().toISOString();
  const shortlist = {
    artworkCount: artworks.length,
    collectionId: collection.id,
    message,
    ownerUid: advisorUid,
    sentAt,
    shareId: published.shareId,
  };

  await saveRootDocument(ADVISORY_REQUESTS_COLLECTION, requestId, {
    shortlist,
    status: "shortlist_sent",
    updatedAt: sentAt,
  });

  const sharePath = `/collections/${published.shareId}`;
  const count = artworks.length === 1 ? "one work" : `${artworks.length} works`;
  const emailSent = await sendAdvisoryEmail({
    actionHref: sharePath,
    actionLabel: "See your shortlist",
    body: `${message ? `${message}\n\n` : ""}We have put together ${count} for you to consider. The link below is private to you; share it with anyone you would like a second opinion from.\n\nReply to this email with any questions, or if you would like more options.`,
    subject: "Your EduthArt shortlist is ready",
    title: `${firstName(request.name)}, your shortlist is ready`,
    to: request.email,
  });

  return {
    emailSent,
    request: (await getAdvisoryRequest(requestId))!,
    sharePath,
  };
}
