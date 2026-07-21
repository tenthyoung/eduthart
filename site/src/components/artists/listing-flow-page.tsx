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
      <div className="mx-auto max-w-7xl space-y-8">
        {!isStandaloneEditor ? (
          <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                  <Sparkles className="size-3.5" />
                  Listing Studio
                </div>
                <h1 className="text-4xl text-foreground sm:text-5xl">
                  Create and publish art with confidence
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  A Shopify-inspired listing workflow for artists: structured
                  sections, autosave drafts, and clear publishing guidance.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" variant="outline">
                  <Link href={previewGalleryHref}>Preview gallery</Link>
                </Button>
                <Button
                  onClick={() => void saveNow()}
                  size="lg"
                  variant="outline"
                >
                  <Save />
                  Save now
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground">
              <span className="font-medium">Save status:</span>
              <span>{saveStatusLabel}</span>
              {saveState === "saving" ? (
                <RefreshCw className="size-4 animate-spin text-primary" />
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Listing studio error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!isStandaloneEditor ? (
          <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl text-foreground">Your listing items</h2>
                <p className="text-sm text-muted-foreground">
                  Add multiple works, select any item to edit it, or bulk update
                  selected items.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCreateItem} size="sm">
                  <Plus />
                  Add item
                </Button>
                <Button
                  disabled={selectedCount === 0}
                  onClick={handleDuplicateSelected}
                  size="sm"
                  variant="outline"
                >
                  <CopyPlus />
                  Duplicate
                </Button>
                <Button
                  disabled={selectedCount === 0}
                  onClick={handleDeleteSelected}
                  size="sm"
                  variant="outline"
                >
                  <MinusCircle />
                  Remove
                </Button>
              </div>
            </div>

            <div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-1">
              {studio.items.map((item, index) => {
                const selected = selectedItemIds.includes(item.id);
                const active = item.id === activeItem.id;
                const title = getItemDisplayTitle(item, index);
                const progress = getItemProgressPercent(item, studio.shared);

                return (
                  <button
                    key={item.id}
                    className={[
                      "min-w-[240px] snap-start rounded-[1.5rem] border p-4 text-left transition-colors",
                      active
                        ? "border-primary/35 bg-primary/8"
                        : "border-border/70 bg-card hover:border-primary/20",
                    ].join(" ")}
                    onClick={() => setActiveItemId(item.id)}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) =>
                          setSelectedItemIds((current) =>
                            checked === true
                              ? Array.from(new Set([...current, item.id]))
                              : current.filter((id) => id !== item.id)
                          )
                        }
                        onClick={(event) => event.stopPropagation()}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {progress}% complete
                        </p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Bulk availability</Label>
                <Select onValueChange={applyBulkAvailability}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Set for selected items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original_available">
                      Original available
                    </SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bulk visibility</Label>
                <Select
                  onValueChange={(
                    value: "draft" | "private" | "public" | "unlisted"
                  ) => applyBulkVisibility(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Set for selected items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                Selected items:{" "}
                <span className="font-medium text-foreground">
                  {selectedCount}
                </span>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                Shared shipping:{" "}
                <span className="font-medium text-foreground">
                  {sharedReady ? "Ready" : "Needs setup"}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {isStandaloneEditor ? (
              <div
                className="rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]"
                id="listing-preview"
              >
                <div className="border-b border-border/70 pb-5">
                  <div className="space-y-2">
                    <p className="text-base font-medium uppercase tracking-[0.22em] text-primary">
                      Edit listing
                    </p>
                    <Input
                      aria-label="Artwork title"
                      className="h-auto border-0 border-b border-transparent px-0 py-1 !text-3xl shadow-none hover:border-border focus-visible:border-primary focus-visible:ring-0 md:!text-3xl"
                      onChange={(event) =>
                        updateActiveItem((current) => ({
                          ...current,
                          artworkDetails: {
                            ...current.artworkDetails,
                            title: event.target.value,
                          },
                        }))
                      }
                      placeholder="Untitled artwork"
                      value={activeItem.artworkDetails.title}
                    />
                    <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                      Edit the listing directly. Changes save automatically as
                      you type.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] border border-border/70 bg-muted/20 p-3">
                      <div className="grid gap-3 md:grid-cols-[5.25rem_minmax(0,1fr)]">
                        {previewImages.length > 0 ? (
                          <div className="order-2 flex gap-2 overflow-x-auto pb-1 md:order-1 md:max-h-[34rem] md:flex-col md:overflow-y-auto md:pr-1">
                            {previewImages.map((image, index) => (
                              <div
                                key={image}
                                className="group relative shrink-0"
                                draggable
                                onDragEnd={() => {
                                  draggedPreviewImageIndexRef.current = null;
                                }}
                                onDragOver={(event) => event.preventDefault()}
                                onDragStart={() => {
                                  draggedPreviewImageIndexRef.current = index;
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  const fromIndex =
                                    draggedPreviewImageIndexRef.current;
                                  if (fromIndex !== null)
                                    reorderListingImages(fromIndex, index);
                                  draggedPreviewImageIndexRef.current = null;
                                }}
                              >
                                <button
                                  aria-label={`Show image ${index + 1}`}
                                  className={cn(
                                    "block overflow-hidden rounded-xl border-2 bg-white transition-all",
                                    index === safeActivePreviewImageIndex
                                      ? "border-primary shadow-sm"
                                      : "border-transparent hover:border-primary/30"
                                  )}
                                  onClick={() =>
                                    setActivePreviewImageIndex(index)
                                  }
                                  type="button"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    alt=""
                                    className="size-20 object-cover"
                                    src={image}
                                  />
                                </button>
                                <GripVertical className="pointer-events-none absolute right-1 top-1 size-4 rounded bg-white/90 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100" />
                                {index === 0 ? (
                                  <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                    Cover
                                  </span>
                                ) : null}
                                <div className="mt-1 flex justify-center gap-1">
                                  <button
                                    aria-label={`Move image ${index + 1} earlier`}
                                    className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-white hover:text-primary disabled:opacity-30"
                                    disabled={index === 0}
                                    onClick={() =>
                                      reorderListingImages(index, index - 1)
                                    }
                                    type="button"
                                  >
                                    <ChevronLeft className="size-3.5" />
                                  </button>
                                  <button
                                    aria-label={`Move image ${index + 1} later`}
                                    className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-white hover:text-primary disabled:opacity-30"
                                    disabled={
                                      index === previewImages.length - 1
                                    }
                                    onClick={() =>
                                      reorderListingImages(index, index + 1)
                                    }
                                    type="button"
                                  >
                                    <ChevronRight className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="relative order-1 overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,rgba(203,145,78,0.16),rgba(249,244,237,0.95))] md:order-2">
                          {activePreviewImage ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt={previewTitle}
                                className="aspect-[4/3] w-full object-contain"
                                src={activePreviewImage}
                              />
                              {previewImages.length > 1 ? (
                                <>
                                  <Button
                                    aria-label="Previous image"
                                    className="absolute left-3 top-1/2 size-10 -translate-y-1/2 rounded-full bg-white/90 p-0 text-foreground shadow-md hover:bg-white"
                                    onClick={() =>
                                      setActivePreviewImageIndex(
                                        (safeActivePreviewImageIndex -
                                          1 +
                                          previewImages.length) %
                                          previewImages.length
                                      )
                                    }
                                    type="button"
                                    variant="outline"
                                  >
                                    <ChevronLeft />
                                  </Button>
                                  <Button
                                    aria-label="Next image"
                                    className="absolute right-3 top-1/2 size-10 -translate-y-1/2 rounded-full bg-white/90 p-0 text-foreground shadow-md hover:bg-white"
                                    onClick={() =>
                                      setActivePreviewImageIndex(
                                        (safeActivePreviewImageIndex + 1) %
                                          previewImages.length
                                      )
                                    }
                                    type="button"
                                    variant="outline"
                                  >
                                    <ChevronRight />
                                  </Button>
                                </>
                              ) : null}
                            </>
                          ) : (
                            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-8 text-center">
                              <ImagePlus className="size-9 text-primary" />
                              <p className="max-w-sm text-base leading-7 text-muted-foreground">
                                Add artwork photos to build the listing gallery.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                        <label
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
                            uploading && "pointer-events-none opacity-60"
                          )}
                        >
                          {uploading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ImagePlus className="size-4" />
                          )}
                          {uploading
                            ? "Uploading..."
                            : previewImages.length > 0
                              ? "Add more photos"
                              : "Add artwork photos"}
                          <input
                            accept="image/*"
                            className="sr-only"
                            disabled={uploading}
                            multiple
                            onChange={(event) =>
                              void handleListingImagesUpload(event)
                            }
                            type="file"
                          />
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary">
                          <ImagePlus className="size-4" />
                          Add detail photos
                          <input
                            accept="image/*"
                            className="sr-only"
                            multiple
                            onChange={(event) =>
                              void handleMultiUpload(
                                event,
                                "detailImageUrls",
                                "artwork-media/details"
                              )
                            }
                            type="file"
                          />
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary">
                          <Upload className="size-4" />
                          {activeItem.media.videoUrl
                            ? "Replace video"
                            : "Add video"}
                          <input
                            accept="video/*"
                            className="sr-only"
                            onChange={(event) =>
                              void handleSingleUpload(
                                event,
                                "videoUrl",
                                "artwork-media/video"
                              )
                            }
                            type="file"
                          />
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Drag thumbnails to reorder. The first image is the
                          cover.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 px-5 py-4">
                      <Label
                        className="text-base text-muted-foreground"
                        htmlFor="preview-price"
                      >
                        Current price ({activeItem.pricingInventory.currency})
                      </Label>
                      <Input
                        className="mt-2 min-h-16 py-2 !text-4xl font-semibold md:!text-4xl"
                        id="preview-price"
                        inputMode="decimal"
                        onChange={(event) => {
                          const price = event.target.value.replaceAll(",", "");

                          if (!/^\d*(?:\.\d{0,2})?$/.test(price)) {
                            return;
                          }

                          updateActiveItem((current) => ({
                            ...current,
                            pricingInventory: {
                              ...current.pricingInventory,
                              price,
                            },
                          }));
                        }}
                        placeholder="0.00"
                        type="text"
                        value={formatPriceInput(
                          activeItem.pricingInventory.price
                        )}
                      />
                      <p className="mt-2 text-base text-muted-foreground">
                        {activeItem.pricingInventory.availability ===
                        "original_available"
                          ? "Original available"
                          : activeItem.pricingInventory.availability.replaceAll(
                              "_",
                              " "
                            )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-border/70 bg-card p-5">
                      <p className="text-base font-medium text-foreground">
                        Artwork details
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="w-full space-y-2">
                            <Label>Artist</Label>
                            <Input
                              disabled
                              value={
                                profile.displayName ?? profile.email ?? "Artist"
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={activeItem.artworkDetails.category}
                            onValueChange={(value) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  category: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <HelpLabel
                            helpKey="medium"
                            label="Medium"
                            onOpen={setActiveHelpKey}
                          />
                          <Select
                            value={activeItem.artworkDetails.medium}
                            onValueChange={(value) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  medium: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose medium" />
                            </SelectTrigger>
                            <SelectContent>
                              {MEDIUM_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Select
                            value={activeItem.artworkDetails.subject}
                            onValueChange={(value) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  subject: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {SUBJECT_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>
                            Dimensions ({activeItem.dimensions.unit})
                          </Label>
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              aria-label="Width"
                              placeholder="Width"
                              value={activeItem.dimensions.width}
                              onChange={(event) =>
                                updateActiveItem((current) => ({
                                  ...current,
                                  dimensions: {
                                    ...current.dimensions,
                                    width: event.target.value,
                                  },
                                }))
                              }
                            />
                            <Input
                              aria-label="Height"
                              placeholder="Height"
                              value={activeItem.dimensions.height}
                              onChange={(event) =>
                                updateActiveItem((current) => ({
                                  ...current,
                                  dimensions: {
                                    ...current.dimensions,
                                    height: event.target.value,
                                  },
                                }))
                              }
                            />
                            <Input
                              aria-label="Depth"
                              placeholder="Depth"
                              value={activeItem.dimensions.depth}
                              onChange={(event) =>
                                updateActiveItem((current) => ({
                                  ...current,
                                  dimensions: {
                                    ...current.dimensions,
                                    depth: event.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-border/70 bg-card p-5">
                      <Label htmlFor="listing-description">Description</Label>
                      <Textarea
                        className="mt-3 min-h-32 border-0 bg-muted/20 text-base leading-7 shadow-none focus-visible:ring-1"
                        id="listing-description"
                        onChange={(event) =>
                          updateActiveItem((current) => ({
                            ...current,
                            artworkDetails: {
                              ...current.artworkDetails,
                              description: event.target.value,
                            },
                          }))
                        }
                        placeholder="Tell buyers what makes this work special."
                        value={activeItem.artworkDetails.description}
                      />
                    </div>

                    <div className="rounded-[1.5rem] border border-border/70 bg-card p-5">
                      <Label htmlFor="listing-story">
                        Story behind the piece
                      </Label>
                      <Textarea
                        className="mt-3 min-h-32 border-0 bg-muted/20 text-base leading-7 shadow-none focus-visible:ring-1"
                        id="listing-story"
                        onChange={(event) =>
                          updateActiveItem((current) => ({
                            ...current,
                            artworkDetails: {
                              ...current.artworkDetails,
                              storyBehindPiece: event.target.value,
                            },
                          }))
                        }
                        placeholder="Share the story behind this piece."
                        value={activeItem.artworkDetails.storyBehindPiece}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    {isStandaloneEditor ? "More listing details" : "Editing"}
                  </p>
                  <h2 className="mt-2 text-2xl text-foreground">
                    {getItemDisplayTitle(
                      activeItem,
                      studio.items.findIndex(
                        (item) => item.id === activeItem.id
                      )
                    )}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {isStandaloneEditor
                      ? "Complete the supporting details below. Every section stays visible, and your changes save automatically."
                      : "Work section by section. Advanced fields are placed lower in each card so the page never feels overwhelming."}
                  </p>
                </div>
                <div className="rounded-full border border-border/70 bg-muted/35 px-4 py-2 text-sm text-foreground">
                  {itemProgress}% complete
                </div>
              </div>

              <Accordion
                className="mt-8"
                collapsible
                defaultValue="photos"
                type="single"
              >
                {!isStandaloneEditor ? (
                  <AccordionItem className="border-border/70" value="photos">
                    <AccordionTrigger className="hover:no-underline">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          Artwork Photos
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Upload strong visuals first. The cover image and
                          gallery drive conversion.
                        </p>
                      </div>
                      <span className="ml-auto rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                        {sectionState(
                          Boolean(
                            activeItem.media.mainImageUrl &&
                            activeItem.media.galleryImageUrls.length > 0
                          ),
                          !activeItem.media.mainImageUrl
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-5">
                        <FileButton
                          accept="image/*"
                          helper="Required cover image for the listing card and preview."
                          label="Cover Image"
                          onChange={(event) =>
                            void handleSingleUpload(
                              event,
                              "mainImageUrl",
                              "artwork-media/main"
                            )
                          }
                        />
                        <ValidationText
                          message={
                            !activeItem.media.mainImageUrl
                              ? "A cover image is required."
                              : null
                          }
                        />
                        <FileButton
                          accept="image/*"
                          helper="Upload multiple gallery images. At least one is required."
                          label="Gallery Images"
                          multiple
                          onChange={(event) =>
                            void handleMultiUpload(
                              event,
                              "galleryImageUrls",
                              "artwork-media/gallery"
                            )
                          }
                        />
                        <ValidationText
                          message={
                            activeItem.media.galleryImageUrls.length === 0
                              ? "Add at least one gallery image."
                              : null
                          }
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FileButton
                            accept="image/*"
                            helper="Optional close-up textures or detail views."
                            label="Detail Photos"
                            multiple
                            onChange={(event) =>
                              void handleMultiUpload(
                                event,
                                "detailImageUrls",
                                "artwork-media/details"
                              )
                            }
                          />
                          <FileButton
                            accept="video/*"
                            helper="Optional studio or listing video."
                            label="Listing Video"
                            onChange={(event) =>
                              void handleSingleUpload(
                                event,
                                "videoUrl",
                                "artwork-media/video"
                              )
                            }
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                            Cover:{" "}
                            {activeItem.media.mainImageUrl
                              ? "Added"
                              : "Missing"}
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                            Gallery: {activeItem.media.galleryImageUrls.length}
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                            Video:{" "}
                            {activeItem.media.videoUrl ? "Added" : "Optional"}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}

                <AccordionItem className="border-border/70" value="basic">
                  <AccordionTrigger className="hover:no-underline">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Basic Information
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Keep this section concise and confidence-inspiring. This
                        is what buyers read first.
                      </p>
                    </div>
                    <span className="ml-auto rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                      {sectionState(
                        Boolean(
                          activeItem.artworkDetails.title.trim() &&
                          activeItem.artworkDetails.description.trim()
                        ),
                        !activeItem.artworkDetails.title.trim()
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <HelpLabel
                          helpKey="title"
                          htmlFor="art-title"
                          label="Artwork title"
                          onOpen={setActiveHelpKey}
                        />
                        <Input
                          id="art-title"
                          value={activeItem.artworkDetails.title}
                          onChange={(event) =>
                            updateActiveItem((current) => ({
                              ...current,
                              artworkDetails: {
                                ...current.artworkDetails,
                                title: event.target.value,
                              },
                            }))
                          }
                        />
                        <ValidationText
                          message={
                            !activeItem.artworkDetails.title.trim()
                              ? "This field is required."
                              : null
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Artist</Label>
                        <Input
                          disabled
                          value={
                            profile.displayName ?? profile.email ?? "Artist"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <HelpLabel
                          helpKey="description"
                          htmlFor="art-description"
                          label="Description"
                          onOpen={setActiveHelpKey}
                        />
                        <Textarea
                          id="art-description"
                          value={activeItem.artworkDetails.description}
                          onChange={(event) =>
                            updateActiveItem((current) => ({
                              ...current,
                              artworkDetails: {
                                ...current.artworkDetails,
                                description: event.target.value,
                              },
                            }))
                          }
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Suggested: 80-300 characters for the first
                            paragraph.
                          </span>
                          <span>
                            {activeItem.artworkDetails.description.length}{" "}
                            characters
                          </span>
                        </div>
                        <ValidationText
                          message={
                            !activeItem.artworkDetails.description.trim()
                              ? "This field is required."
                              : null
                          }
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem className="border-border/70" value="details">
                  <AccordionTrigger className="hover:no-underline">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Artwork Details
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Help collectors understand what the work is, how it was
                        made, and how it will fit.
                      </p>
                    </div>
                    <span className="ml-auto rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                      {sectionState(
                        Boolean(
                          activeItem.artworkDetails.medium &&
                          activeItem.artworkDetails.category &&
                          activeItem.artworkDetails.subject
                        ),
                        !activeItem.artworkDetails.medium
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <HelpLabel
                            helpKey="category"
                            label="Category"
                            onOpen={setActiveHelpKey}
                          />
                          <Select
                            value={activeItem.artworkDetails.category}
                            onValueChange={(value) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  category: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <ValidationText
                            message={
                              !activeItem.artworkDetails.category
                                ? "This field is required."
                                : null
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <HelpLabel
                            helpKey="medium"
                            label="Medium"
                            onOpen={setActiveHelpKey}
                          />
                          <Select
                            value={activeItem.artworkDetails.medium}
                            onValueChange={(value) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  medium: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose medium" />
                            </SelectTrigger>
                            <SelectContent>
                              {MEDIUM_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <ValidationText
                            message={
                              !activeItem.artworkDetails.medium
                                ? "This field is required."
                                : null
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <HelpLabel
                            helpKey="subject"
                            label="Subject"
                            onOpen={setActiveHelpKey}
                          />
                          <Select
                            value={activeItem.artworkDetails.subject}
                            onValueChange={(value) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  subject: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {SUBJECT_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <ValidationText
                            message={
                              !activeItem.artworkDetails.subject
                                ? "This field is required."
                                : null
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <HelpLabel
                            helpKey="style"
                            htmlFor="art-style"
                            label="Style"
                            onOpen={setActiveHelpKey}
                          />
                          <Input
                            id="art-style"
                            value={activeItem.artworkDetails.style}
                            onChange={(event) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  style: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <HelpLabel
                            helpKey="orientation"
                            label="Orientation"
                            onOpen={setActiveHelpKey}
                          />
                          <Select
                            value={activeItem.artworkDetails.orientation}
                            onValueChange={(value) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  orientation: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose orientation" />
                            </SelectTrigger>
                            <SelectContent>
                              {ORIENTATION_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="art-year">Year created</Label>
                          <Input
                            id="art-year"
                            value={activeItem.artworkDetails.yearCreated}
                            onChange={(event) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  yearCreated: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/70 bg-muted/25 p-5">
                        <SectionHeader
                          helper="Dimensions are critical for confidence and shipping estimates."
                          title="Dimensions"
                        />
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="width">Width</Label>
                            <Input
                              id="width"
                              value={activeItem.dimensions.width}
                              onChange={(event) =>
                                updateActiveItem((current) => ({
                                  ...current,
                                  dimensions: {
                                    ...current.dimensions,
                                    width: event.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="height">Height</Label>
                            <Input
                              id="height"
                              value={activeItem.dimensions.height}
                              onChange={(event) =>
                                updateActiveItem((current) => ({
                                  ...current,
                                  dimensions: {
                                    ...current.dimensions,
                                    height: event.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="depth">Depth</Label>
                            <Input
                              id="depth"
                              value={activeItem.dimensions.depth}
                              onChange={(event) =>
                                updateActiveItem((current) => ({
                                  ...current,
                                  dimensions: {
                                    ...current.dimensions,
                                    depth: event.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit</Label>
                            <Select
                              value={activeItem.dimensions.unit}
                              onValueChange={(value: "cm" | "in") =>
                                updateActiveItem((current) => ({
                                  ...current,
                                  dimensions: {
                                    ...current.dimensions,
                                    unit: value,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in">Inches</SelectItem>
                                <SelectItem value="cm">Centimeters</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {!activeItem.dimensions.width ||
                          !activeItem.dimensions.height
                            ? "Width and height are required."
                            : "Dimensions look good."}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <SectionHeader
                          helper="Optional discovery fields help with filtering and recommendations."
                          title="Advanced discovery"
                        />
                        <MultiToggle
                          label="Medium details"
                          options={MEDIUM_DETAIL_OPTIONS}
                          selected={activeItem.artworkDetails.mediumDetails}
                          onChange={(next) =>
                            updateActiveItem((current) => ({
                              ...current,
                              artworkDetails: {
                                ...current.artworkDetails,
                                mediumDetails: next,
                              },
                            }))
                          }
                        />
                        <MultiToggle
                          label="Dominant colors"
                          options={COLOR_OPTIONS}
                          selected={activeItem.artworkDetails.colorPalette}
                          onChange={(next) =>
                            updateActiveItem((current) => ({
                              ...current,
                              artworkDetails: {
                                ...current.artworkDetails,
                                colorPalette: next,
                              },
                            }))
                          }
                        />
                        <MultiToggle
                          label="Best rooms"
                          options={ROOM_OPTIONS}
                          selected={
                            activeItem.artworkDetails.roomRecommendations
                          }
                          onChange={(next) =>
                            updateActiveItem((current) => ({
                              ...current,
                              artworkDetails: {
                                ...current.artworkDetails,
                                roomRecommendations: next,
                              },
                            }))
                          }
                        />
                        <MultiToggle
                          label="Mood"
                          options={MOOD_OPTIONS}
                          selected={activeItem.artworkDetails.mood}
                          onChange={(next) =>
                            updateActiveItem((current) => ({
                              ...current,
                              artworkDetails: {
                                ...current.artworkDetails,
                                mood: next,
                              },
                            }))
                          }
                        />
                        <MultiToggle
                          label="Theme"
                          options={THEME_OPTIONS}
                          selected={activeItem.artworkDetails.theme}
                          onChange={(next) =>
                            updateActiveItem((current) => ({
                              ...current,
                              artworkDetails: {
                                ...current.artworkDetails,
                                theme: next,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem className="border-border/70" value="pricing">
                  <AccordionTrigger className="hover:no-underline">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Pricing and Inventory
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Set the commercial terms clearly, with enough detail to
                        publish confidently.
                      </p>
                    </div>
                    <span className="ml-auto rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                      {sectionState(
                        Boolean(activeItem.pricingInventory.price),
                        !activeItem.pricingInventory.price
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <HelpLabel
                            helpKey="pricing"
                            htmlFor="price"
                            label="Price"
                            onOpen={setActiveHelpKey}
                          />
                          <Input
                            id="price"
                            value={activeItem.pricingInventory.price}
                            onChange={(event) =>
                              updateActiveItem((current) => ({
                                ...current,
                                pricingInventory: {
                                  ...current.pricingInventory,
                                  price: event.target.value,
                                },
                              }))
                            }
                          />
                          <ValidationText
                            message={
                              !activeItem.pricingInventory.price
                                ? "Price must be greater than $0."
                                : null
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <Select
                            value={activeItem.pricingInventory.currency}
                            onValueChange={(value) =>
                              updateActiveItem((current) => ({
                                ...current,
                                pricingInventory: {
                                  ...current.pricingInventory,
                                  currency: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CURRENCY_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Availability</Label>
                          <Select
                            value={activeItem.pricingInventory.availability}
                            onValueChange={(
                              value: ListingItemDraft["pricingInventory"]["availability"]
                            ) =>
                              updateActiveItem((current) => ({
                                ...current,
                                pricingInventory: {
                                  ...current.pricingInventory,
                                  availability: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="original_available">
                                Original available
                              </SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="sold">Sold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            value={activeItem.pricingInventory.quantity}
                            onChange={(event) =>
                              updateActiveItem((current) => ({
                                ...current,
                                pricingInventory: {
                                  ...current.pricingInventory,
                                  quantity: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["Allow offers", "acceptOffers"],
                          ["Negotiable", "negotiable"],
                          ["Limited edition", "limitedEdition"],
                          ["Open edition", "openEdition"],
                        ].map(([label, key]) => (
                          <label
                            key={key}
                            className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/35 p-4 text-sm text-foreground"
                          >
                            <Checkbox
                              checked={
                                activeItem.pricingInventory[
                                  key as keyof typeof activeItem.pricingInventory
                                ] as boolean
                              }
                              onCheckedChange={(checked) =>
                                updateActiveItem((current) => ({
                                  ...current,
                                  pricingInventory: {
                                    ...current.pricingInventory,
                                    [key]: checked === true,
                                  },
                                }))
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>

                      <div className="rounded-[1.5rem] border border-primary/15 bg-primary/5 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                          Payout preview
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Suggested payout preview and commission guidance can
                          live here next.
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem className="border-border/70" value="shipping">
                  <AccordionTrigger className="hover:no-underline">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Shipping
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Shared shipping settings apply across all listings in
                        this studio.
                      </p>
                    </div>
                    <span className="ml-auto rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                      {sectionState(sharedReady, !sharedReady)}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6">
                      <HelpLabel
                        helpKey="shipping"
                        label="Shared shipping settings"
                        onOpen={setActiveHelpKey}
                      />
                      <ShippingAddressFields
                        address={studio.shared.shippingOriginAddress}
                        onChange={(next) =>
                          updateShared((current) => ({
                            ...current,
                            shippingOriginAddress: next,
                          }))
                        }
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="processing-time">
                            Processing time
                          </Label>
                          <Input
                            id="processing-time"
                            placeholder="3-5 business days"
                            value={
                              studio.shared.shippingAuthentication
                                .processingTime
                            }
                            onChange={(event) =>
                              updateShared((current) => ({
                                ...current,
                                shippingAuthentication: {
                                  ...current.shippingAuthentication,
                                  processingTime: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="finish">Finish</Label>
                          <Input
                            id="finish"
                            list="finish-options"
                            value={studio.shared.shippingAuthentication.finish}
                            onChange={(event) =>
                              updateShared((current) => ({
                                ...current,
                                shippingAuthentication: {
                                  ...current.shippingAuthentication,
                                  finish: event.target.value,
                                },
                              }))
                            }
                          />
                          <datalist id="finish-options">
                            {FINISH_OPTIONS.map((option) => (
                              <option key={option} value={option} />
                            ))}
                          </datalist>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="domestic-shipping">
                            Domestic shipping
                          </Label>
                          <Textarea
                            id="domestic-shipping"
                            value={
                              studio.shared.shippingAuthentication
                                .domesticShipping
                            }
                            onChange={(event) =>
                              updateShared((current) => ({
                                ...current,
                                shippingAuthentication: {
                                  ...current.shippingAuthentication,
                                  domesticShipping: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="international-shipping">
                            International shipping
                          </Label>
                          <Textarea
                            id="international-shipping"
                            value={
                              studio.shared.shippingAuthentication
                                .internationalShipping
                            }
                            onChange={(event) =>
                              updateShared((current) => ({
                                ...current,
                                shippingAuthentication: {
                                  ...current.shippingAuthentication,
                                  internationalShipping: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <ValidationText
                        message={
                          !sharedReady
                            ? "Complete the shared shipping address and shipping text before publishing."
                            : null
                        }
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem className="border-border/70" value="story">
                  <AccordionTrigger className="hover:no-underline">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Story and Discovery
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add the human context that makes the work feel memorable
                        and discoverable.
                      </p>
                    </div>
                    <span className="ml-auto rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                      {sectionState(
                        Boolean(
                          activeItem.artworkDetails.artistStatement ||
                          activeItem.artworkDetails.storyBehindPiece
                        ),
                        false
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <HelpLabel
                          helpKey="story"
                          htmlFor="artist-statement"
                          label="Artist statement"
                          onOpen={setActiveHelpKey}
                        />
                        <Textarea
                          id="artist-statement"
                          value={activeItem.artworkDetails.artistStatement}
                          onChange={(event) =>
                            updateActiveItem((current) => ({
                              ...current,
                              artworkDetails: {
                                ...current.artworkDetails,
                                artistStatement: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="story-behind-piece">
                          Story behind the piece
                        </Label>
                        <Textarea
                          id="story-behind-piece"
                          value={activeItem.artworkDetails.storyBehindPiece}
                          onChange={(event) =>
                            updateActiveItem((current) => ({
                              ...current,
                              artworkDetails: {
                                ...current.artworkDetails,
                                storyBehindPiece: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="collection">Collection</Label>
                          <Input
                            id="collection"
                            value={activeItem.artworkDetails.collection}
                            onChange={(event) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  collection: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tags">Tags</Label>
                          <Input
                            id="tags"
                            placeholder="ocean, sunset, california"
                            value={activeItem.artworkDetails.tags.join(", ")}
                            onChange={(event) =>
                              updateActiveItem((current) => ({
                                ...current,
                                artworkDetails: {
                                  ...current.artworkDetails,
                                  tags: event.target.value
                                    .split(",")
                                    .map((value) => value.trim())
                                    .filter(Boolean),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem className="border-border/70" value="visibility">
                  <AccordionTrigger className="hover:no-underline">
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Visibility and Publishing
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Control how the listing appears and confirm the required
                        legal checkboxes.
                      </p>
                    </div>
                    <span className="ml-auto rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
                      {sectionState(publishReady, missingFields.length > 0)}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <HelpLabel
                            helpKey="seo"
                            htmlFor="meta-title"
                            label="Meta title"
                            onOpen={setActiveHelpKey}
                          />
                          <Input
                            id="meta-title"
                            value={activeItem.salesVisibility.metaTitle}
                            onChange={(event) =>
                              updateActiveItem((current) => ({
                                ...current,
                                salesVisibility: {
                                  ...current.salesVisibility,
                                  metaTitle: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slug">Slug</Label>
                          <Input
                            id="slug"
                            value={activeItem.salesVisibility.slug}
                            onChange={(event) =>
                              updateActiveItem((current) => ({
                                ...current,
                                salesVisibility: {
                                  ...current.salesVisibility,
                                  slug: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="meta-description">
                            Meta description
                          </Label>
                          <Textarea
                            id="meta-description"
                            value={activeItem.salesVisibility.metaDescription}
                            onChange={(event) =>
                              updateActiveItem((current) => ({
                                ...current,
                                salesVisibility: {
                                  ...current.salesVisibility,
                                  metaDescription: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["Public", "public"],
                          ["Unlisted", "unlisted"],
                          ["Private", "private"],
                          ["Draft", "draft"],
                          ["Original", "original"],
                          ["Prints", "prints"],
                          ["Limited Prints", "limitedPrints"],
                          ["Digital Download", "digitalDownload"],
                          ["Commission", "commissionAvailable"],
                        ].map(([label, key]) => (
                          <label
                            key={key}
                            className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/35 p-4 text-sm text-foreground"
                          >
                            <Checkbox
                              checked={
                                activeItem.salesVisibility[
                                  key as keyof typeof activeItem.salesVisibility
                                ] as boolean
                              }
                              onCheckedChange={(checked) =>
                                updateActiveItem((current) => ({
                                  ...current,
                                  salesVisibility: {
                                    ...current.salesVisibility,
                                    [key]: checked === true,
                                  },
                                }))
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>

                      <div className="rounded-[1.5rem] border border-primary/15 bg-primary/5 p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                          Required legal confirmations
                        </p>
                        <div className="mt-4 grid gap-3">
                          {[
                            ["I created this artwork.", "createdArtwork"],
                            ["I own all rights.", "ownsRights"],
                            [
                              "No copyrighted material was used.",
                              "noCopyrightedMaterial",
                            ],
                            [
                              "AI disclosure is accurate.",
                              "aiDisclosureConfirmed",
                            ],
                            [
                              "I agree to the seller agreement.",
                              "agreeSellerAgreement",
                            ],
                            [
                              "I agree to the commission rate.",
                              "agreeCommissionRate",
                            ],
                            [
                              "I understand shipping requirements.",
                              "understandShippingRequirements",
                            ],
                            [
                              "I certify all information is accurate.",
                              "certifyAccurateInformation",
                            ],
                          ].map(([label, key]) => (
                            <label
                              key={key}
                              className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-foreground"
                            >
                              <Checkbox
                                checked={
                                  activeItem.salesVisibility[
                                    key as keyof typeof activeItem.salesVisibility
                                  ] as boolean
                                }
                                onCheckedChange={(checked) =>
                                  updateActiveItem((current) => ({
                                    ...current,
                                    salesVisibility: {
                                      ...current.salesVisibility,
                                      [key]: checked === true,
                                    },
                                  }))
                                }
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[2rem] border border-white/70 bg-white/94 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Listing status
              </p>
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-2xl text-foreground">
                  {publishReady ? "Ready to publish" : "Draft"}
                </h3>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                    publishReady
                      ? "bg-green-100 text-green-800"
                      : "bg-amber-100 text-amber-900",
                  ].join(" ")}
                >
                  {publishReady ? "Ready" : "In progress"}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Completion
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on required fields for this item
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-primary">
                    {itemProgress}%
                  </p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-[width] duration-500 ease-out"
                    style={{ width: `${itemProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-border/70 bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">
                  Save status
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {saveStatusLabel}
                </p>
              </div>

              <div className="mt-6">
                <p className="text-sm font-medium text-foreground">
                  Publish checklist
                </p>
                <div className="mt-4">
                  <SidebarChecklist checklist={checklist} />
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-medium text-foreground">
                  Missing required fields
                </p>
                <div className="mt-3 space-y-2">
                  {missingFields.length === 0 ? (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                      Everything required is complete.
                    </div>
                  ) : (
                    missingFields.map((message) => (
                      <div
                        key={message}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                      >
                        {message}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Button asChild size="lg" variant="outline">
                  {isStandaloneEditor ? (
                    <a href="#listing-preview">Preview listing</a>
                  ) : (
                    <Link href={previewGalleryHref}>Preview listing</Link>
                  )}
                </Button>
                <Button
                  disabled={!publishReady || saveState === "saving"}
                  onClick={() => void publishItem()}
                  size="lg"
                >
                  {saveState === "saving" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Upload />
                      Publish item
                    </>
                  )}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>

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
