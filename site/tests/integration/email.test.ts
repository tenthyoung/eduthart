import { afterEach, describe, expect, test } from "vitest";

import { POST as contactRoute } from "@/app/api/contact/route";
import {
  EmailNotConfiguredError,
  isEmailConfigured,
  sendEmail,
  setEmailBindingForTesting,
} from "@/lib/email/send";
import { sendNotificationEmail } from "@/lib/notifications/email";

import { callRoute, type RouteHandler } from "./support/routes";

type SentMessage = Parameters<
  NonNullable<Parameters<typeof setEmailBindingForTesting>[0]>["send"]
>[0];

/** A stand-in for the Cloudflare send_email binding that records each send. */
function fakeBinding(options: { fail?: boolean } = {}) {
  const sent: SentMessage[] = [];
  setEmailBindingForTesting({
    async send(message) {
      if (options.fail) {
        throw Object.assign(new Error("Daily limit reached"), {
          code: "E_DAILY_LIMIT_EXCEEDED",
        });
      }
      sent.push(message);
      return { messageId: `msg-${sent.length}` };
    },
  });
  return sent;
}

const contact = contactRoute as unknown as RouteHandler;

afterEach(() => setEmailBindingForTesting(undefined));

describe("sending email through Cloudflare", () => {
  test("is off outside a Worker, where there is no binding", async () => {
    expect(isEmailConfigured()).toBe(false);
    await expect(sendEmail({ to: "a@example.com", subject: "Hi" })).rejects
      .toBeInstanceOf(EmailNotConfiguredError);
  });

  test("always sends from support@ with the given display name", async () => {
    const sent = fakeBinding();

    const result = await sendEmail({
      fromName: "EduthArt Support",
      subject: "Hello",
      text: "Body",
      to: "  buyer@example.com ",
    });

    expect(result.messageId).toBe("msg-1");
    expect(sent[0]).toMatchObject({
      from: { email: "support@eduthart.com", name: "EduthArt Support" },
      subject: "Hello",
      to: ["buyer@example.com"],
    });
  });

  test("a notification email is skipped, not thrown, when sending fails", async () => {
    fakeBinding({ fail: true });

    await expect(
      sendNotificationEmail("buyer@example.com", {
        body: "Your parcel is on its way.",
        emailSubject: "Your artwork has shipped",
        kind: "order_shipped",
        title: "Shipped",
      } as Parameters<typeof sendNotificationEmail>[1])
    ).resolves.toBe(false);
  });
});

describe("contact form", () => {
  const message = {
    email: "collector@example.com",
    message: "Is <b>this</b> piece framed?",
    name: "Ada <script>",
  };

  test("emails the team with a reply-to of the person who wrote", async () => {
    const sent = fakeBinding();

    const { status } = await callRoute(contact, { body: message });

    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["support@eduthart.com"]);
    expect(sent[0].replyTo).toEqual({
      email: "collector@example.com",
      name: "Ada <script>",
    });
    // What the person typed is escaped, never rendered as markup.
    expect(sent[0].html).toContain("Is &lt;b&gt;this&lt;/b&gt; piece framed?");
    expect(sent[0].html).not.toContain("<script>");
    expect(sent[0].text).toContain("Is <b>this</b> piece framed?");
  });

  test("reports a failure when the email can't be sent", async () => {
    fakeBinding({ fail: true });

    const { status, body } = await callRoute<{ error: string }>(contact, {
      body: message,
    });

    expect(status).toBe(500);
    expect(body.error).toMatch(/try again/i);
  });
});
