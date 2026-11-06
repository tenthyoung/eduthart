import { getCloudflareContext } from "@opennextjs/cloudflare";

import { SUPPORT_EMAIL } from "@/constants/contact.constants";

/**
 * Outgoing email goes through Cloudflare Email Service, reached via the
 * `EMAIL` send_email binding in wrangler.jsonc. eduthart.com is onboarded as a
 * sending domain there, so any recipient is allowed.
 *
 * https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
 */

export type EmailAddress = { email: string; name?: string };

export type OutgoingEmail = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | EmailAddress;
  /** Display name for the sender. The address is always support@. */
  fromName?: string;
};

type SendEmailBinding = {
  send(message: {
    to: string | string[];
    from: string | EmailAddress;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | EmailAddress;
  }): Promise<{ messageId: string }>;
};

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("The EMAIL send_email binding is not available.");
    this.name = "EmailNotConfiguredError";
  }
}

let bindingOverride: SendEmailBinding | null | undefined;

/** Tests swap in a fake binding; pass undefined to go back to the real one. */
export function setEmailBindingForTesting(
  binding: SendEmailBinding | null | undefined
) {
  bindingOverride = binding;
}

function getEmailBinding(): SendEmailBinding | null {
  if (bindingOverride !== undefined) return bindingOverride;

  try {
    const env = getCloudflareContext().env as { EMAIL?: SendEmailBinding };
    return env.EMAIL ?? null;
  } catch {
    // Outside a Worker (plain `next dev`, the test runner) there is no
    // Cloudflare context, so there is nothing to send with.
    return null;
  }
}

export function isEmailConfigured() {
  return getEmailBinding() !== null;
}

/** Where messages for the team (contact form, reports) are delivered. */
export function getTeamInbox() {
  return process.env.CONTACT_EMAIL || SUPPORT_EMAIL;
}

/**
 * Send one email. Throws EmailNotConfiguredError when there is no binding, or
 * the Cloudflare error (with a `.code` such as E_RECIPIENT_SUPPRESSED) when
 * the send is refused, so callers decide whether a failure matters.
 */
export async function sendEmail(email: OutgoingEmail) {
  const binding = getEmailBinding();
  if (!binding) throw new EmailNotConfiguredError();

  const to = (Array.isArray(email.to) ? email.to : [email.to])
    .map((address) => address.trim())
    .filter(Boolean);
  if (to.length === 0)
    throw new Error("An email needs at least one recipient.");

  return binding.send({
    to,
    from: { email: SUPPORT_EMAIL, name: email.fromName ?? "EduthArt" },
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: email.replyTo,
  });
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
