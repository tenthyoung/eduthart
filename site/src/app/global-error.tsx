"use client";

import { useEffect } from "react";

import { SUPPORT_EMAIL } from "@/constants/contact.constants";

import "./globals.css";

/**
 * The last resort, for when the root layout itself fails. It replaces the whole
 * document, so none of the site's providers, header or fonts exist here: plain
 * markup only, and a full-page link home rather than client navigation.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground antialiased">
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-brass">
            Something went wrong
          </p>
          <h1 className="mb-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Sorry, that didn&apos;t work
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
            It&apos;s not you, it&apos;s us. Please try again. If it keeps
            happening, contact customer support and we&apos;ll sort it out.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="h-10 cursor-pointer rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground"
            >
              Try again
            </button>
            {/* A plain anchor on purpose: the router may be what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-10 items-center rounded-xl border px-6 text-sm font-medium"
            >
              Back to home
            </a>
          </div>
          <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-foreground underline underline-offset-4"
            >
              Contact customer support
            </a>{" "}
            ({SUPPORT_EMAIL})
            {error.digest ? (
              <p className="mt-3">
                Reference:{" "}
                <code className="text-foreground">{error.digest}</code>
              </p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
