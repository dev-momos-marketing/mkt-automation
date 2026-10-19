import { noise2D } from "@remotion/noise";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { color, radius, shadow, type } from "../../brand";
import { clamp, MaskWords, useIsVertical } from "../ui";

const MESSAGES = [
  { channel: "Google review", text: "Cold fries, again." },
  { channel: "Post-visit survey", text: "Waited 25 minutes for pickup." },
  { channel: "App chat", text: "Where is my order?" },
  { channel: "Delivery app", text: "Missing a drink." },
  { channel: "Website chat", text: "Can I change my pickup time?" },
  { channel: "Post-visit survey", text: "Wrong order, nobody called back." },
  { channel: "Google review", text: "Still waiting on a reply." },
  { channel: "App chat", text: "My points didn't show up." },
  { channel: "Delivery app", text: "Food arrived cold." },
  { channel: "Website chat", text: "Do you have vegan options?" },
  { channel: "Google review", text: "Order was missing the sauce." },
  { channel: "Post-visit survey", text: "Rude at the counter." },
  { channel: "App chat", text: "Coupon code not working." },
  { channel: "Delivery app", text: "Wrong address on the bag." },
  { channel: "Website chat", text: "Is the Downtown store open?" },
  { channel: "Google review", text: "Two stars. Slow service." },
  { channel: "App chat", text: "Charged twice." },
  { channel: "Delivery app", text: "Half my order is missing." },
];

const SPAWN_END = 100; // last card lands here; arrivals accelerate
const COLLAPSE = [112, 138] as const;

export const CASCADE_LENGTH = 150;

// 2. Problem: messages from every channel pile up, faster and faster.
export const Cascade: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = useIsVertical();

  const tremble = interpolate(frame, [50, COLLAPSE[0]], [0, 7], clamp);
  const collapse = interpolate(frame, [...COLLAPSE], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.7, 0, 0.84, 0),
  });
  const landed = MESSAGES.filter((_, i) => frame >= spawnAt(i)).length;
  const unanswered = Math.round(
    interpolate(frame, [0, SPAWN_END], [3, 64], {
      ...clamp,
      easing: Easing.bezier(0.5, 0, 0.75, 0),
    }),
  );

  return (
    <AbsoluteFill
      style={{
        background: color.beige,
        overflow: "hidden",
        translate: `${noise2D("tx", frame * 0.5, 0) * tremble}px ${noise2D("ty", frame * 0.5, 0) * tremble}px`,
      }}
    >
      {MESSAGES.map((m, i) => {
        const at = spawnAt(i);
        if (frame < at) return null;
        const fall = spring({ frame: frame - at, fps, config: { damping: 13, mass: 0.7 } });
        const prev = spring({ frame: frame - at - 1, fps, config: { damping: 13, mass: 0.7 } });
        const x = width * (0.08 + random(`x${i}`) * (vertical ? 0.42 : 0.62));
        const y = height * (0.08 + random(`y${i}`) * 0.72);
        const startY = -400;
        const curY = interpolate(fall, [0, 1], [startY, y]);
        // Fake motion blur: blur proportional to vertical speed.
        const speed = Math.abs(curY - interpolate(prev, [0, 1], [startY, y]));
        const cx = width / 2 - 300;
        const cy = height / 2 - 60;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: interpolate(collapse, [0, 1], [x, cx]),
              top: interpolate(collapse, [0, 1], [curY, cy]),
              rotate: `${(random(`r${i}`) - 0.5) * 16 * (1 - collapse)}deg`,
              scale: `${1 - collapse}`,
              filter: `blur(${Math.min(8, speed * 0.04)}px)`,
              width: vertical ? 560 : 600,
              boxSizing: "border-box",
              padding: "26px 34px",
              borderRadius: radius.md,
              background: color.white,
              boxShadow: shadow.m,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ ...type.caption, color: color.gray600 }}>{m.channel}</div>
            <div style={{ ...type.body, fontWeight: 500, color: color.ink }}>{m.text}</div>
          </div>
        );
      })}

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: vertical ? "stretch" : "flex-start",
          padding: vertical ? "0 64px 260px" : "0 120px 96px",
          opacity: 1 - collapse,
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            ...type.caption,
            fontWeight: 700,
            color: color.white,
            background: color.brand,
            borderRadius: radius.sm,
            padding: "8px 24px",
            marginBottom: 24,
            fontVariantNumeric: "tabular-nums",
            scale: `${landed > 0 ? 1 + 0.06 * Math.max(0, 1 - ((frame - spawnAt(landed - 1)) / 4)) : 1}`,
          }}
        >
          {unanswered} unanswered
        </div>
        <div
          style={{
            background: color.ink,
            borderRadius: radius.md,
            padding: "28px 44px",
            alignSelf: "flex-start",
          }}
        >
          <MaskWords
            text="Every night, it piles up."
            delay={8}
            style={{ ...type.h2, color: color.white }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Arrivals accelerate: early cards are spaced out, later ones pour in.
const spawnAt = (i: number) =>
  Math.round(Math.pow(i / (MESSAGES.length - 1), 0.55) * SPAWN_END);
