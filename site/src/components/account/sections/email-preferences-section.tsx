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
  EMAIL_KIND_COPY,
  EMAIL_KINDS_BY_CATEGORY,
  resolveKindEnabled,
  type EmailCategory,
  type NotificationSettings,
} from "@/lib/notifications/email-categories";
import type { NotificationKind } from "@/lib/notifications/types";

const ENDPOINT = "/api/account/email-preferences";

function emptySettings(): NotificationSettings {
  return { categories: defaultEmailPreferences(), kinds: {} };
}

/**
 * The state of a category's own checkbox, derived from the kinds beneath it.
 *
 * Indeterminate rather than a guess when the kinds disagree: a half-off
 * category that rendered as "off" would claim to have silenced mail that is
 * still sending.
 */
function categoryCheckedState(
  settings: NotificationSettings,
  category: EmailCategory
): boolean | "indeterminate" {
  const kinds = EMAIL_KINDS_BY_CATEGORY[category];
  const enabled = kinds.map((kind) => resolveKindEnabled(settings, kind));

  if (enabled.every(Boolean)) {
    return true;
  }

  if (enabled.every((value) => !value)) {
    return false;
  }

  return "indeterminate";
}

/**
 * Email preferences for the signed-in account.
 *
 * Two levels: a category switches everything beneath it, and each kind can
 * then differ. This section loads and saves its own state rather than taking
 * it from the account page — the page was deliberately broken up in
 * EDUTHA-71, and routing this back through it would start rebuilding the
 * component it was split out of.
 */
export function EmailPreferencesSection() {
  const { status, user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          settings: NotificationSettings;
        };

        if (!cancelled) {
          setSettings(payload.settings);
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

  const save = async (
    update: {
      categories?: Partial<Record<EmailCategory, boolean>>;
      kinds?: Partial<Record<NotificationKind, boolean>>;
    },
    optimistic: NotificationSettings
  ) => {
    if (!user) {
      return;
    }

    const previous = settings;

    // Move the checkbox immediately. A toggle that waits on the round trip
    // feels broken, and the catch below puts it back if the save fails.
    setSettings(optimistic);
    setSaving(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch(ENDPOINT, {
        body: JSON.stringify(update),
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
        settings: NotificationSettings;
      };

      setSettings(payload.settings);
      setError(null);
    } catch (saveError) {
      setSettings(previous);
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save that preference."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryToggle = (category: EmailCategory, next: boolean) => {
    // The server clears the overrides beneath a category when the category
    // moves; mirror that here so the optimistic view matches what comes back.
    const kinds = { ...settings.kinds };

    for (const kind of EMAIL_KINDS_BY_CATEGORY[category]) {
      delete kinds[kind];
    }

    void save(
      { categories: { [category]: next } },
      {
        categories: { ...settings.categories, [category]: next },
        kinds,
      }
    );
  };

  const handleKindToggle = (kind: NotificationKind, next: boolean) => {
    void save(
      { kinds: { [kind]: next } },
      { ...settings, kinds: { ...settings.kinds, [kind]: next } }
    );
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
          const kinds = EMAIL_KINDS_BY_CATEGORY[category];
          const categoryId = `email-preference-${category}`;

          // A category with one kind beneath it is that kind, so the nested
          // row would be the same control twice.
          const showKinds = kinds.length > 1;

          return (
            <div
              className="rounded-2xl border border-border/70 bg-muted/35 p-4"
              key={category}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  aria-describedby={`${categoryId}-description`}
                  checked={categoryCheckedState(settings, category)}
                  className="mt-0.5"
                  disabled={loading || saving}
                  id={categoryId}
                  onCheckedChange={(checked) =>
                    handleCategoryToggle(category, checked !== false)
                  }
                />
                <div className="space-y-1">
                  <Label className="font-medium" htmlFor={categoryId}>
                    {copy.title}
                  </Label>
                  <p
                    className="text-sm text-muted-foreground"
                    id={`${categoryId}-description`}
                  >
                    {copy.description}
                  </p>
                </div>
              </div>

              {showKinds ? (
                <div className="mt-3 space-y-2 border-t border-border/60 pt-3 pl-7">
                  {kinds.map((kind) => {
                    const kindCopy = EMAIL_KIND_COPY[kind];
                    const kindId = `email-preference-kind-${kind}`;

                    return (
                      <div className="flex items-start gap-3" key={kind}>
                        <Checkbox
                          aria-describedby={`${kindId}-description`}
                          checked={resolveKindEnabled(settings, kind)}
                          className="mt-0.5"
                          disabled={loading || saving}
                          id={kindId}
                          onCheckedChange={(checked) =>
                            handleKindToggle(kind, checked === true)
                          }
                        />
                        <div>
                          <Label className="text-sm" htmlFor={kindId}>
                            {kindCopy.title}
                          </Label>
                          <p
                            className="text-sm text-muted-foreground"
                            id={`${kindId}-description`}
                          >
                            {kindCopy.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
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
