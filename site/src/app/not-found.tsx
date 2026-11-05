import Link from "next/link";

import { ErrorPage } from "@/components/error-page";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/constants/contact.constants";

export const metadata = { title: "Page not found | EduthArt" };

export default function NotFound() {
  return (
    <ErrorPage
      eyebrow="404"
      title="We can't find that page"
      message="The link may be old, or the page may have moved. Here are a couple of good places to start."
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/browse">Browse original art</Link>
          </Button>
        </>
      }
      footnote={
        <>
          Think this is a mistake?{" "}
          <Link
            href="/contact"
            className="text-foreground underline underline-offset-4"
          >
            Contact customer support
          </Link>{" "}
          or write to{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-foreground underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </>
      }
    />
  );
}
