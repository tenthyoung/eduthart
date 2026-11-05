/**
 * A small Firestore client over the REST API, shaped like the slice of
 * `firebase-admin/firestore` this codebase uses.
 *
 * Why it exists: the Admin SDK loads protobufjs, which compiles code with
 * `new Function`, and Cloudflare Workers forbid that. REST needs only `fetch`.
 *
 * Supported: collection / doc / subcollections, get, set (replace or merge),
 * update, delete, add, and queries with where (== < <= > >= != in
 * array-contains), orderBy, limit. FieldValue.increment / delete /
 * serverTimestamp. Not supported, and failing loudly if reached: transactions,
 * batches, listeners, collection groups.
 */

/* ------------------------------ Timestamp ------------------------------ */

export class Timestamp {
  // Underscored names match the Admin SDK's own JSON shape.
  readonly _seconds: number;
  readonly _nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this._seconds = seconds;
    this._nanoseconds = nanoseconds;
  }

  get seconds() {
    return this._seconds;
  }

  get nanoseconds() {
    return this._nanoseconds;
  }

  static now() {
    return Timestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date) {
    return Timestamp.fromMillis(date.getTime());
  }

  static fromMillis(millis: number) {
    const seconds = Math.floor(millis / 1000);
    return new Timestamp(seconds, Math.round((millis - seconds * 1000) * 1e6));
  }

  toDate() {
    return new Date(this.toMillis());
  }

  toMillis() {
    return this._seconds * 1000 + Math.floor(this._nanoseconds / 1e6);
  }

  toISOString() {
    const base = new Date(this._seconds * 1000).toISOString().slice(0, 19);
    const nanos = String(this._nanoseconds).padStart(9, "0");
    return `${base}.${nanos}Z`;
  }

  static fromISOString(value: string) {
    const match = /^(.*?)(?:\.(\d{1,9}))?(Z|[+-]\d\d:\d\d)$/.exec(value);
    if (!match) {
      throw new Error(`Invalid timestamp: ${value}`);
    }
    const whole = Date.parse(`${match[1]}${match[3]}`);
    const nanos = match[2] ? Number(match[2].padEnd(9, "0")) : 0;
    return new Timestamp(Math.floor(whole / 1000), nanos);
  }

  isEqual(other: Timestamp) {
    return (
      this._seconds === other._seconds &&
      this._nanoseconds === other._nanoseconds
    );
  }
}

/* ------------------------------ FieldValue ----------------------------- */

type Sentinel =
  | { kind: "increment"; amount: number }
  | { kind: "delete" }
  | { kind: "serverTimestamp" };

export class FieldValue {
  /** @internal */
  readonly sentinel: Sentinel;

  private constructor(sentinel: Sentinel) {
    this.sentinel = sentinel;
  }

  static increment(amount: number) {
    return new FieldValue({ kind: "increment", amount });
  }

  static delete() {
    return new FieldValue({ kind: "delete" });
  }

  static serverTimestamp() {
    return new FieldValue({ kind: "serverTimestamp" });
  }
}

/* ------------------------------ Encoding ------------------------------- */

type FirestoreValue = Record<string, unknown>;
type FirestoreFields = Record<string, FirestoreValue>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function encodeValue(value: unknown): FirestoreValue {
  if (value === null) {
    return { nullValue: null };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (value instanceof Timestamp) {
    return { timestampValue: value.toISOString() };
  }
  if (value instanceof Date) {
    return { timestampValue: Timestamp.fromDate(value).toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value
          .filter((item) => item !== undefined)
          .map((item) => encodeValue(item)),
      },
    };
  }
  if (value instanceof FieldValue) {
    throw new Error("FieldValue sentinels are only allowed as field values.");
  }
  if (isPlainObject(value)) {
    return { mapValue: { fields: encodeFields(value) } };
  }
  throw new Error(`Unsupported Firestore value: ${String(value)}`);
}

/** Encode a map, dropping `undefined` fields as the Admin SDK is configured to. */
function encodeFields(data: Record<string, unknown>): FirestoreFields {
  const fields: FirestoreFields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value instanceof FieldValue) {
      continue;
    }
    fields[key] = encodeValue(value);
  }
  return fields;
}

export function decodeValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) {
    return Timestamp.fromISOString(String(value.timestampValue));
  }
  if ("referenceValue" in value) return String(value.referenceValue);
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] }).values;
    return (values ?? []).map(decodeValue);
  }
  if ("mapValue" in value) {
    return decodeFields(
      (value.mapValue as { fields?: FirestoreFields }).fields
    );
  }
  return undefined;
}

function decodeFields(fields: FirestoreFields | undefined) {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    data[key] = decodeValue(value);
  }
  return data;
}

