"use client";

const USERNAME_UPDATED_EVENT = "eduthart:username-updated";

export function notifyUsernameUpdated(username: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<string | null>(USERNAME_UPDATED_EVENT, {
      detail: username,
    }),
  );
}

export function subscribeToUsernameUpdates(
  callback: (username: string | null) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<string | null>;
    callback(customEvent.detail ?? null);
  };

  window.addEventListener(USERNAME_UPDATED_EVENT, handler);

  return () => {
    window.removeEventListener(USERNAME_UPDATED_EVENT, handler);
  };
}
