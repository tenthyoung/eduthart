import type { UserNotification } from "@/lib/notifications/types";

export type NotificationsPayload = {
  notifications: UserNotification[];
  unreadCount: number;
};

async function request(
  token: string,
  init?: RequestInit
): Promise<NotificationsPayload> {
  const response = await fetch("/api/notifications", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    (NotificationsPayload & { error?: { message?: string } }) | null;

  if (!response.ok || !payload) {
    throw new Error(
      payload?.error?.message ?? "Unable to load your notifications."
    );
  }

  return {
    notifications: payload.notifications ?? [],
    unreadCount: payload.unreadCount ?? 0,
  };
}

export function fetchNotifications(token: string) {
  return request(token);
}

export function setNotificationReadState(
  token: string,
  id: string,
  read: boolean
) {
  return request(token, {
    body: JSON.stringify({ id, read }),
    method: "PATCH",
  });
}

export function markEveryNotificationRead(token: string) {
  return request(token, {
    body: JSON.stringify({ markAllRead: true }),
    method: "PATCH",
  });
}

export function dismissNotification(token: string, id: string) {
  return request(token, { body: JSON.stringify({ id }), method: "DELETE" });
}

export function clearNotifications(token: string) {
  return request(token, {
    body: JSON.stringify({ all: true }),
    method: "DELETE",
  });
}

export const NOTIFICATIONS_CHANGED_EVENT = "eduthart:notifications-changed";

export function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}
