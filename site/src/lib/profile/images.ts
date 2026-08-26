/**
 * Profile image specs.
 *
 * Banners are 1500 x 500 (3:1), matching the header size used by X/Twitter so
 * artists can reuse artwork they already sized for social profiles. Profile
 * pictures are square and displayed in a circle.
 */

export const IMAGE_OUTPUT_TYPE = "image/jpeg";
export const IMAGE_OUTPUT_QUALITY = 0.92;

export const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const ACCEPTED_IMAGE_TYPES_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

export function isAcceptedImageType(type: string) {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

export const BANNER_WIDTH = 1500;
export const BANNER_HEIGHT = 500;
export const BANNER_DIMENSIONS_LABEL = `${BANNER_WIDTH} × ${BANNER_HEIGHT}`;

export const AVATAR_SIZE = 512;
export const AVATAR_DIMENSIONS_LABEL = `${AVATAR_SIZE} × ${AVATAR_SIZE}`;

export const BANNER_CROP_SPEC = {
  description: `Drag to reposition and zoom to frame your image. Banners are saved at ${BANNER_DIMENSIONS_LABEL} pixels (3:1).`,
  outputHeight: BANNER_HEIGHT,
  outputWidth: BANNER_WIDTH,
  submitLabel: "Save banner",
  submittingLabel: "Saving banner...",
  title: "Position your banner",
} as const;

export const AVATAR_CROP_SPEC = {
  circular: true,
  description: `Drag to reposition and zoom to frame your face. Profile pictures are saved at ${AVATAR_DIMENSIONS_LABEL} pixels and shown as a circle.`,
  outputHeight: AVATAR_SIZE,
  outputWidth: AVATAR_SIZE,
  submitLabel: "Save picture",
  submittingLabel: "Saving picture...",
  title: "Position your profile picture",
} as const;
