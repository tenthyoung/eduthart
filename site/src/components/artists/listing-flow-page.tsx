"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CopyPlus,
  ImagePlus,
  Info,
  Loader2,
  MinusCircle,
  GripVertical,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmptyListingItem,
  createEmptyListingStudio,
  getItemDisplayTitle,
  getItemProgressPercent,
  isSharedShippingComplete,
  normalizeListingStudio,
  type ListingItemDraft,
  type ListingSharedSettings,
  type ListingStudioDraft,
  type ShippingOriginAddress,
} from "@/lib/artists/listing-flow";
import {
  buildArtistPageHref,
  type AccountProfile,
} from "@/lib/auth/account-profile";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

const E2E_AUTH_ENABLED = process.env.NEXT_PUBLIC_E2E_AUTH === "1";
const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024;
const AUTOSAVE_DELAY_MS = 1200;

type ListingStudioPayload = {
  profile: AccountProfile;
  studio: ListingStudioDraft;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "offline";

type ChecklistItem = {
  done: boolean;
  label: string;
};

type ArtworkDetailHelpKey =
  | "title"
  | "description"
  | "category"
  | "medium"
  | "subject"
  | "style"
  | "orientation"
  | "dimensions"
  | "pricing"
  | "shipping"
  | "story"
  | "seo"
  | "visibility";

function Accordion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultValue?: string;
  type?: string;
}) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

function AccordionItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  value?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.5rem] border bg-card",
        className
      )}
    >
      {children}
    </section>
  );
}

function AccordionTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 border-b border-border/70 p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function AccordionContent({ children }: { children: ReactNode }) {
  return <div className="p-5">{children}</div>;
}

const CATEGORY_OPTIONS = [
  "Painting",
  "Drawing",
  "Sculpture",
  "Photography",
  "Digital",
  "Textile",
  "Ceramic",
];
const MEDIUM_OPTIONS = [
  "Oil",
  "Acrylic",
  "Watercolor",
  "Mixed Media",
  "Digital",
  "Bronze",
  "Resin",
  "Film",
];
const SUBJECT_OPTIONS = [
  "Landscape",
  "Portrait",
  "Animals",
  "Abstract",
  "Nature",
  "Cityscape",
  "Faith",
];
const ORIENTATION_OPTIONS = ["Portrait", "Landscape", "Square"];
const COLOR_OPTIONS = ["Blue", "White", "Gold", "Red", "Green", "Black"];
const ROOM_OPTIONS = [
  "Living Room",
  "Bedroom",
  "Office",
  "Kitchen",
  "Hotel",
  "Restaurant",
];
const MOOD_OPTIONS = [
  "Peaceful",
  "Dramatic",
  "Joyful",
  "Spiritual",
  "Dark",
  "Minimal",
  "Vibrant",
];
const THEME_OPTIONS = [
  "Faith",
  "Nature",
  "Animals",
  "Travel",
  "Family",
  "Love",
  "Oceans",
  "Mountains",
];
const MEDIUM_DETAIL_OPTIONS = [
  "Oil",
  "Acrylic",
  "Mixed Media",
  "Gouache",
  "Digital",
  "Film",
  "Giclee",
  "Wood",
  "Stone",
  "Resin",
];
const FINISH_OPTIONS = ["Matte", "Satin", "Gloss", "Lustre"];
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD"];

const ARTWORK_DETAIL_HELP: Record<
  ArtworkDetailHelpKey,
  {
    description: string;
    definitions?: Array<{ description: string; label: string }>;
    examples: string[];
    title: string;
  }
