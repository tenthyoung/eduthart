"use client";

import {
  type ActionCodeSettings,
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  getMultiFactorResolver,
  multiFactor,
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
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
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
import {
  describeTwoFactorError,
  TOTP_DISPLAY_NAME,
  TOTP_ISSUER,
  TwoFactorRequiredError,
  type EnrolledFactor,
  type TotpEnrollment,
} from "@/lib/auth/two-factor";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type FederatedAuthMode = "login" | "signup";

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
  signInWithGoogle: (
    mode: FederatedAuthMode
  ) => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
  sendResetLink: (email: string) => Promise<void>;
  /** Enrolled second factors for the signed-in account, newest last. */
  twoFactor: EnrolledFactor[];
  startTotpEnrollment: () => Promise<TotpEnrollment>;
  confirmTotpEnrollment: (
    enrollment: TotpEnrollment,
    code: string
  ) => Promise<void>;
  disableTotp: (factorUid: string) => Promise<void>;
  /** Finish a sign-in that stopped on a TwoFactorRequiredError. */
  resolveTwoFactorSignIn: (
    resolver: MultiFactorResolver,
    code: string
  ) => Promise<void>;
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

/**
 * The second factors enrolled on a Firebase account.
 *
 * Firebase exposes these on the user record, so there is nothing to fetch and
 * nothing of our own to keep in sync — which is the point: the enrollment
 * state has exactly one home.
 */
/**
 * Whether a caught error is the one Firebase raises for a second factor.
 *
 * The error code is the discriminator Firebase documents for this, and it is
 * the only code that comes with a resolver attached — so narrowing on it is
 * exactly as safe as the SDK's own contract.
 */
function isMultiFactorError(error: unknown): error is MultiFactorError {
  return getAuthErrorCode(error) === "auth/multi-factor-auth-required";
}

function readEnrolledFactors(user: FirebaseUser): EnrolledFactor[] {
  return multiFactor(user).enrolledFactors.map((factor) => ({
    displayName: factor.displayName ?? null,
    enrolledAt: factor.enrollmentTime ?? null,
    uid: factor.uid,
  }));
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

  if (code === "auth/unauthorized-domain") {
    return "Google sign-in is not authorized for this domain yet.";
  }

  if (code === "auth/popup-blocked") {
    return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
  }

  if (code === "auth/account-exists-with-different-credential") {
    return "An account already exists for that email. Sign in with your password instead.";
  }

  if (code === "auth/network-request-failed") {
    return "We could not reach the sign-in service. Check your connection and try again.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a few minutes before trying again.";
  }

  // An unmapped Firebase code would surface as an opaque
  // "Firebase: Error (auth/...)" string, so prefer the fallback for those --
  // but log the real code, otherwise every distinct failure looks identical
  // and there is nothing to debug from.
  if (code !== null) {
    console.error(`Unhandled Firebase auth error: ${code}`, error);
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
    method?: "email_password" | "google";
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
  const [twoFactor, setTwoFactor] = useState<EnrolledFactor[]>([]);

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
        setTwoFactor(nextUser ? readEnrolledFactors(nextUser) : []);
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
        // The password was right; the account just wants its second factor.
        // Hand the caller the resolver so it can ask for a code, rather than
        // reporting this as a failed sign-in.
        if (isMultiFactorError(error)) {
          throw new TwoFactorRequiredError(getMultiFactorResolver(auth, error));
        }

        throw new Error(formatSignInError(error));
      }

      setUser(mapFirebaseUser(credential.user));
      setTwoFactor(readEnrolledFactors(credential.user));
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
      setTwoFactor(readEnrolledFactors(credential.user));
      setStatus("authenticated");
    },
    []
  );

  const signInWithGoogle = useCallback(async (mode: FederatedAuthMode) => {
    const auth = await getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    let credential;

    try {
      credential = await signInWithPopup(auth, provider);
    } catch (error) {
      // A Google account can carry a second factor of ours too, so this path
      // needs the same treatment as email sign-in.
      if (isMultiFactorError(error)) {
        throw new TwoFactorRequiredError(getMultiFactorResolver(auth, error));
      }

      throw new Error(
        formatAuthError(error, "Unable to continue with Google.")
      );
    }

    const additionalInfo = getAdditionalUserInfo(credential);
    const isNewUser = additionalInfo?.isNewUser ?? false;

    if (mode === "login" && isNewUser) {
      await firebaseSignOut(auth);
      throw new Error(
        "Finish first-time Google sign-up on the sign up page so we can capture your legal consent."
      );
    }

    if (mode === "signup") {
      // Google returns given_name/family_name in the provider profile, but
      // fall back to splitting the display name so the completion step starts
      // prefilled rather than blank.
      const profile = (additionalInfo?.profile ?? {}) as {
        family_name?: string;
        given_name?: string;
      };
      const splitName = splitDisplayName(credential.user.displayName);

      await persistUserRecord(credential.user, {
        acceptedLegal: true,
        firstName: profile.given_name ?? splitName.firstName,
        lastName: profile.family_name ?? splitName.lastName,
        method: "google",
      });
    }

    setUser(mapFirebaseUser(credential.user));
    setTwoFactor(readEnrolledFactors(credential.user));
    setStatus("authenticated");

    return { isNewUser };
  }, []);

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
      setTwoFactor(readEnrolledFactors(currentUser));
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
    setTwoFactor(readEnrolledFactors(auth.currentUser));
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

  /**
   * Begin TOTP enrollment.
   *
   * The returned secret has to survive until the person types their first
   * code, so it is handed back to the caller to hold rather than kept here —
   * it is a live object, not something that can be serialised into state.
   */
  const startTotpEnrollment = useCallback(async (): Promise<TotpEnrollment> => {
    const auth = await getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Sign in before setting up two-factor authentication.");
    }

    try {
      const session = await multiFactor(currentUser).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);

      return {
        secret,
        secretKey: secret.secretKey,
        uri: secret.generateQrCodeUrl(
          currentUser.email ?? currentUser.uid,
          TOTP_ISSUER
        ),
      };
    } catch (error) {
      throw new Error(
        describeTwoFactorError(
          getAuthErrorCode(error),
          "Unable to start two-factor setup."
        )
      );
    }
  }, []);

  const confirmTotpEnrollment = useCallback(
    async (enrollment: TotpEnrollment, code: string) => {
      const auth = await getFirebaseAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("Sign in before setting up two-factor authentication.");
      }

      try {
        await multiFactor(currentUser).enroll(
          TotpMultiFactorGenerator.assertionForEnrollment(
            enrollment.secret,
            code.trim()
          ),
          TOTP_DISPLAY_NAME
        );
      } catch (error) {
        throw new Error(
          describeTwoFactorError(
            getAuthErrorCode(error),
            "Unable to turn on two-factor authentication."
          )
        );
      }

      await reload(currentUser);
      setUser(mapFirebaseUser(currentUser));
      setTwoFactor(readEnrolledFactors(currentUser));
    },
    []
  );

  const disableTotp = useCallback(async (factorUid: string) => {
    const auth = await getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("Sign in before changing two-factor authentication.");
    }

    try {
      await multiFactor(currentUser).unenroll(factorUid);
    } catch (error) {
      throw new Error(
        describeTwoFactorError(
          getAuthErrorCode(error),
          "Unable to turn off two-factor authentication."
        )
      );
    }

    await reload(currentUser);
    setUser(mapFirebaseUser(currentUser));
    setTwoFactor(readEnrolledFactors(currentUser));
  }, []);

  /**
   * Finish a sign-in that stopped for a second factor.
   *
   * The resolver carries the half-finished sign-in, so it must be the same
   * object the original failure produced.
   */
  const resolveTwoFactorSignIn = useCallback(
    async (resolver: MultiFactorResolver, code: string) => {
      const hint = resolver.hints.find(
        (candidate) => candidate.factorId === TotpMultiFactorGenerator.FACTOR_ID
      );

      if (!hint) {
        throw new Error(
          "This account uses a second factor this site cannot complete."
        );
      }

      let credential;

      try {
        credential = await resolver.resolveSignIn(
          TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code.trim())
        );
      } catch (error) {
        throw new Error(
          describeTwoFactorError(
            getAuthErrorCode(error),
            "That code was not accepted."
          )
        );
      }

      setUser(mapFirebaseUser(credential.user));
      setTwoFactor(readEnrolledFactors(credential.user));
      setStatus("authenticated");
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      changePassword,
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
      twoFactor,
      startTotpEnrollment,
      confirmTotpEnrollment,
      disableTotp,
      resolveTwoFactorSignIn,
    }),
    [
      changePassword,
      requestEmailChange,
      refreshUser,
      sendResetLink,
      sendVerificationEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      signUpWithEmail,
      status,
      user,
      twoFactor,
      startTotpEnrollment,
      confirmTotpEnrollment,
      disableTotp,
      resolveTwoFactorSignIn,
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
