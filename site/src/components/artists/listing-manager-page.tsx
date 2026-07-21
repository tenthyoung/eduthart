"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CopyPlus,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEmptyListingItem,
  createEmptyListingStudio,
  getItemDisplayTitle,
  getItemProgressPercent,
  normalizeListingStudio,
  type ListingStudioDraft,
} from "@/lib/artists/listing-flow";
import { buildArtistPageHref, type AccountProfile } from "@/lib/auth/account-profile";

type ListingStudioPayload = {
  profile: AccountProfile;
  studio: ListingStudioDraft;
};

type SortValue =
  | "newest"
  | "oldest"
  | "progress_desc"
  | "price_desc"
  | "title_asc";

function buildFallbackProfile(
  user: NonNullable<ReturnType<typeof useAuth>["user"]>,
  username: string,
): AccountProfile {
  return {
    authProviders: user.providerIds,
    bannerURL: null,
    createdAt: null,
    displayName: user.displayName ?? user.email ?? "EduthArt Collector",
    email: user.email ?? null,
    firstName: null,
    lastLoginAt: null,
    lastName: null,
    legal: null,
    photoURL: user.photoURL ?? null,
    shippingOriginAddress: null,
    uid: user.uid,
    updatedAt: null,
    username,
  };
}

async function parseApiError(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;

  return payload?.error?.message ?? fallbackMessage;
}

