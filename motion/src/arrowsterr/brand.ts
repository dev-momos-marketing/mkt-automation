// Arrowsterr brand tokens (Brand system v5, "the Navigator"), adapted for video.
// Colors are verbatim from tokens.json (light theme). Fonts are bundled in
// public/fonts/arrowsterr (all OFL) so renders work offline.
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const font = {
  display: "Funnel Display", // headings only, 18px+, weight 600 (700 for hero)
  sans: "Inter", // everything you read or click
  mono: "Geist Mono", // every number, rank and delta
} as const;

const FILES: [string, string, string][] = [
  [font.display, "600", "funnel-display-latin-600-normal.woff2"],
  [font.display, "700", "funnel-display-latin-700-normal.woff2"],
  [font.sans, "400", "inter-latin-400-normal.woff2"],
  [font.sans, "500", "inter-latin-500-normal.woff2"],
  [font.sans, "600", "inter-latin-600-normal.woff2"],
  [font.mono, "500", "geist-mono-latin-500-normal.woff2"],
];
for (const [family, weight, file] of FILES) {
  loadFont({ family, weight, url: staticFile(`fonts/arrowsterr/${file}`) });
}

export const color = {
  // The brand four
  signal: "#0943B0", // the one thing to click, "you" in a chart (~10% of a view)
  signalText: "#0943B0", // payoff words, eyebrows, links
  signalTint: "#EEF3FF",
  onSignal: "#FFFFFF",
  sky: "#4F7FE0", // shape colour only, never text; nearest rival in charts
  night: "#0B1B3F", // closing band, title slides, Zippie's body
  onNight: "#FFFFFF",
  onNight2: "#B3C7F2",
  signalOnNight: "#8FB0FF", // payoff word on night
  spark: "#F5A70A", // the win. One per view, under 1%
  sparkText: "#8A4B00",
  sparkTint: "#FFF4DC",
  onSpark: "#0B1B3F",

  // Greys carry ~85% of every view
  inkStrong: "#0B1B3F",
  ink: "#333333",
  ink2: "#666666",
  ink3: "#707070",
  bg: "#FFFFFF",
  bg2: "#FCFCFC",
  bg3: "#F1F1F1",
  bg4: "#EBEBEB",
  line: "#EBEBEB",
  lineFaint: "#F1F1F1",
  lineStrong: "#D6D6D6",

  pos: "#0B7A54",
  posTint: "#E6F4EE",
  neg: "#C02A35",
  negTint: "#FBEBEC",
} as const;

// Web scale x2 for 1080p video. Funnel Display tracking from the guideline.
export const type = {
  hero: { fontFamily: font.display, fontSize: 128, fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.035em" },
  display: { fontFamily: font.display, fontSize: 96, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.03em" },
  h1: { fontFamily: font.display, fontSize: 72, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.025em" },
  h2: { fontFamily: font.display, fontSize: 56, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.02em" },
  lead: { fontFamily: font.sans, fontSize: 40, fontWeight: 400, lineHeight: 1.5 },
  ui: { fontFamily: font.sans, fontSize: 32, fontWeight: 400, lineHeight: 1.5 },
  label: { fontFamily: font.sans, fontSize: 28, fontWeight: 500, lineHeight: 1.3 },
  stat: { fontFamily: font.mono, fontSize: 112, fontWeight: 500, lineHeight: 1.0, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" },
  num: { fontFamily: font.mono, fontSize: 32, fontWeight: 500, lineHeight: 1.4, fontVariantNumeric: "tabular-nums" },
} as const;

// Shape: hairline borders, no shadows, no gradients, no pills.
export const radius = { sm: 8, md: 16, lg: 24 } as const;
export const notch = { button: 16, frame: 32 } as const; // 45° cut, top-right

// Motion: quick and plain, things enter rising up or moving right.
export const ease = [0.22, 1, 0.36, 1] as const;

// Brand motif shapes from the system's stylesheet (viewBox noted per path).
export const motif = {
  // The Climb: two stacked chevrons pointing up. viewBox "4 24 56 39"
  climb:
    "M5.244 61.182 L29.322 26.159 A3.25 3.25 0 0 1 34.678 26.159 L58.756 61.182 Q59.663 62.5 58.063 62.5 L53.375 62.5 Q51.775 62.5 50.868 61.182 L32 33.737 L13.132 61.182 Q12.225 62.5 10.625 62.5 L5.937 62.5 Q4.337 62.5 5.244 61.182 Z M18.593 61.182 L29.322 45.575 A3.25 3.25 0 0 1 34.678 45.575 L45.407 61.182 Q46.314 62.5 44.714 62.5 L40.026 62.5 Q38.426 62.5 37.519 61.182 L32 53.153 L26.481 61.182 Q25.574 62.5 23.974 62.5 L19.286 62.5 Q17.686 62.5 18.593 61.182 Z",
  // The Spark: four-point star. viewBox "23.4 3 17.25 17.25"
  spark:
    "M32 3 C33.76 9.555 33.76 9.555 39.331 11.625 C33.76 13.695 33.76 13.695 32 20.25 C30.241 13.695 30.241 13.695 24.669 11.625 C30.241 9.555 30.241 9.555 32 3 Z",
} as const;
