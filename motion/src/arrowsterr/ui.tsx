import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { color, ease, font, motif, notch, radius, type } from "./brand";

export const LOGO_COLOR = staticFile("arrowsterr/arrowsterr-logo-color.svg");
export const LOGO_WHITE = staticFile("arrowsterr/arrowsterr-logo-white.svg");

export const EASE = Easing.bezier(...ease);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const useIsVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

// Brand motion: quick and plain, no overshoot. 0 → 1 over `dur` frames.
export const useIn = (delay = 0, dur = 12) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + dur], [0, 1], { ...clamp, easing: EASE });
};

// Enter rising (8px on the web, 16px at 1080p) and fading in.
export const Rise: React.FC<{
  delay?: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, dur = 12, children, style }) => {
  const p = useIn(delay, dur);
  return <div style={{ opacity: p, translate: `0 ${(1 - p) * 16}px`, ...style }}>{children}</div>;
};

// Enter moving right.
export const Slide: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, style }) => {
  const p = useIn(delay, 12);
  return <div style={{ opacity: p, translate: `${(p - 1) * 32}px 0`, ...style }}>{children}</div>;
};

export const typed = (text: string, frame: number, start: number, cps = 1.4) =>
  text.slice(0, Math.max(0, Math.floor((frame - start) * cps)));

// The flight grid: 16px dot grid (32px at 1080p) in line-strong on bg-2.
export const FlightGrid: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <AbsoluteFill
    style={{
      background: color.bg2,
      backgroundImage: `radial-gradient(circle, ${color.lineStrong} 2px, transparent 2.5px)`,
      backgroundSize: "32px 32px",
      fontFamily: font.sans,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

// A product window: hairline border, no shadow, a quiet title bar.
export const Window: React.FC<{
  title: string;
  width?: number | string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}> = ({ title, width, children, style, bodyStyle }) => (
  <div
    style={{
      width,
      background: color.bg,
      border: `2px solid ${color.line}`,
      borderRadius: radius.lg,
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 32px",
        borderBottom: `2px solid ${color.line}`,
        background: color.bg2,
      }}
    >
      <span style={{ ...type.label, color: color.ink2 }}>{title}</span>
      <span style={{ ...type.num, fontSize: 24, color: color.ink3 }}>⌘K</span>
    </div>
    <div style={{ padding: 32, ...bodyStyle }}>{children}</div>
  </div>
);

// Target ticks: four L-shaped corner marks that say "look here". One set per view.
export const Ticks: React.FC<{
  delay: number;
  children: React.ReactNode;
  gap?: number;
  style?: React.CSSProperties;
}> = ({ delay, children, gap = 12, style }) => {
  const p = useIn(delay, 10);
  const off = gap + (1 - p) * 24;
  const arm = 28;
  const corner = (pos: React.CSSProperties, b: React.CSSProperties) => (
    <span style={{ position: "absolute", width: arm, height: arm, opacity: p, ...pos, ...b }} />
  );
  const line = `4px solid ${color.signalText}`;
  return (
    <div style={{ position: "relative", display: "inline-block", ...style }}>
      {children}
      {corner({ left: -off, top: -off }, { borderLeft: line, borderTop: line })}
      {corner({ right: -off, top: -off }, { borderRight: line, borderTop: line })}
      {corner({ left: -off, bottom: -off }, { borderLeft: line, borderBottom: line })}
      {corner({ right: -off, bottom: -off }, { borderRight: line, borderBottom: line })}
    </div>
  );
};

const CHEVRON = motif.climb.split(" M18.593")[0];

export const Chevron: React.FC<{ size: number; fill?: string; rotate?: number }> = ({
  size,
  fill = color.signal,
  rotate = 0,
}) => (
  <svg width={size} height={size * (39 / 56)} viewBox="4 24 56 39" style={{ rotate: `${rotate}deg`, flexShrink: 0 }}>
    <path d={CHEVRON} fill={fill} />
  </svg>
);

export const Climb: React.FC<{ size: number; fill?: string; style?: React.CSSProperties }> = ({
  size,
  fill = color.signal,
  style,
}) => (
  <svg width={size} height={size * (39 / 56)} viewBox="4 24 56 39" style={style}>
    <path d={motif.climb} fill={fill} />
  </svg>
);

export const SparkStar: React.FC<{ size: number; fill?: string }> = ({ size, fill = color.spark }) => (
  <svg width={size} height={size} viewBox="23.4 3 17.25 17.25" style={{ flexShrink: 0 }}>
    <path d={motif.spark} fill={fill} />
  </svg>
);

// A change next to its number: chevron + sign, readable without colour.
export const Delta: React.FC<{ text: string; size?: number }> = ({ text, size = 32 }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, ...type.num, fontSize: size, color: color.pos }}>
    <Chevron size={size * 0.7} fill={color.pos} />
    {text}
  </span>
);

