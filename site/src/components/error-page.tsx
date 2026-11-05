import { Heading } from "@/components/text/heading";

/**
 * The shared look for "not found" and "something went wrong": a centred
 * eyebrow, headline, short explanation and a row of ways out. It knows nothing
 * about the shop, so it could live in the design system; the copy and links
 * stay with the routes that use it.
 */
export function ErrorPage({
  eyebrow,
  title,
  message,
  actions,
  footnote,
}: {
  eyebrow: string;
  title: string;
  message: string;
  /** The buttons or links offered as ways out. */
  actions: React.ReactNode;
  /** A smaller line under the actions, such as how to reach support. */
  footnote?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 pb-16 pt-32 text-foreground">
      <div className="mx-auto max-w-xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-brass">
          {eyebrow}
        </p>
        <Heading variant="h1">{title}</Heading>
        <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
          {message}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {actions}
        </div>
        {footnote ? (
          <div className="mt-10 border-t pt-6 text-sm text-muted-foreground">
            {footnote}
          </div>
        ) : null}
      </div>
    </div>
  );
}
