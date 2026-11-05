import { ImageResponse } from "next/og";

export const alt = "EduthArt - Buy Original Art Online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Fetches Gloock (the wordmark face) from Google Fonts at build time. Satori
 * needs the raw font file, and the site's `next/font` copy isn't reachable from
 * here. Returns null if the fetch fails so the card still renders, in a serif
 * fallback, instead of breaking the build.
 */
async function loadGloock(): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Gloock")
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
 * ground, ink wordmark and brass bars to match the redesign. The bar geometry
 * mirrors components/brand-mark.tsx (the logo's source of truth), scaled up.
 */
export default async function OpengraphImage() {
  const font = await loadGloock();

  const bar = (top: number, width: number, from: string, to: string) => ({
    position: "absolute" as const,
    left: 0,
    top,
    width,
    height: 46,
    borderRadius: 23,
    background: `linear-gradient(135deg, ${from}, ${to})`,
  });

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
        fontFamily: font ? "Gloock" : "serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "relative",
            width: 190,
            height: 190,
            marginRight: 48,
          }}
        >
          <div style={bar(18, 190, "#e3c9a2", "#d4af7c")} />
          <div style={bar(72, 136, "#dcbc8f", "#c9a069")} />
          <div style={bar(126, 190, "#d4af7c", "#b08a52")} />
        </div>
        <div style={{ display: "flex", fontSize: 150, lineHeight: 1 }}>
          EduthArt
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 56,
          width: 120,
          height: 4,
          background: "#85622f",
        }}
      />
      <div
        style={{
          display: "flex",
          marginTop: 32,
          fontSize: 38,
          lineHeight: 1.3,
          color: "#4a4a4a",
        }}
      >
        Original art, straight from the artists who make it.
      </div>
    </div>,
    {
      ...size,
      fonts: font
        ? [{ name: "Gloock", data: font, style: "normal", weight: 400 }]
        : undefined,
    }
  );
}
