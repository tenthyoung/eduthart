/* eslint-disable @typescript-eslint/no-explicit-any -- request bodies are asserted loosely */
import { describe, expect, test } from "vitest";

import {
  FieldValue,
  Firestore,
  Timestamp,
  decodeValue,
  encodeValue,
} from "@/lib/firebase/firestore-rest";

/**
 * The REST client is the only thing between the app and Firestore on
 * Cloudflare, and there is no emulator in CI, so these pin the wire format:
 * what gets sent for each call, and how responses read back.
 */

type Call = { method: string; url: string; body: any };

function stub(responder: (call: Call) => unknown = () => ({})) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const call = {
      method: init.method ?? "GET",
      url,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
    calls.push(call);
    const result = responder(call);
    return result === null
      ? new Response("{}", { status: 404 })
      : Response.json(result);
  }) as unknown as typeof fetch;

  const db = new Firestore({
    projectId: "demo",
    getToken: async () => "tok",
    fetchImpl,
  });
  return { db, calls };
}

const DOCS = "projects/demo/databases/(default)/documents";

describe("value encoding", () => {
  test("round-trips every supported type", () => {
    const value = {
      s: "x",
      i: 3,
      d: 1.5,
      b: true,
      n: null,
      t: Timestamp.fromMillis(1_700_000_000_123),
      a: [1, "two", { three: 3 }],
      m: { nested: { deep: "yes" } },
    };
    const decoded = decodeValue(encodeValue(value)) as typeof value;

    expect(decoded.t.toMillis()).toBe(1_700_000_000_123);
    expect({ ...decoded, t: null }).toEqual({ ...value, t: null });
  });

  test("sends integers as strings and fractions as doubles", () => {
    expect(encodeValue(7)).toEqual({ integerValue: "7" });
    expect(encodeValue(0.5)).toEqual({ doubleValue: 0.5 });
  });

  test("drops undefined fields instead of failing", () => {
    expect(encodeValue({ a: 1, b: undefined })).toEqual({
      mapValue: { fields: { a: { integerValue: "1" } } },
    });
  });

  test("keeps nanosecond precision on timestamps", () => {
    const ts = decodeValue({
      timestampValue: "2026-11-05T10:00:00.123456789Z",
    }) as Timestamp;
    expect(ts.nanoseconds).toBe(123456789);
    expect(ts.toISOString()).toBe("2026-11-05T10:00:00.123456789Z");
  });
});

describe("documents", () => {
  test("get returns data, and exists=false on 404", async () => {
    const { db, calls } = stub((call) =>
      call.url.endsWith("/users/u1")
        ? { fields: { name: { stringValue: "Ada" } } }
        : null
    );

    const hit = await db.collection("users").doc("u1").get();
    expect(hit.exists).toBe(true);
    expect(hit.data()).toEqual({ name: "Ada" });
    expect(calls[0].url).toBe(
      `https://firestore.googleapis.com/v1/${DOCS}/users/u1`
    );

    const miss = await db.collection("users").doc("nope").get();
    expect(miss.exists).toBe(false);
    expect(miss.data()).toBeUndefined();
  });

  test("set replaces: no update mask", async () => {
    const { db, calls } = stub();
    await db.collection("users").doc("u1").set({ a: 1 });

    const write = calls[0].body.writes[0];
    expect(calls[0].url).toContain(":commit");
    expect(write.update.name).toBe(`${DOCS}/users/u1`);
    expect(write.updateMask).toBeUndefined();
  });

  test("set merge masks only the leaf fields it was given", async () => {
    const { db, calls } = stub();
    await db
      .collection("users")
      .doc("u1")
      .set({ a: 1, profile: { city: "Oslo" }, "odd key": 2 }, { merge: true });

    expect(calls[0].body.writes[0].updateMask.fieldPaths.sort()).toEqual(
      ["`odd key`", "a", "profile.city"].sort()
    );
  });

  test("merge with only an increment still sends a mask, so nothing is wiped", async () => {
    const { db, calls } = stub();
    await db
      .collection("favorites")
      .doc("art1")
      .set({ saveCount: FieldValue.increment(1) }, { merge: true });

    const write = calls[0].body.writes[0];
    expect(write.updateMask).toEqual({ fieldPaths: [] });
    expect(write.update.fields).toEqual({});
    expect(write.updateTransforms).toEqual([
      { fieldPath: "saveCount", increment: { integerValue: "1" } },
    ]);
  });

  test("FieldValue.delete masks the field without a value", async () => {
    const { db, calls } = stub();
    await db
      .collection("users")
      .doc("u1")
      .set({ old: FieldValue.delete(), keep: "x" }, { merge: true });

    const write = calls[0].body.writes[0];
    expect(write.updateMask.fieldPaths.sort()).toEqual(["keep", "old"]);
    expect(write.update.fields).toEqual({ keep: { stringValue: "x" } });
  });

  test("update requires the document to exist and nests dotted paths", async () => {
    const { db, calls } = stub();
    await db.collection("users").doc("u1").update({ "a.b": 1 });

    const write = calls[0].body.writes[0];
    expect(write.currentDocument).toEqual({ exists: true });
    expect(write.updateMask.fieldPaths).toEqual(["a.b"]);
    expect(write.update.fields.a.mapValue.fields.b).toEqual({
      integerValue: "1",
    });
  });

  test("add creates with a generated id and refuses to overwrite", async () => {
    const { db, calls } = stub();
    const ref = await db.collection("reports").add({ ok: true });

    expect(ref.id).toMatch(/^[A-Za-z0-9]{20}$/);
    const write = calls[0].body.writes[0];
    expect(write.currentDocument).toEqual({ exists: false });
    expect(write.update.name).toBe(`${DOCS}/reports/${ref.id}`);
  });

  test("delete sends a delete write", async () => {
    const { db, calls } = stub();
    await db.collection("users").doc("u1").delete();
    expect(calls[0].body.writes[0]).toEqual({ delete: `${DOCS}/users/u1` });
  });

  test("failures carry Firestore's own message", async () => {
    const fetchImpl = (async () =>
      Response.json(
        { error: { message: "Missing or insufficient permissions." } },
        { status: 403 }
      )) as unknown as typeof fetch;
    const db = new Firestore({
      projectId: "demo",
      getToken: async () => null,
      fetchImpl,
    });

    await expect(db.collection("a").doc("b").get()).rejects.toThrow(
      /403: Missing or insufficient permissions/
    );
  });
});

