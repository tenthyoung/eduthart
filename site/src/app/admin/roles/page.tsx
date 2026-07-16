"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { AdminCard, AdminPage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  grantAdminRole,
  listAdminRoles,
  revokeAdminRole,
} from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/format";
import type { AdminRoleRecord } from "@/lib/admin/types";

const PROTECTED_SUPER_ADMIN_EMAILS = new Set([
  "izzy@hendecalabs.com",
  "tenthyoung@gmail.com",
]);

export default function AdminRolesPage() {
  const { access, user } = useAdminAuth();
  const [items, setItems] = useState<AdminRoleRecord[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revokingUid, setRevokingUid] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listAdminRoles());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin roles failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleGrant = async () => {
    setSaving(true);
    try {
      await grantAdminRole(email, role);
      toast.success("Admin role granted.");
      setEmail("");
      setRole("admin");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Grant failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (uid: string) => {
    setRevokingUid(uid);
    try {
      await revokeAdminRole(uid);
      toast.success("Admin role revoked.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revoke failed.");
    } finally {
      setRevokingUid(null);
    }
  };

  return (
    <AdminPage
      title="Admin roles"
      description="Review active admin access and grant or revoke roles through the server-verified super-admin workflow."
    >
      {access?.isSuperAdmin ? (
        <AdminCard className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.04em]">
              Grant access
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This updates both the `admin_roles` record and Firebase custom claims.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_220px_auto]">
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              type="email"
            />
            <Select
              value={role}
              onValueChange={(value: "admin" | "super_admin") => setRole(value)}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super admin</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={saving || email.trim().length === 0} onClick={() => void handleGrant()}>
              {saving ? "Granting..." : "Grant access"}
            </Button>
          </div>
        </AdminCard>
      ) : (
        <AdminCard>
          <p className="text-sm text-muted-foreground">
            Only a super admin can grant or revoke roles. You are signed in as {user?.email ?? "an admin account"}.
          </p>
        </AdminCard>
      )}

      <AdminCard>
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading roles..." : "No active admin roles returned."}
            </p>
          ) : (
            items.map((item) => {
              const canRevoke =
                access?.isSuperAdmin &&
                !(
                  item.role === "super_admin" &&
                  item.email !== null &&
                  PROTECTED_SUPER_ADMIN_EMAILS.has(item.email)
                );
              return (
                <div
                  key={item.uid}
                  className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-medium">{item.displayName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[item.email ?? item.uid, item.role].filter(Boolean).join(" • ")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Updated {formatDateTime(item.updatedAt)}
                    </p>
                  </div>
                  {canRevoke ? (
                    <Button
                      variant="destructive"
                      disabled={revokingUid !== null}
                      onClick={() => void handleRevoke(item.uid)}
                    >
                      {revokingUid === item.uid ? "Revoking..." : "Revoke"}
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </AdminCard>
    </AdminPage>
  );
}
