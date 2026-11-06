import { getCloudflareContext } from "@opennextjs/cloudflare";

import { SUPPORT_EMAIL } from "@/constants/contact.constants";

/**
 * Outbound email goes through Cloudflare Email Service, via the `EMAIL`
 * send_email binding declared in wrangler.jsonc. There is no API key: the
 * binding is the credential, and the sender must sit on a domain onboarded in
 * Email Service (Compute > Email Service > Email Sending).
 *
 * https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
 */

type EmailAddress = { email: string; name?: string };

export type OutgoingEmail = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  /** Display name for the sender; the address is always SUPPORT_EMAIL. */
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
    super(
      "Email is not configured: the EMAIL send_email binding is missing. " +
        "It exists only on the deployed Worker (or `npm run preview`), not under `next dev`."
    );
    this.name = "EmailNotConfiguredError";
  }
}

/**
 * The binding, or null where there is none — `next dev` and the test runner
 * have no Workers context, so getCloudflareContext throws there.
 */
function getEmailBinding(): SendEmailBinding | null {
  try {
    const env = getCloudflareContext().env as { EMAIL?: SendEmailBinding };
    return env.EMAIL ?? null;
  } catch {
    return null;
  }
}

export function isEmailConfigured() {
  return getEmailBinding() !== null;
}

/**
 * Send one email. Throws EmailNotConfiguredError when there is no binding, and
 * passes Cloudflare's errors through (they carry a `.code` such as
 * E_SENDER_NOT_VERIFIED), so each caller decides whether a failed send is fatal.
 */
export async function sendEmail(message: OutgoingEmail) {
  const binding = getEmailBinding();
  if (!binding) {
    throw new EmailNotConfiguredError();
  }

  return binding.send({
    to: message.to,
    from: { email: SUPPORT_EMAIL, name: message.fromName ?? "EduthArt" },
    subject: message.subject,
    html: message.html,
    text: message.text,
    replyTo: message.replyTo,
  });
}
