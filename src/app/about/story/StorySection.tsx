import { Heading } from "@/components/text/heading";
import Link from "next/link";

interface StorySectionProps {
  title: string;
  content: string[];
  className?: string;
}

export function StorySection({
  title,
  content,
  className = "",
}: StorySectionProps) {
  const bodyStyles = "text-lg leading-relaxed text-foreground";
  const sectionStyles = "mb-6";
  const isQuotedSection = title === "How we started";

  const renderContentWithLinks = (text: string) => {
    // Handle the specific links in the Journey section.
    if (text.includes("Industries tab")) {
      const parts = text.split("Industries tab");
      return (
        <>
          {parts[0]}
          <Link
            href="/industries"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Industries tab
          </Link>
          {parts[1].split("request a quote")[0]}
          <Link
            href="/contact"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            request a quote
          </Link>
          {parts[1].split("request a quote")[1]}
        </>
      );
    }

    // Handle highlighted inline keywords
    if (text.includes("DJI Air 3") || text.includes("DJI Mini 4 Pro")) {
      return text.split(/(DJI Air 3|DJI Mini 4 Pro)/).map((part, index) => {
        if (part === "DJI Air 3" || part === "DJI Mini 4 Pro") {
          return (
            <span key={index} className="text-primary font-medium">
              {part}
            </span>
          );
        }
        return part;
      });
    }

    return text;
  };

  return (
    <div className={`${sectionStyles} ${className}`}>
      <Heading variant="h2" className="mb-6">
        {title.split(" ").map((word, index, array) => {
          // Make the last word primary colored
          if (index === array.length - 1) {
            return (
              <span key={index} className="text-primary">
                {word}
              </span>
            );
          }
          return word + " ";
        })}
      </Heading>
      {isQuotedSection ? (
        <blockquote className="ml-2 border-l-4 border-primary/70 pl-6 text-muted-foreground">
          <div className="space-y-6">
            {content.map((paragraph, index) => (
              <p key={index} className="text-lg leading-relaxed">
                {renderContentWithLinks(paragraph.replace(/^- /, ""))}
              </p>
            ))}
          </div>
        </blockquote>
      ) : (
        <div className="space-y-6">
          {content.map((paragraph, index) => (
            <p key={index} className={bodyStyles}>
              {renderContentWithLinks(paragraph)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
