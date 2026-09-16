import { sendNotificationEmail } from "@/lib/notifications/email";
import { isEmailAllowed } from "@/lib/notifications/preferences";
import { createNotification } from "@/lib/notifications/store";
import type { NotificationTemplate } from "@/lib/notifications/types";

export type NotificationRecipient = {
  email: string | null;
  uid: string;
};

/**
 * Record a notification in the recipient's centre and, when the template has a
 * subject, email them as well.
 *
 * Email preferences are checked here rather than at each call site because
 * this is the only path email leaves by — a caller that forgot to ask would
 * otherwise send mail the recipient had switched off.
 *
 * The preference governs the email alone. The in-app notification is always
 * written, so switching off a category quietens the inbox without hiding the
 * record of what happened.
 *
 * Callers are side-effect paths such as checkout fulfilment, so failures are
 * contained here: a notification that cannot be written must not roll back the
 * purchase that produced it.
 */
export async function dispatchNotification(
  recipient: NotificationRecipient,
  template: NotificationTemplate,
  options?: { dedupeKey?: string }
) {
  try {
    const notification = await createNotification(
      recipient.uid,
      template,
      options
    );

    // A deduped repeat returns null, which also means the email already went out.
    if (!notification) {
      return null;
    }

    if (
      recipient.email &&
      (await isEmailAllowed(recipient.uid, template.kind))
    ) {
      await sendNotificationEmail(recipient.email, template);
    }

    return notification;
  } catch (error) {
    console.error("Unable to dispatch notification", error);
    return null;
  }
}

export async function dispatchNotificationToMany(
  recipients: NotificationRecipient[],
  buildTemplate: (recipient: NotificationRecipient) => NotificationTemplate,
  options?: { dedupeKey?: string }
) {
  await Promise.all(
    recipients.map((recipient) =>
      dispatchNotification(recipient, buildTemplate(recipient), options)
    )
  );
}
