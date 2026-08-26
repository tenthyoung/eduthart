export type ShippingOriginAddress = {
  city: string;
  country: string;
  line1: string;
  line2: string | null;
  postalCode: string;
  region: string;
};

export type ListingArtworkDetails = {
  aiDisclosure: "entirely_ai" | "ai_assisted" | "not_used" | "";
  artistStatement: string;
  category: string;
  collection: string;
  colorPalette: string[];
  copyrightCommercialLicensingAvailable: boolean;
  copyrightLicensingAvailable: boolean;
  copyrightOriginalOnly: boolean;
  copyrightPrintsAllowed: boolean;
  description: string;
  medium: string;
  mediumDetails: string[];
  mood: string[];
  orientation: string;
  roomRecommendations: string[];
  storyBehindPiece: string;
  style: string;
  subject: string;
  surface: string;
  tags: string[];
  theme: string[];
  title: string;
  yearCreated: string;
};

export type ListingMedia = {
  backImageUrl: string | null;
  detailImageUrls: string[];
  framedImageUrl: string | null;
  galleryImageUrls: string[];
  mainImageUrl: string | null;
  roomMockupImageUrl: string | null;
  sideProfileImageUrl: string | null;
  signatureImageUrl: string | null;
  videoUrl: string | null;
};

export type ListingDimensions = {
  depth: string;
  frameColor: string;
  frameIncluded: boolean;
  frameMaterial: string;
  framed: boolean;
  height: string;
  readyToHang: boolean;
  rolledInTube: boolean;
  stretchedCanvas: boolean;
  unit: "in" | "cm";
  weight: string;
  weightUnit: "lb" | "kg";
  width: string;
};

export type ListingPricingInventory = {
  acceptOffers: boolean;
  artistProofsAvailable: boolean;
  availability: "draft" | "original_available" | "reserved" | "sold";
  currency: string;
  editionNumber: string;
  editionSize: string;
  limitedEdition: boolean;
  minimumOffer: string;
  negotiable: boolean;
  openEdition: boolean;
  price: string;
  quantity: string;
  reservePrice: string;
};

export type ListingShippingAuthentication = {
  certificateOfAuthenticityIncluded: boolean;
  domesticShipping: string;
  finish: string;
  freeShipping: boolean;
  internationalShipping: string;
  insuranceIncluded: boolean;
  localPickup: boolean;
  materialsUsed: string[];
  numbered: boolean;
  processingTime: string;
  shippedFromSummary: string;
  signatureRequired: boolean;
  signed: boolean;
  signedBack: boolean;
  signedCertificate: boolean;
  signedFront: boolean;
};

export type ListingSalesVisibility = {
  agreeCommissionRate: boolean;
  agreeSellerAgreement: boolean;
  aiDisclosureConfirmed: boolean;
  certifyAccurateInformation: boolean;
  commissionAvailable: boolean;
  createdArtwork: boolean;
  digitalDownload: boolean;
  draft: boolean;
  limitedPrints: boolean;
  metaDescription: string;
  metaTitle: string;
  noCopyrightedMaterial: boolean;
  original: boolean;
  ownsRights: boolean;
  prints: boolean;
  private: boolean;
  public: boolean;
  slug: string;
  understandShippingRequirements: boolean;
  unlisted: boolean;
};

export type ListingItemDraft = {
  artworkDetails: ListingArtworkDetails;
  dimensions: ListingDimensions;
  id: string;
  media: ListingMedia;
  pricingInventory: ListingPricingInventory;
  salesVisibility: ListingSalesVisibility;
  updatedAt: string | null;
};

export type ListingSharedSettings = {
  shippingAuthentication: ListingShippingAuthentication;
  shippingOriginAddress: ShippingOriginAddress | null;
};

export type ListingStudioDraft = {
  items: ListingItemDraft[];
  shared: ListingSharedSettings;
  updatedAt: string | null;
};

