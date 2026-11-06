import { ImageResponse } from "next/og";

import { BRAND_MARK_ASPECT, brandMarkTwoToneDataUrl } from "@/lib/brand/mark-svg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home-screen icon — the same brushstroke E as icon.tsx, scaled to
 * Apple's 180px canvas and left full-bleed square because iOS applies its
 * own corner mask.
 */
export default function AppleIcon() {
  const height = 112;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <img
        alt=""
        height={height}
        src={brandMarkTwoToneDataUrl()}
        width={Math.round(height * BRAND_MARK_ASPECT)}
      />
    </div>,
    size
  );
}
