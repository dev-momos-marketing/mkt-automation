import { getLength, getPointAtLength as rawPoint, getTangentAtLength as rawTangent } from "@remotion/paths";

const ORIGIN = { x: 0, y: 0 };
export const getPointAtLength = (d: string, l: number) => rawPoint(d, l) ?? ORIGIN;
const getTangentAtLength = (d: string, l: number) => rawTangent(d, l) ?? { x: 1, y: 0 };
import { noise2D } from "@remotion/noise";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { color, font, motif, radius, type } from "./brand";
import { clamp, EASE } from "./ui";

// ------------------------------------------------------------ camera helpers

// Scene wrapper: slides in from the right and out to the left with motion blur,
// so back-to-back scenes read as one camera move across the grid.
// `zoomOut` flies the camera *through* a point (in % of the frame) instead of
// panning; `zoomIn` arrives from a pulled-back, blurred wide shot.
export const Pan: React.FC<{
  children: React.ReactNode;
  enter?: boolean;
  exit?: boolean;
  dur?: number;
  zoomIn?: boolean;
  zoomOut?: { x: number; y: number };
}> = ({ children, enter = true, exit = true, dur = 10, zoomIn, zoomOut }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const inP = enter ? interpolate(frame, [0, dur], [1, 0], { ...clamp, easing: EASE }) : 0;
  const outP = exit
    ? interpolate(frame, [durationInFrames - dur, durationInFrames], [0, 1], {
        ...clamp,
        easing: Easing.bezier(0.55, 0, 1, 0.45),
      })
    : 0;
  if (zoomIn || zoomOut) {
    const sIn = zoomIn ? 1 - inP * 0.45 : 1;
    const sOut = zoomOut ? 1 + outP * outP * 5 : 1;
    const xOut = zoomOut ? 0 : -outP * width * 0.45;
    const blur = (zoomIn ? inP : 0) * 16 + (zoomOut ? outP : 0) * 20 + (!zoomIn ? inP * 14 : 0);
    return (
      <AbsoluteFill
        style={{
          translate: `${(!zoomIn ? inP * width * 0.45 : 0) + xOut}px 0`,
          scale: `${sIn * sOut}`,
          transformOrigin: zoomOut ? `${zoomOut.x}% ${zoomOut.y}%` : "50% 50%",
          opacity: zoomOut ? 1 - outP * outP : 1,
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }
  const x = inP * width * 0.45 - outP * width * 0.45;
  const blur = (inP + outP) * 14;
  return (
    <AbsoluteFill style={{ translate: `${x}px 0`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

// Glitch tear: horizontal bands rip sideways with blue/sky channel flashes.
export const TearFlash: React.FC<{ at: number; dur?: number }> = ({ at, dur = 12 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame - at;
  if (t < 0 || t > dur) return null;
  const k = 1 - t / dur;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 9 }).map((_, i) => {
        const y = random(`ty${i}-${Math.floor(frame / 2)}`) * height;
        const h = 6 + random(`th${i}-${Math.floor(frame / 2)}`) * 60;
        const off = (random(`to${i}-${frame}`) - 0.5) * 240 * k;
        return (
          <div key={i} style={{ position: "absolute", left: off, top: y, width, height: h, background: i % 3 === 0 ? color.signal : i % 3 === 1 ? color.sky : color.inkStrong, opacity: 0.18 + 0.5 * k * random(`tp${i}-${frame}`), mixBlendMode: "multiply" }} />
        );
      })}
      <AbsoluteFill style={{ background: color.bg, opacity: t < 2 ? 0.6 : 0 }} />
    </AbsoluteFill>
  );
};

// Data rain: columns of answer tokens drifting down behind the engines.
const TOKENS = ["crm", "best", "startup", "Northwind", "Globex", "Initech", "pricing", "email", "seats", "free", "top", "pick", "recommend", "2026", "vs", "review"];
export const DataRain: React.FC<{ opacity?: number; cols?: number }> = ({ opacity = 0.16, cols = 22 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: cols }).map((_, c) => {
        const speed = 3 + random(`rs${c}`) * 5;
        const x = (c / cols) * width + random(`rx${c}`) * 30;
        return (
          <div key={c} style={{ position: "absolute", left: x, top: ((frame * speed + random(`ro${c}`) * height) % (height + 600)) - 600, display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 12 }).map((_, k) => (
              <span key={k} style={{ fontFamily: font.mono, fontSize: 22, color: k === 11 ? color.signal : color.sky, opacity: (k + 1) / 12 }}>
                {TOKENS[Math.floor(random(`rt${c}-${k}`) * TOKENS.length)]}
              </span>
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Navigator compass: ring draws on, ticks spin up, needle swings to `heading` (deg).
export const Compass: React.FC<{ size: number; boot: number; heading: number }> = ({ size, boot, heading }) => {
  const frame = useCurrentFrame();
  const t = frame - boot;
  const ring = interpolate(t, [0, 12], [0, 1], { ...clamp, easing: EASE });
  const ticksSpin = interpolate(t, [4, 20], [180, 0], { ...clamp, easing: EASE });
  const swing = t < 14 ? -120 : heading + Math.sin((t - 14) / 3) * 30 * Math.exp(-(t - 14) / 8);
  const r = 0.44;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="-0.5 -0.5 1 1" style={{ overflow: "visible" }}>
      <circle r={r} fill={color.bg} stroke={color.signal} strokeWidth={0.025} strokeDasharray={`${ring * circ} ${circ}`} transform="rotate(-90)" />
      <g transform={`rotate(${ticksSpin})`} opacity={ring}>
        {Array.from({ length: 36 }).map((_, i) => {
          const a = (i / 36) * Math.PI * 2;
          const long = i % 9 === 0;
          return <line key={i} x1={Math.cos(a) * (long ? 0.32 : 0.36)} y1={Math.sin(a) * (long ? 0.32 : 0.36)} x2={Math.cos(a) * 0.41} y2={Math.sin(a) * 0.41} stroke={long ? color.inkStrong : color.lineStrong} strokeWidth={long ? 0.02 : 0.01} />;
        })}
      </g>
      <g transform={`rotate(${swing})`} opacity={interpolate(t, [8, 14], [0, 1], clamp)}>
        <path d="M 0 -0.3 L 0.06 0.02 L 0 -0.04 L -0.06 0.02 Z" fill={color.signal} />
        <path d="M 0 0.22 L 0.04 0.02 L -0.04 0.02 Z" fill={color.lineStrong} />
        <circle r={0.035} fill={color.inkStrong} />
      </g>
    </svg>
  );
};

// Decaying, noise-driven shake that starts at each frame in `hits`.
export const useShake = (hits: number[], strength = 14, length = 9) => {
  const frame = useCurrentFrame();
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const t = frame - h;
    if (t < 0 || t > length) continue;
    const k = strength * (1 - t / length);
    x += noise2D("sx", t * 0.9, h) * k;
    y += noise2D("sy", t * 0.9, h) * k;
  }
  return `${x}px ${y}px`;
};

// ------------------------------------------------------------ text effects

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=/<>";

// Each character cycles through random glyphs, then locks in, left to right.
export const DecodeText: React.FC<{
  text: string;
  start: number;
  perChar?: number;
  scramble?: number;
  style?: React.CSSProperties;
}> = ({ text, start, perChar = 1.2, scramble = 6, style }) => {
  const frame = useCurrentFrame();
  const out = text.split("").map((ch, i) => {
    const lock = start + i * perChar + scramble;
    const appear = start + i * perChar;
    if (frame < appear) return " ";
    if (frame >= lock || ch === " ") return ch;
    return GLYPHS[Math.floor(random(`${i}-${Math.floor(frame)}`) * GLYPHS.length)];
  });
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {out.map((c, i) => {
        const settled = frame >= start + i * perChar + scramble;
        return (
          <span key={i} style={{ color: settled ? undefined : color.signalText, opacity: c === " " ? 0 : 1 }}>
            {c === " " ? " " : c}
          </span>
        );
      })}
    </span>
  );
};

// Split-flap display: every changing character flips like a departures board.
export const SplitFlap: React.FC<{
  text: string;
  start: number;
  flips?: number;
  stagger?: number;
  size?: number;
  tile?: string;
  ink?: string;
}> = ({ text, start, flips = 6, stagger = 1, size = 40, tile = color.bg3, ink = color.inkStrong }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline-flex", gap: size * 0.08 }}>
      {text.split("").map((ch, i) => {
        const t = frame - start - i * stagger;
        const settled = t >= flips * 2;
        const step = Math.max(0, Math.floor(t / 2));
        const shown = t < 0 ? " " : settled ? ch : GLYPHS[Math.floor(random(`f${i}-${step}`) * GLYPHS.length)];
        const flip = settled || t < 0 ? 0 : (t % 2) / 2; // 0..1 inside each flap
        return (
          <span
            key={i}
            style={{
              position: "relative",
              width: size * 0.72,
              height: size * 1.25,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: ch === " " ? "transparent" : tile,
              borderRadius: size * 0.12,
              fontFamily: font.mono,
              fontWeight: 500,
              fontSize: size,
              color: ink,
              overflow: "hidden",
            }}
          >
            <span style={{ display: "inline-block", rotate: `x ${flip * 90}deg`, transformOrigin: "50% 50%" }}>
              {shown === " " ? " " : shown}
            </span>
            {ch !== " " && (
              <span style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: color.bg2, opacity: 0.9 }} />
            )}
          </span>
        );
      })}
    </span>
  );
};

// A number that clacks through a split-flap board on its way to `value`.
export const FlapCounter: React.FC<{
  value: number;
  from?: number;
  suffix?: string;
  start: number;
  size?: number;
  tile?: string;
  ink?: string;
}> = ({ value, from, suffix = "", start, size = 72, tile, ink }) => {
  const frame = useCurrentFrame();
  const fmt = (v: number) => `${String(v).padStart(2, " ")}${suffix}`;
  // Before it flips, hold the previous value (already settled).
  if (frame < start && from !== undefined) {
    return <SplitFlap text={fmt(from)} start={-1000} size={size} tile={tile} ink={ink} />;
  }
  return <SplitFlap text={fmt(value)} start={start} flips={8} stagger={2} size={size} tile={tile} ink={ink} />;
};

// ------------------------------------------------------------ the ghost brand

export const AcmeChip: React.FC<{ solid?: boolean; size?: number; style?: React.CSSProperties }> = ({
  solid,
  size = 40,
  style,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.35,
      padding: `${size * 0.25}px ${size * 0.5}px`,
      borderRadius: radius.md,
      border: `3px ${solid ? "solid" : "dashed"} ${solid ? color.signal : color.lineStrong}`,
      background: solid ? color.signalTint : color.bg,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    <span
      style={{
        width: size * 1.1,
        height: size * 1.1,
        borderRadius: radius.sm,
        background: solid ? color.signal : color.bg4,
        color: color.onSignal,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font.sans,
        fontWeight: 600,
        fontSize: size * 0.6,
      }}
    >
      A
    </span>
    <span style={{ fontFamily: font.sans, fontWeight: 600, fontSize: size, color: solid ? color.inkStrong : color.ink3 }}>
      acme.com
    </span>
  </span>
);

// RGB-split glitch: blue and sky channel copies tear sideways in random slices.
export const Glitch: React.FC<{ children: React.ReactNode; intensity: number; seed?: string }> = ({
  children,
  intensity,
  seed = "g",
}) => {
  const frame = useCurrentFrame();
  const f = Math.floor(frame / 2);
  const on = random(`${seed}on${f}`) < 0.55 * intensity;
  const off = on ? (random(`${seed}o${f}`) - 0.5) * 40 * intensity : 0;
  const sliceY = random(`${seed}y${f}`) * 70;
  const flicker = intensity > 0 ? 0.35 + 0.65 * random(`${seed}fl${f}`) : 1;
  return (
    <span style={{ position: "relative", display: "inline-block", opacity: flicker }}>
      <span style={{ visibility: "hidden" }}>{children}</span>
      {on && (
        <>
          <span style={{ position: "absolute", inset: 0, translate: `${off}px 0`, filter: "hue-rotate(200deg) saturate(4)", opacity: 0.55, mixBlendMode: "multiply" }}>
            {children}
          </span>
          <span style={{ position: "absolute", inset: 0, translate: `${-off * 0.7}px 0`, opacity: 0.45, filter: "sepia(1) hue-rotate(180deg) saturate(6)", mixBlendMode: "multiply" }}>
            {children}
          </span>
        </>
      )}
      <span
        style={{
          position: "absolute",
          inset: 0,
          clipPath: on ? `inset(${sliceY}% 0 ${Math.max(0, 85 - sliceY)}% 0)` : undefined,
          translate: on ? `${off * 1.4}px 0` : undefined,
        }}
      >
        {children}
      </span>
      {on && (
        <span style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 ${100 - sliceY}% 0)` }}>{children}</span>
      )}
    </span>
  );
};

// Shatter: the element breaks into a grid of shards that tumble and fall away.
export const Shatter: React.FC<{
  at: number;
  width: number;
  height: number;
  cols?: number;
  rows?: number;
  speed?: number;
  children: React.ReactNode;
}> = ({ at, width, height, cols = 10, rows = 4, speed = 1, children }) => {
  const frame = useCurrentFrame();
  const t = (frame - at) * speed;
  if (t < 0) return <div style={{ width, height }}>{children}</div>;
  const shards = [];
  const w = width / cols;
  const h = height / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = `${i}-${j}`;
      const vx = (random(`vx${k}`) - 0.5) * 26 + (i - cols / 2) * 2;
      const vy = -random(`vy${k}`) * 16 - 4;
      const g = 1.4;
      const x = vx * t;
      const y = vy * t + 0.5 * g * t * t;
      const rot = (random(`r${k}`) - 0.5) * 40 * t;
      const op = interpolate(t, [0, 30], [1, 0], clamp);
      shards.push(
        <div
          key={k}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width,
            height,
            clipPath: `polygon(${i * w}px ${j * h}px, ${(i + 1) * w}px ${j * h + random(`a${k}`) * h * 0.4}px, ${(i + 1) * w}px ${(j + 1) * h}px, ${i * w + random(`b${k}`) * w * 0.4}px ${(j + 1) * h}px)`,
            translate: `${x}px ${y}px`,
            rotate: `${rot}deg`,
            transformOrigin: `${(i + 0.5) * w}px ${(j + 0.5) * h}px`,
            opacity: op,
          }}
        >
          {children}
        </div>,
      );
    }
  }
  return <div style={{ position: "relative", width, height }}>{shards}</div>;
};

// ------------------------------------------------------------ shapes and bursts

export const SonarRings: React.FC<{ at: number; size: number; tint?: string; count?: number }> = ({
  at,
  size,
  tint = color.signal,
  count = 3,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const t = frame - at - i * 6;
        if (t < 0 || t > 40) return null;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: "50%",
              border: `3px solid ${tint}`,
              scale: `${1 + t / 16}`,
              opacity: interpolate(t, [0, 40], [0.8, 0]),
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

// A red stamp that slams down with an overshoot of scale and a tilt.
export const Stamp: React.FC<{ at: number; label: string; style?: React.CSSProperties }> = ({ at, label, style }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0) return null;
  const s = interpolate(t, [0, 4], [2.2, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  return (
    <span
      style={{
        position: "absolute",
        ...type.label,
        fontWeight: 600,
        fontSize: 24,
        color: color.neg,
        background: color.negTint,
        border: `3px solid ${color.neg}`,
        borderRadius: radius.sm,
        padding: "4px 12px",
        rotate: "-8deg",
        scale: `${s}`,
        opacity: interpolate(t, [0, 2], [0, 1], clamp),
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </span>
  );
};

// Starburst: thin rays plus a horizontal flare streak, for the logo and the Spark.
export const Starburst: React.FC<{ at: number; size: number; tint: string; rays?: number; spin?: number; life?: number }> = ({
  at,
  size,
  tint,
  rays = 12,
  spin = 0.4,
  life = 70,
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > life) return null;
  const grow = interpolate(t, [0, 8], [0.2, 1], { ...clamp, easing: EASE });
  const fade = interpolate(t, [Math.min(10, life / 3), life], [1, 0], clamp);
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1 -1 2 2"
      style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -size / 2, marginTop: -size / 2, overflow: "visible", pointerEvents: "none", opacity: fade, rotate: `${t * spin}deg` }}
    >
      {Array.from({ length: rays }).map((_, i) => {
        const a = (i / rays) * Math.PI * 2;
        const len = (i % 2 ? 0.55 : 1) * grow;
        return (
          <line key={i} x1={Math.cos(a) * 0.12} y1={Math.sin(a) * 0.12} x2={Math.cos(a) * len} y2={Math.sin(a) * len} stroke={tint} strokeWidth={i % 2 ? 0.008 : 0.014} strokeLinecap="round" />
        );
      })}
      <ellipse cx={0} cy={0} rx={1.2 * grow} ry={0.012} fill={tint} opacity={0.8} />
      <circle cx={0} cy={0} r={0.18 * grow} fill="none" stroke={tint} strokeWidth={0.01} />
    </svg>
  );
};

// A ring of tiny chevrons and sparkles popping outward: the celebration burst.
export const ChevronConfetti: React.FC<{ at: number; count?: number; radius?: number }> = ({
  at,
  count = 26,
  radius: R = 420,
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 50) return null;
  const p = interpolate(t, [0, 40], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + random(`ca${i}`) * 0.3;
        const d = R * (0.5 + random(`cd${i}`) * 0.6) * p;
        const isStar = i % 3 === 0;
        const s = 18 + random(`cs${i}`) * 18;
        return (
          <svg
            key={i}
            width={s}
            height={s}
            viewBox={isStar ? "23.4 3 17.25 17.25" : "4 24 56 39"}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              translate: `${Math.cos(a) * d - s / 2}px ${Math.sin(a) * d - s / 2 + t * t * 0.08}px`,
              rotate: `${(a * 180) / Math.PI + 90 + t * (random(`cr${i}`) - 0.5) * 20}deg`,
              opacity: interpolate(t, [30, 50], [1, 0], clamp),
            }}
          >
            <path d={isStar ? motif.spark : motif.climb.split(" M18.593")[0]} fill={i % 2 ? color.signal : color.sky} />
          </svg>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------ the comet route

// A route that draws itself with a glowing comet head, a blurred trail and sparks.
export const CometRoute: React.FC<{
  d: string;
  start: number;
  dur: number;
  width: number;
  height: number;
  stroke?: number;
  keepLine?: boolean;
  headSize?: number;
}> = ({ d, start, dur, width, height, stroke = 6, keepLine = true, headSize = 48 }) => {
  const frame = useCurrentFrame();
  const len = getLength(d);
  const p = interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  if (frame < start) return null;
  const drawn = len * p;
  const head = getPointAtLength(d, Math.max(0.1, drawn));
  const tan = getTangentAtLength(d, Math.max(0.1, drawn));
  const angle = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;
  const flying = p > 0 && p < 1;

  const trail = [];
  for (let k = 1; k <= 8; k++) {
    const back = Math.max(0, drawn - k * 22 * (flying ? 1 : 0));
    const pt = getPointAtLength(d, back);
    trail.push(<circle key={k} cx={pt.x} cy={pt.y} r={(headSize / 3) * (1 - k / 10)} fill={color.sky} opacity={flying ? 0.28 * (1 - k / 9) : 0} />);
  }
  const sparks = [];
  if (flying) {
    for (let k = 0; k < 14; k++) {
      const age = (k * 1.7 + frame) % 14;
      const born = Math.max(0, drawn - age * 18);
      const pt = getPointAtLength(d, born);
      const vx = (random(`sx${k}`) - 0.5) * 4 * age;
      const vy = (random(`sy${k}`) - 0.5) * 4 * age + age * age * 0.15;
      sparks.push(<circle key={k} cx={pt.x + vx} cy={pt.y + vy} r={3 - age * 0.18} fill={k % 3 ? color.sky : color.signal} opacity={1 - age / 14} />);
    }
  }

  return (
    <svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <path
        d={d}
        fill="none"
        stroke={color.signal}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${drawn} ${len}`}
        opacity={keepLine ? 1 : interpolate(p, [0.6, 1], [1, 0], clamp)}
      />
      {trail}
      {sparks}
      {p < 1 || keepLine ? (
        <g transform={`translate(${head.x} ${head.y}) rotate(${angle + 90})`} opacity={p < 1 ? 1 : 0}>
          <circle r={headSize * 0.7} fill={color.sky} opacity={0.22} />
          <svg x={-headSize / 2} y={-headSize / 2} width={headSize} height={headSize * 0.7} viewBox="4 24 56 39">
            <path d={motif.climb.split(" M18.593")[0]} fill={color.signal} />
          </svg>
        </g>
      ) : null}
    </svg>
  );
};

// ------------------------------------------------------------ gauges and logos

export const RadialGauge: React.FC<{ value: number; at: number; size: number; label: string }> = ({
  value,
  at,
  size,
  label,
}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [at, at + 26], [0, value], { ...clamp, easing: EASE });
  const r = 0.4;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="-0.5 -0.5 1 1" style={{ rotate: "-90deg" }}>
        <circle r={r} fill="none" stroke={color.bg3} strokeWidth={0.06} />
        <circle r={r} fill="none" stroke={color.signal} strokeWidth={0.06} strokeDasharray={`${(v / 100) * circ} ${circ}`} strokeLinecap="round" />
        {Array.from({ length: 40 }).map((_, i) => {
          const a = (i / 40) * Math.PI * 2;
          const lit = i / 40 <= v / 100;
          return <line key={i} x1={Math.cos(a) * 0.47} y1={Math.sin(a) * 0.47} x2={Math.cos(a) * 0.49} y2={Math.sin(a) * 0.49} stroke={lit ? color.signal : color.lineStrong} strokeWidth={0.008} />;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ ...type.stat, fontSize: size * 0.3, color: color.inkStrong }}>{Math.round(v)}</span>
        <span style={{ ...type.label, fontSize: size * 0.09, color: color.ink2 }}>{label}</span>
      </div>
    </div>
  );
};

export const ENGINES = [
  { id: "chatgpt", name: "ChatGPT", logo: "chatgpt.svg" },
  { id: "claude", name: "Claude", logo: "claude.svg" },
  { id: "gemini", name: "Gemini", logo: "gemini.svg" },
  { id: "perplexity", name: "Perplexity", logo: "perplexity.svg" },
  { id: "google", name: "Google AI", logo: "google.svg" },
] as const;

export const AiLogo: React.FC<{ logo: string; size: number; style?: React.CSSProperties }> = ({ logo, size, style }) => (
  <Img src={staticFile(`ai-logos/${logo}`)} style={{ width: size, height: size, ...style }} />
);
