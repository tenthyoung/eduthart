"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminCard, AdminPage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  listAdvisoryRequests,
  sendAdvisoryShortlist,
  setAdvisoryRequestStatus,
} from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/format";
import {
  ADVISORY_BUDGETS,
  ADVISORY_ROOMS,
  ADVISORY_SIZES,
  ADVISORY_TIMELINES,
  labelFor,
} from "@/lib/advisory/options";
import type { AdvisoryInboxItem } from "@/lib/advisory/requests";
import { formatMinorUnits } from "@/lib/commerce/money";

const STATUS_LABELS: Record<AdvisoryInboxItem["status"], string> = {
  closed: "Closed",
  new: "New",
  shortlist_sent: "Shortlist sent",
};

type Draft = { links: string; message: string; picked: string[] };

const EMPTY_DRAFT: Draft = { links: "", message: "", picked: [] };

function ShortlistComposer({
  item,
  onSent,
}: {
  item: AdvisoryInboxItem;
  onSent: () => Promise<void>;
}) {
  // Drafts live in state, so a failed send leaves the picks and message alone.
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string) =>
    setDraft((current) => ({
      ...current,
      picked: current.picked.includes(key)
        ? current.picked.filter((entry) => entry !== key)
        : [...current.picked, key],
    }));

  const send = async () => {
    setSending(true);
    setError(null);

    try {
      const picks = [
        ...draft.picked,
        ...draft.links.split(/\s+/).filter(Boolean),
      ];
      const result = await sendAdvisoryShortlist(item.id, picks, draft.message);
      toast.success(
        result.emailSent
          ? "Shortlist sent."
          : "Shortlist created, but the email didn't go out. Send the link by hand."
      );
      setDraft(EMPTY_DRAFT);
      await onSent();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "The shortlist could not be sent."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/70 p-4">
      <h4 className="font-semibold">
        {item.shortlist ? "Send another shortlist" : "Send a shortlist"}
      </h4>

      {item.savedItems.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm text-muted-foreground">
            Pick from what they saved
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {item.savedItems.map(({ artwork }) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 p-2 text-sm"
                key={artwork.key}
              >
                <input
                  checked={draft.picked.includes(artwork.key)}
                  onChange={() => toggle(artwork.key)}
                  type="checkbox"
                />
                {artwork.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-10 rounded object-cover"
                    src={artwork.imageUrl}
                  />
                ) : null}
                <span>
                  {artwork.title}
                  <span className="block text-xs text-muted-foreground">
                    {artwork.artistName}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="space-y-2">
        <label
          className="text-sm text-muted-foreground"
          htmlFor={`links-${item.id}`}
        >
          Other works: paste artwork page links, one per line
        </label>
        <Textarea
          className="min-h-20 bg-white dark:bg-transparent"
          id={`links-${item.id}`}
          onChange={(event) =>
            setDraft((current) => ({ ...current, links: event.target.value }))
          }
          placeholder="https://www.eduthart.com/artists/marina/art/harbour-light"
          value={draft.links}
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-sm text-muted-foreground"
          htmlFor={`message-${item.id}`}
        >
          A note for {item.name}
        </label>
        <Textarea
          className="min-h-24 bg-white dark:bg-transparent"
          id={`message-${item.id}`}
          onChange={(event) =>
            setDraft((current) => ({ ...current, message: event.target.value }))
          }
          placeholder="Why these works suit the room, and what to look at first."
          value={draft.message}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button disabled={sending} onClick={() => void send()}>
        {sending ? "Sending…" : "Create link and email it"}
      </Button>
    </div>
  );
}

export default function AdminAdvisoryPage() {
  const [items, setItems] = useState<AdvisoryInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listAdvisoryRequests());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Advisory requests failed to load."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const setStatus = async (item: AdvisoryInboxItem, status: string) => {
    setSavingId(item.id);
    try {
      await setAdvisoryRequestStatus(item.id, status);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Status update failed."
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminPage
      title="Art advisory"
      description="Help-me-choose requests from buyers, with what they have saved. Answer each with a shortlist: a link-only collection in your account."
      actions={
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      <div className="space-y-4">
        {items.length === 0 ? (
          <AdminCard>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading advisory requests..."
                : "No advisory requests yet."}
            </p>
          </AdminCard>
        ) : (
          items.map((item) => (
            <AdminCard key={item.id} className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {item.name}{" "}
                    <span className="ml-2 rounded-full border px-2 py-0.5 align-middle text-xs font-medium text-muted-foreground">
                      {STATUS_LABELS[item.status]}
                    </span>
                  </h3>
                  <a
                    className="text-sm text-muted-foreground underline underline-offset-4"
                    href={`mailto:${item.email}`}
                  >
                    {item.email}
                  </a>
                  <span className="text-sm text-muted-foreground">
                    {item.uid ? (
                      <>
                        {" · "}
                        <Link
                          className="underline underline-offset-4"
                          href={`/admin/users/${item.uid}`}
                        >
                          account
                        </Link>
                      </>
                    ) : (
                      " · guest"
                    )}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </div>
              </div>

              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Budget", labelFor(ADVISORY_BUDGETS, item.budget)],
                  ["Room", labelFor(ADVISORY_ROOMS, item.room)],
                  ["Size", labelFor(ADVISORY_SIZES, item.size)],
                  ["Timeline", labelFor(ADVISORY_TIMELINES, item.timeline)],
                ].map(([term, value]) => (
                  <div key={term}>
                    <dt className="text-muted-foreground">{term}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Style: </span>
                  {item.style}
                </p>
                {item.notes ? (
                  <p className="whitespace-pre-line text-muted-foreground">
                    {item.notes}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Saved works ({item.savedItems.length})
                </h4>
                {item.savedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {item.uid
                      ? "Nothing saved yet."
                      : "Sent while signed out, so there are no saved works to show."}
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-3">
                    {item.savedItems.map(({ artwork }) => (
                      <li key={artwork.key}>
                        <a
                          className="block w-32 text-xs"
                          href={artwork.href}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <div className="mb-1 aspect-square overflow-hidden rounded-lg bg-muted">
                            {artwork.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                alt={artwork.title}
                                className="h-full w-full object-cover"
                                src={artwork.imageUrl}
                              />
                            ) : null}
                          </div>
                          <span className="block font-medium">
                            {artwork.title}
                          </span>
                          <span className="text-muted-foreground">
                            {artwork.priceMinor > 0
                              ? formatMinorUnits(
                                  artwork.priceMinor,
                                  artwork.currency
                                )
                              : "Price on request"}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {item.shortlist ? (
                <p className="text-sm">
                  Shortlist of {item.shortlist.artworkCount} sent{" "}
                  {formatDateTime(item.shortlist.sentAt)}:{" "}
                  <a
                    className="underline underline-offset-4"
                    href={item.shortlist.sharePath}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.shortlist.sharePath}
                  </a>
                </p>
              ) : null}

              {item.status === "closed" ? null : (
                <ShortlistComposer item={item} onSent={load} />
              )}

              <div className="flex gap-2">
                {item.status === "closed" ? (
                  <Button
                    disabled={savingId !== null}
                    onClick={() =>
                      void setStatus(
                        item,
                        item.shortlist ? "shortlist_sent" : "new"
                      )
                    }
                    variant="outline"
                  >
                    Reopen
                  </Button>
                ) : (
                  <Button
                    disabled={savingId !== null}
                    onClick={() => void setStatus(item, "closed")}
                    variant="outline"
                  >
                    Close request
                  </Button>
                )}
              </div>
            </AdminCard>
          ))
        )}
      </div>
    </AdminPage>
  );
}
