import {
  normalizeProfileLocation,
  type ProfileLocation,
} from "@/lib/profile/location";

/**
 * City search through Google Places (the "New" Places API).
 *
 * The key stays on the server: the browser calls /api/places, which calls
 * Google. Without GOOGLE_PLACES_API_KEY the location field falls back to
 * plain city / region / country inputs, so the site works with no key.
 *
 * Cost: autocomplete plus one Place Details (Essentials) lookup per pick,
 * grouped by a session token so a whole search bills as one session.
 */

const PLACES_BASE_URL = "https://places.googleapis.com/v1";

export type CitySuggestion = {
  placeId: string;
  /** "Brooklyn" */
  primary: string;
  /** "New York, United States" */
  secondary: string;
};

export function getGooglePlacesApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

export function isGooglePlacesEnabled() {
  return getGooglePlacesApiKey() !== null;
}

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
};

export async function searchCities(
  input: string,
  sessionToken: string | null,
  fetchImpl: typeof fetch = fetch
): Promise<CitySuggestion[]> {
  const apiKey = getGooglePlacesApiKey();

  if (!apiKey) {
    throw new Error("City search is not set up.");
  }

  const response = await fetchImpl(`${PLACES_BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input,
      // Cities only: never streets or businesses.
      includedPrimaryTypes: ["(cities)"],
      ...(sessionToken ? { sessionToken } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places autocomplete failed (${response.status}).`);
  }

  const payload = (await response.json()) as AutocompleteResponse;

  return (payload.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    const placeId = prediction?.placeId;
    const primary =
      prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text;

    if (!placeId || !primary) {
      return [];
    }

    return [
      {
        placeId,
        primary,
        secondary: prediction?.structuredFormat?.secondaryText?.text ?? "",
      },
    ];
  });
}

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type PlaceDetailsResponse = {
  id?: string;
  addressComponents?: AddressComponent[];
};

function findComponent(components: AddressComponent[], ...types: string[]) {
  for (const type of types) {
    const match = components.find((component) =>
      component.types?.includes(type)
    );

    if (match) {
      return match;
    }
  }

  return undefined;
}

const CITY_TYPES = [
  "locality",
  "postal_town",
  "administrative_area_level_3",
  "sublocality_level_1",
  "sublocality",
  "administrative_area_level_2",
];

/**
 * Turns Google's address components into city, region and country.
 *
 * `pickedName` is the name the person chose in the list ("Brooklyn"). It wins
 * when it is one of the place's own city-level parts, because Google files
 * Brooklyn under the locality "New York" and the person meant Brooklyn.
 */
export function toProfileLocationFromComponents(
  placeId: string,
  components: AddressComponent[],
  pickedName?: string | null
): ProfileLocation | null {
  const picked = pickedName?.trim().toLowerCase();
  const city =
    (picked &&
      components.find(
        (component) =>
          component.longText?.toLowerCase() === picked &&
          component.types?.some((type) => CITY_TYPES.includes(type))
      )) ||
    findComponent(components, ...CITY_TYPES);
  const region = findComponent(components, "administrative_area_level_1");
  const country = findComponent(components, "country");

  return normalizeProfileLocation({
    city: city?.longText,
    region: region?.longText,
    country: country?.longText,
    countryCode: country?.shortText,
    placeId,
  });
}

export async function lookupCity(
  placeId: string,
  sessionToken: string | null,
  pickedName: string | null = null,
  fetchImpl: typeof fetch = fetch
): Promise<ProfileLocation | null> {
  const apiKey = getGooglePlacesApiKey();

  if (!apiKey) {
    throw new Error("City search is not set up.");
  }

  const url = new URL(
    `${PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}`
  );

  if (sessionToken) {
    url.searchParams.set("sessionToken", sessionToken);
  }

  const response = await fetchImpl(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      // Address parts only: the cheapest Place Details tier.
      "X-Goog-FieldMask": "id,addressComponents",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Place Details failed (${response.status}).`);
  }

  const payload = (await response.json()) as PlaceDetailsResponse;
  return toProfileLocationFromComponents(
    payload.id ?? placeId,
    payload.addressComponents ?? [],
    pickedName
  );
}
