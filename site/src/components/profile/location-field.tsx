"use client";

import { MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  Autocomplete,
  type AutocompleteOption,
} from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CitySuggestion } from "@/lib/places/google-places";
import {
  formatProfileLocation,
  MAX_LOCATION_PART_LENGTH,
  normalizeProfileLocation,
  type ProfileLocation,
  type ProfileLocationInput,
} from "@/lib/profile/location";

type Mode = "loading" | "search" | "manual";

function newSessionToken() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Where someone is based: city, region and country, never a street address.
 *
 * With Google Places set up (GOOGLE_PLACES_API_KEY on the server) it is a
 * city search; otherwise, or if search fails, three plain inputs. A free-text
 * location saved before EDUTHA-130 is shown and kept until a city is picked
 * or the person removes it.
 */
export function LocationField({
  idPrefix,
  invalid = false,
  onChange,
  value,
}: {
  idPrefix: string;
  invalid?: boolean;
  onChange: (value: ProfileLocationInput) => void;
  value: ProfileLocationInput;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("loading");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const sessionToken = useRef(newSessionToken());
  const latestQuery = useRef("");

  const picked = normalizeProfileLocation(value);
  // Typed parts that aren't a full city + country yet still belong to manual.
  const hasPartialManualInput = Boolean(
    !picked && (value.city || value.region || value.country)
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/places")
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .catch(() => ({ enabled: false }))
      .then((payload: { enabled?: boolean }) => {
        if (!cancelled) {
          setMode(
            payload.enabled && !hasPartialManualInput ? "search" : "manual"
          );
        }
      });

    return () => {
      cancelled = true;
    };
    // Decide once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callPlaces = async (body: Record<string, unknown>) => {
    if (!user) {
      throw new Error("Sign in to search for your city.");
    }

    const response = await fetch("/api/places", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ ...body, sessionToken: sessionToken.current }),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
      location?: ProfileLocation;
      suggestions?: CitySuggestion[];
    } | null;

    if (!response.ok) {
      // Search is down or not set up: typing it in still works.
      if (response.status === 502 || response.status === 503) {
        setMode("manual");
      }

      throw new Error(
        payload?.error?.message ?? "City search isn't working right now."
      );
    }

    return payload ?? {};
  };

  useEffect(() => {
    if (mode !== "search") {
      return;
    }

    const trimmed = query.trim();
    latestQuery.current = trimmed;

    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(() => {
      callPlaces({ input: trimmed })
        .then((payload) => {
          if (latestQuery.current === trimmed) {
            setSuggestions(payload.suggestions ?? []);
            setNotice(null);
          }
        })
        .catch((error: unknown) => {
          if (latestQuery.current === trimmed) {
            setSuggestions([]);
            setNotice(error instanceof Error ? error.message : null);
          }
        })
        .finally(() => {
          if (latestQuery.current === trimmed) {
            setSearching(false);
          }
        });
    }, 250);

    return () => window.clearTimeout(timer);
    // callPlaces only reads refs and the signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, query]);

  const handlePick = async (option: AutocompleteOption) => {
    setSearching(true);

    try {
      const payload = await callPlaces({ placeId: option.id, name: option.label });

      if (payload.location) {
        onChange({
          city: payload.location.city,
          region: payload.location.region ?? "",
          country: payload.location.country,
          countryCode: payload.location.countryCode ?? "",
          placeId: payload.location.placeId ?? "",
          legacyText: value.legacyText,
        });
        setQuery("");
        setSuggestions([]);
        setNotice(null);
        // The next search is a new billing session.
        sessionToken.current = newSessionToken();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : null);
    } finally {
      setSearching(false);
    }
  };

  const clearPlace = () =>
    onChange({
      ...value,
      city: "",
      region: "",
      country: "",
      countryCode: "",
      placeId: "",
    });

  const setPart = (part: "city" | "region" | "country", next: string) =>
    // A typed edit is no longer the Google place that was picked.
    onChange({ ...value, [part]: next, placeId: "", countryCode: "" });

  return (
    // min-w-0: inside the form's grid, a long city name must truncate
    // rather than push the dialog wider than a phone screen.
    <div className="min-w-0 space-y-2">
      {picked && mode !== "manual" ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{formatProfileLocation(picked)}</span>
          </span>
          <Button
            id={idPrefix}
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearPlace}
          >
            Change
          </Button>
        </div>
      ) : null}

      {!picked && mode === "search" ? (
        <Autocomplete
          id={idPrefix}
          aria-invalid={invalid || undefined}
          emptyText="No cities match. Try another spelling, or type it in."
          loading={searching}
          onQueryChange={setQuery}
          onSelect={handlePick}
          options={suggestions.map((suggestion) => ({
            id: suggestion.placeId,
            label: suggestion.primary,
            description: suggestion.secondary,
          }))}
          placeholder="Search for your city"
          query={query}
        />
      ) : null}

      {mode === "loading" ? (
        <Input
          id={idPrefix}
          disabled
          placeholder="Search for your city"
        />
      ) : null}

      {mode === "manual" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["city", "City", "e.g. Brooklyn", "address-level2"],
              ["region", "State or region", "e.g. New York", "address-level1"],
              ["country", "Country", "e.g. United States", "country-name"],
            ] as const
          ).map(([part, label, placeholder, autoComplete]) => (
            <div key={part} className="space-y-1.5">
              <Label
                htmlFor={part === "city" ? idPrefix : `${idPrefix}-${part}`}
                className="text-xs font-normal text-muted-foreground"
              >
                {label}
                {part === "region" ? " (optional)" : ""}
              </Label>
              <Input
                // The city input takes the field's own id, so the
                // "Location" label above points at it.
                id={part === "city" ? idPrefix : `${idPrefix}-${part}`}
                aria-invalid={invalid || undefined}
                autoComplete={autoComplete}
                maxLength={MAX_LOCATION_PART_LENGTH}
                placeholder={placeholder}
                value={value[part]}
                onChange={(event) => setPart(part, event.target.value)}
              />
            </div>
          ))}
        </div>
      ) : null}

      {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}

      {!picked && value.legacyText ? (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>
            Saved as &ldquo;{value.legacyText}&rdquo;.{" "}
            {mode === "manual" ? "Fill in the fields" : "Pick your city"} to
            update it.
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
            onClick={() => onChange({ ...value, legacyText: "" })}
          >
            <X aria-hidden className="size-3" />
            Remove
          </button>
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Only your city, region and country are shown, never a street address.
        {mode === "search" && !picked ? (
          <>
            {" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setMode("manual")}
            >
              Type it in instead
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}
