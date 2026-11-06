import { ImageResponse } from "next/og";

import {
  BRAND_MARK_ASPECT,
  brandMarkTwoToneDataUrl,
} from "@/lib/brand/mark-svg";

export const alt = "EduthArt - Buy Original Art Online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Fetches a weight of Inter Tight (the wordmark face) from Google Fonts at
 * build time. Satori needs the raw font file, and the site's `next/font` copy
 * isn't reachable from here. Returns null if the fetch fails so the card still
 * renders, in a sans fallback, instead of breaking the build.
 */
async function loadInterTight(weight: 500 | 700): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Inter+Tight:wght@${weight}`
      )
    ).text();
    const url = css.match(
      /src: url\((.+?)\) format\('(opentype|truetype)'\)/
    )?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/**
 * The link-preview card for the whole site: shown by Messenger, iMessage,
 * Slack, LinkedIn and X whenever a page doesn't set its own image. White
 * ground, the ink brushstroke E and the lowercase wordmark, as in the header.
 */
export default async function OpengraphImage() {
  const [bold, medium] = await Promise.all([
    loadInterTight(700),
    loadInterTight(500),
  ]);
  const fonts = [
    bold && { name: "Inter Tight", data: bold, style: "normal", weight: 700 },
    medium && {
      name: "Inter Tight",
      data: medium,
      style: "normal",
      weight: 500,
    },
  ].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 500 | 700;
  }[];
  const markHeight = 168;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 96px",
        background: "#ffffff",
        color: "#1f1f1f",
        fontFamily: fonts.length ? "Inter Tight" : "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          alt=""
          height={markHeight}
          src={brandMarkTwoToneDataUrl()}
          style={{ marginRight: 36 }}
          width={Math.round(markHeight * BRAND_MARK_ASPECT)}
        />
        <div
          style={{
            display: "flex",
            fontSize: 150,
            fontWeight: 700,
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          eduthart
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 56,
          width: "100%",
          height: 2,
          background: "#1f1f1f",
        }}
      />
      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: 38,
          fontWeight: 500,
          lineHeight: 1.3,
          color: "#4a4a4a",
        }}
      >
        Original art, straight from the artists who make it.
      </div>
    </div>,
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