function parsePrice(value: string) {
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function ListingManagerPage({ username }: { username: string }) {
  const router = useRouter();
  const { status, user } = useAuth();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [studio, setStudio] = useState<ListingStudioDraft>(() => createEmptyListingStudio());
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("newest");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=/artists/${username}/listings/new`);
      return;
    }

    if (status !== "authenticated" || !user) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const controller = new AbortController();
        timeoutId = window.setTimeout(() => controller.abort(), 12000);
        const response = await fetch(`/api/artists/listing-flow?username=${encodeURIComponent(username)}`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!response.ok) {
          throw new Error(await parseApiError(response, "Unable to load your listings."));
        }

        const payload = (await response.json()) as ListingStudioPayload;
        if (cancelled) {
          return;
        }

        setProfile(payload.profile);
        setStudio(normalizeListingStudio(payload.studio, {
          existingAddress: payload.profile.shippingOriginAddress,
        }));
        setSelectedItemIds([]);
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error
              ? loadError.name === "AbortError"
                ? "Loading your listings took too long. A local draft list was opened instead."
                : loadError.message
              : "Unable to load your listings.";
          setError(message);
          setProfile(buildFallbackProfile(user, username));
          setStudio(createEmptyListingStudio());
          setSelectedItemIds([]);
        }
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [router, status, user, username]);

  const persistStudio = async (nextStudio: ListingStudioDraft, successMessage?: string) => {
    if (!user) {
      return null;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/artists/listing-flow?username=${encodeURIComponent(username)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studio: {
            ...nextStudio,
            updatedAt: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Unable to update your listings."));
      }

      const payload = (await response.json()) as ListingStudioPayload;
      const normalizedStudio = normalizeListingStudio(payload.studio, {
        existingAddress: payload.profile.shippingOriginAddress,
      });
      setProfile(payload.profile);
      setStudio(normalizedStudio);
      setSelectedItemIds((current) =>
        current.filter((id) => normalizedStudio.items.some((item) => item.id === id)),
      );

      if (successMessage) {
        toast.success(successMessage);
      }

      return normalizedStudio;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to update your listings.";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    const loweredSearch = search.trim().toLowerCase();

    const next = studio.items.filter((item, index) => {
      const title = getItemDisplayTitle(item, index).toLowerCase();
      const matchesSearch =
        !loweredSearch ||
        title.includes(loweredSearch) ||
        item.artworkDetails.category.toLowerCase().includes(loweredSearch) ||
        item.artworkDetails.medium.toLowerCase().includes(loweredSearch) ||
        item.artworkDetails.subject.toLowerCase().includes(loweredSearch);

      const matchesAvailability =
        availabilityFilter === "all" || item.pricingInventory.availability === availabilityFilter;

      const visibility =
        item.salesVisibility.public
          ? "public"
          : item.salesVisibility.unlisted
            ? "unlisted"
            : item.salesVisibility.private
              ? "private"
              : "draft";

      const matchesVisibility =
        visibilityFilter === "all" || visibility === visibilityFilter;

      return matchesSearch && matchesAvailability && matchesVisibility;
    });

    next.sort((a, b) => {
      switch (sortBy) {
        case "title_asc":
          return getItemDisplayTitle(a, 0).localeCompare(getItemDisplayTitle(b, 0));
        case "oldest":
          return new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime();
        case "progress_desc":
          return getItemProgressPercent(b, studio.shared) - getItemProgressPercent(a, studio.shared);
        case "price_desc":
          return parsePrice(b.pricingInventory.price) - parsePrice(a.pricingInventory.price);
        case "newest":
        default:
          return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
      }
    });

    return next;
  }, [availabilityFilter, search, sortBy, studio.items, studio.shared, visibilityFilter]);

  const handleCreateItem = async () => {
    const nextItem = createEmptyListingItem();
    const nextStudio: ListingStudioDraft = {
      ...studio,
      items: [...studio.items, nextItem],
      updatedAt: new Date().toISOString(),
    };

    const persisted = await persistStudio(nextStudio, "New listing created.");
    if (persisted) {
      router.push(`/artists/${username}/listings/${nextItem.id}`);
    }
  };

  const handleDuplicateSelected = async () => {
    const sourceItems = studio.items.filter((item) => selectedItemIds.includes(item.id));
    if (sourceItems.length === 0) {
      toast.error("Select at least one listing to duplicate.");
      return;
    }

    const duplicates = sourceItems.map((item) =>
      createEmptyListingItem({
        ...item,
        id: undefined,
        artworkDetails: {
          ...item.artworkDetails,
          title: item.artworkDetails.title ? `${item.artworkDetails.title} Copy` : "",
        },
      }),
    );

    const persisted = await persistStudio(
      {
        ...studio,
        items: [...studio.items, ...duplicates],
        updatedAt: new Date().toISOString(),
      },
      "Selected listings duplicated.",
    );

    if (persisted) {
      setSelectedItemIds(duplicates.map((item) => item.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItemIds.length === 0) {
      toast.error("Select at least one listing to remove.");
      return;
    }

    const remainingItems = studio.items.filter((item) => !selectedItemIds.includes(item.id));
    const nextStudio: ListingStudioDraft = {
      ...studio,
      items: remainingItems.length > 0 ? remainingItems : [createEmptyListingItem()],
      updatedAt: new Date().toISOString(),
    };

    const persisted = await persistStudio(nextStudio, "Selected listings removed.");
    if (persisted) {
      setSelectedItemIds([]);
    }
  };

  if (loading || status === "loading") {
    return (
      <section className="min-h-screen bg-white px-4 pb-24 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-[2rem] border border-white/70 bg-white/88 p-12 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading your listings...
          </div>
        </div>
      </section>
    );
  }

  if (status === "unauthenticated" || !profile) {
    return null;
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(203,145,78,0.14),_transparent_36%),linear-gradient(180deg,#fbfaf7_0%,#ffffff_26%)] px-4 pb-24 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Listings Manager</p>
              <h1 className="text-4xl text-foreground sm:text-5xl">Manage your artwork inventory</h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                Browse all listing drafts and published works in one place, then open any card to edit on its own page.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="outline">
                <Link href={buildArtistPageHref(profile.username ?? username)}>
                  Preview gallery
                </Link>
              </Button>
              <Button disabled={saving} onClick={() => void handleCreateItem()} size="lg">
                <Plus />
                New listing
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, category, medium, or subject"
                value={search}
              />
            </div>
            <div className="space-y-2">
              <Label>Sort</Label>
              <Select onValueChange={(value: SortValue) => setSortBy(value)} value={sortBy}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Recently updated</SelectItem>
                  <SelectItem value="oldest">Oldest updated</SelectItem>
                  <SelectItem value="title_asc">Title A-Z</SelectItem>
                  <SelectItem value="progress_desc">Highest completion</SelectItem>
                  <SelectItem value="price_desc">Highest price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Availability</Label>
              <Select onValueChange={setAvailabilityFilter} value={availabilityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="original_available">Original available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select onValueChange={setVisibilityFilter} value={visibilityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={selectedItemIds.length === 0 || saving} onClick={() => void handleDuplicateSelected()} size="sm" variant="outline">
              <CopyPlus />
              Duplicate selected
            </Button>
            <Button disabled={selectedItemIds.length === 0 || saving} onClick={() => void handleDeleteSelected()} size="sm" variant="outline">
              <Trash2 />
              Remove selected
            </Button>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/35 px-4 py-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="size-4" />
              {filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Listings error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item, index) => {
            const selected = selectedItemIds.includes(item.id);
            const progress = getItemProgressPercent(item, studio.shared);
            const title = getItemDisplayTitle(item, index);
            const visibility = item.salesVisibility.public
              ? "Public"
              : item.salesVisibility.unlisted
                ? "Unlisted"
                : item.salesVisibility.private
                  ? "Private"
                  : "Draft";
            const mediumLine = [item.artworkDetails.category, item.artworkDetails.medium, item.artworkDetails.subject]
              .filter(Boolean)
              .join(" • ");

            return (
              <button
                key={item.id}
                className="group rounded-[2rem] border border-white/70 bg-white/92 p-5 text-left shadow-[0_30px_80px_-50px_rgba(47,36,28,0.35)] transition-transform hover:-translate-y-0.5 hover:border-primary/20"
                onClick={() => router.push(`/artists/${username}/listings/${item.id}`)}
                type="button"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) =>
                      setSelectedItemIds((current) =>
                        checked === true
                          ? Array.from(new Set([...current, item.id]))
                          : current.filter((id) => id !== item.id),
                      )
                    }
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="truncate text-lg font-semibold text-foreground">{title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {mediumLine || "Add category, medium, and subject"}
                        </p>
                      </div>
                      <span className={[
                        "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                        visibility === "Public"
                          ? "bg-green-100 text-green-800"
                          : visibility === "Draft"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-muted text-muted-foreground",
                      ].join(" ")}>
                        {visibility}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Availability</p>
                        <p className="mt-1 text-sm text-foreground">{item.pricingInventory.availability.replaceAll("_", " ")}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Price</p>
                        <p className="mt-1 text-sm text-foreground">{item.pricingInventory.price || "Not set"} {item.pricingInventory.currency}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Completion</span>
                        <span className="font-medium text-foreground">{progress}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
