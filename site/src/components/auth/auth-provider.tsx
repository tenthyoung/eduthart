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
  type User,
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

import {
  getFirebaseAuth,
} from "@/lib/firebase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type GoogleAuthMode = "login" | "signup";

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
  user: User | null;
};

const TERMS_PATH = "/legal/terms-of-service";
const PRIVACY_PATH = "/legal/privacy-policy";
const LEGAL_VERSION = "2026-07-07";

const AuthContext = createContext<AuthContextValue | null>(null);

function buildDisplayName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

async function persistUserRecord(
  user: User,
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
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
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

        setUser(nextUser);
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
    const auth = await getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const signOut = useCallback(async () => {
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
