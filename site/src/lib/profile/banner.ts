/**
 * Profile banner spec.
 *
 * 1500 x 500 (3:1) matches the header size used by X/Twitter, so artists can
 * reuse artwork they already sized for social profiles, and every banner on the
 * site renders at the same proportions.
 */
export const BANNER_WIDTH = 1500;
export const BANNER_HEIGHT = 500;
export const BANNER_ASPECT_RATIO = BANNER_WIDTH / BANNER_HEIGHT;
export const BANNER_DIMENSIONS_LABEL = `${BANNER_WIDTH} × ${BANNER_HEIGHT}`;

export const MAX_BANNER_FILE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_BANNER_TYPES_ATTRIBUTE = ACCEPTED_BANNER_TYPES.join(",");

export const BANNER_OUTPUT_TYPE = "image/jpeg";
export const BANNER_OUTPUT_QUALITY = 0.92;

export function isAcceptedBannerType(type: string) {
  return (ACCEPTED_BANNER_TYPES as readonly string[]).includes(type);
}
