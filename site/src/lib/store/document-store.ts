import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { isE2EAuthEnabled } from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

/**
 * Shared persistence for the collector features.
 *
 * Every collector surface (favorites, collections, follows, addresses, orders,
 * notifications) needs the same handful of operations against either Firestore
 * or the file-backed store the Playwright suite runs on. Re-implementing that
 * branch in each route is what made the cart route hard to follow, so the
 * branch lives here once and the domain modules stay backend agnostic.
 */

export type StoredDocument = Record<string, unknown> & { id: string };

export type DocumentFilter = {
  field: string;
  value: unknown;
};

const E2E_STORE_DIR = join(tmpdir(), "eduthart-e2e-document-store");

function toStoredDocument(id: string, data: Record<string, unknown> | undefined): StoredDocument {
  return { ...(data ?? {}), id };
}

function getE2EPath(scope: string, collection: string) {
  return join(E2E_STORE_DIR, encodeURIComponent(scope), `${encodeURIComponent(collection)}.json`);
}

async function readE2ECollection(scope: string, collection: string) {
  try {
    const raw = await fs.readFile(getE2EPath(scope, collection), "utf8");
    return JSON.parse(raw) as Record<string, Record<string, unknown>>;
  } catch {
    return {};
  }
}

async function writeE2ECollection(
  scope: string,
  collection: string,
  documents: Record<string, Record<string, unknown>>,
) {
  const path = getE2EPath(scope, collection);
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(documents), "utf8");
}

function matchesFilters(data: Record<string, unknown>, filters: DocumentFilter[]) {
  return filters.every((filter) => data[filter.field] === filter.value);
}

function userCollectionRef(uid: string, collection: string) {
  return getFirebaseAdminDb().collection("users").doc(uid).collection(collection);
}

export async function listUserDocuments(
  uid: string,
  collection: string,
  filters: DocumentFilter[] = [],
): Promise<StoredDocument[]> {
  if (isE2EAuthEnabled()) {
    const documents = await readE2ECollection(uid, collection);
    return Object.entries(documents)
      .filter(([, data]) => matchesFilters(data, filters))
      .map(([id, data]) => toStoredDocument(id, data));
  }

  let query: FirebaseFirestore.Query = userCollectionRef(uid, collection);

  for (const filter of filters) {
    query = query.where(filter.field, "==", filter.value);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((document) => toStoredDocument(document.id, document.data()));
}

export async function getUserDocument(
  uid: string,
  collection: string,
  id: string,
): Promise<StoredDocument | null> {
  if (isE2EAuthEnabled()) {
    const documents = await readE2ECollection(uid, collection);
    const data = documents[id];
    return data ? toStoredDocument(id, data) : null;
  }

  const snapshot = await userCollectionRef(uid, collection).doc(id).get();
  return snapshot.exists ? toStoredDocument(snapshot.id, snapshot.data()) : null;
}

export async function saveUserDocument(
  uid: string,
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<StoredDocument> {
  if (isE2EAuthEnabled()) {
    const documents = await readE2ECollection(uid, collection);
    documents[id] = { ...(documents[id] ?? {}), ...data };
    await writeE2ECollection(uid, collection, documents);
    return toStoredDocument(id, documents[id]);
  }

  await userCollectionRef(uid, collection).doc(id).set(data, { merge: true });
  const snapshot = await userCollectionRef(uid, collection).doc(id).get();
  return toStoredDocument(snapshot.id, snapshot.data());
}

export async function deleteUserDocument(uid: string, collection: string, id: string) {
  if (isE2EAuthEnabled()) {
    const documents = await readE2ECollection(uid, collection);
    delete documents[id];
    await writeE2ECollection(uid, collection, documents);
    return;
  }

  await userCollectionRef(uid, collection).doc(id).delete();
}

export async function deleteUserCollection(uid: string, collection: string) {
  if (isE2EAuthEnabled()) {
    await fs.rm(getE2EPath(uid, collection), { force: true });
    return;
  }

  const documents = await userCollectionRef(uid, collection).listDocuments();
  await Promise.all(documents.map((document) => document.delete()));
}

const ROOT_SCOPE = "__root__";

export async function listRootDocuments(
  collection: string,
  filters: DocumentFilter[] = [],
): Promise<StoredDocument[]> {
  if (isE2EAuthEnabled()) {
    const documents = await readE2ECollection(ROOT_SCOPE, collection);
    return Object.entries(documents)
      .filter(([, data]) => matchesFilters(data, filters))
      .map(([id, data]) => toStoredDocument(id, data));
  }

  let query: FirebaseFirestore.Query = getFirebaseAdminDb().collection(collection);

  for (const filter of filters) {
    query = query.where(filter.field, "==", filter.value);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((document) => toStoredDocument(document.id, document.data()));
}

export async function getRootDocument(collection: string, id: string): Promise<StoredDocument | null> {
  if (isE2EAuthEnabled()) {
    const documents = await readE2ECollection(ROOT_SCOPE, collection);
    const data = documents[id];
    return data ? toStoredDocument(id, data) : null;
  }

  const snapshot = await getFirebaseAdminDb().collection(collection).doc(id).get();
  return snapshot.exists ? toStoredDocument(snapshot.id, snapshot.data()) : null;
}

export async function saveRootDocument(
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<StoredDocument> {
  if (isE2EAuthEnabled()) {
    const documents = await readE2ECollection(ROOT_SCOPE, collection);
    documents[id] = { ...(documents[id] ?? {}), ...data };
    await writeE2ECollection(ROOT_SCOPE, collection, documents);
    return toStoredDocument(id, documents[id]);
  }

  await getFirebaseAdminDb().collection(collection).doc(id).set(data, { merge: true });
  const snapshot = await getFirebaseAdminDb().collection(collection).doc(id).get();
  return toStoredDocument(snapshot.id, snapshot.data());
}

export async function deleteRootDocument(collection: string, id: string) {
  if (isE2EAuthEnabled()) {
    const documents = await readE2ECollection(ROOT_SCOPE, collection);
    delete documents[id];
    await writeE2ECollection(ROOT_SCOPE, collection, documents);
    return;
  }

  await getFirebaseAdminDb().collection(collection).doc(id).delete();
}

export async function clearDocumentStore() {
  await fs.rm(E2E_STORE_DIR, { force: true, recursive: true });
}

/** Drop every collection belonging to one user. Used to reset a test account. */
export async function clearUserDocuments(uid: string) {
  await fs.rm(join(E2E_STORE_DIR, encodeURIComponent(uid)), { force: true, recursive: true });
}

export function createDocumentId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12);
  return `${prefix}_${random.replaceAll("-", "").slice(0, 20)}`;
}
