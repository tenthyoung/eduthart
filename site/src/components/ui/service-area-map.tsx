"use client";

import dynamic from "next/dynamic";

// Dynamically import the map to avoid SSR issues
const ServiceAreaMapInner = dynamic(() => import("./service-area-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-muted/30 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

export function ServiceAreaMap() {
  return <ServiceAreaMapInner />;
}