> = {
  title: {
    title: "Artwork Title",
    description:
      "Use a title that feels intentional and easy for collectors to remember.",
    examples: ["Morning Light", "Quiet Tide", "City Hymn"],
  },
  description: {
    title: "Description",
    description:
      "Summarize what the collector is seeing and what makes the work visually distinct.",
    examples: [
      "Large abstract in layered blues and gold leaf.",
      "Original oil portrait with textured brushwork.",
    ],
  },
  category: {
    title: "Category",
    description:
      "Category is the top-level artwork type used for filtering and discovery.",
    examples: ["Painting", "Drawing", "Sculpture", "Photography"],
  },
  medium: {
    title: "Medium guide",
    description:
      "Medium tells buyers how the artwork was created or what the main material is.",
    examples: ["Oil", "Acrylic", "Watercolor", "Digital"],
    definitions: [
      {
        label: "Oil",
        description:
          "Pigment bound with drying oil, known for rich color, depth, and slow blending.",
      },
      {
        label: "Acrylic",
        description:
          "Fast-drying, water-based polymer paint that can range from transparent washes to heavy texture.",
      },
      {
        label: "Watercolor",
        description:
          "Transparent, water-soluble pigment typically painted on paper for luminous, layered effects.",
      },
      {
        label: "Mixed Media",
        description:
          "A single artwork combining two or more materials or techniques, such as paint, collage, and ink.",
      },
      {
        label: "Digital",
        description:
          "Artwork created primarily with digital tools, including illustration, painting, or generative processes.",
      },
      {
        label: "Bronze",
        description:
          "A durable metal alloy commonly cast into sculpture, often finished with a colored patina.",
      },
      {
        label: "Resin",
        description:
          "A liquid synthetic material that cures into a hard surface and may be cast, layered, or used as a glossy finish.",
      },
      {
        label: "Film",
        description:
          "Photography captured on light-sensitive film before being developed and printed or digitized.",
      },
    ],
  },
  subject: {
    title: "Subject",
    description:
      "Subject helps buyers understand what the piece depicts or centers around.",
    examples: ["Landscape", "Portrait", "Animals", "Abstract"],
  },
  style: {
    title: "Style",
    description:
      "Style is the visual approach or movement that best describes the piece.",
    examples: ["Impressionism", "Realism", "Minimalism", "Contemporary"],
  },
  orientation: {
    title: "Orientation",
    description:
      "Orientation helps buyers picture the shape and hanging direction of the work.",
    examples: ["Portrait", "Landscape", "Square"],
  },
  dimensions: {
    title: "Dimensions",
    description:
      "Dimensions help buyers understand scale, fit, and shipping needs.",
    examples: ["24 x 36 in", "61 x 91 cm", "Depth: 1.5 in"],
  },
  pricing: {
    title: "Pricing",
    description:
      "Pricing should be clear, confidence-inspiring, and aligned with how you want offers handled.",
    examples: ["$1,200 USD", "Accept offers above $900"],
  },
  shipping: {
    title: "Shipping",
    description:
      "Shared shipping settings apply across all items in this studio and must be trustworthy and specific.",
    examples: [
      "Ships in 3-5 business days",
      "Domestic shipping included",
      "Insurance included",
    ],
  },
  story: {
    title: "Story",
    description:
      "Story fields give collectors a reason to connect emotionally with the work.",
    examples: [
      "Inspired by a sunrise after a difficult season.",
      "Part of a coastal memory series.",
    ],
  },
  seo: {
    title: "SEO",
    description:
      "SEO fields shape how the listing looks in search results and preview links.",
    examples: [
      "Golden Hour Landscape Painting",
      "Original coastal painting in layered blue tones.",
    ],
  },
  visibility: {
    title: "Visibility",
    description:
      "Visibility controls whether this listing is private, unlisted, or ready for public viewing.",
    examples: ["Draft", "Public", "Unlisted"],
  },
};

function buildFallbackProfile(
  user: NonNullable<ReturnType<typeof useAuth>["user"]>,
  username: string
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
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;

  return payload?.error?.message ?? fallbackMessage;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read the selected file."));
    };

    reader.onerror = () =>
      reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

