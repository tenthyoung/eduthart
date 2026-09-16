"use client";

import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AccountPanel } from "@/components/account/account-surfaces";
import { useAuth } from "@/components/auth/auth-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { parseApiError } from "@/lib/api/parse-api-error";
import {
  defaultEmailPreferences,
  EMAIL_CATEGORIES,
  EMAIL_CATEGORY_COPY,
  type EmailCategory,
  type EmailPreferences,
} from "@/lib/notifications/email-categories";

const ENDPOINT = "/api/account/email-preferences";

/**
 * Email preferences for the signed-in account.
 *
 * This section loads and saves its own state rather than taking it from the
 * account page. The page was deliberately broken up in EDUTHA-71, and routing
 * four booleans back through it would start rebuilding the component it was
 * split out of.
 */
export function EmailPreferencesSection() {
  const { status, user } = useAuth();
  const [preferences, setPreferences] = useState<EmailPreferences>(
    defaultEmailPreferences
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<EmailCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const token = await user.getIdToken();
        const response = await fetch(ENDPOINT, {
          headers: { authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error(
            await parseApiError(
              response,
              "Unable to load your email preferences."
            )
          );
        }

        const payload = (await response.json()) as {
          preferences: EmailPreferences;
        };

        if (!cancelled) {
          setPreferences(payload.preferences);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your email preferences."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [status, user]);

  const handleToggle = async (category: EmailCategory, next: boolean) => {
    if (!user) {
      return;
    }

    const previous = preferences;

    // Move the checkbox immediately. A toggle that waits on the round trip
    // feels broken, and the catch below puts it back if the save fails.
    setPreferences({ ...previous, [category]: next });
    setSaving(category);

    try {
      const token = await user.getIdToken();
      const response = await fetch(ENDPOINT, {
        body: JSON.stringify({ [category]: next }),
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Unable to save that preference.")
        );
      }

      const payload = (await response.json()) as {
        preferences: EmailPreferences;
      };

      setPreferences(payload.preferences);
      setError(null);
    } catch (saveError) {
      setPreferences(previous);
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save that preference."
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <AccountPanel
      className="space-y-4"
      description="Choose which emails EduthArt sends you. These do not affect your notifications here on the site."
      icon={Mail}
      title="Email preferences"
    >
      {error ? (
        <p className="text-sm text-destructive" role="status">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {EMAIL_CATEGORIES.map((category) => {
          const copy = EMAIL_CATEGORY_COPY[category];
          const inputId = `email-preference-${category}`;

          return (
            <div
              className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/35 p-4"
              key={category}
            >
              <Checkbox
                aria-describedby={`${inputId}-description`}
                checked={preferences[category]}
                className="mt-0.5"
                disabled={loading || saving !== null}
                id={inputId}
                onCheckedChange={(checked) =>
                  void handleToggle(category, checked === true)
                }
              />
              <div className="space-y-1">
                <Label className="font-medium" htmlFor={inputId}>
                  {copy.title}
                </Label>
                <p
                  className="text-sm text-muted-foreground"
                  id={`${inputId}-description`}
                >
                  {copy.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-t border-border/70 pt-4 text-sm text-muted-foreground">
        Security emails, such as a password or email address change, are always
        sent. They are how you would find out if someone else reached your
        account.
      </p>
    </AccountPanel>
  );
}
