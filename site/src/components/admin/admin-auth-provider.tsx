"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
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
  AdminApiError,
  createAdminSession,
  deleteAdminSession,
  getAdminAccessStatus,
} from "@/lib/admin/api";
import type { AdminAccess } from "@/lib/admin/types";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AdminSessionStatus =
  | "loading"
  | "signed_out"
  | "unauthorized"
  | "ready"
  | "error";

type AdminAuthContextValue = {
  access: AdminAccess | null;
  error: AdminApiError | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  status: AdminSessionStatus;
  user: User | null;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

type AdminAuthProviderProps = {
  children: ReactNode;
};

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [status, setStatus] = useState<AdminSessionStatus>("loading");
  const [error, setError] = useState<AdminApiError | null>(null);

  const refreshAccess = useCallback(async () => {
    const auth = await getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setUser(null);
      setAccess(null);
      setError(null);
      setStatus("signed_out");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const nextAccess = await getAdminAccessStatus();
      setUser(currentUser);
      setAccess(nextAccess);
      setStatus("ready");
    } catch (error) {
      const normalized =
        error instanceof AdminApiError
          ? error
          : new AdminApiError("unknown", "Unable to verify admin access.");
      setUser(currentUser);
      setAccess(null);
      setError(normalized);
      setStatus(
        normalized.code === "functions/permission-denied" ||
          normalized.code === "permission-denied"
          ? "unauthorized"
          : "error",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    getFirebaseAuth().then((auth) => {
      if (cancelled) {
        return;
      }

      unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
        setUser(nextUser);
        if (!nextUser) {
          setAccess(null);
          setError(null);
          setStatus("signed_out");
          return;
        }
        await refreshAccess();
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [refreshAccess]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const auth = await getFirebaseAuth();
      setStatus("loading");
      setError(null);
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        const idToken = await credential.user.getIdToken(true);
        const nextAccess = await createAdminSession(idToken);
        setUser(credential.user);
        setAccess(nextAccess);
        setStatus("ready");
      } catch (error) {
        await firebaseSignOut(auth).catch(() => undefined);
        const normalized =
          error instanceof AdminApiError
            ? error
            : new AdminApiError(
                "auth/failed",
                error instanceof Error ? error.message : "Sign in failed.",
              );
        setError(normalized);
        setStatus("error");
        throw normalized;
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    const auth = await getFirebaseAuth();
    await deleteAdminSession().catch(() => undefined);
    await firebaseSignOut(auth);
    setUser(null);
    setAccess(null);
    setError(null);
    setStatus("signed_out");
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      access,
      error,
      signIn,
      signOut,
      refreshAccess,
      status,
      user,
    }),
    [access, error, refreshAccess, signIn, signOut, status, user],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider.");
  }
  return context;
}

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAdminAuth();

  useEffect(() => {
    if (pathname === "/admin/login") {
      return;
    }

    if (status === "signed_out") {
      router.replace("/admin/login");
    }
  }, [pathname, router, status]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return <>{children}</>;
}