function formatRelativeSaveTime(value: Date | null) {
  if (!value) {
    return "Not saved yet";
  }

  const diffSeconds = Math.max(
    0,
    Math.round((Date.now() - value.getTime()) / 1000)
  );

  if (diffSeconds < 10) {
    return "Saved just now";
  }

  if (diffSeconds < 60) {
    return `Saved ${diffSeconds}s ago`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  return `Saved ${diffMinutes}m ago`;
}

function formatPriceInput(value: string) {
  const [integerPart = "", decimalPart] = value.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return decimalPart === undefined
    ? groupedInteger
    : `${groupedInteger}.${decimalPart}`;
}

function getItemChecklist(
  item: ListingItemDraft,
  shared: ListingSharedSettings
) {
  const checklist: ChecklistItem[] = [
    { label: "Title", done: Boolean(item.artworkDetails.title.trim()) },
    {
      label: "Photos",
      done: Boolean(
        item.media.mainImageUrl && item.media.galleryImageUrls.length > 0
      ),
    },
    { label: "Price", done: Boolean(item.pricingInventory.price) },
    { label: "Medium", done: Boolean(item.artworkDetails.medium) },
    {
      label: "Dimensions",
      done: Boolean(item.dimensions.width && item.dimensions.height),
    },
    { label: "Shipping information", done: isSharedShippingComplete(shared) },
  ];

  return checklist;
}

function getMissingFieldMessages(
  item: ListingItemDraft,
  shared: ListingSharedSettings
) {
  const messages: string[] = [];

  if (!item.artworkDetails.title.trim()) {
    messages.push("Add an artwork title.");
  }
  if (!item.artworkDetails.description.trim()) {
    messages.push("Add a clear artwork description.");
  }
  if (!item.media.mainImageUrl) {
    messages.push("Upload a cover image.");
  }
  if (item.media.galleryImageUrls.length === 0) {
    messages.push("Add at least one gallery image.");
  }
  if (!item.artworkDetails.medium) {
    messages.push("Choose a medium.");
  }
  if (!item.artworkDetails.category) {
    messages.push("Choose a category.");
  }
  if (!item.artworkDetails.subject) {
    messages.push("Choose a subject.");
  }
  if (!item.dimensions.width || !item.dimensions.height) {
    messages.push("Enter width and height.");
  }
  if (!item.pricingInventory.price) {
    messages.push("Set a price.");
  }
  if (!isSharedShippingComplete(shared)) {
    messages.push("Complete shared shipping settings.");
  }

  return messages;
}

function sectionState(done: boolean, warning: boolean) {
  if (done) {
    return "Complete";
  }

  if (warning) {
    return "Needs attention";
  }

  return "Optional";
}

function HelpLabel({
  helpKey,
  label,
  onOpen,
  htmlFor,
}: {
  helpKey: ArtworkDetailHelpKey;
  label: string;
  onOpen: (key: ArtworkDetailHelpKey) => void;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <button
        aria-label={`Learn more about ${label}`}
        className="inline-flex size-6 items-center justify-center rounded-full border border-border/80 bg-white text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        onClick={() => onOpen(helpKey)}
        type="button"
      >
        <Info className="size-3.5" />
      </button>
    </div>
  );
}

function ValidationText({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-base font-medium leading-6 text-amber-700">{message}</p>
  );
}

function SectionHeader({ helper, title }: { helper: string; title: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-base leading-7 text-muted-foreground">{helper}</p>
    </div>
  );
}

function FileButton({
  accept,
  helper,
  label,
  multiple = false,
  onChange,
}: {
  accept: string;
  helper: string;
  label: string;
  multiple?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputId = `file-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <label
      className="block rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-4 transition-colors hover:border-primary/45"
      htmlFor={inputId}
    >
      <div className="flex items-start gap-3">
        <ImagePlus className="mt-0.5 size-5 text-primary" />
        <div className="space-y-1">
          <p className="text-base font-medium leading-6 text-foreground">
            {label}
          </p>
          <p className="text-base leading-6 text-muted-foreground">{helper}</p>
        </div>
      </div>
      <input
        accept={accept}
        className="mt-3 block w-full text-base text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-base file:font-medium file:text-primary-foreground"
        id={inputId}
        multiple={multiple}
        onChange={onChange}
        type="file"
      />
    </label>
  );
}

function MultiToggle({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-base font-medium leading-6 text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <button
              key={option}
              className={[
                "rounded-full border px-3 py-1.5 text-base transition-colors",
                checked
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/80 bg-white text-muted-foreground hover:border-primary/30",
              ].join(" ")}
              onClick={() =>
                onChange(
                  checked
                    ? selected.filter((item) => item !== option)
                    : [...selected, option]
                )
              }
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShippingAddressFields({
  address,
  onChange,
}: {
  address: ShippingOriginAddress | null;
  onChange: (next: ShippingOriginAddress) => void;
}) {
  const current = address ?? {
    city: "",
    country: "",
    line1: "",
    line2: null,
    postalCode: "",
    region: "",
  };

  const update = (patch: Partial<ShippingOriginAddress>) =>
    onChange({
      ...current,
      ...patch,
    });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="shipping-line1">Address line 1</Label>
        <Input
          id="shipping-line1"
          value={current.line1}
          onChange={(event) => update({ line1: event.target.value })}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="shipping-line2">Address line 2</Label>
        <Input
          id="shipping-line2"
          value={current.line2 ?? ""}
          onChange={(event) => update({ line2: event.target.value || null })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shipping-city">City</Label>
        <Input
          id="shipping-city"
          value={current.city}
          onChange={(event) => update({ city: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shipping-region">State / Region</Label>
        <Input
          id="shipping-region"
          value={current.region}
          onChange={(event) => update({ region: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shipping-postal">Postal code</Label>
        <Input
          id="shipping-postal"
          value={current.postalCode}
          onChange={(event) => update({ postalCode: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shipping-country">Country</Label>
        <Input
          id="shipping-country"
          value={current.country}
          onChange={(event) => update({ country: event.target.value })}
        />
      </div>
    </div>
  );
}

function SidebarChecklist({ checklist }: { checklist: ChecklistItem[] }) {
  return (
    <div className="space-y-3">
      {checklist.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-base">
          {item.done ? (
            <CheckCircle2 className="size-4 text-green-600" />
          ) : (
            <MinusCircle className="size-4 text-amber-600" />
          )}
          <span
            className={item.done ? "text-foreground" : "text-muted-foreground"}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ListingFlowPage({
  itemId,
  username,
}: {
  itemId?: string;
  username: string;
}) {
  const router = useRouter();
  const { status, user } = useAuth();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [studio, setStudio] = useState<ListingStudioDraft>(() =>
    createEmptyListingStudio()
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [activeHelpKey, setActiveHelpKey] =
    useState<ArtworkDetailHelpKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [activePreviewImageIndex, setActivePreviewImageIndex] = useState(0);
  const activeHelp = activeHelpKey ? ARTWORK_DETAIL_HELP[activeHelpKey] : null;
  const isStandaloneEditor = Boolean(itemId);
  const listingsTypographyClassName = [
    "[&_h1]:font-sans",
    "[&_h2]:font-sans",
    "[&_h3]:font-sans",
    "[&_p]:font-sans",
    "[&_span]:font-sans",
    "[&_label]:font-sans",
    "[&_button]:font-sans",
    "[&_label[data-slot=label]]:text-base",
    "[&_label[data-slot=label]]:leading-6",
    "[&_p.text-sm]:text-base",
    "[&_p.text-sm]:leading-7",
    "[&_p.text-xs]:text-base",
    "[&_p.text-xs]:leading-6",
    "[&_span.text-xs]:text-base",
    "[&_span.text-xs]:leading-6",
    "[&_div.text-sm]:text-base",
    "[&_div.text-xs]:text-base",
    "[&_[data-slot=input]]:text-base",
    "[&_[data-slot=input]]:md:text-base",
    "[&_[data-slot=textarea]]:text-base",
    "[&_[data-slot=textarea]]:md:text-base",
    "[&_[data-slot=select-trigger]]:text-base",
    "[&_[data-slot=select-item]]:text-base",
  ].join(" ");
  const standaloneTypographyClassName = isStandaloneEditor
    ? ["[&_h2.text-2xl]:text-3xl", "[&_h3.text-2xl]:text-3xl"].join(" ")
    : "";

  const lastPersistedSnapshotRef = useRef("");
  const hasLoadedRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const saveRequestIdRef = useRef(0);
  const draggedPreviewImageIndexRef = useRef<number | null>(null);

  const activeItem =
    studio.items.find((item) => item.id === activeItemId) ??
    studio.items[0] ??
    null;

  const checklist = useMemo(
    () => (activeItem ? getItemChecklist(activeItem, studio.shared) : []),
    [activeItem, studio.shared]
  );
  const missingFields = useMemo(
    () =>
      activeItem ? getMissingFieldMessages(activeItem, studio.shared) : [],
    [activeItem, studio.shared]
  );
  const publishReady = missingFields.length === 0;
  const selectedCount = selectedItemIds.length;
  const sharedReady = isSharedShippingComplete(studio.shared);
  const itemProgress = activeItem
    ? getItemProgressPercent(activeItem, studio.shared)
    : 0;
  const previewImages = activeItem
    ? [
        activeItem.media.mainImageUrl,
        ...activeItem.media.galleryImageUrls,
      ].filter(
        (value, index, array): value is string =>
          Boolean(value) && array.indexOf(value) === index
      )
    : [];
  const safeActivePreviewImageIndex = Math.min(
    activePreviewImageIndex,
    Math.max(0, previewImages.length - 1)
  );
  const activePreviewImage = previewImages[safeActivePreviewImageIndex] ?? null;
  const previewTitle = activeItem
    ? getItemDisplayTitle(
        activeItem,
        studio.items.findIndex((item) => item.id === activeItem.id)
      )
    : "Untitled artwork";
  const previewGalleryHref = buildArtistPageHref(profile?.username ?? username);

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
        const response = await fetch(
          `/api/artists/listing-flow?username=${encodeURIComponent(username)}`,
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!response.ok) {
          throw new Error(
            await parseApiError(response, "Unable to load your listing studio.")
          );
        }

        const payload = (await response.json()) as ListingStudioPayload;
        if (cancelled) {
          return;
        }

        const normalizedStudio = normalizeListingStudio(payload.studio, {
          existingAddress: payload.profile.shippingOriginAddress,
        });
        setProfile(payload.profile);
        setStudio(normalizedStudio);
        setActiveItemId(
          itemId && normalizedStudio.items.some((item) => item.id === itemId)
            ? itemId
            : (normalizedStudio.items[0]?.id ?? null)
        );
        setSelectedItemIds([]);
        lastPersistedSnapshotRef.current = JSON.stringify(normalizedStudio);
        hasLoadedRef.current = true;
        setSaveState("saved");
        setLastSavedAt(new Date());
      } catch (loadError) {
        if (!cancelled) {
          const fallbackProfile = buildFallbackProfile(user, username);
          const fallbackStudio = normalizeListingStudio(null, {
            existingAddress: fallbackProfile.shippingOriginAddress,
          });
          const message =
            loadError instanceof Error
              ? loadError.name === "AbortError"
                ? "Loading your listing studio took too long. A local draft was opened so you can keep working."
                : loadError.message
              : "Unable to load your listing studio.";
          setError(message);
          setProfile(fallbackProfile);
          setStudio(fallbackStudio);
          setActiveItemId(
            itemId && fallbackStudio.items.some((item) => item.id === itemId)
              ? itemId
              : (fallbackStudio.items[0]?.id ?? null)
          );
          setSelectedItemIds([]);
          lastPersistedSnapshotRef.current = JSON.stringify(fallbackStudio);
          hasLoadedRef.current = true;
          setSaveState("idle");
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
  }, [itemId, router, status, user, username]);

  useEffect(() => {
    if (itemId) {
      setActiveItemId(itemId);
    }
  }, [itemId]);

  useEffect(() => {
    if (!itemId || loading) {
      return;
    }

    const exists = studio.items.some((item) => item.id === itemId);
    if (!exists) {
      router.replace(`/artists/${username}/listings/new`);
    }
  }, [itemId, loading, router, studio.items, username]);

  const persistStudio = useCallback(
    async ({
      nextStudio,
      successMessage,
      silent,
    }: {
      nextStudio: ListingStudioDraft;
      silent?: boolean;
      successMessage?: string;
    }) => {
      if (!user) {
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSaveState("offline");
        return;
      }

      const requestId = ++saveRequestIdRef.current;
      setSaveState("saving");
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(
          `/api/artists/listing-flow?username=${encodeURIComponent(username)}`,
          {
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
          }
        );

        if (!response.ok) {
          throw new Error(
            await parseApiError(response, "Unable to save your listing studio.")
          );
        }

        const payload = (await response.json()) as ListingStudioPayload;
        if (requestId !== saveRequestIdRef.current) {
          return;
        }

        const normalizedStudio = normalizeListingStudio(payload.studio, {
          existingAddress: payload.profile.shippingOriginAddress,
        });

        setProfile(payload.profile);
        setStudio(normalizedStudio);
        setActiveItemId((current) =>
          normalizedStudio.items.some((item) => item.id === current)
            ? current
            : (normalizedStudio.items[0]?.id ?? null)
        );
        setSelectedItemIds((current) =>
          current.filter((id) =>
            normalizedStudio.items.some((item) => item.id === id)
          )
        );
        lastPersistedSnapshotRef.current = JSON.stringify(normalizedStudio);
        setSaveState("saved");
        setLastSavedAt(new Date());

        if (!silent && successMessage) {
          toast.success(successMessage);
        }
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : "Unable to save your listing studio.";
        setError(message);
        setSaveState("dirty");
        if (!silent) {
          toast.error(message);
        }
      }
    },
    [user, username]
  );

  useEffect(() => {
    if (!hasLoadedRef.current || loading) {
      return;
    }

    const snapshot = JSON.stringify(studio);
    if (snapshot === lastPersistedSnapshotRef.current) {
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveState("offline");
      return;
    }

    setSaveState("dirty");

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void persistStudio({
        nextStudio: studio,
        silent: true,
      });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [loading, persistStudio, studio]);

  const updateStudio = (
    updater: (current: ListingStudioDraft) => ListingStudioDraft
  ) => {
    setStudio((current) => updater(current));
  };

  const updateActiveItem = (
    updater: (item: ListingItemDraft) => ListingItemDraft
  ) => {
    if (!activeItem) {
      return;
    }

    updateStudio((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === activeItem.id
          ? {
              ...updater(item),
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
    }));
  };

  const updateShared = (
    updater: (shared: ListingSharedSettings) => ListingSharedSettings
  ) => {
    updateStudio((current) => ({
      ...current,
      shared: updater(current.shared),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleCreateItem = () => {
    const nextItem = createEmptyListingItem();
    updateStudio((current) => ({
      ...current,
      items: [...current.items, nextItem],
      updatedAt: new Date().toISOString(),
    }));
    setActiveItemId(nextItem.id);
    setSelectedItemIds([]);
    toast.success("New listing item created.");
  };

  const handleDuplicateSelected = () => {
    const sourceItems = studio.items.filter((item) =>
      selectedItemIds.includes(item.id)
    );
    if (sourceItems.length === 0) {
      toast.error("Select at least one listing item to duplicate.");
      return;
    }

    const duplicates = sourceItems.map((item) =>
      createEmptyListingItem({
        ...item,
        id: undefined,
        artworkDetails: {
          ...item.artworkDetails,
          title: item.artworkDetails.title
            ? `${item.artworkDetails.title} Copy`
            : "",
        },
      })
    );

    updateStudio((current) => ({
      ...current,
      items: [...current.items, ...duplicates],
      updatedAt: new Date().toISOString(),
    }));
    setSelectedItemIds(duplicates.map((item) => item.id));
    setActiveItemId(duplicates[0]?.id ?? activeItemId);
    toast.success("Selected items duplicated.");
  };

  const handleDeleteSelected = () => {
    if (selectedItemIds.length === 0) {
      toast.error("Select one or more listing items to remove.");
      return;
    }

    const remainingItems = studio.items.filter(
      (item) => !selectedItemIds.includes(item.id)
    );
    const nextItems =
      remainingItems.length > 0 ? remainingItems : [createEmptyListingItem()];
    updateStudio((current) => ({
      ...current,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    }));
    setSelectedItemIds([]);
    setActiveItemId(nextItems[0]?.id ?? null);
    toast.success("Selected items removed.");
  };

  const applyBulkAvailability = (
    availability: ListingItemDraft["pricingInventory"]["availability"]
  ) => {
    if (selectedItemIds.length === 0) {
      toast.error("Select at least one item first.");
      return;
    }

    updateStudio((current) => ({
      ...current,
      items: current.items.map((item) =>
        selectedItemIds.includes(item.id)
          ? {
              ...item,
              pricingInventory: {
                ...item.pricingInventory,
                availability,
              },
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
    }));
  };

  const applyBulkVisibility = (
    mode: "draft" | "private" | "public" | "unlisted"
  ) => {
    if (selectedItemIds.length === 0) {
      toast.error("Select at least one item first.");
      return;
    }

    updateStudio((current) => ({
      ...current,
      items: current.items.map((item) =>
        selectedItemIds.includes(item.id)
          ? {
              ...item,
              salesVisibility: {
                ...item.salesVisibility,
                draft: mode === "draft",
                private: mode === "private",
                public: mode === "public",
                unlisted: mode === "unlisted",
              },
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
    }));
  };

  const saveNow = async () => {
    await persistStudio({
      nextStudio: studio,
      successMessage: "Draft saved.",
    });
  };

  const publishItem = async () => {
    if (!activeItem || !publishReady) {
      toast.error("Finish the required fields before publishing.");
      return;
    }

    updateActiveItem((current) => ({
      ...current,
      pricingInventory: {
        ...current.pricingInventory,
        availability:
          current.pricingInventory.availability === "draft"
            ? "original_available"
            : current.pricingInventory.availability,
      },
      salesVisibility: {
        ...current.salesVisibility,
        draft: false,
        private: false,
        public: true,
        unlisted: false,
      },
    }));

    await persistStudio({
      nextStudio: {
        ...studio,
        items: studio.items.map((item) =>
          item.id === activeItem.id
            ? {
                ...item,
                pricingInventory: {
                  ...item.pricingInventory,
                  availability:
                    item.pricingInventory.availability === "draft"
                      ? "original_available"
                      : item.pricingInventory.availability,
                },
                salesVisibility: {
                  ...item.salesVisibility,
                  draft: false,
                  private: false,
                  public: true,
                  unlisted: false,
                },
                updatedAt: new Date().toISOString(),
              }
            : item
        ),
      },
      successMessage: "Listing published.",
    });
  };

  const uploadFiles = async (files: FileList | null, pathPrefix: string) => {
    if (!files || !user) {
      return [];
    }

    const uploads = Array.from(files);
    for (const file of uploads) {
      if (file.size > MAX_MEDIA_FILE_SIZE) {
        throw new Error("Each uploaded file must be 10 MB or smaller.");
      }
    }

    setUploading(true);

    try {
      const results = await Promise.all(
        uploads.map(async (file) => {
          if (E2E_AUTH_ENABLED) {
            return readFileAsDataUrl(file);
          }

          const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
          const storage = getFirebaseStorage();
          const storageRef = ref(
            storage,
            `${pathPrefix}/${user.uid}/${Date.now()}-${safeName}`
          );
          await uploadBytes(storageRef, file, {
            cacheControl: "public,max-age=31536000,immutable",
            contentType: file.type,
          });
          return getDownloadURL(storageRef);
        })
      );

      return results;
    } finally {
      setUploading(false);
    }
  };

  const handleSingleUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    target: keyof ListingItemDraft["media"],
    pathPrefix: string
  ) => {
    try {
      const [fileUrl] = await uploadFiles(event.target.files, pathPrefix);
      if (!fileUrl) {
        return;
      }

      updateActiveItem((current) => ({
        ...current,
        media: {
          ...current.media,
          [target]: fileUrl,
        },
      }));
      toast.success("Media added to this listing.");
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload this file.";
      setError(message);
      toast.error(message);
    } finally {
      event.target.value = "";
    }
  };

  const handleMultiUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    target: "detailImageUrls" | "galleryImageUrls",
    pathPrefix: string
  ) => {
    try {
      const uploaded = await uploadFiles(event.target.files, pathPrefix);
      if (uploaded.length === 0) {
        return;
      }

      updateActiveItem((current) => ({
        ...current,
        media: {
          ...current.media,
          [target]: [...current.media[target], ...uploaded].slice(
            0,
            target === "galleryImageUrls" ? 20 : 10
          ),
        },
      }));
      toast.success("Media added to this listing.");
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload these files.";
      setError(message);
      toast.error(message);
    } finally {
      event.target.value = "";
    }
  };

  const handleListingImagesUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const uploaded = await uploadFiles(
        event.target.files,
        "artwork-media/gallery"
      );
      if (uploaded.length === 0) {
        return;
      }

      updateActiveItem((current) => {
        const images = [
          current.media.mainImageUrl,
          ...current.media.galleryImageUrls,
          ...uploaded,
        ]
          .filter(
            (value, index, array): value is string =>
              Boolean(value) && array.indexOf(value) === index
          )
          .slice(0, 20);

        return {
          ...current,
          media: {
            ...current.media,
            mainImageUrl: images[0] ?? null,
            galleryImageUrls: images.slice(1),
          },
        };
      });
      toast.success(
        `${uploaded.length} ${uploaded.length === 1 ? "image" : "images"} added.`
      );
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload these images.";
      setError(message);
      toast.error(message);
    } finally {
      event.target.value = "";
    }
  };

  const reorderListingImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    updateActiveItem((current) => {
      const images = [
        current.media.mainImageUrl,
        ...current.media.galleryImageUrls,
      ].filter(
        (value, index, array): value is string =>
          Boolean(value) && array.indexOf(value) === index
      );
      const [movedImage] = images.splice(fromIndex, 1);

      if (!movedImage) {
        return current;
      }

      images.splice(toIndex, 0, movedImage);

      return {
        ...current,
        media: {
          ...current.media,
          mainImageUrl: images[0] ?? null,
          galleryImageUrls: images.slice(1),
        },
      };
    });
    setActivePreviewImageIndex(toIndex);
  };

  const saveStatusLabel = uploading
    ? "Uploading media..."
    : saveState === "saving"
      ? "Saving..."
      : saveState === "offline"
        ? "Offline changes pending"
        : saveState === "dirty"
          ? "Unsaved changes"
          : formatRelativeSaveTime(lastSavedAt);

  if (loading || status === "loading") {
    return (
      <section className="min-h-screen bg-transparent px-0 pb-10 pt-0">
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-[2rem] border border-white/70 bg-white/88 p-12 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading your listing studio...
          </div>
        </div>
      </section>
    );
  }

  if (status === "unauthenticated" || !profile || !activeItem) {
    return null;
  }

  return (
    <section
      className={cn(
        "min-h-screen bg-transparent px-0 pb-12 pt-0 font-sans text-base",
        listingsTypographyClassName,
        standaloneTypographyClassName
      )}
    >
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-4 py-3 shadow-[0_-18px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {getItemDisplayTitle(
                activeItem,
                studio.items.findIndex((item) => item.id === activeItem.id)
              )}
            </p>
            <p className="text-xs text-muted-foreground">{saveStatusLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => void saveNow()} size="sm" variant="outline">
              Save
            </Button>
            <Button
              disabled={!publishReady || saveState === "saving"}
              onClick={() => void publishItem()}
              size="sm"
            >
              Publish
            </Button>
          </div>
        </div>
      </div>

      <Sheet
        open={Boolean(activeHelp)}
        onOpenChange={(open) => !open && setActiveHelpKey(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {activeHelp ? (
            <>
              <SheetHeader className="border-b border-border/70 pb-4">
                <SheetTitle className="text-2xl">{activeHelp.title}</SheetTitle>
                <SheetDescription className="text-sm leading-6">
                  {activeHelp.description}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 p-4">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    Why this field matters
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Clear, confident listing details reduce buyer hesitation and
                    make the work easier to discover.
                  </p>
                </div>
                {activeHelp.definitions ? (
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Available mediums
                    </p>
                    <dl className="mt-3 space-y-3">
                      {activeHelp.definitions.map((definition) => (
                        <div
                          key={definition.label}
                          className="rounded-xl border border-border/70 bg-card px-4 py-3"
                        >
                          <dt className="text-sm font-semibold text-foreground">
                            {definition.label}
                          </dt>
                          <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                            {definition.description}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Examples
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {activeHelp.examples.map((example) => (
                        <li
                          key={example}
                          className="rounded-xl border border-border/70 bg-card px-3 py-2"
                        >
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
