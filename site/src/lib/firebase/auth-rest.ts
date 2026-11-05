import { importX509, jwtVerify, decodeProtectedHeader } from "jose";

/**
 * The slice of `firebase-admin/auth` this codebase uses, over Google's REST
 * APIs and Web Crypto so it runs on Cloudflare Workers.
 *
 * Tokens are verified locally against Google's published certificates (the same
 * thing the Admin SDK does); account reads and writes go through the Identity
 * Toolkit admin endpoints.
 */

export type DecodedIdToken = {
  uid: string;
  sub: string;
  aud: string;
  iss: string;
  iat: number;
  exp: number;
  auth_time: number;
  email?: string;
  email_verified?: boolean;
  [claim: string]: unknown;
};

export type UserRecord = {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  disabled: boolean;
  customClaims?: Record<string, unknown>;
  providerData: { providerId: string }[];
  /** UTC string, as the Admin SDK reports it. */
  tokensValidAfterTime?: string;
};

export class AuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export type AuthConfig = {
  projectId: string;
  getToken: () => Promise<string | null>;
  /** Identity Toolkit base, overridden for the emulator. */
  identityHost?: string;
  fetchImpl?: typeof fetch;
};

const ID_TOKEN_CERTS =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const SESSION_COOKIE_CERTS =
  "https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys";

type CertCache = { certs: Record<string, string>; expiresAt: number };
const certCaches = new Map<string, CertCache>();

export function resetCertCache() {
  certCaches.clear();
}

async function getCerts(url: string, fetchImpl: typeof fetch) {
  const hit = certCaches.get(url);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.certs;
  }

  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new AuthError(
      "auth/internal-error",
      `Could not fetch signing certificates (${response.status}).`
    );
  }

  const maxAge = /max-age=(\d+)/.exec(
    response.headers.get("cache-control") ?? ""
  );
  const certs = (await response.json()) as Record<string, string>;
  certCaches.set(url, {
    certs,
    expiresAt: Date.now() + (maxAge ? Number(maxAge[1]) : 3600) * 1000,
  });

  return certs;
}

export class Auth {
  private readonly config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  private get fetchImpl() {
    return this.config.fetchImpl ?? fetch;
  }

  /* ----------------------------- Verification ---------------------------- */

  private async verifyJwt(
    token: string,
    certsUrl: string,
    issuer: string,
    kind: string
  ): Promise<DecodedIdToken> {
    let kid: string | undefined;
    try {
      kid = decodeProtectedHeader(token).kid;
    } catch {
      throw new AuthError("auth/argument-error", `Malformed ${kind}.`);
    }

    const certs = await getCerts(certsUrl, this.fetchImpl);
    const cert = kid ? certs[kid] : undefined;
    if (!cert) {
      throw new AuthError(
        "auth/argument-error",
        `${kind} has an unknown signing key.`
      );
    }

    try {
      const key = await importX509(cert, "RS256");
      const { payload } = await jwtVerify(token, key, {
        algorithms: ["RS256"],
        issuer,
        audience: this.config.projectId,
      });

      if (typeof payload.sub !== "string" || !payload.sub) {
        throw new Error("missing subject");
      }
      if (
        typeof payload.auth_time !== "number" ||
        payload.auth_time > Date.now() / 1000 + 5
      ) {
        throw new Error("bad auth_time");
      }

      return { ...payload, uid: payload.sub } as DecodedIdToken;
    } catch (error) {
      const expired = (error as { code?: string }).code === "ERR_JWT_EXPIRED";
      throw new AuthError(
        expired
          ? kind === "ID token"
            ? "auth/id-token-expired"
            : "auth/session-cookie-expired"
          : "auth/argument-error",
        `${kind} is not valid: ${(error as Error).message}`
      );
    }
  }

  private async assertNotRevoked(decoded: DecodedIdToken, revokedCode: string) {
    const user = await this.getUser(decoded.uid);
    if (user.disabled) {
      throw new AuthError("auth/user-disabled", "The user is disabled.");
    }
    if (
      user.tokensValidAfterTime &&
      decoded.auth_time * 1000 < Date.parse(user.tokensValidAfterTime)
    ) {
      throw new AuthError(revokedCode, "The credential has been revoked.");
    }
  }

