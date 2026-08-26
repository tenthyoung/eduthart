import {
  listIndexedArtworks,
  type IndexedArtwork,
} from "@/lib/artists/artwork-index";
import {
  buildArtworkKey,
  type ArtworkReference,
} from "@/lib/collectors/artwork-reference";
import {
  createDocumentId,
  deleteRootDocument,
  deleteUserDocument,
  getRootDocument,
  getUserDocument,
  listUserDocuments,
  saveRootDocument,
  saveUserDocument,
} from "@/lib/store/document-store";

const COLLECTIONS_COLLECTION = "collections";
const COLLECTION_ITEMS_COLLECTION = "collection_items";
const SHARED_COLLECTIONS_COLLECTION = "shared_collections";

export const MAX_COLLECTION_NAME_LENGTH = 60;

export type CollectionArtwork = {
  addedAt: string;
  artwork: IndexedArtwork | null;
  key: string;
};

export type ArtworkCollection = {
  artworks: CollectionArtwork[];
  createdAt: string;
  description: string | null;
  id: string;
  isPublic: boolean;
  name: string;
  ownerUid: string;
  shareId: string | null;
  updatedAt: string;
};

function normalizeName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Give your collection a name.");
  }

  if (trimmed.length > MAX_COLLECTION_NAME_LENGTH) {
    throw new Error(
      `Collection names must be ${MAX_COLLECTION_NAME_LENGTH} characters or fewer.`
    );
  }

  return trimmed;
}

function buildItemId(collectionId: string, artworkKey: string) {
  return `${collectionId}__${artworkKey}`;
}

async function readCollectionArtworks(
  uid: string,
  collectionId: string,
  index: Map<string, IndexedArtwork>
) {
  const documents = await listUserDocuments(uid, COLLECTION_ITEMS_COLLECTION, [
    { field: "collectionId", value: collectionId },
  ]);

  return documents
    .map((document) => {
      const key =
        typeof document.artworkKey === "string" ? document.artworkKey : "";

      return {
        addedAt: typeof document.addedAt === "string" ? document.addedAt : "",
        artwork: index.get(key) ?? null,
        key,
      };
    })
    .sort((first, second) => second.addedAt.localeCompare(first.addedAt));
}

function toCollection(
  document: Record<string, unknown> & { id: string },
  ownerUid: string,
  artworks: CollectionArtwork[]
): ArtworkCollection {
  return {
    artworks,
    createdAt: typeof document.createdAt === "string" ? document.createdAt : "",
    description:
      typeof document.description === "string" ? document.description : null,
    id: document.id,
    isPublic: document.isPublic === true,
    name:
      typeof document.name === "string" ? document.name : "Untitled collection",
    ownerUid,
    shareId: typeof document.shareId === "string" ? document.shareId : null,
    updatedAt: typeof document.updatedAt === "string" ? document.updatedAt : "",
  };
}

export async function listCollections(
  uid: string
): Promise<ArtworkCollection[]> {
  const documents = await listUserDocuments(uid, COLLECTIONS_COLLECTION);
  const index = new Map(
    (await listIndexedArtworks()).map((artwork) => [artwork.key, artwork])
  );

  const collections = await Promise.all(
    documents.map(async (document) =>
      toCollection(
        document,
        uid,
        await readCollectionArtworks(uid, document.id, index)
      )
    )
  );

  return collections.sort((first, second) =>
    second.createdAt.localeCompare(first.createdAt)
  );
}

export async function getCollection(uid: string, collectionId: string) {
  const document = await getUserDocument(
    uid,
    COLLECTIONS_COLLECTION,
    collectionId
  );

  if (!document) {
    return null;
  }

  const index = new Map(
    (await listIndexedArtworks()).map((artwork) => [artwork.key, artwork])
  );
  return toCollection(
    document,
    uid,
    await readCollectionArtworks(uid, collectionId, index)
  );
}

export async function createCollection(
  uid: string,
  name: string,
  description?: string | null
) {
  const now = new Date().toISOString();
  const id = createDocumentId("col");

  await saveUserDocument(uid, COLLECTIONS_COLLECTION, id, {
    createdAt: now,
    description: description?.trim() || null,
    isPublic: false,
    name: normalizeName(name),
    shareId: null,
    updatedAt: now,
  });

  return getCollection(uid, id);
}

