import { Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";

const db = getFirebaseAdminDb();
const auth = getFirebaseAdminAuth();
const SERIOUS_MODERATION_ACTIONS = new Set(["warn", "remove"]);
const BOOTSTRAP_SUPER_ADMIN_EMAILS = new Set([
  "izzy@hendecalabs.com",
  "tenthyoung@gmail.com",
]);
const ADMIN_ROLE_COLLECTION = "admin_roles";
const SESSION_COOKIE_NAME = "memdojo_admin_session";
const SESSION_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type AdminRole = "admin" | "super_admin";
const PLAN_PRICE_BY_TIER: Record<string, {
  monthlyDisplay: string;
  yearlyDisplay: string;
  monthlyCents: number | null;
  yearlyCents: number | null;
}> = {
  free: {
    monthlyDisplay: "Free",
    yearlyDisplay: "Free",
    monthlyCents: 0,
    yearlyCents: 0,
  },
  plus: {
    monthlyDisplay: "$6.99/mo",
    yearlyDisplay: "$59.99/yr",
    monthlyCents: 699,
    yearlyCents: 5999,
  },
  pro: {
    monthlyDisplay: "$9.99/mo",
    yearlyDisplay: "$89.99/yr",
    monthlyCents: 999,
    yearlyCents: 8999,
  },
};

export class AdminRouteError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    status = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = "AdminRouteError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function getAdminSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getAdminSessionCookieMaxAgeMs() {
  return SESSION_COOKIE_MAX_AGE_MS;
}

