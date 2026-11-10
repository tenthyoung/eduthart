import { brandLogoHtml } from "@/lib/brand/logo";
import { escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email/send";
import type { NotificationTemplate } from "@/lib/notifications/types";

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://eduthart.com").replace(
    /\/+$/,
    ""
  );
}

/**
 * The logo for the top of an email. Points at the PNG of the mark
 * (app/brand/mark.png), because mail clients won't show SVG or data URLs.
 */
export function emailLogoHtml() {
  return brandLogoHtml({
    markSrc: `${getSiteUrl()}/brand/mark.png`,
    fontSize: 19,
  });
}

function toAbsoluteUrl(href: string) {
  return href.startsWith("http")
    ? href
    : `${getSiteUrl()}${href.startsWith("/") ? "" : "/"}${href}`;
}

function renderEmail(template: NotificationTemplate) {
  const action =
    template.actionHref && template.actionLabel
      ? `<p style="margin:28px 0 0"><a href="${escapeHtml(toAbsoluteUrl(template.actionHref))}" style="background:#2f241c;border-radius:999px;color:#ffffff;display:inline-block;font-size:15px;font-weight:600;padding:13px 26px;text-decoration:none">${escapeHtml(template.actionLabel)}</a></p>`
      : "";

  return `<!DOCTYPE html>
<html>
<body style="background:#f6f3ef;margin:0;padding:32px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="background:#ffffff;border-radius:20px;margin:0 auto;max-width:560px;overflow:hidden">
    <div style="border-bottom:1px solid #efe9e2;padding:26px 32px">
      ${emailLogoHtml()}
    </div>
    <div style="padding:32px">
      <h1 style="color:#2f241c;font-size:22px;line-height:1.35;margin:0 0 14px">${escapeHtml(template.title)}</h1>
      <p style="color:#5b5048;font-size:15px;line-height:1.7;margin:0;white-space:pre-line">${escapeHtml(template.body)}</p>
      ${action}
    </div>
    <div style="border-top:1px solid #efe9e2;color:#8d8178;font-size:12px;line-height:1.6;padding:20px 32px">
      You are receiving this because of activity on your EduthArt account.
      <a href="${escapeHtml(`${getSiteUrl()}/account`)}" style="color:#8d8178">Manage your account</a>.
    </div>
  </div>
</body>
</html>`;
}

export function isNotificationEmailEnabled() {
  return isEmailConfigured();
}

/**
 * Deliver a notification by email.
 *
 * Email is a secondary channel: the in-app notification is the record of
 * truth, so a missing email binding or a Cloudflare outage is logged and swallowed
 * rather than failing the action that triggered the notification.
 */
export async function sendNotificationEmail(
  to: string,
  template: NotificationTemplate
) {
  if (!template.emailSubject || !to.trim() || !isNotificationEmailEnabled()) {
    return false;
  }

  try {
    await sendEmail({
      to,
      subject: template.emailSubject,
      html: renderEmail(template),
      text: [
        template.title,
        "",
        template.body,
        template.actionHref ? `\n${toAbsoluteUrl(template.actionHref)}` : "",
      ].join("\n"),
    });

    return true;
  } catch (error) {
    console.error("Unable to send notification email", error);
    return false;
  }
}
