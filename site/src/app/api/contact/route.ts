import { NextRequest, NextResponse } from "next/server";

import { escapeHtml, getTeamInbox, sendEmail } from "@/lib/email/send";
import { emailLogoHtml } from "@/lib/notifications/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const sentOn = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const data = await sendEmail({
      fromName: "EduthArt Support",
      to: getTeamInbox(),
      replyTo: { email, name },
      subject: `New EduthArt support message from ${name}`,
      html: `<!DOCTYPE html>
<html>
<body style="background:#f6f3ef;margin:0;padding:32px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="background:#ffffff;border-radius:20px;margin:0 auto;max-width:560px;overflow:hidden">
    <div style="border-bottom:1px solid #efe9e2;padding:26px 32px">
      ${emailLogoHtml()}
      <p style="color:#8d8178;font-size:14px;margin:10px 0 0">New support message</p>
    </div>
    <div style="padding:32px">
      <p style="color:#2f241c;font-size:15px;line-height:1.6;margin:0 0 4px"><strong>${escapeHtml(name)}</strong></p>
      <p style="margin:0 0 24px"><a href="mailto:${escapeHtml(email)}" style="color:#8a6a2f;font-size:15px">${escapeHtml(email)}</a></p>
      <p style="color:#5b5048;font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>
    </div>
    <div style="border-top:1px solid #efe9e2;color:#8d8178;font-size:12px;line-height:1.6;padding:20px 32px">
      Sent from the EduthArt support form on ${escapeHtml(sentOn)}. Reply to this email to answer ${escapeHtml(name)} directly.
    </div>
  </div>
</body>
</html>`,
      text: `New EduthArt support message

Name: ${name}
Email: ${email}

${message}

Sent from the EduthArt support form on ${sentOn}.
Reply to this email to answer ${name} directly.
`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Message sent successfully!",
        messageId: data.messageId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);

    return NextResponse.json(
      {
        error: "Failed to send message. Please try again later.",
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
