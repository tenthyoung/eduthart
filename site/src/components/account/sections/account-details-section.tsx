"use client";

import { Info } from "lucide-react";

import {
  AccountPanel,
  DetailList,
  DetailRow,
} from "@/components/account/account-surfaces";
import type { AccountProfile } from "@/lib/auth/account-profile";

function formatAccountDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AccountDetailsSection({
  profile,
}: {
  profile: AccountProfile | null;
}) {
  return (
    <AccountPanel icon={Info} title="Account information">
      <DetailList>
        <DetailRow
          label="Created"
          value={formatAccountDate(profile?.createdAt ?? null)}
        />
        <DetailRow
          label="Last profile update"
          value={formatAccountDate(profile?.updatedAt ?? null)}
        />
        <DetailRow
          label="Last sign-in sync"
          value={formatAccountDate(profile?.lastLoginAt ?? null)}
        />
        <DetailRow
          label="Legal acceptance"
          value={formatAccountDate(profile?.legal?.acceptedAt ?? null)}
        />
        <DetailRow
          label="Legal version"
          value={profile?.legal?.acceptedVersion ?? "Not available"}
        />
      </DetailList>
    </AccountPanel>
  );
}
