/* eslint-disable @typescript-eslint/no-explicit-any -- request bodies are asserted loosely */
import { SignJWT, exportPKCS8, generateKeyPair, importPKCS8 } from "jose";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import { Auth, resetCertCache } from "@/lib/firebase/auth-rest";
import {
  getAccessToken,
  resetAccessTokenCache,
} from "@/lib/firebase/google-auth";

/**
 * Token verification and the account calls, against a fake Google. A real
 * X.509 certificate is what jose's importX509 reads, so one is generated
 * with openssl (present on macOS and the CI image) and served as Google would.
 */

import { createPrivateKey } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT = "demo-project";
let privateKey: CryptoKey;
let certPem: string;

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), "auth-rest-"));
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "2",
      "-subj",
      "/CN=test",
      "-keyout",
      join(dir, "k.pem"),
      "-out",
      join(dir, "c.pem"),
    ],
    { stdio: "ignore" }
  );
  certPem = readFileSync(join(dir, "c.pem"), "utf8");
  const pk = createPrivateKey(readFileSync(join(dir, "k.pem")));
  privateKey = await importPKCS8(
    pk.export({ type: "pkcs8", format: "pem" }) as string,
    "RS256"
  );
});

beforeEach(() => {
  resetCertCache();
  resetAccessTokenCache();
});

type Call = { url: string; body?: any };

function makeAuth(users: Record<string, unknown>[] = []) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    });
    if (
      url.includes("securetoken@system") ||
      url.includes("relyingparty/publicKeys")
    ) {
      return Response.json(
        { k1: certPem },
        { headers: { "cache-control": "max-age=300" } }
      );
    }
    if (url.endsWith(":createSessionCookie")) {
      return Response.json({ sessionCookie: "cookie-jwt" });
    }
    if (url.endsWith("/accounts:lookup")) {
      return Response.json({ users });
    }
    return Response.json({});
  }) as unknown as typeof fetch;

  return {
    calls,
    auth: new Auth({
      projectId: PROJECT,
      getToken: async () => "tok",
      fetchImpl,
    }),
  };
}

function sign(
  claims: Record<string, unknown>,
  issuer: string,
  expSeconds = 3600
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ auth_time: now - 10, ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setSubject("user-1")
    .setIssuer(issuer)
    .setAudience(PROJECT)
    .setIssuedAt(now - 10)
    .setExpirationTime(now + expSeconds)
    .sign(privateKey);
}

describe("verifyIdToken", () => {
  test("accepts a valid token and exposes uid", async () => {
    const { auth } = makeAuth();
    const token = await sign(
      { email: "a@b.co" },
      `https://securetoken.google.com/${PROJECT}`
    );
    const decoded = await auth.verifyIdToken(token);
    expect(decoded.uid).toBe("user-1");
    expect(decoded.email).toBe("a@b.co");
  });

  test("rejects the wrong issuer", async () => {
    const { auth } = makeAuth();
    const token = await sign({}, "https://securetoken.google.com/other");
    await expect(auth.verifyIdToken(token)).rejects.toMatchObject({
      code: "auth/argument-error",
    });
  });

  test("reports expiry distinctly", async () => {
    const { auth } = makeAuth();
    const token = await sign(
      {},
      `https://securetoken.google.com/${PROJECT}`,
      -100
    );
    await expect(auth.verifyIdToken(token)).rejects.toMatchObject({
      code: "auth/id-token-expired",
    });
  });

  test("rejects an unknown signing key", async () => {
    const { auth } = makeAuth();
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ auth_time: now })
      .setProtectedHeader({ alg: "RS256", kid: "other" })
      .setSubject("u")
      .setIssuer(`https://securetoken.google.com/${PROJECT}`)
      .setAudience(PROJECT)
      .setExpirationTime(now + 60)
      .sign(privateKey);
    await expect(auth.verifyIdToken(token)).rejects.toMatchObject({
      code: "auth/argument-error",
    });
  });

  test("checkRevoked rejects tokens issued before validSince", async () => {
    const now = Math.floor(Date.now() / 1000);
    const { auth } = makeAuth([
      { localId: "user-1", validSince: String(now + 100) },
    ]);
    const token = await sign({}, `https://securetoken.google.com/${PROJECT}`);
    await expect(auth.verifyIdToken(token, true)).rejects.toMatchObject({
      code: "auth/id-token-revoked",
    });
  });

  test("checkRevoked rejects disabled users and passes healthy ones", async () => {
    const token = await sign({}, `https://securetoken.google.com/${PROJECT}`);
    const disabled = makeAuth([{ localId: "user-1", disabled: true }]);
    await expect(
      disabled.auth.verifyIdToken(token, true)
    ).rejects.toMatchObject({ code: "auth/user-disabled" });

    const ok = makeAuth([{ localId: "user-1" }]);
    await expect(ok.auth.verifyIdToken(token, true)).resolves.toMatchObject({
      uid: "user-1",
    });
  });

  test("certificates are cached between calls", async () => {
    const { auth, calls } = makeAuth();
    const token = await sign({}, `https://securetoken.google.com/${PROJECT}`);
    await auth.verifyIdToken(token);
    await auth.verifyIdToken(token);
    expect(
      calls.filter((c) => c.url.includes("securetoken@system"))
    ).toHaveLength(1);
  });
});

