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
  publicDecks: PublicDeckSummary[];
};

export type ModerationQueueItem = {
  publicDeckId: string;
  deckName: string;
  ownerUid: string | null;
  openReportCount: number;
  latestReason: string;
  latestReportType: string;
  visibility: string | null;
  publicationStatus: string | null;
};

export type PublicDeckReport = {
  id: string;
  reason: string;
  details: string | null;
  reportType: string;
  reportSubcategory: string | null;
  reportSource: string | null;
  reporterUid: string | null;
  reporterEmail: string | null;
  createdAt: string | null;
};

export type PublicDeckSummary = {
  id: string;
  ownerUid?: string | null;
  sourceDeckId?: string | null;
  visibility?: string | null;
  publicationStatus?: string | null;
  moderationStatus?: string | null;
  moderationReason?: string | null;
  updatedAt?: string | null;
  deckSnapshot?: {
    name?: string;
    description?: string;
  };
  openReports?: PublicDeckReport[];
};

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
