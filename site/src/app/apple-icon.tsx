import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home-screen icon — the same three-bars "E" as icon.tsx, scaled to
 * Apple's 180px canvas and left full-bleed square because iOS applies its
 * own corner mask.
 */
export default function AppleIcon() {
  const bar = (top: number, width: number, from: string, to: string) => ({
    position: "absolute" as const,
    left: 39,
    top,
    width,
    height: 28,
    borderRadius: 14,
    background: `linear-gradient(135deg, ${from}, ${to})`,
  });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#1f1f1f",
      }}
    >
      <div style={bar(28, 101, "#e3c9a2", "#d4af7c")} />
      <div style={bar(76, 73, "#dcbc8f", "#c9a069")} />
      <div style={bar(124, 101, "#d4af7c", "#b08a52")} />
    </div>,
    size
  );
}
