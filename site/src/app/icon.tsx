import { ImageResponse } from "next/og";

import { BRAND_MARK_ASPECT, brandMarkTwoToneDataUrl } from "@/lib/brand/mark-svg";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * The favicon — the brushstroke E in ink, gold middle stroke, on a rounded white square. The tile
 * keeps the ink mark readable on dark browser chrome as well as light; the
 * mark itself is the same artwork components/brand-mark.tsx masks with.
 */
export default function Icon() {
  const height = 44;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        borderRadius: 14,
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
