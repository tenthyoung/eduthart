import { z } from "zod";

/**
 * Where a person is based: a city, its region and its country. Never a street
 * address. Public pages show only this, so it is safe to display anywhere.
 *
 * Stored on the profile as `locationPlace`. The older `location` string stays
 * on the profile as the text pages display: it is rebuilt from these parts on
 * every save, and profiles saved before EDUTHA-130 keep their free text there
 * untouched until the person picks a city.
 */
export type ProfileLocation = {
  city: string;
  /** State, province or similar. Empty when the country has none. */
  region: string | null;
  country: string;
  /** ISO 3166-1 alpha-2 code when Google supplied it, e.g. "US". */
  countryCode: string | null;
  /** Google Places id when picked from autocomplete; null when typed. */
  placeId: string | null;
};

export const MAX_LOCATION_PART_LENGTH = 80;

function readPart(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_LOCATION_PART_LENGTH) : null;
}

/** Reads a stored or submitted location, or null if it has no city/country. */
export function normalizeProfileLocation(
  value: unknown
): ProfileLocation | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const city = readPart(record.city);
  const country = readPart(record.country);

  if (!city || !country) {
    return null;
  }

  const countryCode = readPart(record.countryCode);
  const placeId = readPart(record.placeId);

  return {
    city,
    region: readPart(record.region),
    country,
    countryCode:
      countryCode && /^[A-Za-z]{2}$/.test(countryCode)
        ? countryCode.toUpperCase()
        : null,
    placeId: placeId && /^[\w-]{1,300}$/.test(placeId) ? placeId : null,
  };
}

/**
 * "Brooklyn, New York, United States", or "Lyon, France" when there is no
 * region (or the region just repeats the city, as in "Singapore").
 */
export function formatProfileLocation(location: ProfileLocation) {
  const parts = [location.city];

  if (
    location.region &&
    location.region.toLowerCase() !== location.city.toLowerCase()
  ) {
    parts.push(location.region);
  }

  if (location.country.toLowerCase() !== location.city.toLowerCase()) {
    parts.push(location.country);
  }

  return parts.join(", ");
}

/** What the location field holds while someone is editing it. */
export type ProfileLocationInput = {
  city: string;
  region: string;
  country: string;
  countryCode: string;
  placeId: string;
  /**
   * The free text saved before EDUTHA-130. Shown so it is never silently
   * lost, kept on save while no city is picked, and cleared only when the
   * person removes it.
   */
  legacyText: string;
  /**
   * Text typed into the city search but not yet picked from the list. Kept
   * in the form so a save can't silently drop it.
   */
  pendingQuery: string;
};

export const EMPTY_PROFILE_LOCATION_INPUT: ProfileLocationInput = {
  city: "",
  region: "",
  country: "",
  countryCode: "",
  placeId: "",
  legacyText: "",
  pendingQuery: "",
};

export function toProfileLocationInput(profile: {
  location: string | null;
  locationPlace: ProfileLocation | null;
}): ProfileLocationInput {
  if (profile.locationPlace) {
    return {
      city: profile.locationPlace.city,
      region: profile.locationPlace.region ?? "",
      country: profile.locationPlace.country,
      countryCode: profile.locationPlace.countryCode ?? "",
      placeId: profile.locationPlace.placeId ?? "",
      legacyText: "",
      pendingQuery: "",
    };
  }

  return {
    ...EMPTY_PROFILE_LOCATION_INPUT,
    legacyText: profile.location ?? "",
  };
}

const partSchema = z
  .string()
  .max(
    MAX_LOCATION_PART_LENGTH,
    `Keep each part under ${MAX_LOCATION_PART_LENGTH} characters.`
  );

export const profileLocationInputSchema = z
  .object({
    city: partSchema,
    region: partSchema,
    country: partSchema,
    countryCode: z.string(),
    placeId: z.string(),
    legacyText: z.string(),
    pendingQuery: z.string(),
  })
  .superRefine((value, context) => {
    if (value.pendingQuery.trim()) {
      context.addIssue({
        code: "custom",
        message:
          "Pick your city from the list, or choose \u201cType it in instead\u201d.",
      });
      return;
    }

    const started = Boolean(
      value.city.trim() || value.region.trim() || value.country.trim()
    );

    if (started && !(value.city.trim() && value.country.trim())) {
      context.addIssue({
        code: "custom",
        message: "Enter at least a city and a country, or leave all three blank.",
      });
    }
  });

/** What a location field will save, as display text ("" when empty). */
export function describeProfileLocationInput(input: ProfileLocationInput) {
  const place = normalizeProfileLocation(input);
  return place ? formatProfileLocation(place) : input.legacyText.trim();
}

/**
 * The PATCH body for a location field: the structured location when a city
 * is set, otherwise the old free text (kept, or cleared if removed).
 */
export function toProfileLocationPatch(input: ProfileLocationInput): {
  location?: string | null;
  locationPlace: ProfileLocation | null;
} {
  const place = normalizeProfileLocation(input);

  if (place) {
    return { locationPlace: place };
  }

  return {
    location: input.legacyText.trim() || null,
    locationPlace: null,
  };
}
