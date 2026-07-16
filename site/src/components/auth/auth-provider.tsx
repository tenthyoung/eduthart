"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
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

import { buildDisplayName } from "@/lib/auth/account-profile";
import {
  getFirebaseAuth,
} from "@/lib/firebase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type GoogleAuthMode = "login" | "signup";

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
  requestEmailChange: (nextEmail: string) => Promise<{
    email: string;
    requiresVerification: boolean;
  }>;
  refreshUser: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (mode: GoogleAuthMode) => Promise<void>;
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
        parsed.emailVerified ?? parsed.providerIds?.includes("google.com") ?? false,
      getIdToken: async () => `e2e:${parsed.uid}`,
      photoURL: parsed.photoURL ?? null,
      providerIds: parsed.providerIds?.length ? parsed.providerIds : ["password"],
      uid: parsed.uid,
    };
  } catch {
    return null;
  }
}

function notifyE2EAuthChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(E2E_AUTH_EVENT));
}

function formatAuthError(error: unknown, fallbackMessage: string) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : null;

  if (code === "auth/email-already-in-use") {
    return "That email address is already in use by another account.";
  }

  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (code === "auth/requires-recent-login") {
    return "For security, please sign out and sign back in before changing your email address.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

async function persistUserRecord(
  user: FirebaseUser,
  options?: {
    acceptedLegal?: boolean;
    firstName?: string;
    lastName?: string;
    method?: "email_password" | "google";
  },
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
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(
      payload?.error?.message ?? "Unable to sync your account profile.",
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

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = await getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    await persistUserRecord(credential.user);
  }, []);

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
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

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
    },
    [],
  );

  const signInWithGoogle = useCallback(async (mode: GoogleAuthMode) => {
    const auth = await getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const credential = await signInWithPopup(auth, provider);
    const additionalInfo = getAdditionalUserInfo(credential);
    const isNewUser = additionalInfo?.isNewUser ?? false;

    if (mode === "login" && isNewUser) {
      await firebaseSignOut(auth);
      throw new Error(
        "Finish first-time Google sign-up on the sign up page so we can capture your legal consent.",
      );
    }

    await persistUserRecord(credential.user, {
      acceptedLegal: mode === "signup",
      method: "google",
    });
  }, []);

  const sendResetLink = useCallback(async (email: string) => {
    if (E2E_AUTH_ENABLED) {
      return;
    }

    const auth = await getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim());
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
        throw new Error("You need to be signed in to change your email address.");
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
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(
          payload?.error?.message ?? "Unable to change your email address.",
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
      throw new Error(formatAuthError(error, "Unable to start your email change."));
    }

    return {
      email: normalizedEmail,
      requiresVerification: true,
    };
  }, []);

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
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      requestEmailChange,
      sendResetLink,
      sendVerificationEmail,
      refreshUser,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      signUpWithEmail,
      status,
      user,
    }),
    [requestEmailChange, refreshUser, sendResetLink, sendVerificationEmail, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, status, user],
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
