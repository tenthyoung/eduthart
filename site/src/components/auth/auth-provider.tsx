"use client";

import {
  type ActionCodeSettings,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { buildDisplayName, splitDisplayName } from "@/lib/auth/account-profile";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type FederatedAuthMode = "login" | "signup";

export type FederatedProvider = "apple.com" | "google.com";

export type AuthUser = {
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  photoURL: string | null;
  providerIds: string[];
  uid: string;
};

type AuthContextValue = {
  changePassword: (
    currentPassword: string,
    nextPassword: string
  ) => Promise<void>;
  requestEmailChange: (nextEmail: string) => Promise<{
    email: string;
    requiresVerification: boolean;
  }>;
  refreshUser: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithFederatedProvider: (
    provider: FederatedProvider,
    mode: FederatedAuthMode
  ) => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
  sendResetLink: (email: string) => Promise<void>;
  signUpWithEmail: (args: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) => Promise<void>;
  status: AuthStatus;
  user: AuthUser | null;
};

const TERMS_PATH = "/legal/terms-of-service";
const PRIVACY_PATH = "/legal/privacy-policy";
const LEGAL_VERSION = "2026-07-07";
const E2E_STORAGE_KEY = "eduthart:e2e-user";
const E2E_AUTH_EVENT = "eduthart:e2e-auth-changed";
const E2E_AUTH_ENABLED = process.env.NEXT_PUBLIC_E2E_AUTH === "1";
const RESET_PASSWORD_RETURN_PATH = "/login?reset=success";
export const MIN_PASSWORD_LENGTH = 8;

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseUser(user: FirebaseUser): AuthUser {
  return {
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
    getIdToken: (forceRefresh?: boolean) => user.getIdToken(forceRefresh),
    photoURL: user.photoURL,
    providerIds: user.providerData
      .map((provider) => provider.providerId)
      .filter(Boolean),
    uid: user.uid,
  };
}

function readE2EUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(E2E_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      displayName?: string | null;
      email?: string | null;
      emailVerified?: boolean;
      photoURL?: string | null;
      providerIds?: string[];
      uid?: string;
    };

    if (!parsed.uid) {
      return null;
    }

    return {
      displayName: parsed.displayName ?? null,
      email: parsed.email ?? null,
      emailVerified:
        parsed.emailVerified ??
        parsed.providerIds?.includes("google.com") ??
        false,
      getIdToken: async () => `e2e:${parsed.uid}`,
      photoURL: parsed.photoURL ?? null,
      providerIds: parsed.providerIds?.length
        ? parsed.providerIds
        : ["password"],
      uid: parsed.uid,
    };
  } catch {
    return null;
  }
}

/**
 * Tell the server a security-sensitive change happened so it can notify the
 * account owner. Failure here must not surface as a failed password change.
 */
async function reportSecurityEvent(
  body: { nextEmail?: string; type: "email_changed" | "password_changed" },
  token?: string
) {
  try {
    await fetch("/api/auth/security-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Unable to report a security event", error);
  }
}

function notifyE2EAuthChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(E2E_AUTH_EVENT));
}

function getAuthErrorCode(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : null;
}

function formatAuthError(error: unknown, fallbackMessage: string) {
  const code = getAuthErrorCode(error);

  if (code === "auth/email-already-in-use") {
    return "That email address is already in use by another account.";
  }

  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (code === "auth/requires-recent-login") {
    return "For security, please sign out and sign back in before making this change.";
  }

  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "That current password is not correct.";
  }

  if (code === "auth/weak-password") {
    return "Choose a stronger password with at least 8 characters.";
  }

  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  ) {
    return "The sign-in window closed before it finished. Please try again.";
  }

  if (code === "auth/operation-not-allowed") {
    return "That sign-in method is not enabled for EduthArt yet.";
  }

  if (code === "auth/network-request-failed") {
    return "We could not reach the sign-in service. Check your connection and try again.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a few minutes before trying again.";
  }

  // An unmapped Firebase code would surface as an opaque
  // "Firebase: Error (auth/...)" string, so prefer the fallback for those.
  if (code !== null) {
    return fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function formatSignInError(error: unknown) {
  const code = getAuthErrorCode(error);

  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  ) {
    return "That email and password combination is not correct.";
  }

  if (code === "auth/user-disabled") {
    return "This account has been disabled. Contact support if you need help.";
  }

  return formatAuthError(error, "Unable to sign you in.");
}

