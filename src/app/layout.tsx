import { ThemeProvider } from "@/components/theme-provider";
import { LocomotiveScrollProvider } from "@/components/locomotive-scroll-provider";
import { SiteShell } from "@/components/site-shell";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduthArt - Buy Original Art Online",
  description:
    "Browse curated original art online with room-based discovery, thoughtful collections, and collector-friendly guidance.",
  icons: {
    icon: "/logo/pure-logo-icon.png",
    apple: "/logo/pure-logo-icon.png",
    shortcut: "/logo/pure-logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider defaultTheme="light">
          <LocomotiveScrollProvider>
            <SiteShell>{children}</SiteShell>
          </LocomotiveScrollProvider>
        </ThemeProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
