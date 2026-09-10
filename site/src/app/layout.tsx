import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LocomotiveScrollProvider } from "@/components/locomotive-scroll-provider";
import { SiteShell } from "@/components/site-shell";
import type { Metadata } from "next";
import { Geist, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EduthArt - Buy Original Art Online",
  description:
    "Browse curated original art online with room-based discovery, thoughtful collections, and collector-friendly guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${outfit.variable} antialiased`}>
        <AuthProvider>
          <ThemeProvider defaultTheme="light">
            <LocomotiveScrollProvider>
              <SiteShell>{children}</SiteShell>
            </LocomotiveScrollProvider>
          </ThemeProvider>
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