async function persistUserRecord(
  user: FirebaseUser,
  options?: {
    acceptedLegal?: boolean;
    firstName?: string;
    lastName?: string;
    method?: "apple" | "email_password" | "google";
  }
) {
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/auth/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      acceptedLegal: options?.acceptedLegal ?? false,
      idToken,
      legalVersion: LEGAL_VERSION,
      method: options?.method ?? null,
      privacyPolicyPath: PRIVACY_PATH,
      termsOfServicePath: TERMS_PATH,
      ...(options?.firstName?.trim()
        ? { firstName: options.firstName.trim() }
        : {}),
      ...(options?.lastName?.trim()
        ? { lastName: options.lastName.trim() }
        : {}),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      payload?.error?.message ?? "Unable to sync your account profile."
    );
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    if (E2E_AUTH_ENABLED) {
      const syncUser = () => {
        const nextUser = readE2EUser();
        setUser(nextUser);
        setStatus(nextUser ? "authenticated" : "unauthenticated");
      };

      syncUser();
      window.addEventListener("storage", syncUser);
      window.addEventListener(E2E_AUTH_EVENT, syncUser);

      return () => {
        window.removeEventListener("storage", syncUser);
        window.removeEventListener(E2E_AUTH_EVENT, syncUser);
      };
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    getFirebaseAuth().then((auth) => {
      if (cancelled) {
        return;
      }

      unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
        if (cancelled) {
          return;
        }

        setUser(nextUser ? mapFirebaseUser(nextUser) : null);
        setStatus(nextUser ? "authenticated" : "unauthenticated");
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const auth = await getFirebaseAuth();
      let credential;

      try {
        credential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } catch (error) {
        throw new Error(formatSignInError(error));
      }

      setUser(mapFirebaseUser(credential.user));
      setStatus("authenticated");
    },
    []
  );

  const signUpWithEmail = useCallback(
    async ({
      email,
      firstName,
      lastName,
      password,
    }: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
    }) => {
      const auth = await getFirebaseAuth();
      let credential;

      try {
        credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } catch (error) {
        throw new Error(
          formatAuthError(error, "Unable to create your account.")
        );
      }

      const displayName = buildDisplayName(firstName, lastName);

      if (displayName) {
        await updateProfile(credential.user, {
          displayName,
        });
      }

      await persistUserRecord(credential.user, {
        acceptedLegal: true,
        firstName,
        lastName,
        method: "email_password",
      });

      await sendEmailVerification(credential.user);
      setUser(mapFirebaseUser(credential.user));
      setStatus("authenticated");
    },
    []
  );

  const signInWithFederatedProvider = useCallback(
    async (providerId: FederatedProvider, mode: FederatedAuthMode) => {
      const auth = await getFirebaseAuth();
      const providerLabel = providerId === "apple.com" ? "Apple" : "Google";
      let provider: GoogleAuthProvider | OAuthProvider;

      if (providerId === "apple.com") {
        const appleProvider = new OAuthProvider("apple.com");
        // Apple only returns a name and email on the very first authorization,
        // so both scopes have to be requested up front.
        appleProvider.addScope("email");
        appleProvider.addScope("name");
        provider = appleProvider;
      } else {
        const googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: "select_account" });
        provider = googleProvider;
      }

      let credential;

      try {
        credential = await signInWithPopup(auth, provider);
      } catch (error) {
        throw new Error(
          formatAuthError(error, `Unable to continue with ${providerLabel}.`)
        );
      }

      const additionalInfo = getAdditionalUserInfo(credential);
      const isNewUser = additionalInfo?.isNewUser ?? false;

      if (mode === "login" && isNewUser) {
        await firebaseSignOut(auth);
        throw new Error(
          `Finish first-time ${providerLabel} sign-up on the sign up page so we can capture your legal consent.`
        );
      }

      if (mode === "signup") {
        // Google returns given_name/family_name in the provider profile, while
        // Apple only ever supplies a display name, and only on the very first
        // authorization. Take whichever is available so the completion step
        // starts prefilled rather than blank.
        const profile = (additionalInfo?.profile ?? {}) as {
          family_name?: string;
          given_name?: string;
        };
        const splitName = splitDisplayName(credential.user.displayName);

        await persistUserRecord(credential.user, {
          acceptedLegal: true,
          firstName: profile.given_name ?? splitName.firstName,
          lastName: profile.family_name ?? splitName.lastName,
          method: providerId === "apple.com" ? "apple" : "google",
        });
      }

      setUser(mapFirebaseUser(credential.user));
      setStatus("authenticated");

      return { isNewUser };
    },
    []
  );

  const sendResetLink = useCallback(async (email: string) => {
    if (E2E_AUTH_ENABLED) {
      return;
    }

    const auth = await getFirebaseAuth();
    const origin =
      typeof window === "undefined" ? null : window.location.origin;
    const actionCodeSettings: ActionCodeSettings | undefined = origin
      ? {
          url: `${origin}${RESET_PASSWORD_RETURN_PATH}`,
        }
      : undefined;

    await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
  }, []);

  const sendVerificationEmail = useCallback(async () => {
    if (E2E_AUTH_ENABLED) {
      return;
    }

    const auth = await getFirebaseAuth();

    if (!auth.currentUser) {
      throw new Error("You need to be signed in to verify your email.");
    }

    await sendEmailVerification(auth.currentUser);
  }, []);

  const requestEmailChange = useCallback(async (nextEmail: string) => {
    const normalizedEmail = nextEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("Please enter a valid email address.");
    }

    if (E2E_AUTH_ENABLED) {
      const nextUser = readE2EUser();

      if (!nextUser) {
        throw new Error(
          "You need to be signed in to change your email address."
        );
      }

      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer e2e:${nextUser.uid}`,
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(
          payload?.error?.message ?? "Unable to change your email address."
        );
      }

      const updatedUser = {
        ...nextUser,
        email: normalizedEmail,
      };
      window.localStorage.setItem(E2E_STORAGE_KEY, JSON.stringify(updatedUser));
      notifyE2EAuthChanged();
      setUser(updatedUser);
      setStatus("authenticated");

      return {
        email: normalizedEmail,
        requiresVerification: false,
      };
    }

    const auth = await getFirebaseAuth();

    if (!auth.currentUser) {
      throw new Error("You need to be signed in to change your email address.");
    }

    if (auth.currentUser.email?.trim().toLowerCase() === normalizedEmail) {
      throw new Error("Use a different email address to make a change.");
    }

    try {
      await verifyBeforeUpdateEmail(auth.currentUser, normalizedEmail);
    } catch (error) {
      throw new Error(
        formatAuthError(error, "Unable to start your email change.")
      );
    }

    await reportSecurityEvent(
      { nextEmail: normalizedEmail, type: "email_changed" },
      await auth.currentUser.getIdToken()
    );

    return {
      email: normalizedEmail,
      requiresVerification: true,
    };
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, nextPassword: string) => {
      if (nextPassword.length < MIN_PASSWORD_LENGTH) {
        throw new Error(
          `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`
        );
      }

      if (E2E_AUTH_ENABLED) {
        const nextUser = readE2EUser();

        if (!nextUser) {
          throw new Error("You need to be signed in to change your password.");
        }

        await reportSecurityEvent(
          { type: "password_changed" },
          `e2e:${nextUser.uid}`
        );
        return;
      }

      const auth = await getFirebaseAuth();
      const currentUser = auth.currentUser;

      if (!currentUser?.email) {
        throw new Error(
          "You need to be signed in with an email and password to change it."
        );
      }

      try {
        // Re-authenticating first turns a stale session into a clear "wrong
        // password" message instead of Firebase's requires-recent-login error.
        await reauthenticateWithCredential(
          currentUser,
          EmailAuthProvider.credential(currentUser.email, currentPassword)
        );
        await updatePassword(currentUser, nextPassword);
      } catch (error) {
        throw new Error(
          formatAuthError(error, "Unable to change your password.")
        );
      }

      await reportSecurityEvent(
        { type: "password_changed" },
        await currentUser.getIdToken(true)
      );
      setUser(mapFirebaseUser(currentUser));
    },
    []
  );

  const refreshUser = useCallback(async () => {
    if (E2E_AUTH_ENABLED) {
      const nextUser = readE2EUser();
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "unauthenticated");
      return;
    }

    const auth = await getFirebaseAuth();

    if (!auth.currentUser) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    await reload(auth.currentUser);
    await persistUserRecord(auth.currentUser);
    setUser(mapFirebaseUser(auth.currentUser));
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    if (E2E_AUTH_ENABLED) {
      window.localStorage.removeItem(E2E_STORAGE_KEY);
      notifyE2EAuthChanged();
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    const auth = await getFirebaseAuth();
    await firebaseSignOut(auth);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      changePassword,
      requestEmailChange,
      sendResetLink,
      sendVerificationEmail,
      refreshUser,
      signInWithEmail,
      signInWithFederatedProvider,
      signOut,
      signUpWithEmail,
      status,
      user,
    }),
    [
      changePassword,
      requestEmailChange,
      refreshUser,
      sendResetLink,
      sendVerificationEmail,
      signInWithEmail,
      signInWithFederatedProvider,
      signOut,
      signUpWithEmail,
      status,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