describe("verifySessionCookie", () => {
  test("uses the session issuer and cookie certs", async () => {
    const { auth, calls } = makeAuth();
    const cookie = await sign(
      {},
      `https://session.firebase.google.com/${PROJECT}`
    );
    await expect(auth.verifySessionCookie(cookie)).resolves.toMatchObject({
      uid: "user-1",
    });
    expect(calls[0].url).toContain("relyingparty/publicKeys");

    const idToken = await sign({}, `https://securetoken.google.com/${PROJECT}`);
    await expect(auth.verifySessionCookie(idToken)).rejects.toThrow();
  });
});

describe("account calls", () => {
  test("getUser maps the REST record", async () => {
    const { auth, calls } = makeAuth([
      {
        localId: "u9",
        email: "x@y.z",
        displayName: "X",
        photoUrl: "http://p",
        customAttributes: '{"admin":true}',
        validSince: "1700000000",
        providerUserInfo: [{ providerId: "google.com" }],
      },
    ]);
    const user = await auth.getUser("u9");

    expect(calls[0].url).toBe(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`
    );
    expect(user).toMatchObject({
      uid: "u9",
      email: "x@y.z",
      displayName: "X",
      photoURL: "http://p",
      disabled: false,
      customClaims: { admin: true },
      providerData: [{ providerId: "google.com" }],
    });
    expect(new Date(user.tokensValidAfterTime!).getTime()).toBe(
      1_700_000_000_000
    );
  });

  test("a missing user throws auth/user-not-found", async () => {
    const { auth } = makeAuth([]);
    await expect(auth.getUserByEmail("no@one.co")).rejects.toMatchObject({
      code: "auth/user-not-found",
    });
  });

  test("writes go to the right endpoints", async () => {
    const { auth, calls } = makeAuth([{ localId: "u1" }]);
    await auth.setCustomUserClaims("u1", { admin: true });
    await auth.updateUser("u1", { disabled: true });
    await auth.deleteUser("u1");

    expect(calls[0].url).toMatch(/accounts:update$/);
    expect(calls[0].body).toEqual({
      localId: "u1",
      customAttributes: '{"admin":true}',
    });
    expect(calls[1].body).toEqual({ localId: "u1", disableUser: true });
    expect(calls[3].url).toMatch(/accounts:delete$/);
  });

  test("createSessionCookie converts ms to seconds", async () => {
    const { auth, calls } = makeAuth();
    const cookie = await auth.createSessionCookie("id-token", {
      expiresIn: 5 * 24 * 3600 * 1000,
    });
    expect(cookie).toBe("cookie-jwt");
    expect(calls[0].body).toEqual({
      idToken: "id-token",
      validDuration: String(5 * 24 * 3600),
    });
  });
});

describe("service account access token", () => {
  test("exchanges a signed JWT and caches the result", async () => {
    const { privateKey: pk } = await generateKeyPair("RS256", {
      extractable: true,
    });
    const pem = await exportPKCS8(pk);
    let hits = 0;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      hits += 1;
      const params = init.body as URLSearchParams;
      expect(params.get("grant_type")).toContain("jwt-bearer");
      expect(params.get("assertion")!.split(".")).toHaveLength(3);
      return Response.json({ access_token: "ya29", expires_in: 3600 });
    }) as unknown as typeof fetch;

    const account = {
      clientEmail: "sa@x.iam",
      privateKey: pem,
      projectId: PROJECT,
    };
    expect(await getAccessToken(account, fetchImpl)).toBe("ya29");
    expect(await getAccessToken(account, fetchImpl)).toBe("ya29");
    expect(hits).toBe(1);
  });
});
