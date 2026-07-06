"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

interface SocialIconProps {
  iconPath: string;
  label: string;
  href: string;
  className?: string;
  size?: number;
  variant?: "navbar" | "footer";
}

export const SocialIcon = ({
  iconPath,
  label,
  href,
  className = "",
  size = 20,
  variant = "navbar",
}: SocialIconProps) => {
  const baseStyles =
    variant === "footer"
      ? "text-foreground hover:text-primary transition-colors duration-200"
      : "text-foreground/80 hover:text-primary transition-colors duration-200";

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(baseStyles, className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        role="img"
        aria-label={label}
      >
        <path d={iconPath} />
      </svg>
    </Link>
  );
};
