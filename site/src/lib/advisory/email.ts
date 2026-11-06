import { Resend } from "resend";

import { SUPPORT_EMAIL } from "@/constants/contact.constants";
import { getSiteUrl } from "@/lib/notifications/email";

/**
 * Email for the art advisory service.
 *
 * Advisory mail goes to people who may not have an account, so it cannot use
 * the notification templates (those are addressed to account holders and
 * carry an account footer). It keeps the same look so a buyer sees one house
 * style.
 */

export type AdvisoryEmail = {
  actionHref?: string | null;
  actionLabel?: string | null;
  body: string;
  replyTo?: string | null;
  subject: string;
  title: string;
  to: string;
};

export function getAdvisoryInboxEmail() {
  return (
    process.env.ADVISORY_EMAIL || process.env.CONTACT_EMAIL || SUPPORT_EMAIL
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toAbsoluteUrl(href: string) {
  return href.startsWith("http")
    ? href
    : `${getSiteUrl()}${href.startsWith("/") ? "" : "/"}${href}`;
}

export function renderAdvisoryEmail(email: AdvisoryEmail) {
  const action =
    email.actionHref && email.actionLabel
      ? `<p style="margin:28px 0 0"><a href="${escapeHtml(toAbsoluteUrl(email.actionHref))}" style="background:#111111;border-radius:999px;color:#ffffff;display:inline-block;font-size:15px;font-weight:600;padding:13px 26px;text-decoration:none">${escapeHtml(email.actionLabel)}</a></p>`
      : "";

  return `<!DOCTYPE html>
<html>
<body style="background:#f5f5f5;margin:0;padding:32px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="background:#ffffff;border-radius:20px;margin:0 auto;max-width:560px;overflow:hidden">
    <div style="border-bottom:1px solid #eeeeee;padding:26px 32px">
      <span style="color:#111111;font-size:19px;font-weight:700;letter-spacing:0.02em">eduthart</span>
    </div>
    <div style="padding:32px">
      <h1 style="color:#111111;font-size:22px;line-height:1.35;margin:0 0 14px">${escapeHtml(email.title)}</h1>
      <p style="color:#555555;font-size:15px;line-height:1.7;margin:0;white-space:pre-line">${escapeHtml(email.body)}</p>
      ${action}
    </div>
    <div style="border-top:1px solid #eeeeee;color:#888888;font-size:12px;line-height:1.6;padding:20px 32px">
      Sent by the EduthArt art advisory service. Reply to this email to reach the gallery.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send one advisory email.
 *
 * The stored request is the record of truth, so a missing API key or a Resend
 * outage is logged and reported back as `false` rather than thrown: the buyer's
 * request must not be lost because a confirmation could not go out.
 */
export async function sendAdvisoryEmail(email: AdvisoryEmail) {
  if (!email.to.trim() || !process.env.RESEND_API_KEY) {
    return false;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || `EduthArt <${SUPPORT_EMAIL}>`,
      html: renderAdvisoryEmail(email),
      replyTo: email.replyTo ?? undefined,
      subject: email.subject,
      text: [
        email.title,
        "",
        email.body,
        email.actionHref ? `\n${toAbsoluteUrl(email.actionHref)}` : "",
      ].join("\n"),
      to: [email.to.trim()],
    });

    if (error) {
      console.error("Unable to send advisory email", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unable to send advisory email", error);
    return false;
  }
}
