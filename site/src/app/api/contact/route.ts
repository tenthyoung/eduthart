import { SUPPORT_EMAIL } from "@/constants/contact.constants";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  try {
    // Initialize Resend at runtime to avoid build-time errors
    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await request.json();
    const { name, email, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 },
      );
    }

    // Send email using Resend API
    const data = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL || `EduthArt Support <${SUPPORT_EMAIL}>`,
      to: [process.env.CONTACT_EMAIL || SUPPORT_EMAIL],
      subject: `New EduthArt support message from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contact Form Submission</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6ee44f 0%, #4ade80 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">EduthArt</h1>
              <p style="margin: 10px 0 0 0; color: white; opacity: 0.9;">New support message</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- Contact Details -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 20px 0; color: #333; font-size: 18px; border-bottom: 2px solid #6ee44f; padding-bottom: 10px;">Contact Information</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}" style="color: #6ee44f; text-decoration: none;">${email}</a></td>
                  </tr>
                </table>
              </div>

              <!-- Message -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px; border-bottom: 2px solid #6ee44f; padding-bottom: 10px;">Message</h2>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #6ee44f;">
                  <p style="margin: 0; line-height: 1.6; color: #555; white-space: pre-wrap;">${message}</p>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="margin: 0; color: #999; font-size: 14px;">
                  This message was sent from the EduthArt support form.<br>
                  <span style="color: #6ee44f;">🚁</span> Sent on ${new Date().toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
MEMDOJO - New Support Message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTACT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: ${name}
Email: ${email}

MESSAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This message was sent from the EduthArt support form.
Sent on: ${new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
      `,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Message sent successfully!",
        messageId: data.data?.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Contact form error:", error);

    return NextResponse.json(
      {
        error: "Failed to send message. Please try again later.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
