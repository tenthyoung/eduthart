"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ADVISORY_BUDGETS,
  ADVISORY_ROOMS,
  ADVISORY_SIZES,
  ADVISORY_TIMELINES,
  MAX_ADVISORY_NOTES_LENGTH,
  MAX_ADVISORY_STYLE_LENGTH,
  type AdvisoryOption,
} from "@/lib/advisory/options";

type Values = {
  budget: string;
  email: string;
  name: string;
  notes: string;
  room: string;
  size: string;
  style: string;
  timeline: string;
  website: string;
};

const EMPTY: Values = {
  budget: "",
  email: "",
  name: "",
  notes: "",
  room: "",
  size: "",
  style: "",
  timeline: "",
  website: "",
};

type SubmitError = { field: keyof Values | null; message: string };

const selectClassName =
  "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive md:text-sm";

function OptionSelect({
  error,
  id,
  label,
  onChange,
  options,
  value,
}: {
  error: string | null;
  id: keyof Values;
  label: string;
  onChange: (value: string) => void;
  options: readonly AdvisoryOption[];
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`advisory-${id}`}>{label}</Label>
      <select
        aria-describedby={error ? `advisory-${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        className={selectClassName}
        id={`advisory-${id}`}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      >
        <option disabled value="">
          Choose one
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={id} message={error} />
    </div>
  );
}

function FieldError({
  id,
  message,
}: {
  id: keyof Values;
  message: string | null;
}) {
  return message ? (
    <p className="text-sm text-destructive" id={`advisory-${id}-error`}>
      {message}
    </p>
  ) : null;
}

/**
 * The "Help me choose" brief.
 *
 * Everything the buyer types stays in component state: a failed submission,
 * whether a validation message or a dead connection, leaves every field as it
 * was, and nothing goes in the URL.
 */
export function AdvisoryRequestForm() {
  const { user } = useAuth();
  const [values, setValues] = useState<Values>(EMPTY);
  const [error, setError] = useState<SubmitError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const prefilled = useRef(false);

  // Fill in who they are once, if signed in, without overwriting their typing.
  useEffect(() => {
    if (!user || prefilled.current) {
      return;
    }

    prefilled.current = true;
    setValues((current) => ({
      ...current,
      email: current.email || user.email || "",
      name: current.name || user.displayName || "",
    }));
  }, [user]);

  const set = (field: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError((current) => (current?.field === field ? null : current));
  };

  const fieldError = (field: keyof Values) =>
    error?.field === field ? error.message : null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    // The honeypot is the one field that never survives a submit.
    setValues((current) => ({ ...current, website: "" }));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }

      const response = await fetch("/api/advisory", {
        body: JSON.stringify(values),
        headers,
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { field?: string | null; message?: string };
        } | null;
        const field = body?.error?.field;
        setError({
          field: field && field in EMPTY ? (field as keyof Values) : null,
          message:
            body?.error?.message ??
            "We couldn't send your request just now. Please try again.",
        });
        return;
      }

      setSubmittedEmail(values.email.trim());
    } catch {
      setError({
        field: null,
        message:
          "We couldn't reach EduthArt. Check your connection and try again; your answers are still here.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedEmail) {
    return (
      <div
        className="space-y-4 rounded-2xl border border-border bg-card p-8"
        role="status"
      >
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">
          Thank you. Your request is with our curators.
        </h2>
        <p className="text-muted-foreground">
          We have sent a confirmation to{" "}
          <span className="font-medium text-foreground">{submittedEmail}</span>.
          A curator will reply to that address with a shortlist of works to
          consider.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild>
            <Link href="/browse">Keep browsing</Link>
          </Button>
          {user ? (
            <Button asChild variant="outline">
              <Link href="/account/favorites">Your saved works</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form
      aria-label="Help me choose"
      className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8"
      noValidate
      onSubmit={onSubmit}
    >
      {error && !error.field ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <OptionSelect
          error={fieldError("budget")}
          id="budget"
          label="Budget"
          onChange={set("budget")}
          options={ADVISORY_BUDGETS}
          value={values.budget}
        />
        <OptionSelect
          error={fieldError("room")}
          id="room"
          label="Where will it hang?"
          onChange={set("room")}
          options={ADVISORY_ROOMS}
          value={values.room}
        />
        <OptionSelect
          error={fieldError("size")}
          id="size"
          label="Size"
          onChange={set("size")}
          options={ADVISORY_SIZES}
          value={values.size}
        />
        <OptionSelect
          error={fieldError("timeline")}
          id="timeline"
          label="Timeline"
          onChange={set("timeline")}
          options={ADVISORY_TIMELINES}
          value={values.timeline}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="advisory-style">Style you are drawn to</Label>
        <Input
          aria-describedby={
            fieldError("style") ? "advisory-style-error" : undefined
          }
          aria-invalid={fieldError("style") ? true : undefined}
          id="advisory-style"
          maxLength={MAX_ADVISORY_STYLE_LENGTH}
          name="style"
          onChange={(event) => set("style")(event.target.value)}
          placeholder="Quiet abstracts, muted greens, lots of texture"
          required
          value={values.style}
        />
        <FieldError id="style" message={fieldError("style")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="advisory-notes">
          Anything else{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          aria-describedby={
            fieldError("notes") ? "advisory-notes-error" : undefined
          }
          aria-invalid={fieldError("notes") ? true : undefined}
          className="min-h-28"
          id="advisory-notes"
          maxLength={MAX_ADVISORY_NOTES_LENGTH}
          name="notes"
          onChange={(event) => set("notes")(event.target.value)}
          placeholder="Wall colour, the furniture around it, artists you already love, a date you are working towards."
          value={values.notes}
        />
        <FieldError id="notes" message={fieldError("notes")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="advisory-name">Your name</Label>
          <Input
            aria-describedby={
              fieldError("name") ? "advisory-name-error" : undefined
            }
            aria-invalid={fieldError("name") ? true : undefined}
            autoComplete="name"
            id="advisory-name"
            name="name"
            onChange={(event) => set("name")(event.target.value)}
            required
            value={values.name}
          />
          <FieldError id="name" message={fieldError("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="advisory-email">Email for the reply</Label>
          <Input
            aria-describedby={
              fieldError("email") ? "advisory-email-error" : undefined
            }
            aria-invalid={fieldError("email") ? true : undefined}
            autoComplete="email"
            id="advisory-email"
            name="email"
            onChange={(event) => set("email")(event.target.value)}
            required
            type="email"
            value={values.email}
          />
          <FieldError id="email" message={fieldError("email")} />
        </div>
      </div>

      {/* Hidden from people; bots fill it in. Never repopulated. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="advisory-website">Website</label>
        <input
          autoComplete="off"
          id="advisory-website"
          name="website"
          onChange={(event) => set("website")(event.target.value)}
          tabIndex={-1}
          value={values.website}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {user
            ? "We'll see the works you've saved, so there's no need to list them."
            : "Signed in? We'll see the works you've saved alongside your brief."}
        </p>
        <Button className="sm:w-auto" disabled={submitting} type="submit">
          {submitting ? "Sending…" : "Ask a curator"}
        </Button>
      </div>
    </form>
  );
}
