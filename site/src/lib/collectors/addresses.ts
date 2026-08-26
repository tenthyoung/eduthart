import type {
  AddressKind,
  SavedAddress,
} from "@/lib/collectors/address-format";
import {
  createDocumentId,
  deleteUserDocument,
  getUserDocument,
  listUserDocuments,
  saveUserDocument,
} from "@/lib/store/document-store";

const ADDRESSES_COLLECTION = "addresses";

export type {
  AddressKind,
  SavedAddress,
} from "@/lib/collectors/address-format";

export type AddressInput = {
  city?: string;
  country?: string;
  isDefault?: boolean;
  kind?: AddressKind;
  label?: string | null;
  line1?: string;
  line2?: string | null;
  name?: string;
  phone?: string | null;
  postalCode?: string;
  region?: string;
};

const REQUIRED_FIELDS: Array<{ field: keyof AddressInput; label: string }> = [
  { field: "name", label: "full name" },
  { field: "line1", label: "street address" },
  { field: "city", label: "city" },
  { field: "postalCode", label: "postal code" },
  { field: "country", label: "country" },
];

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toSavedAddress(
  document: Record<string, unknown> & { id: string }
): SavedAddress {
  return {
    city: readString(document.city),
    country: readString(document.country),
    createdAt: readString(document.createdAt),
    id: document.id,
    isDefault: document.isDefault === true,
    kind: document.kind === "billing" ? "billing" : "shipping",
    label: readString(document.label) || null,
    line1: readString(document.line1),
    line2: readString(document.line2) || null,
    name: readString(document.name),
    phone: readString(document.phone) || null,
    postalCode: readString(document.postalCode),
    region: readString(document.region),
    updatedAt: readString(document.updatedAt),
  };
}

function validate(input: AddressInput) {
  const missing = REQUIRED_FIELDS.filter(
    ({ field }) => !readString(input[field])
  ).map(({ label }) => label);

  if (missing.length > 0) {
    throw new Error(`Please add a ${missing.join(", a ")} for this address.`);
  }
}

export async function listAddresses(
  uid: string,
  kind?: AddressKind
): Promise<SavedAddress[]> {
  const documents = await listUserDocuments(
    uid,
    ADDRESSES_COLLECTION,
    kind ? [{ field: "kind", value: kind }] : []
  );

  return documents
    .map(toSavedAddress)
    .sort((first, second) =>
      first.isDefault === second.isDefault
        ? second.createdAt.localeCompare(first.createdAt)
        : Number(second.isDefault) - Number(first.isDefault)
    );
}

export async function getDefaultAddress(uid: string, kind: AddressKind) {
  const addresses = await listAddresses(uid, kind);
  return addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
}

export async function getAddress(uid: string, id: string) {
  const document = await getUserDocument(uid, ADDRESSES_COLLECTION, id);
  return document ? toSavedAddress(document) : null;
}

/**
 * Only one address per kind can be the default, so promoting one demotes the
 * rest of that kind. Billing and shipping defaults are independent.
 */
async function clearOtherDefaults(
  uid: string,
  kind: AddressKind,
  keepId: string
) {
  const addresses = await listAddresses(uid, kind);

  await Promise.all(
    addresses
      .filter((address) => address.isDefault && address.id !== keepId)
      .map((address) =>
        saveUserDocument(uid, ADDRESSES_COLLECTION, address.id, {
          isDefault: false,
        })
      )
  );
}

export async function saveAddress(
  uid: string,
  input: AddressInput,
  id?: string
) {
  validate(input);

  const kind: AddressKind = input.kind === "billing" ? "billing" : "shipping";
  const existing = id ? await getAddress(uid, id) : null;
  const addressId = existing?.id ?? id ?? createDocumentId("adr");
  const now = new Date().toISOString();
  const existingOfKind = await listAddresses(uid, kind);
  // The first address of a kind becomes its default so checkout always has one.
  const isDefault = input.isDefault === true || existingOfKind.length === 0;

  await saveUserDocument(uid, ADDRESSES_COLLECTION, addressId, {
    city: readString(input.city),
    country: readString(input.country).toUpperCase(),
    createdAt: existing?.createdAt || now,
    isDefault,
    kind,
    label: readString(input.label) || null,
    line1: readString(input.line1),
    line2: readString(input.line2) || null,
    name: readString(input.name),
    phone: readString(input.phone) || null,
    postalCode: readString(input.postalCode),
    region: readString(input.region),
    updatedAt: now,
  });

  if (isDefault) {
    await clearOtherDefaults(uid, kind, addressId);
  }

  return getAddress(uid, addressId);
}

export async function setDefaultAddress(uid: string, id: string) {
  const address = await getAddress(uid, id);

  if (!address) {
    throw new Error("That address could not be found.");
  }

  await saveUserDocument(uid, ADDRESSES_COLLECTION, id, {
    isDefault: true,
    updatedAt: new Date().toISOString(),
  });
  await clearOtherDefaults(uid, address.kind, id);

  return getAddress(uid, id);
}

export async function deleteAddress(uid: string, id: string) {
  const address = await getAddress(uid, id);

  if (!address) {
    return;
  }

  await deleteUserDocument(uid, ADDRESSES_COLLECTION, id);

  // Losing the default leaves the kind without one, so the next address takes over.
  if (address.isDefault) {
    const remaining = await listAddresses(uid, address.kind);

    if (remaining[0]) {
      await saveUserDocument(uid, ADDRESSES_COLLECTION, remaining[0].id, {
        isDefault: true,
      });
    }
  }
}
