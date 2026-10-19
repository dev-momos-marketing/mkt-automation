// Momos brand tokens (Brand Guidelines v4 / Website 3.0), adapted for video.
// Web pixel sizes are scaled up for video in `type` below; colors are verbatim.
import { loadFont } from "@remotion/google-fonts/Poppins";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const color = {
  brand: "#D73E33", // primary CTA, headlines
  brandFg: "#FF787A", // highlights on dark only (2.4:1 on beige)
  brandBg: "#FFEBEB",
  brandPale: "#FDF7F6",

  ink: "#14181D",
  neutral700: "#353D4D",
  textSecondary: "#4D4D4D",
  gray600: "#535862",
  grayDisabled: "#A0A0A0",
  border: "#E0E0E0",

  white: "#FFFFFF",
  beige: "#FBF8F4",
  warmCream: "#F5EDE8",
  bgSecondary: "#F9F9F9",
  bgBlue: "#F4F7FA",

  purple: "#9886FF",
  purpleDark: "#7057FF",
  olive: "#CAD7C0",
  oliveDark: "#5F7536",
  ochre: "#E9D39C",
  ochreDark: "#A07820",
  blue: "#BFD4E3",
  blueDark: "#3A6080",
  warning: "#FFD12E",
  warningDark: "#9B7A00",
} as const;

// Video type scale for a 1080px-tall (16:9) or 1080px-wide (1:1, 9:16) frame.
// Roughly 1.5-2x the web scale: video is watched small, compressed, and for seconds.
export const type = {
  display: { fontSize: 140, fontWeight: 700, lineHeight: 1.1 },
  h1: { fontSize: 96, fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: 72, fontWeight: 700, lineHeight: 1.25 },
  h3: { fontSize: 56, fontWeight: 500, lineHeight: 1.3 },
  body: { fontSize: 40, fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: 32, fontWeight: 500, lineHeight: 1.5 }, // floor; nothing smaller
} as const;

// Web radii/shadows doubled for 1080p video.
export const radius = { sm: 8, md: 16, lg: 24, xl: 32, full: 9999 } as const;

export const shadow = {
  s: "0px 8px 30px rgba(0, 0, 0, 0.08)",
  m: "0px 8px 30px rgba(0, 0, 0, 0.16)",
  l: "0px 22px 56px rgba(0, 0, 0, 0.12)",
} as const;

// 4px base unit, doubled for video.
export const space = (n: number) => n * 8;
