import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { SUPPORT_EMAIL } from "@/constants/contact.constants";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { createExternalDeckReports, parsePublicDeckIds } from "@/lib/reporting";

const schema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  mailingAddress: z.string().min(1),
  phone: z.string().min(1),
  relationship: z.string().min(1),
  copyrightedWorkDescription: z.string().min(20),
  contentUrls: z.string().min(1),
  explanation: z.string().min(20),
  signature: z.string().min(1),
  goodFaith: z.literal(true),
  accuracy: z.literal(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const urls = body.contentUrls
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "At least one direct public deck URL is required." },
        { status: 400 },
      );
    }
    if (parsePublicDeckIds(urls).length === 0) {
      return NextResponse.json(
        {
          error:
            "Please include at least one valid direct EduthArt public deck URL.",
        },
        { status: 400 },
      );
    }

    const db = getFirebaseAdminDb();
    const submissionRef = db.collection("dmca_notices").doc();
    await submissionRef.set({
      id: submissionRef.id,
      fullName: body.fullName,
      email: body.email,
      mailingAddress: body.mailingAddress,
      phone: body.phone,
      relationship: body.relationship,
      copyrightedWorkDescription: body.copyrightedWorkDescription,
      urls,
      explanation: body.explanation,
      signature: body.signature,
      createdAt: new Date().toISOString(),
      status: "submitted",
    });

    const queueDetails = [
      `Copyright owner/agent: ${body.relationship}`,
      `Claimant: ${body.fullName}`,
      `Claimant email: ${body.email}`,
      `Phone: ${body.phone}`,
      `Address: ${body.mailingAddress}`,
      "",
      "Copyrighted work description:",
      body.copyrightedWorkDescription,
      "",
      "Infringement explanation:",
      body.explanation,
    ].join("\n");

    const publicDeckIds = await createExternalDeckReports({
      urls,
      reportType: "copyright",
      reportSubcategory: body.relationship,
      reason: "DMCA notice submitted",
      details: queueDetails,
      reporterEmail: body.email,
      submissionCollection: "dmca_notices",
      submissionId: submissionRef.id,
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL || `EduthArt Support <${SUPPORT_EMAIL}>`,
      to: [process.env.CONTACT_EMAIL || SUPPORT_EMAIL],
      subject: `EduthArt DMCA notice (${urls.length} URL${urls.length === 1 ? "" : "s"})`,
      text: `New EduthArt DMCA notice

Claimant: ${body.fullName}
Email: ${body.email}
Phone: ${body.phone}
Relationship: ${body.relationship}
Matched deck IDs: ${publicDeckIds.join(", ") || "None"}
Signature: ${body.signature}

URLs:
${urls.join("\n")}

Copyrighted work description:
${body.copyrightedWorkDescription}

Explanation:
${body.explanation}
`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    console.error("DMCA report error:", error);
    return NextResponse.json(
      { error: "Failed to submit DMCA notice. Please try again later." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
