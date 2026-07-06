import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { SUPPORT_EMAIL } from "@/constants/contact.constants";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { createExternalDeckReports, parsePublicDeckIds } from "@/lib/reporting";

const schema = z.object({
  contentUrls: z.string().min(1),
  gradeLevel: z.string().min(1),
  subject: z.string().min(1),
  assessmentType: z.string().min(1),
  originalAuthor: z.string().min(1),
  description: z.string().min(20),
  email: z.string().email(),
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
    const submissionRef = db.collection("test_content_reports").doc();
    await submissionRef.set({
      id: submissionRef.id,
      urls,
      gradeLevel: body.gradeLevel,
      subject: body.subject,
      assessmentType: body.assessmentType,
      originalAuthor: body.originalAuthor,
      description: body.description,
      reporterEmail: body.email,
      createdAt: new Date().toISOString(),
      status: "submitted",
    });

    const queueDetails = [
      `Grade level: ${body.gradeLevel}`,
      `Subject: ${body.subject}`,
      `Assessment type: ${body.assessmentType}`,
      `Original author: ${body.originalAuthor}`,
      "",
      body.description,
    ].join("\n");

    const publicDeckIds = await createExternalDeckReports({
      urls,
      reportType: "academic_integrity",
      reportSubcategory: body.assessmentType,
      reason: "Assessment or test content report",
      details: queueDetails,
      reporterEmail: body.email,
      submissionCollection: "test_content_reports",
      submissionId: submissionRef.id,
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL || `EduthArt Support <${SUPPORT_EMAIL}>`,
      to: [process.env.CONTACT_EMAIL || SUPPORT_EMAIL],
      subject: `EduthArt test content report (${urls.length} URL${urls.length === 1 ? "" : "s"})`,
      text: `New EduthArt test content report

Reporter email: ${body.email}
Grade level: ${body.gradeLevel}
Subject: ${body.subject}
Assessment type: ${body.assessmentType}
Original author: ${body.originalAuthor}
Matched deck IDs: ${publicDeckIds.join(", ") || "None"}

URLs:
${urls.join("\n")}

Description:
${body.description}
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

    console.error("Test content report error:", error);
    return NextResponse.json(
      { error: "Failed to submit report. Please try again later." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
