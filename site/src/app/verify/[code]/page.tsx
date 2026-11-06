import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { findPublicCertificateByCode } from "@/lib/commerce/certificates";

// A certificate is checked live, so a code is never served from a stale cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify a certificate of authenticity - EduthArt",
  // Codes belong to the people holding the certificate; keep them out of search.
  robots: { follow: false, index: false },
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(date);
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  // Only the public fields ever reach this page, never the buyer or order.
  const certificate = await findPublicCertificateByCode(
    decodeURIComponent(code)
  );

  if (!certificate) {
    notFound();
  }

  const facts = [
    ["Artist", certificate.artistName],
    ["Title", certificate.title],
    ["Year", certificate.yearCreated],
    ["Medium", certificate.medium],
    ["Dimensions", certificate.dimensions],
    ["Sold", formatDate(certificate.issuedAt)],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <main className="min-h-screen bg-background pt-28 pb-20 text-foreground">
      <div className="container mx-auto max-w-2xl px-4">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <BadgeCheck className="size-4" />
          Verified certificate of authenticity
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          This is a genuine EduthArt certificate.
        </h1>
        <p className="mt-3 text-muted-foreground">
          EduthArt issued certificate{" "}
          <span className="font-mono font-semibold text-foreground">
            {certificate.code}
          </span>{" "}
          for the original artwork below when it was sold.
        </p>

        <div className="mt-10 flex flex-col gap-8 border-t border-foreground pt-8 sm:flex-row">
          {certificate.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={certificate.title}
              className="max-h-64 w-auto max-w-full self-start object-contain sm:max-w-[14rem]"
              src={certificate.imageUrl}
            />
          ) : null}
          <dl className="grid flex-1 gap-5 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {certificate.artworkHref ? (
          <p className="mt-10 text-sm">
            <Link
              className="underline underline-offset-4"
              href={certificate.artworkHref}
            >
              See this piece on EduthArt
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
