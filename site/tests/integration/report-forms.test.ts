import { afterEach, describe, expect, test, vi } from "vitest";

import { POST as dmcaRoute } from "@/app/api/dmca/route";
import { POST as reportRoute } from "@/app/api/test-content-report/route";
import { setEmailBindingForTesting } from "@/lib/email/send";

import { fakeEmailBinding } from "./support/email";
import { callRoute, type RouteHandler } from "./support/routes";

/**
 * The DMCA and content-report forms, at the point where they email the team.
 *
 * Both routes save the submission first and email second. The email is a
 * courtesy copy, so a refused send must not turn a saved submission into an
 * error: the person would retry and file the same notice twice. These assert
 * on exactly that, with Firestore and the deck-report fan-out replaced by
 * stand-ins, since neither is configured here and neither is what's under test.
 */

const { saved } = vi.hoisted(() => ({
  saved: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminDb: () => ({
    collection: (name: string) => ({
      doc: () => ({
        id: `${name}-1`,
        set: async (data: Record<string, unknown>) => {
          saved.push({ collection: name, ...data });
        },
      }),
    }),
  }),
}));

vi.mock("@/lib/reporting", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/reporting")>()),
  createExternalDeckReports: async () => ["deck-1"],
}));

const dmca = dmcaRoute as unknown as RouteHandler;
const report = reportRoute as unknown as RouteHandler;

const dmcaNotice = {
  accuracy: true,
  contentUrls: "https://eduthart.com/public-decks/deck-1",
  copyrightedWorkDescription: "A series of twelve ink drawings of the harbour.",
  email: "claimant@example.com",
  explanation: "These were lifted from my portfolio site without permission.",
  fullName: "Rosa Claimant",
  goodFaith: true,
  mailingAddress: "1 Harbour Lane",
  phone: "555-0100",
  relationship: "Copyright owner",
  signature: "Rosa Claimant",
};

const contentReport = {
  assessmentType: "Final exam",
  contentUrls: "https://eduthart.com/public-decks/deck-1",
  description: "This is the answer key to a current exam paper.",
  email: "teacher@example.com",
  gradeLevel: "12",
  originalAuthor: "Exam board",
  subject: "Chemistry",
};

afterEach(() => {
  saved.length = 0;
  setEmailBindingForTesting(undefined);
});

describe("DMCA notice", () => {
  test("saves the notice and emails the team, reply-to the claimant", async () => {
    const sent = fakeEmailBinding();

    const { status } = await callRoute(dmca, { body: dmcaNotice });

    expect(status).toBe(200);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      collection: "dmca_notices",
      email: "claimant@example.com",
      urls: ["https://eduthart.com/public-decks/deck-1"],
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      from: { email: "support@eduthart.com", name: "EduthArt Support" },
      replyTo: "claimant@example.com",
      to: ["support@eduthart.com"],
    });
    expect(sent[0].subject).toContain("DMCA notice");
    expect(sent[0].text).toContain("Rosa Claimant");
    expect(sent[0].text).toContain("https://eduthart.com/public-decks/deck-1");
  });

  test("still succeeds when the email is refused, since the notice is saved", async () => {
    fakeEmailBinding({ fail: true });

    const { status } = await callRoute(dmca, { body: dmcaNotice });

    expect(status).toBe(200);
    expect(saved).toHaveLength(1);
  });

  test("still succeeds with no email binding at all", async () => {
    const { status } = await callRoute(dmca, { body: dmcaNotice });

    expect(status).toBe(200);
    expect(saved).toHaveLength(1);
  });

  test("rejects an invalid notice before saving or emailing anything", async () => {
    const sent = fakeEmailBinding();

    const { status } = await callRoute(dmca, {
      body: { ...dmcaNotice, goodFaith: false },
    });

    expect(status).toBe(400);
    expect(saved).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });
});

describe("test content report", () => {
  test("saves the report and emails the team, reply-to the reporter", async () => {
    const sent = fakeEmailBinding();

    const { status } = await callRoute(report, { body: contentReport });

    expect(status).toBe(200);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      collection: "test_content_reports",
      reporterEmail: "teacher@example.com",
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      replyTo: "teacher@example.com",
      to: ["support@eduthart.com"],
    });
    expect(sent[0].subject).toContain("test content report");
    expect(sent[0].text).toContain("Chemistry");
  });

  test("still succeeds when the email is refused, since the report is saved", async () => {
    fakeEmailBinding({ fail: true });

    const { status } = await callRoute(report, { body: contentReport });

    expect(status).toBe(200);
    expect(saved).toHaveLength(1);
  });
});
