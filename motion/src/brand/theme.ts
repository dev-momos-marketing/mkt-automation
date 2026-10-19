import { Easing } from "remotion";

// Single source of truth for momos video design decisions.
// Scenes import from here; never hard-code hex, fonts, easings or durations.
// Brand values come from the live momos.com demo form (lead-routing/framer/LeadForm.tsx).

export const color = {
  ink: "#15181E", // primary text
  inkSoft: "#4D4D4D", // secondary text
  inkMuted: "#8A8784", // meta text, empty stars
  red: "#D73E33", // THE accent: one per frame, never decorative
  coral: "#FF787A", // only inside the CTA button gradient
  cream: "#FBF8F4", // stage background
  blush: "#FFF0F0", // selected / success tint
  white: "#FFFFFF", // cards
  hairline: "rgba(21,24,30,0.08)",
} as const;

export const shadow = {
  card: "0px 1px 4px rgba(191,187,186,0.10), 0px 6px 24px rgba(191,187,186,0.22), 0px 24px 80px rgba(191,187,186,0.38)",
  // The momos.com CTA, exactly as on the website. Only on the marketing CTA, never on product UI.
  cta: "0px 6px 20px rgba(255,120,122,0.6), 0px 0px 0px 8px rgba(255,120,122,0.08)",
} as const;

export const radius = { card: 32, button: 28, pill: 999 } as const;

export const font = {
  family: "Poppins",
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// Type scale for a 1080px-wide frame. Scale with width for other formats.
// Remotion floors: headline >= 84px, must-read text >= 44px.
export const type = {
  display: 112,
  headline: 88,
  body: 44, // must-read floor
  meta: 34, // non-essential labels only (timestamps, source)
  tracking: { headline: "-0.035em", body: "-0.01em" },
  lineHeight: { headline: 1.08, body: 1.38 },
} as const;

// Easing: strong, asymmetric curves. No CSS defaults, no linear (except constant drift).
export const ease = {
  enter: Easing.bezier(0.16, 1, 0.3, 1), // expo-out: reveals, text, cards arriving
  move: Easing.bezier(0.77, 0, 0.175, 1), // on-screen moves, camera
  exit: Easing.bezier(0.7, 0, 0.84, 0), // leaving: fast, at ~45% of enter duration
  settle: Easing.spring({ damping: 200 }), // no overshoot: text, opacity, UI
  premium: Easing.spring({ stiffness: 100, damping: 16 }), // damping ratio 0.8: shapes, cards
} as const;

// Durations in seconds; convert with `* fps` at the call site.
export const dur = {
  micro: 0.2, // presses, ticks
  enter: 0.6,
  hero: 0.8,
  move: 0.7,
  exit: 0.27, // 45% of enter
  stagger: 0.06, // list items 40-80ms
  pop: 0.2, // 6 frames @30fps: scale 1 -> 1.08 -> 1
} as const;

// Music grid. Cut and land hits on beats; compute from the beat index, never by summing rounded durations.
export const BPM = 120;
export const beat = (n: number, fps: number, bpm: number = BPM) =>
  Math.round((n * fps * 60) / bpm);

// Composite safe box (Meta Reels / YouTube Shorts / TikTok), 1080x1920.
// Headline, UI focal point, logo and captions must sit inside it.
export const safe916 = { left: 120, right: 888, top: 288, bottom: 1248 } as const;

// The content column: the safe box inset by 60px on every side, so camera drift and
// shadows never cross the box. Every card shares this width; stacks fit y 348-1188.
export const column916 = { left: 180, right: 828, width: 648, top: 348, bottom: 1188 } as const;
