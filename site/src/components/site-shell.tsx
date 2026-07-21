"use client";

import { usePathname } from "next/navigation";

import { ArtistWorkspaceShell } from "@/components/artist-workspace-shell";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { extractArtistUsernameFromPath, getNavContext } from "@/lib/navigation";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const navContext = getNavContext(pathname);

  if (navContext === "admin") {
    return <main>{children}</main>;
  }

  if (navContext === "artist-workspace") {
    const username = extractArtistUsernameFromPath(pathname);

    if (!username) {
      return <main>{children}</main>;
    }

    return <ArtistWorkspaceShell username={username}>{children}</ArtistWorkspaceShell>;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
