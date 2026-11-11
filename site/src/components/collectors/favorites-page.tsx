"use client";

import { FolderPlus, Heart, HeartOff, Scale } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormShell,
  SubmitButton,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCollectorResource } from "@/hooks/useCollectorResource";
import { collectorRequest } from "@/lib/collectors/client";
import type { ArtworkCollection } from "@/lib/collectors/collections";
import type { FavoriteRecord } from "@/lib/collectors/favorites";
import { addToComparison } from "@/lib/collectors/comparison";
import { SubmitError } from "@/lib/forms/describe-submit-error";

const newCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name the new collection."),
});

type NewCollectionValues = z.infer<typeof newCollectionSchema>;

export function FavoritesPage() {
  const { data, error, loading, mutate, user } = useCollectorResource<
    FavoriteRecord[]
  >({
    initialData: [],
    path: "/api/collectors/favorites",
    select: (payload) => (payload.favorites as FavoriteRecord[]) ?? [],
    signInPath: "/account/favorites",
  });
  const [collections, setCollections] = useState<ArtworkCollection[]>([]);
  const [organizing, setOrganizing] = useState<FavoriteRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const newCollectionForm = useForm<NewCollectionValues>({
    resolver: zodResolver(newCollectionSchema),
    defaultValues: { name: "" },
  });
  const creating = newCollectionForm.formState.isSubmitting;

  const openOrganizer = async (favorite: FavoriteRecord) => {
    setOrganizing(favorite);

    if (!user) {
      return;
    }

    try {
      const payload = await collectorRequest<{
        collections: ArtworkCollection[];
      }>("/api/collectors/collections", await user.getIdToken());
      setCollections(payload.collections);
    } catch {
      setCollections([]);
    }
  };

  // Throws on failure, so the "create and add" form can show it in its own
  // callout. A click on an existing collection takes the toast instead.
  const addToCollectionOrThrow = async (collectionId: string) => {
    if (!organizing || !user) {
      return;
    }

    const payload = await collectorRequest<{
      collections: ArtworkCollection[];
    }>("/api/collectors/collections", await user.getIdToken(), {
      body: {
        collectionId,
        itemId: organizing.itemId,
        username: organizing.artistUsername,
      },
      method: "POST",
    });
    setCollections(payload.collections);
    setOrganizing(null);
    toast.success("Added to your collection.");
  };

  const addToCollection = async (collectionId: string) => {
    setBusy(true);

    try {
      await addToCollectionOrThrow(collectionId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to add that to a collection."
      );
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async ({ name }: NewCollectionValues) => {
    if (!user) {
      return;
    }

    const created = await collectorRequest<{
      collections: ArtworkCollection[];
    }>("/api/collectors/collections", await user.getIdToken(), {
      body: { name },
      method: "POST",
    });
    setCollections(created.collections);

    const newest = created.collections.find(
      (collection) => collection.name === name
    );

    if (!newest) {
      throw new SubmitError(
        "The collection was created, but we couldn't add the artwork to it. Choose it from the list above."
      );
    }

    newCollectionForm.reset({ name: "" });
    await addToCollectionOrThrow(newest.id);
  };

  if (loading) {
    return (
      <AccountShell
        description="Artwork you saved for later."
        title="Favorites"
      >
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
                    <Button
                      onClick={() => void openOrganizer(favorite)}
                      size="sm"
                      variant="outline"
                    >
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
                          "Removed from your favorites."
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
            ) : null
          )}
        </ArtworkCardGrid>
      )}

      <Dialog
        open={organizing !== null}
        // Stay open while a save is running, so its result (or its error) has
        // somewhere to show.
        onOpenChange={(open) =>
          open || busy || creating ? null : setOrganizing(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to a collection</DialogTitle>
            <DialogDescription>
              Group “{organizing?.artwork?.title ?? "this artwork"}” with the
              rest of a theme you are building.
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
                  disabled={busy || creating}
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

          <FormShell
            form={newCollectionForm}
            onSubmit={createAndAdd}
            errorTitle="That collection wasn't added"
            disabled={busy}
            formClassName="border-t border-border pt-4"
            className="space-y-4"
          >
            <FormField
              control={newCollectionForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="new-collection-name">
                    New collection
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="new-collection-name"
                      placeholder="Large abstracts"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <SubmitButton pendingLabel="Creating...">
                Create and add
              </SubmitButton>
            </DialogFooter>
          </FormShell>
        </DialogContent>
      </Dialog>
    </AccountShell>
  );
}