export async function createAdminSessionCookie(idToken: string) {
  return auth.createSessionCookie(idToken, {
    expiresIn: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export async function verifyAdminIdToken(idToken: string) {
  try {
    return await auth.verifyIdToken(idToken, true);
  } catch (error) {
    throw new AdminRouteError(
      "auth/invalid-token",
      "Your sign-in session is invalid. Please sign in again.",
      401,
      error,
    );
  }
}

export async function verifyAdminSessionCookie(sessionCookie: string) {
  try {
    return await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    throw new AdminRouteError(
      "auth/session-expired",
      "Your admin session expired. Please sign in again.",
      401,
      error,
    );
  }
}

function normalizedEmail(value: unknown): string | null {
  const email = value?.toString().trim().toLowerCase();
  return email ? email : null;
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function parseOptionalTimestamp(value: unknown): Timestamp | null {
  if (value instanceof Timestamp) {
    return value;
  }

  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Timestamp.fromMillis(value);
  }

  if (typeof value === "string") {
    const millis = Date.parse(value);
    if (!Number.isNaN(millis)) {
      return Timestamp.fromMillis(millis);
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    const seconds = (value as { seconds: number }).seconds;
    const nanos = (value as { nanoseconds?: unknown }).nanoseconds;
    return new Timestamp(seconds, typeof nanos === "number" ? nanos : 0);
  }

  return null;
}

function timestampToIsoString(value: unknown): string | null {
  const parsed = parseOptionalTimestamp(value);
  return parsed ? parsed.toDate().toISOString() : null;
}

async function setAdminClaims(uid: string, role: AdminRole | null): Promise<void> {
  const user = await auth.getUser(uid);
  const existingClaims = user.customClaims ?? {};
  const nextClaims = {
    ...existingClaims,
    admin: role != null,
    superAdmin: role === "super_admin",
  };
  await auth.setCustomUserClaims(uid, nextClaims);
}

async function upsertAdminRole({
  uid,
  role,
  email,
  grantedBy,
}: {
  uid: string;
  role: AdminRole;
  email: string | null;
  grantedBy: string;
}): Promise<void> {
  await db.collection(ADMIN_ROLE_COLLECTION).doc(uid).set(
    {
      uid,
      role,
      email,
      grantedBy,
      active: true,
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    },
    { merge: true },
  );
  await setAdminClaims(uid, role);
}

async function ensureBootstrapSuperAdmin(uid: string, email: string | null): Promise<void> {
  if (email == null || !BOOTSTRAP_SUPER_ADMIN_EMAILS.has(email)) {
    return;
  }

  const roleRef = db.collection(ADMIN_ROLE_COLLECTION).doc(uid);
  const roleSnap = await roleRef.get();
  const data = roleSnap.data();
  const isAlreadyActive =
    roleSnap.exists &&
    data?.active === true &&
    data.role === "super_admin";

  if (!isAlreadyActive) {
    await roleRef.set(
      {
        uid,
        role: "super_admin",
        email,
        grantedBy: "bootstrap",
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  }

  await setAdminClaims(uid, "super_admin");
}

async function getEffectiveAdminAccess(decodedToken: DecodedIdToken): Promise<{
  uid: string;
  role: AdminRole;
  isSuperAdmin: boolean;
}> {
  const uid = decodedToken.uid;
  const email = normalizedEmail(decodedToken.email);
  await ensureBootstrapSuperAdmin(uid, email);

  const roleSnap = await db.collection(ADMIN_ROLE_COLLECTION).doc(uid).get();
  const roleData = roleSnap.data();
  const roleFromDoc = roleData?.active === true ? roleData.role : null;

  if (roleFromDoc === "super_admin" || decodedToken.superAdmin === true) {
    if (roleFromDoc !== "super_admin") {
      await upsertAdminRole({
        uid,
        role: "super_admin",
        email,
        grantedBy: uid,
      });
    }
    return { uid, role: "super_admin", isSuperAdmin: true };
  }

  if (roleFromDoc === "admin" || decodedToken.admin === true) {
    if (roleFromDoc !== "admin") {
      await upsertAdminRole({
        uid,
        role: "admin",
        email,
        grantedBy: uid,
      });
    }
    return { uid, role: "admin", isSuperAdmin: false };
  }

  throw new AdminRouteError(
    "permission-denied",
    "Admin access required.",
    403,
  );
}

export async function requireAdmin(decodedToken: DecodedIdToken) {
  return getEffectiveAdminAccess(decodedToken);
}

export async function requireSuperAdmin(decodedToken: DecodedIdToken) {
  const access = await getEffectiveAdminAccess(decodedToken);
  if (!access.isSuperAdmin) {
    throw new AdminRouteError(
      "permission-denied",
      "Super admin access required.",
      403,
    );
  }
  return access;
}

export async function getAdminAccessStatus(decodedToken: DecodedIdToken) {
  const access = await getEffectiveAdminAccess(decodedToken);
  return {
    isAdmin: true,
    isSuperAdmin: access.isSuperAdmin,
    role: access.role,
  };
}

async function getUserProfile(uid: string): Promise<Record<string, unknown>> {
  const snap = await db.collection("users").doc(uid).get();
  return (snap.data() as Record<string, unknown> | undefined) ?? {};
}

function priceSummaryForTier(tier: string) {
  const summary = PLAN_PRICE_BY_TIER[tier] ?? PLAN_PRICE_BY_TIER.free;
  return {
    currentTier: tier,
    monthlyDisplay: summary.monthlyDisplay,
    yearlyDisplay: summary.yearlyDisplay,
    monthlyCents: summary.monthlyCents,
    yearlyCents: summary.yearlyCents,
  };
}

async function buildBillingSummary(uid: string): Promise<Record<string, unknown>> {
  const billingSnap = await db.collection("users").doc(uid).collection("settings").doc("billing").get();
  const creditsSnap = await db.collection("users").doc(uid).collection("settings").doc("credits").get();
  const billingData = (billingSnap.data() as Record<string, unknown> | undefined) ?? {};
  const creditsData = (creditsSnap.data() as Record<string, unknown> | undefined) ?? {};
  const tier = billingData.currentTier?.toString() ??
    billingData.tier?.toString() ??
    creditsData.tier?.toString() ??
    "free";
  const planSummary = priceSummaryForTier(tier);
  const receipts = Array.isArray(billingData.receipts) ? billingData.receipts : [];

  return {
    ...planSummary,
    hasBillingSnapshot: billingSnap.exists,
    latestKnownAmountPaidUsd:
      typeof billingData.latestKnownAmountPaidUsd === "number"
        ? billingData.latestKnownAmountPaidUsd
        : null,
    latestKnownInterval: billingData.latestKnownInterval ?? null,
    latestKnownRenewsAt:
      timestampToIsoString(billingData.latestKnownRenewalAt) ??
      timestampToIsoString(billingData.latestKnownRenewsAt),
    lastSyncedAt: timestampToIsoString(billingData.lastSyncedAt),
    providerCustomerId: billingData.providerCustomerId ?? null,
    receiptCount: receipts.length,
    receipts,
  };
}

function serializePublicDeckSummary(
  docId: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const deckSnapshot = (data.deckSnapshot as Record<string, unknown> | undefined) ?? {};
  return {
    id: docId,
    ownerUid: data.ownerUid ?? null,
    sourceDeckId: data.sourceDeckId ?? null,
    name: deckSnapshot.name ?? "Untitled Deck",
    visibility: data.visibility ?? null,
    publicationStatus: data.publicationStatus ?? null,
    moderationStatus: data.moderationStatus ?? null,
    moderationReason: data.moderationReason ?? null,
    updatedAt: timestampToIsoString(data.updatedAt) ?? data.updatedAt ?? null,
    reportCount: data.reportCount ?? 0,
    deckSnapshot,
  };
}

export async function searchUsersForAdmin(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const usersCollection = db.collection("users");
  const docsById = new Map<string, QueryDocumentSnapshot>();

  if (!normalizedQuery) {
    const recentUsers = await usersCollection.orderBy("updatedAt", "desc").limit(20).get();
    recentUsers.docs.forEach((doc) => docsById.set(doc.id, doc));
  } else {
    const usernameMatches = await usersCollection
      .where("usernameLower", ">=", normalizedQuery)
      .where("usernameLower", "<=", `${normalizedQuery}\uf8ff`)
      .limit(20)
      .get();
    usernameMatches.docs.forEach((doc) => docsById.set(doc.id, doc));

    if (normalizedQuery.includes("@")) {
      const emailMatches = await usersCollection
        .where("email", "==", normalizedQuery)
        .limit(10)
        .get();
      emailMatches.docs.forEach((doc) => docsById.set(doc.id, doc));
    }
  }

  const results = await Promise.all(
    Array.from(docsById.values()).slice(0, 20).map(async (doc) => {
      const userData = doc.data() as Record<string, unknown>;
      const aiUsageSnap = await usersCollection.doc(doc.id).collection("settings").doc("ai_usage").get();
      const creditsSnap = await usersCollection.doc(doc.id).collection("settings").doc("credits").get();
      const aiUsage = (aiUsageSnap.data() as Record<string, unknown> | undefined) ?? {};
      const credits = (creditsSnap.data() as Record<string, unknown> | undefined) ?? {};
      return {
        uid: doc.id,
        email: userData.email ?? null,
        username: userData.username ?? null,
        displayName:
          [userData.firstName, userData.lastName]
            .filter((value) => typeof value === "string" && value.toString().trim().length > 0)
            .join(" ") ||
          userData.username ||
          userData.email ||
          doc.id,
        accountStatus: userData.accountStatus ?? "active",
        publishingDisabled: userData.publishingDisabled === true,
        tier: credits.tier ?? "free",
        monthlyTokens: aiUsage.monthlyTokens ?? 0,
        monthlyEstimatedCostMicrosUsd: aiUsage.monthlyEstimatedCostMicrosUsd ?? 0,
        updatedAt: timestampToIsoString(userData.updatedAt),
      };
    }),
  );

  results.sort((left, right) =>
    `${right.updatedAt ?? ""}`.localeCompare(`${left.updatedAt ?? ""}`),
  );
  return results;
}

export async function getAdminUserDetails(targetUid: string) {
  const userSnap = await db.collection("users").doc(targetUid).get();
  if (!userSnap.exists) {
    throw new AdminRouteError("not-found", "User not found.", 404);
  }

  const userData = userSnap.data() as Record<string, unknown>;
  const aiUsageSnap = await db.collection("users").doc(targetUid).collection("settings").doc("ai_usage").get();
  const creditsSnap = await db.collection("users").doc(targetUid).collection("settings").doc("credits").get();
  const publicDecksSnap = await db
    .collection("public_decks")
    .where("ownerUid", "==", targetUid)
    .orderBy("updatedAt", "desc")
    .limit(25)
    .get();
  const roleSnap = await db.collection(ADMIN_ROLE_COLLECTION).doc(targetUid).get();

  return {
    user: {
      uid: targetUid,
      email: userData.email ?? null,
      username: userData.username ?? null,
      usernameLower: userData.usernameLower ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      avatarUrl: userData.avatarUrl ?? null,
      createdAt: timestampToIsoString(userData.createdAt),
      updatedAt: timestampToIsoString(userData.updatedAt),
      accountStatus: userData.accountStatus ?? "active",
      publishingDisabled: userData.publishingDisabled === true,
      moderationReason: userData.moderationReason ?? null,
      moderatedAt: timestampToIsoString(userData.moderatedAt),
      moderatedBy: userData.moderatedBy ?? null,
    },
    aiUsage: aiUsageSnap.data() ?? null,
    credits: creditsSnap.data() ?? null,
    billing: await buildBillingSummary(targetUid),
    adminRole: roleSnap.exists ? roleSnap.data() ?? null : null,
    publicDecks: publicDecksSnap.docs.map((doc) =>
      serializePublicDeckSummary(doc.id, doc.data() as Record<string, unknown>),
    ),
  };
}

export async function listAdminRoles() {
  const snapshot = await db
    .collection(ADMIN_ROLE_COLLECTION)
    .where("active", "==", true)
    .orderBy("updatedAt", "desc")
    .get();

  return Promise.all(
    snapshot.docs.map(async (doc) => {
      const roleData = doc.data();
      const userData = await getUserProfile(doc.id);
      return {
        uid: doc.id,
        role: roleData.role ?? "admin",
        email: roleData.email ?? userData.email ?? null,
        active: roleData.active === true,
        grantedBy: roleData.grantedBy ?? null,
        updatedAt: timestampToIsoString(roleData.updatedAt),
        displayName:
          [userData.firstName, userData.lastName]
            .filter((value) => typeof value === "string" && value.toString().trim().length > 0)
            .join(" ") ||
          userData.username ||
          userData.email ||
          doc.id,
      };
    }),
  );
}

export async function grantAdminRole(
  actorUid: string,
  email: string,
  role: AdminRole,
) {
  const normalized = normalizedEmail(email);
  if (!normalized) {
    throw new AdminRouteError("invalid-argument", "email is required.", 400);
  }

  const targetUser = await auth.getUserByEmail(normalized);
  await upsertAdminRole({
    uid: targetUser.uid,
    role,
    email: normalized,
    grantedBy: actorUid,
  });

  return { success: true, uid: targetUser.uid, role };
}

export async function revokeAdminRole(actorUid: string, targetUid: string) {
  if (!targetUid) {
    throw new AdminRouteError("invalid-argument", "uid is required.", 400);
  }
  if (targetUid === actorUid) {
    throw new AdminRouteError(
      "failed-precondition",
      "You cannot revoke your own super admin access.",
      400,
    );
  }

  await db.collection(ADMIN_ROLE_COLLECTION).doc(targetUid).set(
    {
      active: false,
      revokedBy: actorUid,
      revokedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
  await setAdminClaims(targetUid, null);
  return { success: true };
}

export async function updateUserModerationState(
  moderatorUid: string,
  targetUid: string,
  action: string,
  reason: string,
) {
  if (!targetUid || !action) {
    throw new AdminRouteError(
      "invalid-argument",
      "uid and action are required.",
      400,
    );
  }
  if (targetUid === moderatorUid && action !== "enable_publishing") {
    throw new AdminRouteError(
      "failed-precondition",
      "You cannot moderate your own account.",
      400,
    );
  }

  const userRef = db.collection("users").doc(targetUid);
  const updates: Record<string, unknown> = {
    moderatedBy: moderatorUid,
    moderatedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    moderationReason: reason || null,
  };

  switch (action) {
    case "activate":
      updates.accountStatus = "active";
      await auth.updateUser(targetUid, { disabled: false });
      break;
    case "suspend":
      updates.accountStatus = "suspended";
      await auth.updateUser(targetUid, { disabled: false });
      break;
    case "ban":
      updates.accountStatus = "banned";
      await auth.updateUser(targetUid, { disabled: true });
      break;
    case "unban":
      updates.accountStatus = "active";
      await auth.updateUser(targetUid, { disabled: false });
      break;
    case "disable_publishing":
      updates.publishingDisabled = true;
      break;
    case "enable_publishing":
      updates.publishingDisabled = false;
      break;
    default:
      throw new AdminRouteError(
        "invalid-argument",
        "Unsupported moderation action.",
        400,
      );
  }

  await userRef.set(updates, { merge: true });
  return { success: true };
}

export async function listModerationQueue() {
  const reportsSnapshot = await db
    .collection("deck_reports")
    .where("status", "==", "open")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const grouped = new Map<string, {
    publicDeckId: string;
    openReportCount: number;
    latestReason: string;
    latestReportType: string;
  }>();

  for (const doc of reportsSnapshot.docs) {
    const data = doc.data();
    const publicDeckId = data.publicDeckId as string;
    const existing = grouped.get(publicDeckId);
    if (!existing) {
      grouped.set(publicDeckId, {
        publicDeckId,
        openReportCount: 1,
        latestReason: (data.reason as string | undefined) ?? "Reported",
        latestReportType: (data.reportType as string | undefined) ?? "policy",
      });
      continue;
    }
    existing.openReportCount += 1;
  }

  return Promise.all(
    Array.from(grouped.values()).map(async (group) => {
      const publicDeckSnap = await db.collection("public_decks").doc(group.publicDeckId).get();
      const publicDeck = publicDeckSnap.data() as Record<string, unknown> | undefined;
      return {
        publicDeckId: group.publicDeckId,
        deckName:
          ((publicDeck?.deckSnapshot as Record<string, unknown> | undefined)?.name as string | undefined) ??
          "Untitled Deck",
        ownerUid: publicDeck?.ownerUid ?? null,
        openReportCount: group.openReportCount,
        latestReason: group.latestReason,
        latestReportType: group.latestReportType,
        visibility: publicDeck?.visibility ?? null,
        publicationStatus: publicDeck?.publicationStatus ?? null,
      };
    }),
  );
}

export async function getPublicDeckDetails(publicDeckId: string) {
  const snapshot = await db.collection("public_decks").doc(publicDeckId).get();
  if (!snapshot.exists) {
    return null;
  }

  const reportsSnapshot = await db
    .collection("deck_reports")
    .where("publicDeckId", "==", publicDeckId)
    .where("status", "==", "open")
    .orderBy("createdAt", "desc")
    .get();

  return {
    id: snapshot.id,
    ...(snapshot.data() as Record<string, unknown>),
    openReports: reportsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        reason: data.reason ?? "Reported",
        details: data.details ?? null,
        reportType: data.reportType ?? "policy",
        reportSubcategory: data.reportSubcategory ?? null,
        reportSource: data.reportSource ?? null,
        reporterUid: data.reporterUid ?? null,
        reporterEmail: data.reporterEmail ?? null,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt ?? null,
      };
    }),
  };
}

async function createUserNotification({
  userUid,
  title,
  body,
  type,
  actionRoute,
  status,
  publicDeckId,
  sourceDeckId,
}: {
  userUid: string;
  title: string;
  body: string;
  type: string;
  actionRoute: string | null;
  status: string;
  publicDeckId: string;
  sourceDeckId: string;
}) {
  await db.collection("user_notifications").add({
    userUid,
    title,
    body,
    type,
    actionRoute,
    status,
    publicDeckId,
    sourceDeckId,
    createdAt: Timestamp.now(),
    readAt: null,
  });
}

async function queueModerationEmail({
  userUid,
  action,
  deckName,
  reason,
}: {
  userUid: string;
  action: string;
  deckName: string;
  reason: string;
}) {
  await db.collection("moderation_email_queue").add({
    userUid,
    action,
    deckName,
    reason,
    status: "pending",
    createdAt: Timestamp.now(),
  });
}

export async function moderateDeck(
  moderatorUid: string,
  publicDeckId: string,
  action: "warn" | "hide" | "remove",
  reason: string,
) {
  if (!publicDeckId || !action || !reason) {
    throw new AdminRouteError(
      "invalid-argument",
      "publicDeckId, action, and reason are required.",
      400,
    );
  }
  if (!["warn", "hide", "remove"].includes(action)) {
    throw new AdminRouteError(
      "invalid-argument",
      "Unsupported moderation action.",
      400,
    );
  }

  const publicDeckRef = db.collection("public_decks").doc(publicDeckId);
  const publicDeckSnap = await publicDeckRef.get();
  if (!publicDeckSnap.exists) {
    throw new AdminRouteError("not-found", "Public deck not found.", 404);
  }
  const publicDeck = publicDeckSnap.data() as Record<string, unknown>;
  const ownerUid = publicDeck.ownerUid?.toString();
  const sourceDeckId = publicDeck.sourceDeckId?.toString();
  if (!ownerUid || !sourceDeckId) {
    throw new AdminRouteError(
      "failed-precondition",
      "Deck ownership metadata is missing.",
      400,
    );
  }

  const now = nowIsoString();
  const publicUpdate: Record<string, unknown> = {
    moderationReason: reason,
    moderatedAt: now,
    moderatedBy: moderatorUid,
    updatedAt: now,
  };
  const privateUpdate: Record<string, unknown> = {
    moderationReason: reason,
    moderatedAt: now,
    moderatedBy: moderatorUid,
    updatedAt: now,
  };

  if (action === "warn") {
    publicUpdate.moderationStatus = "warned";
    privateUpdate.moderationStatus = "warned";
  } else if (action === "hide") {
    publicUpdate.moderationStatus = "hidden";
    publicUpdate.publicationStatus = "hidden";
    privateUpdate.moderationStatus = "hidden";
    privateUpdate.visibility = "private";
    privateUpdate.publicationStatus = "hidden";
  } else {
    publicUpdate.moderationStatus = "removed";
    publicUpdate.publicationStatus = "removed";
    privateUpdate.moderationStatus = "removed";
    privateUpdate.visibility = "private";
    privateUpdate.publicationStatus = "removed";
  }

  await publicDeckRef.set(publicUpdate, { merge: true });
  await db.collection("users").doc(ownerUid).collection("decks").doc(sourceDeckId).set(privateUpdate, { merge: true });

  const openReports = await db
    .collection("deck_reports")
    .where("publicDeckId", "==", publicDeckId)
    .where("status", "==", "open")
    .get();
  await Promise.all(
    openReports.docs.map((doc) =>
      doc.ref.set(
        {
          status: "resolved",
          resolvedAt: Timestamp.now(),
          resolvedBy: moderatorUid,
          resolutionAction: action,
        },
        { merge: true },
      ),
    ),
  );

  await db.collection("deck_moderation_events").add({
    publicDeckId,
    ownerUid,
    sourceDeckId,
    action,
    reason,
    moderatedBy: moderatorUid,
    createdAt: Timestamp.now(),
  });

  const deckName =
    ((publicDeck.deckSnapshot as Record<string, unknown> | undefined)?.name as string | undefined) ??
    "Untitled Deck";

  await createUserNotification({
    userUid: ownerUid,
    title: `Your deck "${deckName}" was moderated`,
    body: `Status: ${action}. Reason: ${reason}`,
    type: action === "warn" ? "warning" : "alert",
    actionRoute: `deck/${sourceDeckId}`,
    status: action,
    publicDeckId,
    sourceDeckId,
  });

  if (SERIOUS_MODERATION_ACTIONS.has(action)) {
    await queueModerationEmail({
      userUid: ownerUid,
      action,
      deckName,
      reason,
    });
  }

  return { success: true };
}

export async function listRefundRequests() {
  const snapshot = await db
    .collection("refund_requests")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => {
    const refund = doc.data();
    return {
      id: doc.id,
      ...refund,
      createdAt: timestampToIsoString(refund.createdAt),
      updatedAt: timestampToIsoString(refund.updatedAt),
      resolvedAt: timestampToIsoString(refund.resolvedAt),
    };
  });
}

export async function updateRefundRequestStatus(
  moderatorUid: string,
  refundRequestId: string,
  status: string,
  adminNotes: string,
) {
  if (!refundRequestId || !status) {
    throw new AdminRouteError(
      "invalid-argument",
      "refundRequestId and status are required.",
      400,
    );
  }

  await db.collection("refund_requests").doc(refundRequestId).set(
    {
      status,
      adminNotes: adminNotes || null,
      resolvedBy: moderatorUid,
      resolvedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );

  return { success: true };
}
