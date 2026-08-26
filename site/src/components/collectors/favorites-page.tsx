"use client";

import { FolderPlus, Heart, HeartOff, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AccountShell } from "@/components/account/account-shell";
import {
  ArtworkCard,
  ArtworkCardGrid,
  CollectorEmptyState,
} from "@/components/collectors/artwork-card";
import { CollectorLoadingPanel } from "@/components/collectors/loading-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollectorResource } from "@/hooks/useCollectorResource";
import { collectorRequest } from "@/lib/collectors/client";
import type { ArtworkCollection } from "@/lib/collectors/collections";
import type { FavoriteRecord } from "@/lib/collectors/favorites";
import { addToComparison } from "@/lib/collectors/comparison";

export function FavoritesPage() {
  const { data, error, loading, mutate, user } = useCollectorResource<FavoriteRecord[]>({
    initialData: [],
    path: "/api/collectors/favorites",
    select: (payload) => (payload.favorites as FavoriteRecord[]) ?? [],
    signInPath: "/account/favorites",
  });
  const [collections, setCollections] = useState<ArtworkCollection[]>([]);
  const [organizing, setOrganizing] = useState<FavoriteRecord | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [busy, setBusy] = useState(false);

  const openOrganizer = async (favorite: FavoriteRecord) => {
    setOrganizing(favorite);

    if (!user) {
      return;
    }

    try {
      const payload = await collectorRequest<{ collections: ArtworkCollection[] }>(
        "/api/collectors/collections",
        await user.getIdToken(),
      );
      setCollections(payload.collections);
    } catch {
      setCollections([]);
    }
  };

  const addToCollection = async (collectionId: string) => {
    if (!organizing || !user) {
      return;
    }

    setBusy(true);

    try {
      const payload = await collectorRequest<{ collections: ArtworkCollection[] }>(
        "/api/collectors/collections",
        await user.getIdToken(),
        {
          body: {
            collectionId,
            itemId: organizing.itemId,
            username: organizing.artistUsername,
          },
          method: "POST",
        },
      );
      setCollections(payload.collections);
      setOrganizing(null);
      toast.success("Added to your collection.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add that to a collection.");
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    const name = newCollectionName.trim();

    if (!user || !name) {
      return;
    }

    setBusy(true);

    try {
      const created = await collectorRequest<{ collections: ArtworkCollection[] }>(
        "/api/collectors/collections",
        await user.getIdToken(),
        { body: { name }, method: "POST" },
      );
      setCollections(created.collections);

      const newest = created.collections.find((collection) => collection.name === name);

      if (!newest) {
        throw new Error("The collection was created but could not be opened.");
      }

      setNewCollectionName("");
      await addToCollection(newest.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create that collection.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <AccountShell description="Artwork you saved for later." title="Favorites">
        <CollectorLoadingPanel label="Loading your favorites..." />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      action={
        <Button asChild variant="outline">
          <Link href="/account/collections">
            <FolderPlus />
            Manage collections
          </Link>
        </Button>
      }
      description="Artwork you saved for later. Organize it into collections, compare pieces, or unsave what you have moved on from."
      title="Favorites"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Favorites error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {data.length === 0 ? (
        <CollectorEmptyState
          action={
            <Button asChild>
              <Link href="/">Browse artwork</Link>
            </Button>
          }
          description="Tap the heart on any artwork to keep it here, and we will tell you if it sells."
          icon={<Heart className="size-5" />}
          title="No saved artwork yet"
        />
      ) : (
        <ArtworkCardGrid>
          {data.map((favorite) =>
            favorite.artwork ? (
              <ArtworkCard
                key={favorite.key}
                actions={
                  <>
                    <Button onClick={() => void openOrganizer(favorite)} size="sm" variant="outline">
                      <FolderPlus />
                      Add to collection
                    </Button>
                    <Button
                      onClick={() => addToComparison(favorite.key)}
                      size="sm"
                      variant="outline"
                    >
                      <Scale />
                      Compare
                    </Button>
                    <Button
                      aria-label={`Remove ${favorite.artwork.title} from favorites`}
                      onClick={() =>
                        void mutate(
                          {
                            body: {
                              itemId: favorite.itemId,
                              username: favorite.artistUsername,
                            },
                            method: "DELETE",
                          },
                          "Removed from your favorites.",
                        )
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <HeartOff />
                      Unsave
                    </Button>
                  </>
                }
                artwork={favorite.artwork}
              />
            ) : null,
          )}
        </ArtworkCardGrid>
      )}

      <Dialog open={organizing !== null} onOpenChange={(open) => (open ? null : setOrganizing(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to a collection</DialogTitle>
            <DialogDescription>
              Group “{organizing?.artwork?.title ?? "this artwork"}” with the rest of a theme you are
              building.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {collections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have no collections yet. Create your first one below.
              </p>
            ) : (
              collections.map((collection) => (
                <Button
                  key={collection.id}
                  className="w-full justify-between"
                  disabled={busy}
                  onClick={() => void addToCollection(collection.id)}
                  type="button"
                  variant="outline"
                >
                  {collection.name}
                  <span className="text-xs text-muted-foreground">
                    {collection.artworks.length} saved
                  </span>
                </Button>
              ))
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="new-collection-name">New collection</Label>
            <Input
              id="new-collection-name"
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder="Large abstracts"
              value={newCollectionName}
            />
          </div>

          <DialogFooter>
            <Button disabled={busy || !newCollectionName.trim()} onClick={() => void createAndAdd()}>
              Create and add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountShell>
  );
}
