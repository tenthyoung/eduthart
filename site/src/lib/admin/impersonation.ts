import { Timestamp } from "@/lib/firebase/firestore-rest";
import type { DecodedIdToken } from "@/lib/firebase/auth-rest";

import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";

import { AdminRouteError, requireAdmin } from "./server";

const AUDIT_COLLECTION = "admin_audit_log";
const ADMIN_ROLE_COLLECTION = "admin_roles";

/**
 * The custom claim that marks an ID token as an admin ghosting an account.
 * Server routes read it back through `getAuthenticatedSession`.
 */
export const IMPERSONATED_BY_CLAIM = "impersonatedBy";

async function writeAudit(entry: {
  action: "impersonation_started" | "impersonation_ended";
  actorUid: string;
  actorEmail: string | null;
  targetUid: string;
  targetEmail: string | null;
}) {
  await getFirebaseAdminDb()
    .collection(AUDIT_COLLECTION)
    .add({ ...entry, createdAt: Timestamp.now() });
}

async function isAdminAccount(uid: string) {
  const snap = await getFirebaseAdminDb()
    .collection(ADMIN_ROLE_COLLECTION)
    .doc(uid)
    .get();
  const data = snap.data();

  return {
    admin: snap.exists && data?.active === true,
    superAdmin:
      snap.exists && data?.active === true && data.role === "super_admin",
  };
}

/**
 * A Firebase custom token that signs the browser in as `targetUid`.
 *
 * Any admin may ghost an ordinary account. Ghosting another admin needs a super
 * admin, and nobody may ghost a super admin, so ghosting cannot be used to climb
 * to a role the caller does not hold. The action is audit logged before the
 * token is minted.
 */
export async function startImpersonation(
  decodedToken: DecodedIdToken,
  targetUid: string
) {
  const access = await requireAdmin(decodedToken);

  if (!targetUid) {
    throw new AdminRouteError("invalid-argument", "uid is required.", 400);
  }

  if (targetUid === access.uid) {
    throw new AdminRouteError(
      "failed-precondition",
      "You are already signed in as yourself.",
      400
    );
  }

  const auth = getFirebaseAdminAuth();
  const target = await auth.getUser(targetUid).catch(() => null);

  if (!target) {
    throw new AdminRouteError("not-found", "User not found.", 404);
  }

  const targetRole = await isAdminAccount(targetUid);

  if (targetRole.superAdmin || target.customClaims?.superAdmin === true) {
    throw new AdminRouteError(
      "permission-denied",
      "Super admin accounts can't be ghosted.",
      403
    );
  }

  if (
    (targetRole.admin || target.customClaims?.admin === true) &&
    !access.isSuperAdmin
  ) {
    throw new AdminRouteError(
      "permission-denied",
      "Only a super admin can ghost another admin.",
      403
    );
  }

  await writeAudit({
    action: "impersonation_started",
    actorUid: access.uid,
    actorEmail: decodedToken.email ?? null,
    targetUid,
    targetEmail: target.email ?? null,
  });

  const token = await auth.createCustomToken(targetUid, {
    [IMPERSONATED_BY_CLAIM]: access.uid,
  });

  return { token, target: { uid: targetUid, email: target.email ?? null } };
}

/**
 * A custom token that signs the browser back in as the admin themselves.
 *
 * The admin session cookie is untouched while ghosting, so it is what proves
 * who to return to; nothing the ghosted browser holds is trusted for this.
 */
export async function stopImpersonation(
  decodedToken: DecodedIdToken,
  targetUid = ""
) {
  const access = await requireAdmin(decodedToken);

  await writeAudit({
    action: "impersonation_ended",
    actorUid: access.uid,
    actorEmail: decodedToken.email ?? null,
    targetUid,
    targetEmail: null,
  });

  const token = await getFirebaseAdminAuth().createCustomToken(access.uid);

  return { token };
}
