import type { AccountProfile } from "@/lib/auth/account-profile";

export type NavContext =
  | "admin"
  | "artist-public"
  | "artist-workspace"
  | "marketing"
  | "marketing-home";

const ARTIST_PUBLIC_ROUTE = /^\/artists\/([^/]+)\/?$/;
const ARTIST_WORKSPACE_ROUTE = /^\/artists\/([^/]+)\/listings(?:\/|$)/;

export function isArtistCapableUsername(username?: string | null) {
  return typeof username === "string" && username.trim().length > 0;
}

export function isArtistCapableProfile(
  profile?: Pick<AccountProfile, "username"> | null,
) {
  return isArtistCapableUsername(profile?.username);
}

export function extractArtistUsernameFromPath(pathname: string) {
  const workspaceMatch = pathname.match(ARTIST_WORKSPACE_ROUTE);

  if (workspaceMatch?.[1]) {
    return workspaceMatch[1];
  }

  const publicMatch = pathname.match(ARTIST_PUBLIC_ROUTE);
  return publicMatch?.[1] ?? null;
}

export function getNavContext(pathname: string): NavContext {
  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (ARTIST_WORKSPACE_ROUTE.test(pathname)) {
    return "artist-workspace";
  }

  if (ARTIST_PUBLIC_ROUTE.test(pathname)) {
    return "artist-public";
  }

  if (pathname === "/") {
    return "marketing-home";
  }

  return "marketing";
}