export async function renameCollection(
  uid: string,
  collectionId: string,
  name: string
) {
  const existing = await getUserDocument(
    uid,
    COLLECTIONS_COLLECTION,
    collectionId
  );

  if (!existing) {
    throw new Error("That collection could not be found.");
  }

  await saveUserDocument(uid, COLLECTIONS_COLLECTION, collectionId, {
    name: normalizeName(name),
    updatedAt: new Date().toISOString(),
  });

  return getCollection(uid, collectionId);
}

export async function deleteCollection(uid: string, collectionId: string) {
  const existing = await getUserDocument(
    uid,
    COLLECTIONS_COLLECTION,
    collectionId
  );

  if (!existing) {
    return;
  }

  if (typeof existing.shareId === "string" && existing.shareId) {
    await deleteRootDocument(SHARED_COLLECTIONS_COLLECTION, existing.shareId);
  }

  const items = await listUserDocuments(uid, COLLECTION_ITEMS_COLLECTION, [
    { field: "collectionId", value: collectionId },
  ]);

  await Promise.all(
    items.map((item) =>
      deleteUserDocument(uid, COLLECTION_ITEMS_COLLECTION, item.id)
    )
  );
  await deleteUserDocument(uid, COLLECTIONS_COLLECTION, collectionId);
}

/**
 * Publish or unpublish a collection.
 *
 * A share id is minted on first publish and kept afterwards, so a link that a
 * collector has already sent to someone keeps working if they unpublish and
 * publish again.
 */
export async function setCollectionVisibility(
  uid: string,
  collectionId: string,
  isPublic: boolean
) {
  const existing = await getUserDocument(
    uid,
    COLLECTIONS_COLLECTION,
    collectionId
  );

  if (!existing) {
    throw new Error("That collection could not be found.");
  }

  const shareId =
    typeof existing.shareId === "string" && existing.shareId
      ? existing.shareId
      : createDocumentId("share");

  await saveUserDocument(uid, COLLECTIONS_COLLECTION, collectionId, {
    isPublic,
    shareId,
    updatedAt: new Date().toISOString(),
  });

  if (isPublic) {
    await saveRootDocument(SHARED_COLLECTIONS_COLLECTION, shareId, {
      collectionId,
      ownerUid: uid,
    });
  } else {
    await deleteRootDocument(SHARED_COLLECTIONS_COLLECTION, shareId);
  }

  return getCollection(uid, collectionId);
}

export async function addArtworkToCollection(
  uid: string,
  collectionId: string,
  reference: ArtworkReference
) {
  const existing = await getUserDocument(
    uid,
    COLLECTIONS_COLLECTION,
    collectionId
  );

  if (!existing) {
    throw new Error("That collection could not be found.");
  }

  const artworkKey = buildArtworkKey(reference);

  await saveUserDocument(
    uid,
    COLLECTION_ITEMS_COLLECTION,
    buildItemId(collectionId, artworkKey),
    {
      addedAt: new Date().toISOString(),
      artworkKey,
      collectionId,
    }
  );

  return getCollection(uid, collectionId);
}

export async function removeArtworkFromCollection(
  uid: string,
  collectionId: string,
  artworkKey: string
) {
  await deleteUserDocument(
    uid,
    COLLECTION_ITEMS_COLLECTION,
    buildItemId(collectionId, artworkKey)
  );
  return getCollection(uid, collectionId);
}

export async function getSharedCollection(shareId: string) {
  const pointer = await getRootDocument(SHARED_COLLECTIONS_COLLECTION, shareId);

  if (
    !pointer ||
    typeof pointer.ownerUid !== "string" ||
    typeof pointer.collectionId !== "string"
  ) {
    return null;
  }

  const collection = await getCollection(
    pointer.ownerUid,
    pointer.collectionId
  );
  return collection?.isPublic ? collection : null;
}

export async function deleteAllCollections(uid: string) {
  const collections = await listUserDocuments(uid, COLLECTIONS_COLLECTION);
  await Promise.all(
    collections.map((collection) => deleteCollection(uid, collection.id))
  );
}
