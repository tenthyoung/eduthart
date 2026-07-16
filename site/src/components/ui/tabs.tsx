"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted/50 backdrop-blur-sm text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded-xl p-1 shadow-sm border border-border/20",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-out",
        "text-muted-foreground hover:text-primary hover:bg-primary/5",
        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-primary/10 before:to-primary/5 before:opacity-0 before:transition-opacity before:duration-200",
        "hover:before:opacity-100 data-[state=active]:before:opacity-0",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