type Tone = "neutral" | "signal" | "pos" | "neg" | "spark";
const TONES: Record<Tone, [string, string]> = {
  neutral: [color.bg3, color.ink2],
  signal: [color.signalTint, color.signalText],
  pos: [color.posTint, color.pos],
  neg: [color.negTint, color.neg],
  spark: [color.sparkTint, color.sparkText],
};

export const Tag: React.FC<{ tone?: Tone; children: React.ReactNode; style?: React.CSSProperties }> = ({
  tone = "neutral",
  children,
  style,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      ...type.label,
      fontWeight: 500,
      background: TONES[tone][0],
      color: TONES[tone][1],
      borderRadius: radius.sm,
      padding: "6px 16px",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

// The Notch: a 45 degree cut on the top-right corner. Primary buttons only.
export const NotchButton: React.FC<{
  label: string;
  variant?: "primary" | "onNight" | "ghostNight";
  pressed?: number;
  style?: React.CSSProperties;
}> = ({ label, variant = "primary", pressed = 0, style }) => {
  const cut = notch.button;
  const ghost = variant === "ghostNight";
  return (
    <div
      style={{
        ...type.label,
        fontSize: 34,
        fontWeight: 600,
        padding: "22px 44px",
        color: variant === "onNight" ? color.night : color.onSignal,
        background: variant === "primary" ? color.signal : variant === "onNight" ? color.bg : "transparent",
        border: ghost ? `2px solid ${color.onNight2}` : "none",
        borderRadius: radius.sm,
        clipPath: ghost ? undefined : `polygon(0 0, calc(100% - ${cut}px) 0, 100% ${cut}px, 100% 100%, 0 100%)`,
        scale: `${1 - pressed * 0.04}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </div>
  );
};

// Your brand as it appears to AI: a dashed grey ghost that fills in as you become visible.
export const BrandChip: React.FC<{ solid: number; size?: number; style?: React.CSSProperties }> = ({
  solid,
  size = 40,
  style,
}) => {
  const s = Math.max(0, Math.min(1, solid));
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.35,
        padding: `${size * 0.25}px ${size * 0.5}px`,
        borderRadius: radius.md,
        border: `3px ${s < 1 ? "dashed" : "solid"} ${s < 1 ? color.lineStrong : color.signal}`,
        background: s < 1 ? "transparent" : color.signalTint,
        ...style,
      }}
    >
      <span
        style={{
          width: size * 1.1,
          height: size * 1.1,
          borderRadius: radius.sm,
          background: s < 1 ? color.bg4 : color.signal,
          color: color.onSignal,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: font.sans,
          fontWeight: 600,
          fontSize: size * 0.6,
          opacity: 0.35 + 0.65 * s,
        }}
      >
        T
      </span>
      <span
        style={{
          fontFamily: font.sans,
          fontWeight: 600,
          fontSize: size,
          color: interpolateColor(s),
        }}
      >
        tablely.com
      </span>
    </span>
  );
};

const interpolateColor = (s: number) =>
  s >= 1 ? color.inkStrong : s > 0.5 ? color.ink2 : color.lineStrong;

export const Logo: React.FC<{ height: number; white?: boolean; style?: React.CSSProperties }> = ({
  height,
  white,
  style,
}) => <Img src={white ? LOGO_WHITE : LOGO_COLOR} style={{ height, ...style }} />;

// A heading with a payoff phrase in signal-text.
export const Headline: React.FC<{
  lead: string;
  payoff: string;
  size?: number;
  breakBefore?: boolean;
  onNight?: boolean;
  style?: React.CSSProperties;
}> = ({ lead, payoff, size = 96, breakBefore, onNight, style }) => (
  <div
    style={{
      ...type.display,
      fontSize: size,
      color: onNight ? color.onNight : color.inkStrong,
      textWrap: "balance",
      ...style,
    }}
  >
    {lead}
    {breakBefore ? <br /> : " "}
    <span style={{ color: onNight ? color.signalOnNight : color.signalText }}>{payoff}</span>
  </div>
);