export type LegacyListingFlowDraft = {
  artworkDetails: ListingArtworkDetails;
  completedSteps: string[];
  currentStep: string;
  dimensions: ListingDimensions;
  media: ListingMedia;
  pricingInventory: ListingPricingInventory;
  salesVisibility: ListingSalesVisibility;
  shippingAuthentication: ListingShippingAuthentication;
  shippingOriginAddress: ShippingOriginAddress | null;
  updatedAt: string | null;
};

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `listing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
}

export function createEmptyListingItem(seed?: Partial<ListingItemDraft>) {
  return {
    artworkDetails: {
      aiDisclosure: "",
      artistStatement: "",
      category: "",
      collection: "",
      colorPalette: [],
      copyrightCommercialLicensingAvailable: false,
      copyrightLicensingAvailable: false,
      copyrightOriginalOnly: true,
      copyrightPrintsAllowed: false,
      description: "",
      medium: "",
      mediumDetails: [],
      mood: [],
      orientation: "",
      roomRecommendations: [],
      storyBehindPiece: "",
      style: "",
      subject: "",
      surface: "",
      tags: [],
      theme: [],
      title: "",
      yearCreated: "",
      ...seed?.artworkDetails,
    },
    dimensions: {
      depth: "",
      frameColor: "",
      frameIncluded: false,
      frameMaterial: "",
      framed: false,
      height: "",
      readyToHang: false,
      rolledInTube: false,
      stretchedCanvas: false,
      unit: "in",
      weight: "",
      weightUnit: "lb",
      width: "",
      ...seed?.dimensions,
    },
    id: seed?.id ?? createId(),
    media: {
      backImageUrl: null,
      detailImageUrls: [],
      framedImageUrl: null,
      galleryImageUrls: [],
      mainImageUrl: null,
      roomMockupImageUrl: null,
      sideProfileImageUrl: null,
      signatureImageUrl: null,
      videoUrl: null,
      ...seed?.media,
    },
    pricingInventory: {
      acceptOffers: false,
      artistProofsAvailable: false,
      availability: "draft",
      currency: "USD",
      editionNumber: "",
      editionSize: "",
      limitedEdition: false,
      minimumOffer: "",
      negotiable: false,
      openEdition: false,
      price: "",
      quantity: "1",
      reservePrice: "",
      ...seed?.pricingInventory,
    },
    salesVisibility: {
      agreeCommissionRate: false,
      agreeSellerAgreement: false,
      aiDisclosureConfirmed: false,
      certifyAccurateInformation: false,
      commissionAvailable: false,
      createdArtwork: false,
      digitalDownload: false,
      draft: true,
      limitedPrints: false,
      metaDescription: "",
      metaTitle: "",
      noCopyrightedMaterial: false,
      original: true,
      ownsRights: false,
      prints: false,
      private: false,
      public: false,
      slug: "",
      understandShippingRequirements: false,
      unlisted: false,
      ...seed?.salesVisibility,
    },
    updatedAt: seed?.updatedAt ?? null,
  } satisfies ListingItemDraft;
}

export function createDefaultSharedSettings(
  existingAddress?: ShippingOriginAddress | null
) {
  return {
    shippingAuthentication: {
      certificateOfAuthenticityIncluded: false,
      domesticShipping: "",
      finish: "",
      freeShipping: false,
      insuranceIncluded: false,
      internationalShipping: "",
      localPickup: false,
      materialsUsed: [],
      numbered: false,
      processingTime: "",
      shippedFromSummary: "",
      signatureRequired: false,
      signed: false,
      signedBack: false,
      signedCertificate: false,
      signedFront: false,
    },
    shippingOriginAddress: existingAddress ?? null,
  } satisfies ListingSharedSettings;
}

export function createEmptyListingStudio(options?: {
  existingAddress?: ShippingOriginAddress | null;
  includeStarterItem?: boolean;
}) {
  return {
    items:
      options?.includeStarterItem === false ? [] : [createEmptyListingItem()],
    shared: createDefaultSharedSettings(options?.existingAddress ?? null),
    updatedAt: null,
  } satisfies ListingStudioDraft;
}

function isLegacyFlow(value: unknown): value is LegacyListingFlowDraft {
  return (
    typeof value === "object" &&
    value !== null &&
    "currentStep" in value &&
    "completedSteps" in value
  );
}

function isStudio(value: unknown): value is ListingStudioDraft {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    "shared" in value
  );
}

function normalizeItem(item: Partial<ListingItemDraft> | null | undefined) {
  return createEmptyListingItem(item ?? undefined);
}

export function normalizeListingStudio(
  value: ListingStudioDraft | LegacyListingFlowDraft | null | undefined,
  options?: { existingAddress?: ShippingOriginAddress | null }
) {
  const base = createEmptyListingStudio({
    existingAddress: options?.existingAddress ?? null,
    includeStarterItem: false,
  });

  if (!value) {
    return {
      ...base,
      items: [createEmptyListingItem()],
    } satisfies ListingStudioDraft;
  }

  if (isLegacyFlow(value)) {
    return {
      items: [
        normalizeItem({
          artworkDetails: value.artworkDetails,
          dimensions: value.dimensions,
          media: value.media,
          pricingInventory: value.pricingInventory,
          salesVisibility: value.salesVisibility,
          updatedAt: value.updatedAt,
        }),
      ],
      shared: {
        shippingAuthentication: {
          ...base.shared.shippingAuthentication,
          ...value.shippingAuthentication,
        },
        shippingOriginAddress:
          value.shippingOriginAddress ?? options?.existingAddress ?? null,
      },
      updatedAt: value.updatedAt,
    } satisfies ListingStudioDraft;
  }

  if (!isStudio(value)) {
    return {
      ...base,
      items: [createEmptyListingItem()],
    } satisfies ListingStudioDraft;
  }

  const items =
    Array.isArray(value.items) && value.items.length > 0
      ? value.items.map((item) => normalizeItem(item))
      : [createEmptyListingItem()];

  return {
    items,
    shared: {
      shippingAuthentication: {
        ...base.shared.shippingAuthentication,
        ...value.shared?.shippingAuthentication,
      },
      shippingOriginAddress:
        value.shared?.shippingOriginAddress ?? options?.existingAddress ?? null,
    },
    updatedAt: value.updatedAt ?? null,
  } satisfies ListingStudioDraft;
}

export function isSharedShippingComplete(shared: ListingSharedSettings) {
  return Boolean(
    shared.shippingOriginAddress?.line1 &&
    shared.shippingOriginAddress.city &&
    shared.shippingOriginAddress.region &&
    shared.shippingOriginAddress.postalCode &&
    shared.shippingOriginAddress.country &&
    shared.shippingAuthentication.processingTime &&
    shared.shippingAuthentication.domesticShipping &&
    shared.shippingAuthentication.internationalShipping
  );
}

export type ListingRequirement = {
  done: boolean;
  key: string;
  label: string;
  message: string;
};

/**
 * The minimum an item needs before it can be published. This is the single
 * source of truth behind the publish gate, the sidebar checklist, and the
 * completion percentage, so "100%" always means "publishable".
 */
export function getItemRequirements(
  item: ListingItemDraft,
  shared: ListingSharedSettings
): ListingRequirement[] {
  return [
    {
      done: Boolean(item.artworkDetails.title.trim()),
      key: "title",
      label: "Title",
      message: "Add an artwork title.",
    },
    {
      done: Boolean(item.artworkDetails.description.trim()),
      key: "description",
      label: "Description",
      message: "Add a clear artwork description.",
    },
    {
      done: Boolean(item.media.mainImageUrl),
      key: "photos",
      label: "Photos",
      message: "Upload a cover image.",
    },
    {
      done: Boolean(item.pricingInventory.price),
      key: "price",
      label: "Price",
      message: "Set a price.",
    },
    {
      done: Boolean(item.artworkDetails.medium),
      key: "medium",
      label: "Medium",
      message: "Choose a medium.",
    },
    {
      done: Boolean(item.artworkDetails.category),
      key: "category",
      label: "Category",
      message: "Choose a category.",
    },
    {
      done: Boolean(item.artworkDetails.subject),
      key: "subject",
      label: "Subject",
      message: "Choose a subject.",
    },
    {
      done: Boolean(item.dimensions.width && item.dimensions.height),
      key: "dimensions",
      label: "Dimensions",
      message: "Enter width and height.",
    },
    {
      done: isSharedShippingComplete(shared),
      key: "shipping",
      label: "Shipping information",
      message: "Complete shared shipping settings.",
    },
  ];
}

export type ListingChecklistEntry = ListingRequirement & {
  required: boolean;
};

/**
 * Fields that are not gated on, but that make a listing more convincing.
 * These never count toward the completion percentage.
 */
export function getItemOptionalEnhancements(
  item: ListingItemDraft
): ListingRequirement[] {
  return [
    {
      done:
        item.media.galleryImageUrls.length > 0 ||
        item.media.detailImageUrls.length > 0,
      key: "additional-photos",
      label: "Additional photos",
      message: "Add detail or gallery photos so buyers can inspect the piece.",
    },
    {
      done: Boolean(item.media.videoUrl),
      key: "video",
      label: "Video",
      message: "Add a short video to show scale and texture.",
    },
    {
      done: Boolean(item.artworkDetails.storyBehindPiece.trim()),
      key: "story",
      label: "Story behind the piece",
      message: "Share the story behind the piece.",
    },
    {
      done: Boolean(item.artworkDetails.yearCreated),
      key: "year-created",
      label: "Year created",
      message: "Add the year the piece was created.",
    },
    {
      done: item.artworkDetails.tags.length > 0,
      key: "tags",
      label: "Tags",
      message: "Add tags so the piece is easier to discover.",
    },
  ];
}

export function getItemChecklist(
  item: ListingItemDraft,
  shared: ListingSharedSettings
): ListingChecklistEntry[] {
  return [
    ...getItemRequirements(item, shared).map((requirement) => ({
      ...requirement,
      required: true,
    })),
    ...getItemOptionalEnhancements(item).map((enhancement) => ({
      ...enhancement,
      required: false,
    })),
  ];
}

export function getItemMissingRequirements(
  item: ListingItemDraft,
  shared: ListingSharedSettings
) {
  return getItemRequirements(item, shared).filter(
    (requirement) => !requirement.done
  );
}

export function getItemCompletionCount(
  item: ListingItemDraft,
  shared: ListingSharedSettings
) {
  return getItemRequirements(item, shared).filter(
    (requirement) => requirement.done
  ).length;
}

export function getItemProgressPercent(
  item: ListingItemDraft,
  shared: ListingSharedSettings
) {
  const requirements = getItemRequirements(item, shared);
  const completed = requirements.filter(
    (requirement) => requirement.done
  ).length;

  return Math.round((completed / requirements.length) * 100);
}

export function getItemDisplayTitle(item: ListingItemDraft, index: number) {
  return item.artworkDetails.title.trim() || `Untitled Piece ${index + 1}`;
}
