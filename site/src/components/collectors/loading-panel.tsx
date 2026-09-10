"use client";

import { Loader2 } from "lucide-react";

export function CollectorLoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-[2rem] border border-white/70 bg-white/88 dark:border-border dark:bg-card/88 p-12 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        {label}
      </div>
    </div>
  );
}
