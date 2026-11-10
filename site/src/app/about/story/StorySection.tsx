import { Heading } from "@/components/text/heading";

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
                {paragraph.replace(/^- /, "")}
              </p>
            ))}
          </div>
        </blockquote>
      ) : (
        <div className="space-y-6">
          {content.map((paragraph, index) => (
            <p key={index} className={bodyStyles}>
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
