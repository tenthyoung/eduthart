import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * The favicon — the three-bars "E" from the brand mark on a rounded ink
 * square, so the gold reads on both light and dark browser chrome. The bar
 * geometry mirrors components/brand-mark.tsx (the source of truth for the
 * logo); satori can't paint one gradient across separate elements, so each
 * bar carries its own slice of the light-gold-to-deep-gold ramp.
 */
export default function Icon() {
  const bar = (top: number, width: number, from: string, to: string) => ({
    position: "absolute" as const,
    left: 14,
    top,
    width,
    height: 10,
    borderRadius: 5,
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
        borderRadius: 14,
      }}
    >
      <div style={bar(10, 36, "#e3c9a2", "#d4af7c")} />
      <div style={bar(27, 26, "#dcbc8f", "#c9a069")} />
      <div style={bar(44, 36, "#d4af7c", "#b08a52")} />
    </div>,
    size
  );
}
