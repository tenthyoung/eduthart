import { ThemeProvider } from "@/components/theme-provider";
import { LocomotiveScrollProvider } from "@/components/locomotive-scroll-provider";
import { SiteShell } from "@/components/site-shell";
import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduthArt - Contemporary Art Gallery and Private Viewings",
  description:
    "Discover curated exhibitions, private viewings, and membership opportunities at EduthArt, a contemporary art gallery in Orange County.",
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
      <body
        className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} antialiased`}
      >
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
