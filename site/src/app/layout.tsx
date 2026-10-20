import { AuthProvider } from "@/components/auth/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LocomotiveScrollProvider } from "@/components/locomotive-scroll-provider";
import { SiteShell } from "@/components/site-shell";
import type { Metadata } from "next";
import { Gloock, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// The display serif shared with Hendeca Labs, for the wordmark and accent words.
const gloock = Gloock({
  subsets: ["latin"],
  variable: "--font-gloock",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EduthArt - Buy Original Art Online",
  description:
    "Original art bought straight from the artists who make it. Every piece is one of a kind, signed, and shipped from the artist's studio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${gloock.variable} antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider defaultTheme="light">
              <LocomotiveScrollProvider>
                <SiteShell>{children}</SiteShell>
              </LocomotiveScrollProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
