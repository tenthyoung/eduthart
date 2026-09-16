/**
 * Six warm, gallery-appropriate gradients. Each one's lighter stop clears
 * 4.6:1 against white, so the initials stay legible on any of them and the
 * avatar reads the same in light and dark mode instead of following the theme.
 */
export const AVATAR_PALETTES = [
  "from-[#956d30] to-[#6e5124]",
  "from-[#ac6046] to-[#7f4734]",
  "from-[#667a5f] to-[#4b5a46]",
  "from-[#5e7795] to-[#46586e]",
  "from-[#8a5f78] to-[#664659]",
  "from-[#9d6856] to-[#744d40]",
] as const;

/**
 * Two letters where we have a full name, one where we only have a single word
 * or an email address, and an empty string when there is nothing to work with
 * -- the avatar falls back to a glyph for that last case.
 *
 * Only ASCII-ish word characters count, so a name that is punctuation or an
 * emoji does not produce a meaningless initial.
 */
export function initialsFor(name?: string | null, email?: string | null) {
  const words =
    name
      ?.trim()
      .split(/\s+/)
      .filter((word) => /\p{L}|\p{N}/u.test(word)) ?? [];

  const firstLetter = (word: string) =>
    word.match(/\p{L}|\p{N}/u)?.[0]?.toUpperCase() ?? "";

  if (words.length > 1) {
    return `${firstLetter(words[0])}${firstLetter(words[words.length - 1])}`;
  }

  if (words.length === 1) {
    return firstLetter(words[0]);
  }

  return firstLetter(email?.trim().split("@")[0] ?? "");
}

/**
 * Stable per-person colour: the same account keeps its gradient across
 * sessions and devices rather than shuffling on every render.
 */
export function paletteFor(seed: string) {
  let hash = 5381;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }

  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}