  async verifyIdToken(idToken: string, checkRevoked = false) {
    const decoded = await this.verifyJwt(
      idToken,
      ID_TOKEN_CERTS,
      `https://securetoken.google.com/${this.config.projectId}`,
      "ID token"
    );
    if (checkRevoked) {
      await this.assertNotRevoked(decoded, "auth/id-token-revoked");
    }
    return decoded;
  }

  async verifySessionCookie(sessionCookie: string, checkRevoked = false) {
    const decoded = await this.verifyJwt(
      sessionCookie,
      SESSION_COOKIE_CERTS,
      `https://session.firebase.google.com/${this.config.projectId}`,
      "session cookie"
    );
    if (checkRevoked) {
      await this.assertNotRevoked(decoded, "auth/session-cookie-revoked");
    }
    return decoded;
  }

  /* ------------------------------ Admin calls ---------------------------- */

  private async call<T>(action: string, body: Record<string, unknown>) {
    const host =
      this.config.identityHost ?? "https://identitytoolkit.googleapis.com";
    const token = await this.config.getToken();
    const response = await this.fetchImpl(
      `${host}/v1/projects/${this.config.projectId}${action}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      const message = detail?.error?.message ?? response.statusText;
      throw new AuthError(
        message.startsWith("USER_NOT_FOUND")
          ? "auth/user-not-found"
          : "auth/internal-error",
        `Identity Toolkit ${response.status}: ${message}`
      );
    }

    return (await response.json()) as T;
  }

  private async lookup(query: Record<string, unknown>) {
    const result = await this.call<{ users?: RawUser[] }>(
      "/accounts:lookup",
      query
    );
    const raw = result.users?.[0];
    if (!raw) {
      throw new AuthError(
        "auth/user-not-found",
        "There is no user record for that identifier."
      );
    }
    return toUserRecord(raw);
  }

  getUser(uid: string) {
    return this.lookup({ localId: [uid] });
  }

  getUserByEmail(email: string) {
    return this.lookup({ email: [email] });
  }

  async setCustomUserClaims(
    uid: string,
    claims: Record<string, unknown> | null
  ) {
    await this.call("/accounts:update", {
      localId: uid,
      customAttributes: JSON.stringify(claims ?? {}),
    });
  }

  async updateUser(uid: string, properties: { disabled?: boolean }) {
    await this.call("/accounts:update", {
      localId: uid,
      ...(properties.disabled === undefined
        ? {}
        : { disableUser: properties.disabled }),
    });
    return this.getUser(uid);
  }

  async deleteUser(uid: string) {
    await this.call("/accounts:delete", { localId: uid });
  }

  async createSessionCookie(idToken: string, options: { expiresIn: number }) {
    const result = await this.call<{ sessionCookie: string }>(
      ":createSessionCookie",
      {
        idToken,
        // expiresIn is milliseconds on the Admin SDK; the API wants seconds.
        validDuration: String(Math.floor(options.expiresIn / 1000)),
      }
    );
    return result.sessionCookie;
  }
}

type RawUser = {
  localId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  disabled?: boolean;
  customAttributes?: string;
  validSince?: string;
  providerUserInfo?: { providerId: string }[];
};

function toUserRecord(raw: RawUser): UserRecord {
  let customClaims: Record<string, unknown> | undefined;
  try {
    customClaims = raw.customAttributes
      ? JSON.parse(raw.customAttributes)
      : undefined;
  } catch {
    customClaims = undefined;
  }

  return {
    uid: raw.localId,
    email: raw.email,
    displayName: raw.displayName,
    photoURL: raw.photoUrl,
    disabled: raw.disabled === true,
    customClaims,
    providerData: (raw.providerUserInfo ?? []).map(({ providerId }) => ({
      providerId,
    })),
    tokensValidAfterTime: raw.validSince
      ? new Date(Number(raw.validSince) * 1000).toUTCString()
      : undefined,
  };
}
