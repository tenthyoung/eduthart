"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Search,
  Shield,
  Users,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useAdminAuth } from "./admin-auth-provider";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Search },
  { href: "/admin/moderation", label: "Moderation", icon: Shield },
  { href: "/admin/refunds", label: "Refunds", icon: CreditCard },
  { href: "/admin/roles", label: "Roles", icon: Users },
  { href: "/admin/docs", label: "Documentation", icon: BookOpen },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { access, error, signOut, status, user } = useAdminAuth();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (status === "loading") {
    return <AdminLoadingState label="Checking admin access..." />;
  }

  if (status === "signed_out") {
    return <AdminLoadingState label="Redirecting to sign in..." />;
  }

  if (status === "unauthorized") {
    return (
      <AdminCenteredState
        title="Signed in, but not authorized"
        description="This account can access the internal admin console only after the backend confirms admin privileges."
        actionLabel="Sign out"
        onAction={signOut}
      >
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Permission denied</AlertTitle>
          <AlertDescription>
            {error?.message ?? "Admin access required."}
          </AlertDescription>
        </Alert>
      </AdminCenteredState>
    );
  }

  if (status === "error") {
    return (
      <AdminCenteredState
        title="Admin access check failed"
        description="The site could not confirm access with the secure admin server."
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      >
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Server error</AlertTitle>
          <AlertDescription>
            {error?.message ?? "Unknown admin error."}
          </AlertDescription>
        </Alert>
      </AdminCenteredState>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(136,98,247,0.18),_transparent_32%),linear-gradient(180deg,#faf8ff_0%,#f3f4f6_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-72 shrink-0 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_80px_rgba(91,64,182,0.10)] backdrop-blur lg:flex lg:flex-col">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              EduthArt Internal
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Admin Console
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Moderation, refunds, account controls, and role management.
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href ||
                (href !== "/admin" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-black/5 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-black/5 bg-black/[0.03] p-4">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {access?.role === "super_admin" ? "Super admin" : "Admin"}
                </p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {user?.email ?? "Unknown user"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full justify-start"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="rounded-[28px] border border-white/70 bg-white/85 px-5 py-4 shadow-[0_18px_80px_rgba(91,64,182,0.10)] backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                  EduthArt Internal
                </p>
                <h1 className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                  Admin Console
                </h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    pathname === href || pathname.startsWith(`${href}/`)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <header className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_18px_80px_rgba(91,64,182,0.10)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              Internal Console
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              {title}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-3">{actions}</div>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export function AdminCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_60px_rgba(91,64,182,0.08)] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <AdminCard className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-3xl font-semibold tracking-[-0.05em]",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </AdminCard>
  );
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AdminCard>
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </AdminCard>
  );
}

export function AdminLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#faf8ff_0%,#f3f4f6_100%)] px-6">
      <div className="rounded-[28px] border border-white/70 bg-white/90 px-8 py-10 text-center shadow-[0_18px_60px_rgba(91,64,182,0.10)]">
        <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function AdminCenteredState({
  title,
  description,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#faf8ff_0%,#f3f4f6_100%)] px-6">
      <div className="w-full max-w-xl rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_18px_60px_rgba(91,64,182,0.10)]">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          EduthArt Internal
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        {children ? <div className="mt-6">{children}</div> : null}
        {actionLabel && onAction ? (
          <Button className="mt-6" onClick={() => void onAction()}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
