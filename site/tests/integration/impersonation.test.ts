import type { DecodedIdToken } from "firebase-admin/auth";
import { beforeEach, describe, expect, test, vi } from "vitest";

const roles = new Map<string, { active: boolean; role: string }>();
const users = new Map<string, { email: string; customClaims?: object }>();
const audit: Array<Record<string, unknown>> = [];
const createCustomToken = vi.fn(
  async (uid: string, claims?: object) =>
    `token:${uid}:${JSON.stringify(claims ?? {})}`
);
let actorIsSuper = false;

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminAuth: () => ({
    createCustomToken,
    getUser: async (uid: string) => {
      const user = users.get(uid);
      if (!user) throw new Error("no user");
      return { uid, ...user };
    },
  }),
  getFirebaseAdminDb: () => ({
    collection: (name: string) => ({
      add: async (entry: Record<string, unknown>) => {
        if (name === "admin_audit_log") audit.push(entry);
      },
      doc: (uid: string) => ({
        get: async () => ({
          exists: roles.has(uid),
          data: () => roles.get(uid),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/admin/server", async () => {
  class AdminRouteError extends Error {
    constructor(
      readonly code: string,
      message: string,
      readonly status = 500
    ) {
      super(message);
    }
  }
  return {
    AdminRouteError,
    requireAdmin: async (token: DecodedIdToken) => ({
      uid: token.uid,
      isSuperAdmin: actorIsSuper,
      role: actorIsSuper ? "super_admin" : "admin",
    }),
  };
});

import {
  startImpersonation,
  stopImpersonation,
} from "@/lib/admin/impersonation";

const actor = { uid: "admin-1", email: "a@x.com" } as DecodedIdToken;

beforeEach(() => {
  roles.clear();
  users.clear();
  audit.length = 0;
  createCustomToken.mockClear();
  actorIsSuper = false;
  users.set("user-1", { email: "u@x.com" });
});

describe("impersonation", () => {
  test("mints a token for the target tagged with the admin", async () => {
    const result = await startImpersonation(actor, "user-1");

    expect(createCustomToken).toHaveBeenCalledWith("user-1", {
      impersonatedBy: "admin-1",
    });
    expect(result.target.email).toBe("u@x.com");
    expect(audit[0]).toMatchObject({
      action: "impersonation_started",
      actorUid: "admin-1",
      targetUid: "user-1",
    });
  });

  test("refuses to ghost yourself or a missing user", async () => {
    await expect(startImpersonation(actor, "admin-1")).rejects.toMatchObject({
      status: 400,
    });
    await expect(startImpersonation(actor, "nobody")).rejects.toMatchObject({
      status: 404,
    });
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  test("only a super admin can ghost an admin, and nobody a super admin", async () => {
    users.set("admin-2", { email: "b@x.com" });
    roles.set("admin-2", { active: true, role: "admin" });
    users.set("super-1", { email: "s@x.com" });
    roles.set("super-1", { active: true, role: "super_admin" });

    await expect(startImpersonation(actor, "admin-2")).rejects.toMatchObject({
      status: 403,
    });

    actorIsSuper = true;
    await expect(startImpersonation(actor, "admin-2")).resolves.toBeTruthy();
    await expect(startImpersonation(actor, "super-1")).rejects.toMatchObject({
      status: 403,
    });
  });

  test("a failed check leaves no audit entry and mints no token", async () => {
    users.set("super-1", { email: "s@x.com" });
    roles.set("super-1", { active: true, role: "super_admin" });

    await expect(startImpersonation(actor, "super-1")).rejects.toThrow();
    expect(audit).toHaveLength(0);
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  test("stopping returns a plain token for the admin and logs it", async () => {
    const { token } = await stopImpersonation(actor, "user-1");

    expect(token).toBe("token:admin-1:{}");
    expect(audit[0]).toMatchObject({
      action: "impersonation_ended",
      targetUid: "user-1",
    });
  });
});
