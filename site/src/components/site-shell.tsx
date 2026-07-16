"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <main>{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