describe("queries", () => {
  test("builds filters, ordering and limit", async () => {
    const { db, calls } = stub(() => [
      {
        document: {
          name: `${DOCS}/users/u2`,
          fields: { usernameLower: { stringValue: "ada" } },
        },
      },
      { readTime: "2026-11-05T00:00:00Z" },
    ]);

    const snapshot = await db
      .collection("users")
      .where("usernameLower", ">=", "a")
      .where("usernameLower", "<=", "a")
      .orderBy("updatedAt", "desc")
      .limit(20)
      .get();

    expect(calls[0].url).toBe(
      `https://firestore.googleapis.com/v1/${DOCS}:runQuery`
    );
    const query = calls[0].body.structuredQuery;
    expect(query.from).toEqual([{ collectionId: "users" }]);
    expect(query.where.compositeFilter.op).toBe("AND");
    expect(
      query.where.compositeFilter.filters.map((f: any) => f.fieldFilter.op)
    ).toEqual(["GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL"]);
    expect(query.orderBy).toEqual([
      { field: { fieldPath: "updatedAt" }, direction: "DESCENDING" },
    ]);
    expect(query.limit).toBe(20);

    expect(snapshot.size).toBe(1);
    expect(snapshot.docs[0].id).toBe("u2");
    expect(snapshot.docs[0].ref.path).toBe("users/u2");
    expect(snapshot.empty).toBe(false);
  });

  test("a single filter is not wrapped in a composite", async () => {
    const { db, calls } = stub(() => []);
    await db.collection("x").where("status", "==", "open").get();
    expect(calls[0].body.structuredQuery.where.fieldFilter.op).toBe("EQUAL");
  });

  test("subcollections are queried from their parent document", async () => {
    const { db, calls } = stub(() => []);
    const snapshot = await db
      .collection("users")
      .doc("u1")
      .collection("decks")
      .where("a", "==", 1)
      .get();

    expect(calls[0].url).toBe(
      `https://firestore.googleapis.com/v1/${DOCS}/users/u1:runQuery`
    );
    expect(calls[0].body.structuredQuery.from).toEqual([
      { collectionId: "decks" },
    ]);
    expect(snapshot.empty).toBe(true);
  });

  test("listDocuments returns refs for deletion", async () => {
    const { db } = stub(() => [
      { document: { name: `${DOCS}/users/u1/decks/d1` } },
      { document: { name: `${DOCS}/users/u1/decks/d2` } },
    ]);
    const refs = await db
      .collection("users")
      .doc("u1")
      .collection("decks")
      .listDocuments();
    expect(refs.map((ref) => ref.path)).toEqual([
      "users/u1/decks/d1",
      "users/u1/decks/d2",
    ]);
  });
});
