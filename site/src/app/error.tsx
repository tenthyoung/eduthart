"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ErrorPage } from "@/components/error-page";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/constants/contact.constants";

/**
 * Shown when a page fails while rendering. It sits inside the normal site
 * shell, so the header and footer stay. `digest` is the id the server logged
 * for this failure; quoting it lets support find the exact error.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const subject = encodeURIComponent("Something went wrong on EduthArt");
  const body = encodeURIComponent(
    `Hi, I hit an error on EduthArt.\n\nPage: ${
      typeof window === "undefined" ? "" : window.location.href
    }\nReference: ${error.digest ?? "none"}\n\nWhat I was doing:\n`
  );

  return (
    <ErrorPage
      eyebrow="Something went wrong"
      title="Sorry, that didn't work"
      message="It's not you, it's us. Please try again. If it keeps happening, contact customer support and we'll sort it out."
      actions={
        <>
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </>
      }
      footnote={
        <>
          <p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}
              className="text-foreground underline underline-offset-4"
            >
              Contact customer support
            </a>{" "}
            ({SUPPORT_EMAIL}) or use the{" "}
            <Link
              href="/contact"
              className="text-foreground underline underline-offset-4"
            >
              contact form
            </Link>
            .
          </p>
          {error.digest ? (
            <p className="mt-3">
              Reference: <code className="text-foreground">{error.digest}</code>
            </p>
          ) : null}
        </>
      }
    />
  );
}
