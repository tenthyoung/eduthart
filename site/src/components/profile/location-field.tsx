"use client";

import { MapPin, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  Autocomplete,
  type AutocompleteOption,
} from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { useFormField } from "@/components/ui/form";
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

/** City search is down or not set up; typing it in still works. */
class PlacesUnavailableError extends Error {}

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
 *
 * Render it inside a `FormItem`: like `FormControl`, it takes its id, error
 * state and aria-describedby from the surrounding form field.
 *
 * Nothing typed is dropped: a failed search moves the query into City, text
 * typed but not picked blocks the save with a message (see `pendingQuery`),
 * and "Change" keeps the saved city until a new one is picked.
 */
export function LocationField({
  onChange,
  value,
}: {
  onChange: (value: ProfileLocationInput) => void;
  value: ProfileLocationInput;
}) {
  const { user } = useAuth();
  const { error, formItemId, formMessageId } = useFormField();
  const invalid = Boolean(error);
  const describedBy = invalid ? formMessageId : undefined;
  const [mode, setMode] = useState<Mode>("loading");
  // Searching for a new city while the saved one stays in the form.
  const [replacing, setReplacing] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const sessionToken = useRef(newSessionToken());
  const latestQuery = useRef("");
  const latestPick = useRef(0);
  // The latest value and callback, for async work that outlives the render
  // it started in.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const query = value.pendingQuery;
  const picked = normalizeProfileLocation(value);
  const showSearch = mode === "search" && (!picked || replacing);

  const options = useMemo<AutocompleteOption[]>(
    () =>
      suggestions.map((suggestion) => ({
        id: suggestion.placeId,
        label: suggestion.primary,
        description: suggestion.secondary,
      })),
    [suggestions]
  );

  useEffect(() => {
    let cancelled = false;
    // Typed parts that aren't a full city + country yet belong to manual.
    const hasPartialManualInput = Boolean(
      !picked && (value.city || value.region || value.country)
    );

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

  /**
   * Switch to the plain inputs, carrying over whatever was typed (or the
   * city that was just clicked) so the person never retypes it.
   */
  const switchToManual = (seed?: string) => {
    const current = valueRef.current;
    const carried = (seed ?? current.pendingQuery).trim();

    onChangeRef.current(
      carried
        ? {
            ...current,
            city: carried,
            region: "",
            country: "",
            countryCode: "",
            placeId: "",
            pendingQuery: "",
          }
        : { ...current, pendingQuery: "" }
    );
    setReplacing(false);
    setSuggestions([]);
    setMode("manual");
  };

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
      const message =
        payload?.error?.message ?? "City search isn't working right now.";
      throw response.status === 502 || response.status === 503
        ? new PlacesUnavailableError(message)
        : new Error(message);
    }

    return payload ?? {};
  };

  useEffect(() => {
    if (!showSearch) {
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
        .catch((caught: unknown) => {
          if (latestQuery.current !== trimmed) {
            return;
          }

          setSuggestions([]);
          setNotice(caught instanceof Error ? caught.message : null);

          if (caught instanceof PlacesUnavailableError) {
            switchToManual();
          }
        })
        .finally(() => {
          if (latestQuery.current === trimmed) {
            setSearching(false);
          }
        });
    }, 250);

    return () => window.clearTimeout(timer);
    // callPlaces and switchToManual only read refs and the signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSearch, query]);

  const handlePick = async (option: AutocompleteOption) => {
    // A slower earlier lookup must not overwrite a later pick.
    const pick = ++latestPick.current;
    setSearching(true);

    try {
      const payload = await callPlaces({
        placeId: option.id,
        name: option.label,
      });

      if (pick !== latestPick.current || !payload.location) {
        return;
      }

      onChangeRef.current({
        city: payload.location.city,
        region: payload.location.region ?? "",
        country: payload.location.country,
        countryCode: payload.location.countryCode ?? "",
        placeId: payload.location.placeId ?? "",
        legacyText: valueRef.current.legacyText,
        pendingQuery: "",
      });
      setReplacing(false);
      setSuggestions([]);
      setNotice(null);
      // The next search is a new billing session.
      sessionToken.current = newSessionToken();
    } catch (caught) {
      if (pick !== latestPick.current) {
        return;
      }

      setNotice(caught instanceof Error ? caught.message : null);

      if (caught instanceof PlacesUnavailableError) {
        // Keep the city they clicked rather than the half-typed query.
        switchToManual(option.label);
      }
    } finally {
      if (pick === latestPick.current) {
        setSearching(false);
      }
    }
  };

  const setPart = (part: "city" | "region" | "country", next: string) =>
    // A typed edit is no longer the Google place that was picked.
    onChange({ ...value, [part]: next, placeId: "", countryCode: "" });

  const partId = (part: "city" | "region" | "country") =>
    // The city input takes the field's own id, so the "Location" label
    // points at it.
    part === "city" ? formItemId : `${formItemId}-${part}`;

  return (
    // min-w-0: inside the form's grid, a long city name must truncate
    // rather than push the dialog wider than a phone screen.
    <div className="min-w-0 space-y-2">
      {picked && mode !== "manual" && !replacing ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2">
          {/* The label points here, not at Change, so clicking the word
              "Location" never starts replacing the saved city. */}
          <span
            id={formItemId}
            aria-describedby={describedBy}
            className="flex min-w-0 items-center gap-2 text-sm"
          >
            <MapPin
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="truncate">{formatProfileLocation(picked)}</span>
          </span>
          <Button
            aria-label="Change location"
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setReplacing(true)}
          >
            Change
          </Button>
        </div>
      ) : null}

      {showSearch ? (
        <Autocomplete
          id={formItemId}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          autoFocus={replacing}
          emptyText="No cities match. Try another spelling, or type it in."
          loading={searching}
          // Search starts at two letters, so don't open "No cities match"
          // after one.
          minQueryLength={2}
          onQueryChange={(next) =>
            onChange({ ...valueRef.current, pendingQuery: next })
          }
          onSelect={handlePick}
          options={options}
          placeholder="Search for your city"
          query={query}
        />
      ) : null}

      {mode === "loading" && !picked ? (
        <Input id={formItemId} disabled placeholder="Search for your city" />
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
                htmlFor={partId(part)}
                className="text-xs font-normal text-muted-foreground"
              >
                {label}
                {part === "region" ? " (optional)" : ""}
              </Label>
              <Input
                id={partId(part)}
                aria-describedby={describedBy}
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

      {notice ? (
        <p role="status" className="text-xs text-destructive">
          {notice}
        </p>
      ) : null}

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
        {showSearch ? (
          <>
            {" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => switchToManual()}
            >
              Type it in instead
            </button>
          </>
        ) : null}
        {replacing && picked ? (
          <>
            {" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                onChange({ ...value, pendingQuery: "" });
                setReplacing(false);
              }}
            >
              Keep {picked.city}
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}
