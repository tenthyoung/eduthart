"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AdminCard, AdminPage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchUsers } from "@/lib/admin/api";
import { formatCurrencyFromMicros, formatDateTime } from "@/lib/admin/format";
import type { AdminUserSummary } from "@/lib/admin/types";

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      setUsers(await searchUsers(query));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "User search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPage
      title="User search"
      description="Search by username or exact email, then jump into moderation history, usage, billing, and public deck ownership."
      actions={
        <div className="flex flex-wrap gap-3">
          <Input
            className="min-w-72 bg-white"
            placeholder="username or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSearch();
              }
            }}
          />
          <Button onClick={() => void handleSearch()} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      }
    >
      <AdminCard>
        <div className="space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Run a search to load matching accounts.
            </p>
          ) : (
            users.map((user) => (
              <Link
                key={user.uid}
                href={`/admin/users/${user.uid}`}
                className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-4 transition-colors hover:bg-black/[0.04] lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="font-medium">{user.displayName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[user.email ?? user.username ?? user.uid, `status: ${user.accountStatus}`]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      user.publishingDisabled ? "publishing disabled" : "publishing enabled",
                      `${user.tier} tier`,
                      `updated ${formatDateTime(user.updatedAt)}`,
                    ].join(" • ")}
                  </p>
                </div>
                <div className="shrink-0 text-sm font-medium text-muted-foreground">
                  {formatCurrencyFromMicros(user.monthlyEstimatedCostMicrosUsd)}
                </div>
              </Link>
            ))
          )}
        </div>
      </AdminCard>
    </AdminPage>
  );
}