/* ------------------------------ Field paths ---------------------------- */

const SIMPLE_SEGMENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function quoteSegment(segment: string) {
  return SIMPLE_SEGMENT.test(segment)
    ? segment
    : `\`${segment.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
}

function fieldPath(path: string) {
  return path.split(".").map(quoteSegment).join(".");
}

type Collected = {
  fields: Record<string, unknown>;
  maskPaths: string[];
  transforms: Record<string, unknown>[];
};

/**
 * Walk a data object for a merge write. Plain objects merge key by key (that is
 * what `set(..., {merge: true})` does); anything else is a leaf.
 */
function collectMerge(
  data: Record<string, unknown>,
  prefix: string[] = [],
  out: Collected = { fields: {}, maskPaths: [], transforms: [] },
  target: Record<string, unknown> = out.fields
) {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const path = [...prefix, key];
    const joined = path.map(quoteSegment).join(".");

    if (value instanceof FieldValue) {
      addSentinel(out, joined, value.sentinel);
      continue;
    }

    if (isPlainObject(value) && Object.keys(value).length > 0) {
      const child: Record<string, unknown> = {};
      target[key] = child;
      collectMerge(value, path, out, child);
      if (Object.keys(child).length === 0) {
        delete target[key];
      }
      continue;
    }

    target[key] = value;
    out.maskPaths.push(joined);
  }
  return out;
}

function addSentinel(out: Collected, path: string, sentinel: Sentinel) {
  switch (sentinel.kind) {
    case "delete":
      // In the mask, absent from the fields: that is how REST deletes a field.
      out.maskPaths.push(path);
      break;
    case "increment":
      out.transforms.push({
        fieldPath: path,
        increment: encodeValue(sentinel.amount),
      });
      break;
    case "serverTimestamp":
      out.transforms.push({
        fieldPath: path,
        setToServerTimestamp: "REQUEST_TIME",
      });
      break;
  }
}

/** Sentinels anywhere in a full-replace `set`, outside merge. */
function collectReplace(data: Record<string, unknown>) {
  const out: Collected = { fields: {}, maskPaths: [], transforms: [] };

  const walk = (node: Record<string, unknown>, prefix: string[]) => {
    for (const [key, value] of Object.entries(node)) {
      if (value instanceof FieldValue) {
        if (value.sentinel.kind === "delete") {
          throw new Error(
            "FieldValue.delete() needs set(..., {merge:true}) or update()."
          );
        }
        addSentinel(
          out,
          [...prefix, key].map(quoteSegment).join("."),
          value.sentinel
        );
      } else if (isPlainObject(value)) {
        walk(value, [...prefix, key]);
      }
    }
  };
  walk(data, []);
  return out;
}

/* ------------------------------ Transport ------------------------------ */

export type FirestoreConfig = {
  projectId: string;
  databaseId?: string;
  /** Resolves a bearer token, or null for the emulator. */
  getToken: () => Promise<string | null>;
  /** Override for the emulator: e.g. "http://127.0.0.1:8080". */
  emulatorHost?: string;
  fetchImpl?: typeof fetch;
};

export class FirestoreError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "FirestoreError";
    this.code = code;
  }
}

const AUTO_ID_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function autoId() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => AUTO_ID_CHARS[byte % 62]).join("");
}

/* ----------------------------- Snapshots ------------------------------- */

export class DocumentSnapshot {
  readonly ref: DocumentReference;
  readonly exists: boolean;
  private readonly fields: Record<string, unknown> | undefined;

  constructor(ref: DocumentReference, fields?: Record<string, unknown>) {
    this.ref = ref;
    this.fields = fields;
    this.exists = fields !== undefined;
  }

  get id() {
    return this.ref.id;
  }

  data(): Record<string, unknown> | undefined {
    return this.fields;
  }

  get(path: string): unknown {
    return path
      .split(".")
      .reduce<unknown>(
        (value, segment) =>
          value && typeof value === "object"
            ? (value as Record<string, unknown>)[segment]
            : undefined,
        this.fields
      );
  }
}

/** A snapshot known to exist, so `data()` is never undefined. */
export class QueryDocumentSnapshot extends DocumentSnapshot {
  data(): Record<string, unknown> {
    return super.data() as Record<string, unknown>;
  }
}

export class QuerySnapshot {
  readonly docs: QueryDocumentSnapshot[];

  constructor(docs: QueryDocumentSnapshot[]) {
    this.docs = docs;
  }

  get empty() {
    return this.docs.length === 0;
  }

  get size() {
    return this.docs.length;
  }

  forEach(callback: (doc: QueryDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

/* ------------------------------- Firestore ----------------------------- */

type WhereOp = "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "array-contains";

const OPERATORS: Record<WhereOp, string> = {
  "==": "EQUAL",
  "!=": "NOT_EQUAL",
  "<": "LESS_THAN",
  "<=": "LESS_THAN_OR_EQUAL",
  ">": "GREATER_THAN",
  ">=": "GREATER_THAN_OR_EQUAL",
  in: "IN",
  "array-contains": "ARRAY_CONTAINS",
};

export class Firestore {
  private readonly config: FirestoreConfig;

  constructor(config: FirestoreConfig) {
    this.config = config;
  }

  collection(path: string) {
    return new CollectionReference(this, path);
  }

  doc(path: string) {
    return new DocumentReference(this, path);
  }

  batch(): never {
    throw new Error("Firestore batches are not supported by the REST client.");
  }

  runTransaction(): never {
    throw new Error(
      "Firestore transactions are not supported by the REST client."
    );
  }

  /** @internal */
  get databasePath() {
    const { projectId, databaseId = "(default)" } = this.config;
    return `projects/${projectId}/databases/${databaseId}`;
  }

  /** @internal */
  documentName(path: string) {
    return `${this.databasePath}/documents/${path}`;
  }

  /** @internal */
  async request<T>(
    method: "GET" | "POST",
    suffix: string,
    body?: unknown,
    options: { allowNotFound?: boolean } = {}
  ): Promise<T | null> {
    const host = this.config.emulatorHost ?? "https://firestore.googleapis.com";
    const url = `${host}/v1/${this.databasePath}/documents${suffix}`;
    const token = await this.config.getToken();
    const fetchImpl = this.config.fetchImpl ?? fetch;

    const response = await fetchImpl(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 404 && options.allowNotFound) {
      return null;
    }

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | { error?: { message?: string } }[]
        | null;
      const message = Array.isArray(detail)
        ? detail[0]?.error?.message
        : detail?.error?.message;
      throw new FirestoreError(
        response.status,
        `Firestore ${response.status}: ${message ?? response.statusText}`
      );
    }

    return (await response.json()) as T;
  }

  /** @internal */
  async commit(writes: Record<string, unknown>[]) {
    await this.request("POST", ":commit", { writes });
  }
}

export class DocumentReference {
  readonly firestore: Firestore;
  readonly path: string;

  constructor(firestore: Firestore, path: string) {
    this.firestore = firestore;
    this.path = path;
  }

  get id() {
    return this.path.split("/").pop() as string;
  }

  collection(name: string) {
    return new CollectionReference(this.firestore, `${this.path}/${name}`);
  }

  async get() {
    const document = await this.firestore.request<{
      fields?: FirestoreFields;
    }>("GET", `/${this.path}`, undefined, { allowNotFound: true });

    return new DocumentSnapshot(
      this,
      document ? decodeFields(document.fields) : undefined
    );
  }

  async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
    const name = this.firestore.documentName(this.path);

    if (options?.merge) {
      const { fields, maskPaths, transforms } = collectMerge(data);
      await this.firestore.commit([
        {
          update: { name, fields: encodeFields(fields) },
          // Always present: without a mask the write replaces the document.
          updateMask: { fieldPaths: maskPaths },
          ...(transforms.length ? { updateTransforms: transforms } : {}),
        },
      ]);
      return;
    }

    const { transforms } = collectReplace(data);
    await this.firestore.commit([
      {
        update: { name, fields: encodeFields(data) },
        ...(transforms.length ? { updateTransforms: transforms } : {}),
      },
    ]);
  }

  /** Writes only if absent; used by `add`. */
  async create(data: Record<string, unknown>) {
    const { transforms } = collectReplace(data);
    await this.firestore.commit([
      {
        update: {
          name: this.firestore.documentName(this.path),
          fields: encodeFields(data),
        },
        currentDocument: { exists: false },
        ...(transforms.length ? { updateTransforms: transforms } : {}),
      },
    ]);
  }

  /** Keys are field paths ("a.b"); values replace that field wholesale. */
  async update(data: Record<string, unknown>) {
    const fields: Record<string, unknown> = {};
    const maskPaths: string[] = [];
    const transforms: Record<string, unknown>[] = [];

    for (const [path, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const quoted = fieldPath(path);

      if (value instanceof FieldValue) {
        const out: Collected = { fields: {}, maskPaths, transforms };
        addSentinel(out, quoted, value.sentinel);
        continue;
      }

      const segments = path.split(".");
      let cursor = fields;
      segments.slice(0, -1).forEach((segment) => {
        cursor[segment] = (cursor[segment] as Record<string, unknown>) ?? {};
        cursor = cursor[segment] as Record<string, unknown>;
      });
      cursor[segments[segments.length - 1]] = value;
      maskPaths.push(quoted);
    }

    await this.firestore.commit([
      {
        update: {
          name: this.firestore.documentName(this.path),
          fields: encodeFields(fields),
        },
        updateMask: { fieldPaths: maskPaths },
        currentDocument: { exists: true },
        ...(transforms.length ? { updateTransforms: transforms } : {}),
      },
    ]);
  }

  async delete() {
    await this.firestore.commit([
      { delete: this.firestore.documentName(this.path) },
    ]);
  }
}

type Filter = { field: string; op: WhereOp; value: unknown };
type Order = { field: string; direction: "asc" | "desc" };

export class Query {
  protected readonly firestore: Firestore;
  protected readonly collectionPath: string;
  private readonly filters: Filter[];
  private readonly orders: Order[];
  private readonly limitCount: number | null;

  constructor(
    firestore: Firestore,
    collectionPath: string,
    filters: Filter[] = [],
    orders: Order[] = [],
    limitCount: number | null = null
  ) {
    this.firestore = firestore;
    this.collectionPath = collectionPath;
    this.filters = filters;
    this.orders = orders;
    this.limitCount = limitCount;
  }

  where(field: string, op: WhereOp, value: unknown) {
    if (!(op in OPERATORS)) {
      throw new Error(`Unsupported where operator: ${op}`);
    }
    return new Query(
      this.firestore,
      this.collectionPath,
      [...this.filters, { field, op, value }],
      this.orders,
      this.limitCount
    );
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    return new Query(
      this.firestore,
      this.collectionPath,
      this.filters,
      [...this.orders, { field, direction }],
      this.limitCount
    );
  }

  limit(count: number) {
    return new Query(
      this.firestore,
      this.collectionPath,
      this.filters,
      this.orders,
      count
    );
  }

  /** @internal Exposed for tests. */
  toStructuredQuery() {
    const segments = this.collectionPath.split("/");
    const query: Record<string, unknown> = {
      from: [{ collectionId: segments[segments.length - 1] }],
    };

    const filters = this.filters.map((filter) => ({
      fieldFilter: {
        field: { fieldPath: fieldPath(filter.field) },
        op: OPERATORS[filter.op],
        value:
          filter.op === "in"
            ? {
                arrayValue: {
                  values: (filter.value as unknown[]).map(encodeValue),
                },
              }
            : encodeValue(filter.value),
      },
    }));

    if (filters.length === 1) {
      query.where = filters[0];
    } else if (filters.length > 1) {
      query.where = { compositeFilter: { op: "AND", filters } };
    }

    if (this.orders.length) {
      query.orderBy = this.orders.map((order) => ({
        field: { fieldPath: fieldPath(order.field) },
        direction: order.direction === "desc" ? "DESCENDING" : "ASCENDING",
      }));
    }

    if (this.limitCount !== null) {
      query.limit = this.limitCount;
    }

    return query;
  }

  async get() {
    return this.run(this.toStructuredQuery());
  }

  protected async runRaw(structuredQuery: Record<string, unknown>) {
    const segments = this.collectionPath.split("/");
    // A subcollection is queried from its parent document; a root one from
    // the documents root.
    const parent = segments.slice(0, -1).join("/");
    const results = await this.firestore.request<
      { document?: { name: string; fields?: FirestoreFields } }[]
    >("POST", `${parent ? `/${parent}` : ""}:runQuery`, { structuredQuery });

    const prefix = this.firestore.documentName("");
    return (results ?? [])
      .filter((row) => row.document)
      .map((row) => ({
        path: row.document!.name.slice(prefix.length),
        fields: row.document!.fields,
      }));
  }

  private async run(structuredQuery: Record<string, unknown>) {
    const rows = await this.runRaw(structuredQuery);
    return new QuerySnapshot(
      rows.map(
        (row) =>
          new QueryDocumentSnapshot(
            new DocumentReference(this.firestore, row.path),
            decodeFields(row.fields)
          )
      )
    );
  }
}

export class CollectionReference extends Query {
  readonly path: string;

  constructor(firestore: Firestore, path: string) {
    super(firestore, path);
    this.path = path;
  }

  get id() {
    return this.path.split("/").pop() as string;
  }

  doc(id: string = autoId()) {
    return new DocumentReference(this.firestore, `${this.path}/${id}`);
  }

  /** References to every document directly under this collection. */
  async listDocuments() {
    const rows = await this.runRaw({
      from: [{ collectionId: this.id }],
      select: { fields: [{ fieldPath: "__name__" }] },
    });
    return rows.map((row) => new DocumentReference(this.firestore, row.path));
  }

  async add(data: Record<string, unknown>) {
    const ref = this.doc();
    await ref.create(data);
    return ref;
  }
}
