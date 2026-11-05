"use client";

import { signInWithCustomToken } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/client";

import { requestImpersonationToken, requestReturnToken } from "./api";

/**
 * Sign this browser in as another account.
 *
 * The server checks the caller's admin session, audit logs the request and
 * mints the token; this only trades it for a Firebase session. Navigation is a
 * full page load on purpose, so nothing cached for the admin leaks into the
 * ghosted view.
 */
export async function ghostIntoAccount(uid: string) {
  const { token } = await requestImpersonationToken(uid);
  const auth = await getFirebaseAuth();
  await signInWithCustomToken(auth, token);
  window.location.assign("/account");
}

/** Leave ghost mode and land back on the admin page for that user. */
export async function exitGhostMode(ghostedUid: string) {
  const { token } = await requestReturnToken(ghostedUid);
  const auth = await getFirebaseAuth();
  await signInWithCustomToken(auth, token);
  window.location.assign(`/admin/users/${ghostedUid}`);
}
