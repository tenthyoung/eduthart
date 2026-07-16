import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionContentWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that adds appropriate padding to prevent navbar overlap.
 */
export function SectionContentWrapper({
  children,
  className = "",
}: SectionContentWrapperProps) {
  return (
    <div
      className={cn(
        "w-full min-h-full px-4 pt-28 pb-10 sm:px-6 sm:pt-32 sm:pb-12 lg:h-full lg:px-8 lg:py-24",
        className,
      )}
    >
      {children}
    </div>
  );
}
