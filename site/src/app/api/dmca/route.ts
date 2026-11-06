import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTeamInbox, sendEmail } from "@/lib/email/send";
import { createArtworkReports, parseReportedPages } from "@/lib/reporting";
import { SITE_URL } from "@/lib/site-url";
import { createDocumentId, saveRootDocument } from "@/lib/store/document-store";

const DMCA_NOTICES_COLLECTION = "dmca_notices";

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
        { error: "At least one EduthArt artwork URL is required." },
        { status: 400 }
      );
    }

    const pages = parseReportedPages(urls);
    if (pages.length === 0) {
      return NextResponse.json(
        {
          error: `Please include at least one EduthArt artwork or artist page URL, for example ${SITE_URL}/artists/artist-name/art/artwork-id.`,
        },
        { status: 400 }
      );
    }

    const submissionId = createDocumentId("dmca");
    await saveRootDocument(DMCA_NOTICES_COLLECTION, submissionId, {
      id: submissionId,
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

    const matched = await createArtworkReports({
      details: queueDetails,
      pages,
      reason: "DMCA notice submitted",
      reportSubcategory: body.relationship,
      reporterEmail: body.email,
      submissionCollection: DMCA_NOTICES_COLLECTION,
      submissionId,
    });

    const matchedArtworks =
      matched.artworks.length > 0
        ? matched.artworks
            .map(
              (artwork) =>
                `- "${artwork.title}" by ${artwork.artistName} — ${SITE_URL}${artwork.href}`
            )
            .join("\n")
        : "None";
    const matchedArtists =
      matched.artists.length > 0
        ? matched.artists
            .map(
              (artist) =>
                `- ${artist.artistName} — ${SITE_URL}/artists/${artist.username}`
            )
            .join("\n")
        : "None";

    // The submission is already saved, so a failed email is logged rather than
    // failing the request: retrying would file the same notice twice.
    try {
      await sendEmail({
        fromName: "EduthArt Support",
        to: getTeamInbox(),
        replyTo: body.email,
        subject: `EduthArt DMCA notice (${urls.length} URL${urls.length === 1 ? "" : "s"})`,
        text: `New EduthArt DMCA notice

Claimant: ${body.fullName}
Email: ${body.email}
Phone: ${body.phone}
Relationship: ${body.relationship}
Signature: ${body.signature}

Matched artworks (flagged in the moderation queue):
${matchedArtworks}

Artist pages named:
${matchedArtists}

URLs as submitted:
${urls.join("\n")}

Copyrighted work description:
${body.copyrightedWorkDescription}

Explanation:
${body.explanation}
`,
      });
    } catch (emailError) {
      console.error("Unable to email the team about a submission", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    console.error("DMCA report error:", error);
    return NextResponse.json(
      { error: "Failed to submit DMCA notice. Please try again later." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
