import { ImageResponse } from "next/og";

import { BRAND_MARK_ASPECT } from "@/lib/brand/logo";
import { brandMarkTwoToneDataUrl } from "@/lib/brand/mark-svg";

export const dynamic = "force-static";

const HEIGHT = 128;
const WIDTH = Math.round(HEIGHT * BRAND_MARK_ASPECT);

/**
 * The mark as a PNG on a transparent ground, for emails: mail clients won't
 * show SVG or data URLs, so `brandLogoHtml` points at this absolute URL.
 * Drawn large so it stays sharp at the 25px or so emails show it at.
 */
export function GET() {
  return new ImageResponse(
    // ImageResponse renders with Satori, which has no next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      height={HEIGHT}
      src={brandMarkTwoToneDataUrl()}
      width={WIDTH}
    />,
    { width: WIDTH, height: HEIGHT }
  );
}
