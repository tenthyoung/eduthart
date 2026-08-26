"use client";

/**
 * The comparison tray.
 *
 * Comparing pieces is a scratchpad, not a saved preference, so it lives in
 * session storage: it survives navigating between artworks and disappears when
 * the collector closes the tab.
 */
const COMPARISON_STORAGE_KEY = "eduthart:comparison";
export const COMPARISON_CHANGED_EVENT = "eduthart:comparison-changed";
export const MAX_COMPARISON_ITEMS = 4;

function read(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(COMPARISON_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((key): key is string => typeof key === "string")
      : [];
  } catch {
    return [];
  }
}

function write(keys: string[]) {
  if (typeof window === "undefined") {
    return keys;
  }

  window.sessionStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(keys));
  window.dispatchEvent(new Event(COMPARISON_CHANGED_EVENT));
  return keys;
}

export function listComparison() {
  return read();
}

export function isInComparison(artworkKey: string) {
  return read().includes(artworkKey);
}

export function addToComparison(artworkKey: string) {
  const keys = read();

  if (keys.includes(artworkKey)) {
    return keys;
  }

  // Four side-by-side columns is the most that stays readable on a laptop, so
  // the oldest entry drops out rather than the add silently failing.
  return write([...keys, artworkKey].slice(-MAX_COMPARISON_ITEMS));
}

export function removeFromComparison(artworkKey: string) {
  return write(read().filter((key) => key !== artworkKey));
}

export function toggleComparison(artworkKey: string) {
  return isInComparison(artworkKey)
    ? removeFromComparison(artworkKey)
    : addToComparison(artworkKey);
}

export function clearComparison() {
  return write([]);
}

export function subscribeToComparison(listener: (keys: string[]) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handle = () => listener(read());
  window.addEventListener(COMPARISON_CHANGED_EVENT, handle);
  window.addEventListener("storage", handle);

  return () => {
    window.removeEventListener(COMPARISON_CHANGED_EVENT, handle);
    window.removeEventListener("storage", handle);
  };
}
