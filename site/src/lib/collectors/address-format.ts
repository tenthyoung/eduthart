export type AddressKind = "billing" | "shipping";

export type SavedAddress = {
  city: string;
  country: string;
  createdAt: string;
  id: string;
  isDefault: boolean;
  kind: AddressKind;
  label: string | null;
  line1: string;
  line2: string | null;
  name: string;
  phone: string | null;
  postalCode: string;
  region: string;
  updatedAt: string;
};

/**
 * Shape an address for display.
 *
 * Kept apart from the address store so client components can format an address
 * without pulling the Firebase Admin SDK into the browser bundle.
 */
export function formatAddressLines(address: SavedAddress) {
  return [
    address.name,
    address.line1,
    address.line2,
    [address.city, address.region, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ].filter((line): line is string => Boolean(line));
}
