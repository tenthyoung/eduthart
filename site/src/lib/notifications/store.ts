import {
  createDocumentId,
  deleteUserCollection,
  deleteUserDocument,
  getUserDocument,
  listUserDocuments,
  saveUserDocument,
} from "@/lib/store/document-store";

import type {
  NotificationTemplate,
  UserNotification,
} from "@/lib/notifications/types";

const NOTIFICATIONS_COLLECTION = "notifications";

function toUserNotification(
  document: Record<string, unknown> & { id: string }
): UserNotification {
  return {
    actionHref:
      typeof document.actionHref === "string" ? document.actionHref : null,
    actionLabel:
      typeof document.actionLabel === "string" ? document.actionLabel : null,
    body: typeof document.body === "string" ? document.body : "",
    createdAt:
      typeof document.createdAt === "string"
        ? document.createdAt
        : new Date(0).toISOString(),
    id: document.id,
    imageUrl: typeof document.imageUrl === "string" ? document.imageUrl : null,
    kind: (typeof document.kind === "string"
      ? document.kind
      : "choose_username") as UserNotification["kind"],
    readAt: typeof document.readAt === "string" ? document.readAt : null,
    title: typeof document.title === "string" ? document.title : "",
  };
}

export async function listNotifications(
  uid: string
): Promise<UserNotification[]> {
  const documents = await listUserDocuments(uid, NOTIFICATIONS_COLLECTION);

  return documents
    .map(toUserNotification)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function countUnreadNotifications(uid: string) {
  const notifications = await listNotifications(uid);
  return notifications.filter((notification) => notification.readAt === null)
    .length;
}

export async function createNotification(
  uid: string,
  template: NotificationTemplate,
  options?: { dedupeKey?: string }
): Promise<UserNotification | null> {
  const id = options?.dedupeKey ?? createDocumentId("ntf");

  // A dedupe key makes repeat dispatches idempotent, which matters for the
  // webhook fulfilment path that Stripe is allowed to retry.
  if (options?.dedupeKey) {
    const existing = await getUserDocument(uid, NOTIFICATIONS_COLLECTION, id);

    if (existing) {
      return null;
    }
  }

  const saved = await saveUserDocument(uid, NOTIFICATIONS_COLLECTION, id, {
    actionHref: template.actionHref,
    actionLabel: template.actionLabel,
    body: template.body,
    createdAt: new Date().toISOString(),
    imageUrl: template.imageUrl,
    kind: template.kind,
    readAt: null,
    title: template.title,
  });

  return toUserNotification(saved);
}

export async function setNotificationRead(
  uid: string,
  id: string,
  read: boolean
) {
  const existing = await getUserDocument(uid, NOTIFICATIONS_COLLECTION, id);

  if (!existing) {
    return null;
  }

  const saved = await saveUserDocument(uid, NOTIFICATIONS_COLLECTION, id, {
    readAt: read ? new Date().toISOString() : null,
  });

  return toUserNotification(saved);
}

export async function markAllNotificationsRead(uid: string) {
  const notifications = await listNotifications(uid);
  const readAt = new Date().toISOString();

  await Promise.all(
    notifications
      .filter((notification) => notification.readAt === null)
      .map((notification) =>
        saveUserDocument(uid, NOTIFICATIONS_COLLECTION, notification.id, {
          readAt,
        })
      )
  );

  return listNotifications(uid);
}

export async function deleteNotification(uid: string, id: string) {
  await deleteUserDocument(uid, NOTIFICATIONS_COLLECTION, id);
}

export async function deleteAllNotifications(uid: string) {
  await deleteUserCollection(uid, NOTIFICATIONS_COLLECTION);
}
