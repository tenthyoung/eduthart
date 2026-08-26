"use client";

import {
  Check,
  Copy,
  Globe,
  Images,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AccountShell } from "@/components/account/account-shell";
import {
  CollectorEmptyState,
  formatArtworkPrice,
} from "@/components/collectors/artwork-card";
import { CollectorLoadingPanel } from "@/components/collectors/loading-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollectorResource } from "@/hooks/useCollectorResource";
import type { ArtworkCollection } from "@/lib/collectors/collections";

function buildShareUrl(shareId: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/collections/${shareId}`;
}

export function CollectionsPage() {
  const { data, error, loading, mutate } = useCollectorResource<
    ArtworkCollection[]
  >({
    initialData: [],
    path: "/api/collectors/collections",
    select: (payload) => (payload.collections as ArtworkCollection[]) ?? [],
    signInPath: "/account/collections",
  });
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const copyShareLink = async (shareId: string) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(shareId));
      toast.success("Share link copied to your clipboard.");
    } catch {
      toast.error("Copy the link from the address bar instead.");
    }
  };

  if (loading) {
    return (
      <AccountShell
        description="Group the artwork you saved."
        title="Collections"
      >
        <CollectorLoadingPanel label="Loading your collections..." />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      description="Group the artwork you saved into themes, then publish a collection to share it with someone else."
      title="Collections"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Collections error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="flex flex-col gap-3 rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void mutate(
            { body: { name: newName }, method: "POST" },
            "Collection created."
          ).then((ok) => ok && setNewName(""));
        }}
      >
        <div className="flex-1 space-y-2">
          <Label htmlFor="collection-name">New collection</Label>
          <Input
            id="collection-name"
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Coastal light"
            value={newName}
          />
        </div>
        <Button disabled={!newName.trim()} type="submit">
          <Plus />
          Create collection
        </Button>
      </form>

      <div className="mt-8 space-y-6">
        {data.length === 0 ? (
          <CollectorEmptyState
            description="Collections let you keep a shortlist for a room, a gift, or a theme, and share it as a link."
            icon={<Images className="size-5" />}
            title="No collections yet"
          />
        ) : (
          data.map((collection) => (
            <section
              key={collection.id}
              className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  {renamingId === collection.id ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void mutate(
                          {
                            body: {
                              collectionId: collection.id,
                              name: renameDraft,
                            },
                            method: "PATCH",
                          },
                          "Collection renamed."
                        ).then((ok) => ok && setRenamingId(null));
                      }}
                    >
                      <Label
                        className="sr-only"
                        htmlFor={`rename-${collection.id}`}
                      >
                        Collection name
                      </Label>
                      <Input
                        autoFocus
                        className="max-w-xs"
                        id={`rename-${collection.id}`}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        value={renameDraft}
                      />
                      <Button
                        disabled={!renameDraft.trim()}
                        size="sm"
                        type="submit"
                      >
                        <Check />
                        Save
                      </Button>
                      <Button
                        onClick={() => setRenamingId(null)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <X />
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl text-foreground">
                        {collection.name}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {collection.isPublic ? (
                          <Globe className="size-3" />
                        ) : (
                          <Lock className="size-3" />
                        )}
                        {collection.isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {collection.artworks.length}{" "}
                    {collection.artworks.length === 1 ? "artwork" : "artworks"}
                  </p>
                  {collection.isPublic && collection.shareId ? (
                    <p className="break-all text-sm text-muted-foreground">
                      Share link:{" "}
                      <Link
                        className="text-primary underline decoration-primary/30 underline-offset-4"
                        href={`/collections/${collection.shareId}`}
                      >
                        /collections/{collection.shareId}
                      </Link>
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setRenamingId(collection.id);
                      setRenameDraft(collection.name);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Pencil />
                    Rename
                  </Button>
                  <Button
                    onClick={() =>
                      void mutate(
                        {
                          body: {
                            collectionId: collection.id,
                            isPublic: !collection.isPublic,
                          },
                          method: "PATCH",
                        },
                        collection.isPublic
                          ? "Collection is private again."
                          : "Collection published. Anyone with the link can view it."
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    {collection.isPublic ? <Lock /> : <Globe />}
                    {collection.isPublic ? "Make private" : "Publish"}
                  </Button>
                  {collection.isPublic && collection.shareId ? (
                    <Button
                      onClick={() => void copyShareLink(collection.shareId!)}
                      size="sm"
                      variant="outline"
                    >
                      <Copy />
                      Copy link
                    </Button>
                  ) : null}
                  <Button
                    onClick={() =>
                      void mutate(
                        {
                          body: { collectionId: collection.id },
                          method: "DELETE",
                        },
                        "Collection deleted."
                      )
                    }
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 />
                    Delete
                  </Button>
                </div>
              </div>

              {collection.artworks.length > 0 ? (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {collection.artworks.map((entry) => (
                    <li
                      key={entry.key}
                      className="flex gap-3 rounded-2xl border border-border/70 p-3"
                    >
                      {entry.artwork?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt=""
                          className="size-16 shrink-0 rounded-xl object-cover"
                          src={entry.artwork.imageUrl}
                        />
                      ) : (
                        <div className="size-16 shrink-0 rounded-xl bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        {entry.artwork ? (
                          <Link
                            className="line-clamp-2 text-sm font-medium hover:underline"
                            href={entry.artwork.href}
                          >
                            {entry.artwork.title}
                          </Link>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            This artwork is no longer listed.
                          </p>
                        )}
                        {entry.artwork ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatArtworkPrice(entry.artwork)}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        aria-label="Remove from collection"
                        className="shrink-0"
                        onClick={() =>
                          void mutate(
                            {
                              body: {
                                artworkKey: entry.key,
                                collectionId: collection.id,
                              },
                              method: "DELETE",
                            },
                            "Removed from the collection."
                          )
                        }
                        size="icon"
                        variant="ghost"
                      >
                        <X />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Nothing here yet. Add artwork from your{" "}
                  <Link
                    className="text-primary underline underline-offset-4"
                    href="/account/favorites"
                  >
                    favorites
                  </Link>
                  .
                </p>
              )}
            </section>
          ))
        )}
      </div>
    </AccountShell>
  );
}
