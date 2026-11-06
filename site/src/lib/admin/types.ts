export type AdminRole = "admin" | "super_admin" | "none";

export type AdminAccess = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: AdminRole;
};

export type AdminUserSummary = {
  uid: string;
  email: string | null;
  username: string | null;
  displayName: string;
  accountStatus: string;
  publishingDisabled: boolean;
  tier: string;
  monthlyTokens: number;
  monthlyEstimatedCostMicrosUsd: number;
  updatedAt: string | null;
};

export type AdminRoleRecord = {
  uid: string;
  role: AdminRole;
  email: string | null;
  active: boolean;
  grantedBy: string | null;
  updatedAt: string | null;
  displayName: string;
};

export type BillingSummary = {
  currentTier: string;
  monthlyDisplay: string;
  yearlyDisplay: string;
  latestKnownAmountPaidUsd: number | null;
  latestKnownRenewsAt: string | null;
};

export type AdminUserDetail = {
  user: {
    uid: string;
    email: string | null;
    username: string | null;
    usernameLower: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    accountStatus: string;
    publishingDisabled: boolean;
    moderationReason: string | null;
    moderatedAt: string | null;
    moderatedBy: string | null;
  };
  aiUsage: {
    monthlyTokens?: number;
    monthlyEstimatedCostMicrosUsd?: number;
    cumulativeTokens?: number;
    cumulativePromptTokens?: number;
    cumulativeOutputTokens?: number;
  } | null;
  credits: {
    tier?: string;
    creditsUsed?: number;
    totalCreditsUsed?: number;
  } | null;
  billing: BillingSummary;
  adminRole: Record<string, unknown> | null;
  publishedArtworks: AdminArtworkSummary[];
};

/** One listing an artist has published, as the admin user page lists them. */
export type AdminArtworkSummary = {
  artworkKey: string;
  availability: string;
  href: string | null;
  imageUrl: string | null;
  itemId: string;
  listed: boolean;
  moderationStatus: string | null;
  title: string;
};

export type ModerationQueueItem = {
  artistName: string;
  artistUid: string;
  artistUsername: string;
  artworkKey: string;
  href: string;
  imageUrl: string | null;
  latestReason: string;
  latestReportType: string;
  latestReportedAt: string;
  listed: boolean;
  moderationStatus: string | null;
  openReportCount: number;
  title: string;
};

export type ArtworkReportRecord = {
  createdAt: string;
  details: string;
  id: string;
  reason: string;
  reportSource: string;
  reportSubcategory: string | null;
  reportType: string;
  reporterEmail: string | null;
  resolutionAction: string | null;
  resolvedAt: string | null;
  status: string;
};

export type ArtworkModerationState = {
  moderatedAt: string;
  moderatedBy: string;
  reason: string;
  status: string;
};

export type ArtworkModerationDetail = {
  artistName: string;
  artistUid: string;
  artistUsername: string;
  artworkKey: string;
  availability: string;
  href: string;
  imageUrl: string | null;
  itemId: string;
  listed: boolean;
  moderation: ArtworkModerationState | null;
  openReports: ArtworkReportRecord[];
  priceDisplay: string;
  resolvedReports: ArtworkReportRecord[];
  title: string;
};

export type ArtworkModerationAction =
  "dismiss" | "hide" | "remove" | "restore" | "warn";

export type RefundRequestRecord = {
  id: string;
  uid: string;
  userEmail: string | null;
  reason: string;
  details: string;
  status: string;
  currentTier: string;
  currentPriceDisplay: string;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
  adminNotes: string | null;
};
