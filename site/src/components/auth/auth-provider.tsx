"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
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
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  photoURL: string | null;
  providerIds: string[];
  uid: string;
};

type AuthContextValue = {
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
      sendResetLink,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      signUpWithEmail,
      status,
      user,
    }),
    [sendResetLink, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, status, user],
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
