import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { getE2EAccountProfile, isE2EAuthEnabled } from "@/lib/auth/e2e-store";

type SessionUser = {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerData: Array<{ providerId: string }>;
  uid: string;
};

export type AuthenticatedSession = {
  authType: "e2e" | "firebase";
  token: string;
  uid: string;
  user: SessionUser;
};

function getAuthorizationToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

export async function getAuthenticatedSession(
  request: Request,
  bodyIdToken?: string | null,
): Promise<AuthenticatedSession> {
  const token = getAuthorizationToken(request) ?? bodyIdToken?.trim() ?? null;

  if (!token) {
    throw new Error("A valid ID token is required.");
  }

  if (isE2EAuthEnabled() && token.startsWith("e2e:")) {
    const uid = token.slice(4);
    const profile = await getE2EAccountProfile(uid);

    if (!profile) {
      throw new Error("Test account profile not found.");
    }

    return {
      authType: "e2e",
      token,
      uid,
      user: {
        displayName: profile.displayName,
        email: profile.email,
        photoURL: profile.photoURL,
        providerData: profile.authProviders.map((providerId) => ({ providerId })),
        uid,
      },
    };
  }

  const auth = getFirebaseAdminAuth();
  const decoded = await auth.verifyIdToken(token, true);
  const user = await auth.getUser(decoded.uid);

  return {
    authType: "firebase",
    token,
    uid: decoded.uid,
    user: {
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
      providerData: user.providerData.map((provider) => ({
        providerId: provider.providerId,
      })),
      uid: user.uid,
    },
  };
}
