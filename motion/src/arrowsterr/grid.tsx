import { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color } from "./brand";
import { absCue, CARD_LAND, sceneLength, sceneStart, SCENES, type Scene } from "./timeline";

// A ripple through the dot field: a ring travelling out from (x, y) in 0..1 coords.
type Ripple = { at: number; x: number; y: number; amp: number; speed?: number };

const SPACING = 32;

// Every beat that physically hits the grid. Positions are rough per-layout centres.
const ripples = (vertical: boolean): Ripple[] => {
  const r: Ripple[] = [];
  // Keystrokes while the prompt types.
  for (let i = 0; i < 26; i++) r.push({ at: absCue("ask-when") - 4 + i * 2.4, x: 0.5, y: 0.5, amp: 5, speed: 9 });
  // Cards landing on the shortlist.
  CARD_LAND.forEach((f, i) =>
    r.push({ at: sceneStart("shortlist") + f, x: vertical ? 0.5 : 0.27 + i * 0.23, y: vertical ? 0.42 + i * 0.12 : 0.55, amp: 14 }),
  );
  // Stamps on the 5 engines, then the shatter.
  for (let i = 0; i < 5; i++) r.push({ at: absCue("inv-zero") + 4 + i * 4, x: 0.18 + i * 0.16, y: vertical ? 0.4 : 0.38, amp: 12 });
  r.push({ at: absCue("inv-you"), x: 0.5, y: vertical ? 0.62 : 0.74, amp: 26, speed: 18 });
  // The logo forge shockwave and the drop.
  r.push({ at: absCue("meet-name") + 18, x: 0.5, y: vertical ? 0.3 : 0.28, amp: 40, speed: 22 });
  // Falling blocks in the plan.
  for (let i = 0; i < 5; i++) r.push({ at: absCue("plan-2") + 6 + i * 6, x: vertical ? 0.2 + i * 0.15 : 0.56 + i * 0.08, y: 0.7, amp: 8 });
  // Sonic boom, the Spark, the close.
  r.push({ at: absCue("ship") + 10, x: 0.5, y: 0.5, amp: 34, speed: 26 });
  r.push({ at: absCue("land-rec"), x: 0.5, y: vertical ? 0.45 : 0.5, amp: 44, speed: 20 });
  r.push({ at: absCue("close-start"), x: 0.5, y: 0.55, amp: 26, speed: 20 });
  return r;
};

// How far the "camera" has travelled: each scene change pans the world left.
const PAN = new Set<Scene>(["shortlist", "meet", "see", "find", "plan", "create", "land"]);
const panOffset = (frame: number, width: number) => {
  let x = 0;
  for (const s of SCENES) {
    if (!PAN.has(s)) continue;
    const at = sceneStart(s);
    x += interpolate(frame, [at - 10, at + 10], [0, width * 0.45], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.65, 0, 0.35, 1),
    });
  }
  // "Ship it" whips the camera far to the right.
  const ship = sceneStart("ship");
  x += interpolate(frame, [ship + 6, ship + sceneLength("ship")], [0, width * 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.5, 0, 0.2, 1),
  });
  return x;
};

// The living flight grid: a field of dots that ripples, warps and scrolls with the camera.
export const LivingGrid: React.FC<{ dim?: number }> = ({ dim = 0 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const events = useMemo(() => ripples(vertical), [vertical]);

  const pan = panOffset(frame, width) % SPACING;
  const active = events.filter((e) => frame >= e.at && frame < e.at + 60);
  const cols = Math.ceil(width / SPACING) + 2;
  const rows = Math.ceil(height / SPACING) + 1;

  const dots: React.ReactNode[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const bx = i * SPACING - pan;
      const by = j * SPACING + SPACING / 2;
      let dx = 0;
      let dy = 0;
      let glow = 0;
      for (const e of active) {
        const t = frame - e.at;
        const ex = e.x * width;
        const ey = e.y * height;
        const d = Math.hypot(bx - ex, by - ey) || 1;
        const front = t * (e.speed ?? 14);
        const band = (d - front) / 60;
        if (Math.abs(band) > 2.5) continue;
        const k = Math.exp(-band * band) * e.amp * Math.exp(-t / 22);
        dx += ((bx - ex) / d) * k;
        dy += ((by - ey) / d) * k;
        glow = Math.max(glow, Math.min(1, k / 10));
      }
      dots.push(
        <circle
          key={j * cols + i}
          cx={bx + dx}
          cy={by + dy}
          r={2 + glow * 2}
          fill={glow > 0.15 ? color.sky : color.lineStrong}
          opacity={0.9 - dim * 0.6}
        />,
      );
    }
  }

  return (
    <AbsoluteFill style={{ background: color.bg2 }}>
      <svg width={width} height={height}>{dots}</svg>
    </AbsoluteFill>
  );
};
