"use client";

import type {
  AdminAccess,
  AdminRoleRecord,
  AdminUserDetail,
  AdminUserSummary,
  ModerationQueueItem,
  PublicDeckSummary,
  RefundRequestRecord,
} from "./types";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class AdminApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.code = code;
    this.details = details;
  }
}

async function parseError(response: Response): Promise<AdminApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new AdminApiError(
      body.error?.code ?? `${response.status}`,
      body.error?.message ?? "Admin request failed.",
      body.error?.details,
    );
  } catch {
    return new AdminApiError(`${response.status}`, "Admin request failed.");
  }
}

async function adminRequest<TResponse>(
  input: string,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function createAdminSession(idToken: string): Promise<AdminAccess> {
  const response = await adminRequest<{ access: AdminAccess }>(
    "/api/admin/session",
    {
      method: "POST",
      body: JSON.stringify({ idToken }),
    },
  );
  return response.access;
}

export async function deleteAdminSession() {
  await adminRequest<{ success: true }>("/api/admin/session", {
    method: "DELETE",
  });
}

export async function getAdminAccessStatus(): Promise<AdminAccess> {
  return adminRequest<AdminAccess>("/api/admin/access");
}

export async function searchUsers(query: string): Promise<AdminUserSummary[]> {
  const response = await adminRequest<{ items?: AdminUserSummary[] }>(
    `/api/admin/users?query=${encodeURIComponent(query)}`,
  );
  return response.items ?? [];
}

export async function getAdminUserDetails(uid: string): Promise<AdminUserDetail> {
  return adminRequest<AdminUserDetail>(`/api/admin/users/${uid}`);
}

export async function listAdminRoles(): Promise<AdminRoleRecord[]> {
  const response = await adminRequest<{ items?: AdminRoleRecord[] }>(
    "/api/admin/roles",
  );
  return response.items ?? [];
}

export async function grantAdminRole(email: string, role: "admin" | "super_admin") {
  return adminRequest("/api/admin/roles", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function revokeAdminRole(uid: string) {
  return adminRequest(`/api/admin/roles/${uid}`, {
    method: "DELETE",
  });
}

export async function updateUserModerationState(
  uid: string,
  action: string,
  reason: string,
) {
  return adminRequest(`/api/admin/users/${uid}/moderation`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
}

export async function listModerationQueue(): Promise<ModerationQueueItem[]> {
  const response = await adminRequest<{ items?: ModerationQueueItem[] }>(
    "/api/admin/moderation",
  );
  return response.items ?? [];
}

export async function moderateDeck(
  publicDeckId: string,
  action: "warn" | "hide" | "remove",
  reason: string,
) {
  return adminRequest(`/api/admin/public-decks/${publicDeckId}/moderation`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
}

export async function getPublicDeckDetails(
  publicDeckId: string,
): Promise<PublicDeckSummary | null> {
  return adminRequest<PublicDeckSummary | null>(
    `/api/admin/public-decks/${publicDeckId}`,
  );
}

export async function listRefundRequests(): Promise<RefundRequestRecord[]> {
  const response = await adminRequest<{ items?: RefundRequestRecord[] }>(
    "/api/admin/refunds",
  );
  return response.items ?? [];
}

export async function updateRefundRequestStatus(
  refundRequestId: string,
  status: string,
  adminNotes: string,
) {
  return adminRequest(`/api/admin/refunds/${refundRequestId}`, {
    method: "POST",
    body: JSON.stringify({ status, adminNotes }),
  });
}
