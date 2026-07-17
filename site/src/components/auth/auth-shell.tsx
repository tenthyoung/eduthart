"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

export function AuthShell({
  children,
  description,
  eyebrow,
  title,
}: AuthShellProps) {
  return (
    <section className="relative overflow-hidden bg-background px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex rounded-full border border-primary/15 bg-card/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-sm backdrop-blur-sm">
            {eyebrow}
          </div>
          <div className="space-y-4">
            <h1 className="max-w-xl text-5xl text-foreground sm:text-6xl">
              {title}
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              {description}
            </p>
          </div>
          <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-[0_18px_40px_-34px_rgba(47,36,28,0.35)] backdrop-blur-sm">
              Email and password with Firebase-backed sessions.
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/65 p-4 shadow-[0_18px_40px_-34px_rgba(47,36,28,0.35)] backdrop-blur-sm">
              Google sign-in plus privacy and terms acceptance on sign up.
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Need to review the legal terms first? Visit{" "}
            <Link className="font-medium text-primary hover:underline" href="/legal/terms-of-service">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link className="font-medium text-primary hover:underline" href="/legal/privacy-policy">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div
          className={cn(
            "rounded-[2rem] border border-border/70 bg-card/88 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl sm:p-8",
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
