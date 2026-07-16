import { cn } from "@/lib/utils";

export const Heading = ({
  variant = "h2",
  children,
  className,
}: {
  variant?: "h1" | "h2" | "h3";
  children: React.ReactNode;
  className?: string;
}) => {
  if (variant === "h1") {
    return (
      <h1
        className={cn(
          "mb-3 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-primary sm:text-5xl lg:text-6xl",
          className,
        )}
      >
        {children}
      </h1>
    );
  }
  if (variant === "h2") {
    return (
      <h2
        className={cn(
          "mb-6 text-3xl font-semibold leading-[1.1] tracking-[-0.035em] text-primary md:text-4xl",
          className,
        )}
      >
        {children}
      </h2>
    );
  }
  if (variant === "h3") {
    return (
      <h3
        className={cn(
          "mb-5 text-2xl font-semibold leading-[1.14] tracking-[-0.025em] text-primary md:text-3xl",
          className,
        )}
      >
        {children}
      </h3>
    );
  }
  return (
    <h2
      className={cn(
        "mb-6 text-3xl font-semibold leading-[1.1] tracking-[-0.035em] text-primary md:text-4xl",
        className,
      )}
    >
      {children}
    </h2>
  );
};
