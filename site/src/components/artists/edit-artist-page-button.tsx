"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export function EditArtistPageButton({ artistUid }: { artistUid: string }) {
  const { status, user } = useAuth();

  if (status !== "authenticated" || user?.uid !== artistUid) {
    return null;
  }

  return (
    <Button asChild variant="outline">
      <Link href="/account">
        <Pencil />
        Edit page
      </Link>
    </Button>
  );
}
