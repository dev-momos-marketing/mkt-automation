import { lightLeak } from "@remotion/effects/light-leak";
import { noise2D } from "@remotion/noise";
import {
  AbsoluteFill,
  Img,
  interpolate,
  Solid,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { color, radius, shadow, type } from "../brand";

export const ALFIE_ICON = staticFile("brand/alfie.png");
export const MOMOS_LOGO = staticFile("brand/momos-logo.png");

// One beat at 120 bpm, 30fps. Cuts and staggers snap to this grid.
export const BEAT = 15;

export const useIsVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

// No-bounce spring by default: Momos UI motion is warm and calm.
export const useEnter = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// Decaying, noise-driven camera shake starting at `at`.
export const useShake = (at: number, strength = 18, length = 10) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > length) return { x: 0, y: 0 };
  const decay = 1 - t / length;
  return {
    x: noise2D("shake-x", t * 0.6, at) * strength * decay,
    y: noise2D("shake-y", t * 0.6, at) * strength * decay,
  };
};

export const Rise: React.FC<{
  delay?: number;
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, distance = 40, children, style }) => {
  const p = useEnter(delay);
  return (
    <div style={{ opacity: p, translate: `0 ${(1 - p) * distance}px`, ...style }}>
      {children}
    </div>
  );
};

// Word-by-word mask reveal: each word slides up from behind its own clip.
export const MaskWords: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, stagger = 4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ margin: 0, ...style }}>
      {text.split(" ").map((word, i) => {
        const p = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 200 },
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "top",
              paddingBottom: "0.1em",
              marginRight: "0.26em",
            }}
          >
            <span style={{ display: "inline-block", translate: `0 ${(1 - p) * 110}%` }}>
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
};

// Source art is 418x512; the dumpling (Alfie's head and body) is centered near (210, 175).
const ALFIE_W = 418;
const ALFIE_H = 512;

// Head crop of the mascot on a brand-red disc (the cream art vanishes on beige).
export const AlfieAvatar: React.FC<{ size: number; style?: React.CSSProperties }> = ({
  size,
  style,
}) => {
  const w = size * 1.12;
  const s = w / ALFIE_W;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius.full,
        background: color.brand,
        boxShadow: shadow.s,
        overflow: "hidden",
        ...style,
      }}
    >
      <Img
        src={ALFIE_ICON}
        style={{
          position: "absolute",
          width: w,
          height: ALFIE_H * s,
          left: size / 2 - 210 * s,
          top: size * 0.6 - 175 * s,
          maxWidth: "none",
        }}
      />
    </div>
  );
};

// The full mascot with a gentle idle float.
export const AlfieFull: React.FC<{
  height: number;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ height, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const pop = useEnter(delay, 11);
  const t = Math.max(0, frame - delay);
  return (
    <Img
      src={ALFIE_ICON}
      style={{
        height,
        width: (height * ALFIE_W) / ALFIE_H,
        opacity: Math.min(1, pop * 2),
        scale: `${0.4 + pop * 0.6}`,
        translate: `0 ${Math.sin(t / 14) * height * 0.015}px`,
        rotate: `${Math.sin(t / 22) * 2.5}deg`,
        transformOrigin: "50% 90%",
        ...style,
      }}
    />
  );
};

export const Bubble: React.FC<{
  from: "guest" | "alfie";
  text: string;
  delay: number;
  // When set, the text types out over this many frames.
  typeFrames?: number;
  size?: number;
  style?: React.CSSProperties;
}> = ({ from, text, delay, typeFrames, size = 40, style }) => {
  const frame = useCurrentFrame();
  const p = useEnter(delay, 14);
  if (frame < delay) return null;

  const shown = typeFrames
    ? text.slice(
        0,
        Math.round(interpolate(frame, [delay, delay + typeFrames], [0, text.length], clamp)),
      )
    : text;
  const guest = from === "guest";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: guest ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 20,
        opacity: Math.min(1, p * 2),
        scale: `${0.7 + p * 0.3}`,
        transformOrigin: guest ? "right bottom" : "left bottom",
        ...style,
      }}
    >
      {!guest && <AlfieAvatar size={size * 1.8} />}
      <div
        style={{
          ...type.body,
          fontSize: size,
          maxWidth: "82%",
          padding: `${size * 0.6}px ${size * 0.85}px`,
          borderRadius: radius.lg,
          borderBottomRightRadius: guest ? radius.sm : radius.lg,
          borderBottomLeftRadius: guest ? radius.lg : radius.sm,
          background: guest ? color.ink : color.white,
          color: guest ? color.white : color.ink,
          boxShadow: guest ? shadow.m : shadow.s,
          border: guest ? "none" : `2px solid ${color.border}`,
        }}
      >
        {/* Reserve the full text height so the layout doesn't jump while typing. */}
        <span style={{ position: "relative", display: "block" }}>
          <span style={{ visibility: "hidden" }}>{text}</span>
          <span style={{ position: "absolute", inset: 0 }}>{shown}</span>
        </span>
      </div>
    </div>
  );
};

export const TypingDots: React.FC<{ from: number; to: number; size?: number }> = ({
  from,
  to,
  size = 40,
}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
      <AlfieAvatar size={size * 1.8} />
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: `${size * 0.75}px ${size * 0.85}px`,
          borderRadius: radius.lg,
          borderBottomLeftRadius: radius.sm,
          background: color.white,
          border: `2px solid ${color.border}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: radius.full,
              background: color.gray600,
              translate: `0 ${-8 * Math.max(0, Math.sin((frame - i * 4) / 3))}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// A check mark that draws itself inside an olive circle.
export const Check: React.FC<{ delay: number; size?: number }> = ({ delay, size = 64 }) => {
  const pop = useEnter(delay, 12);
  const draw = useEnter(delay + 4);
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius.full,
        background: color.olive,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        scale: `${pop}`,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
        <path
          d="M4 12.5l5 5L20 6.5"
          fill="none"
          stroke={color.oliveDark}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={26}
          strokeDashoffset={26 * (1 - draw)}
        />
      </svg>
    </div>
  );
};

// Film grain as an SVG turbulence layer; the seed changes every 2 frames.
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            seed={Math.floor(frame / 2)}
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

// Slow, noise-driven glowing shapes for the dark reveal.
export const LiquidGlow: React.FC<{ colors: string[]; opacity?: number }> = ({
  colors,
  opacity = 0.55,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const base = Math.min(width, height);
  return (
    <AbsoluteFill style={{ opacity, filter: `blur(${base * 0.09}px)` }}>
      {colors.map((c, i) => {
        const x = width / 2 + noise2D(`bx${i}`, frame * 0.008, i) * width * 0.28;
        const y = height / 2 + noise2D(`by${i}`, frame * 0.008, i + 10) * height * 0.22;
        const r = base * (0.22 + 0.06 * noise2D(`br${i}`, frame * 0.01, i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "42% 58% 55% 45%",
              rotate: `${frame * (i % 2 ? 0.6 : -0.4)}deg`,
              background: c,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// WebGL light leak on a Solid; screen-blended so it only adds light.
export const LightLeak: React.FC<{ duration: number; seed?: number; hueShift?: number }> = ({
  duration,
  seed = 3,
  hueShift = 330,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  if (frame > duration) return null;
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.7 }}>
      <Solid
        width={width}
        height={height}
        color="black"
        effects={[
          lightLeak({
            seed,
            hueShift,
            progress: interpolate(frame, [0, duration], [0, 1], clamp),
          }),
        ]}
      />
    </AbsoluteFill>
  );
};
