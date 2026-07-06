import type { ReactNode } from "react";

import {
  AdminAuthProvider,
  AdminRouteGuard,
} from "@/components/admin/admin-auth-provider";
import { AdminShell } from "@/components/admin/admin-ui";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminRouteGuard>
        <AdminShell>{children}</AdminShell>
      </AdminRouteGuard>
    </AdminAuthProvider>
  );
}
