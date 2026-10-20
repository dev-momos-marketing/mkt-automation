import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { color, fontFamily, radius, shadow, type } from "../brand";
import { clamp } from "../alfie/ui";

// Momos motion: warm and confident. Soft overshoot is allowed for Alfie only.
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const useIn = (delay = 0, dur = 12) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + dur], [0, 1], { ...clamp, easing: EASE });
};

export const usePop = (delay = 0, damping = 12) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};

// ------------------------------------------------------------ text

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=";

// Characters scramble, then lock in left to right.
export const Decode: React.FC<{ text: string; start: number; perChar?: number; scramble?: number; style?: React.CSSProperties }> = ({
  text,
  start,
  perChar = 1,
  scramble = 5,
  style,
}) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {text.split("").map((ch, i) => {
        const appear = start + i * perChar;
        const lock = appear + scramble;
        if (frame < appear) return <span key={i} style={{ opacity: 0 }}>{ch}</span>;
        if (frame >= lock || ch === " ") return <span key={i}>{ch}</span>;
        return (
          <span key={i} style={{ color: color.brand }}>
            {GLYPHS[Math.floor(random(`${i}-${frame}`) * GLYPHS.length)]}
          </span>
        );
      })}
    </span>
  );
};

// ------------------------------------------------------------ restaurant props

// Thermal receipt paper with a torn zigzag bottom edge.
export const Receipt: React.FC<{ width: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ width, children, style }) => (
  <div style={{ position: "relative", width, background: color.white, padding: "28px 30px 40px", boxShadow: shadow.m, fontFamily, ...style }}>
    {children}
    <svg width={width} height={16} viewBox={`0 0 ${width} 16`} preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: -15 }}>
      <path d={`M0 0 ${Array.from({ length: Math.ceil(width / 16) }).map((_, i) => `L${i * 16 + 8} 14 L${i * 16 + 16} 0`).join(" ")} Z`} fill={color.white} />
    </svg>
  </div>
);

export const ReceiptLine: React.FC<{ left: React.ReactNode; right?: React.ReactNode; big?: boolean; style?: React.CSSProperties }> = ({ left, right, big, style }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontWeight: big ? 700 : 500, fontSize: big ? 80 : 30, lineHeight: 1.25, color: color.ink, fontVariantNumeric: "tabular-nums", ...style }}>
    <span>{left}</span>
    {right !== undefined && <span>{right}</span>}
  </div>
);

export const Dashes: React.FC = () => <div style={{ borderTop: `3px dashed ${color.border}`, margin: "14px 0" }} />;

// The ticket printer body.
export const Printer: React.FC<{ width: number; jitter?: number }> = ({ width, jitter = 0 }) => {
  const frame = useCurrentFrame();
  const j = jitter * (random(`pj${frame}`) - 0.5) * 3;
  return (
    <div style={{ width, height: width * 0.3, translate: `${j}px 0`, background: color.ink, borderRadius: radius.lg, position: "relative", boxShadow: shadow.l }}>
      <div style={{ position: "absolute", left: "8%", right: "8%", bottom: 22, height: 10, borderRadius: 5, background: "#000" }} />
      <div style={{ position: "absolute", right: 28, top: 22, width: 18, height: 18, borderRadius: 9, background: frame % 10 < 5 ? color.oliveDark : color.olive }} />
      <div style={{ position: "absolute", left: 30, top: 22, fontFamily, fontWeight: 600, fontSize: 24, color: color.beige, opacity: 0.8 }}>momos kitchen</div>
    </div>
  );
};

// An order ticket for the rail.
export const Ticket: React.FC<{ n: number; seed: number; w?: number }> = ({ n, seed, w = 230 }) => {
  const items = ["Burger", "Lemonade", "Fries", "Wings", "Shake", "Salad", "Wrap", "Tacos", "Coffee", "Bowl"];
  return (
    <div style={{ width: w, background: color.white, borderRadius: 6, padding: "22px 20px 26px", boxShadow: shadow.s, fontFamily, rotate: `${(random(`tr${seed}`) - 0.5) * 6}deg` }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 28, color: color.ink }}>
        <span>#{n}</span>
        <span style={{ fontWeight: 500, color: color.gray600 }}>9:4{Math.floor(random(`tt${seed}`) * 8)}</span>
      </div>
      <Dashes />
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ fontWeight: 500, fontSize: 26, lineHeight: 1.5, color: color.ink }}>
          {1 + Math.floor(random(`tq${seed}${k}`) * 2)} {items[Math.floor(random(`ti${seed}${k}`) * items.length)]}
        </div>
      ))}
    </div>
  );
};

// Soft steam wisps rising and curling. Deterministic per seed.
export const Steam: React.FC<{ x: number; y: number; count?: number; spread?: number; opacity?: number; start?: number; burst?: boolean }> = ({
  x,
  y,
  count = 10,
  spread = 160,
  opacity = 0.5,
  start = 0,
  burst,
}) => {
  const frame = useCurrentFrame();
  const t0 = frame - start;
  if (t0 < 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const life = burst ? Math.min(1, t0 / 40) : ((t0 * 0.8 + i * 13) % 70) / 70;
        const rise = burst ? 380 * Math.sqrt(life) * (0.6 + random(`sr${i}`) * 0.6) : 260 * life;
        const dx = (random(`sx${i}`) - 0.5) * spread * (burst ? 2.4 * life : 1) + Math.sin(life * 6 + i) * 20;
        const size = (burst ? 140 : 70) * (0.6 + random(`ss${i}`) * 0.8) * (0.6 + life);
        const op = burst ? (1 - life) * opacity : Math.sin(Math.PI * life) * opacity;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + dx - size / 2,
              top: y - rise - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: color.white,
              filter: `blur(${size * 0.25}px)`,
              opacity: op,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

// A phone with a buzz shake.
export const Phone: React.FC<{ w: number; h: number; buzzAt?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ w, h, buzzAt, children, style }) => {
  const frame = useCurrentFrame();
  const b = buzzAt !== undefined ? frame - buzzAt : -1;
  const shake = b >= 0 && b < 14 ? Math.sin(b * 2.6) * 10 * (1 - b / 14) : 0;
  return (
    <div style={{ width: w, height: h, borderRadius: 64, background: color.ink, padding: 16, boxShadow: shadow.l, translate: `${shake}px 0`, rotate: `${shake * 0.2}deg`, ...style }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 50, background: color.beige, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 24, boxSizing: "border-box", gap: 16 }}>
        <div style={{ position: "absolute", top: 18, left: "50%", translate: "-50% 0", width: 120, height: 30, borderRadius: 15, background: color.ink }} />
        {children}
      </div>
    </div>
  );
};

// A notification card from one of Alfie's channels.
export const Notice: React.FC<{ channel: string; text: string; w?: number; style?: React.CSSProperties }> = ({ channel, text, w = 520, style }) => (
  <div style={{ width: w, boxSizing: "border-box", background: color.white, borderRadius: radius.md, padding: "20px 26px", boxShadow: shadow.m, display: "flex", flexDirection: "column", gap: 4, fontFamily, ...style }}>
    <span style={{ fontSize: 24, fontWeight: 500, color: color.gray600 }}>{channel}</span>
    <span style={{ fontSize: 32, fontWeight: 600, color: color.ink, lineHeight: 1.3 }}>{text}</span>
  </div>
);

// Bamboo steamer basket (ochre is this film's prop colour) with a liftable lid.
export const Steamer: React.FC<{ w: number; lid?: { y: number; rot: number; opacity: number } }> = ({ w, lid = { y: 0, rot: 0, opacity: 1 } }) => {
  const h = w * 0.42;
  const band = (y: number, k: number) => <rect key={k} x={0} y={y} width={w} height={6} fill={color.ochreDark} opacity={0.55} />;
  return (
    <div style={{ position: "relative", width: w, height: h + w * 0.2 }}>
      {/* lid */}
      <svg width={w} height={w * 0.24} style={{ position: "absolute", left: 0, top: 0, translate: `0 ${lid.y}px`, rotate: `${lid.rot}deg`, opacity: lid.opacity, overflow: "visible", zIndex: 2 }}>
        <ellipse cx={w / 2} cy={w * 0.14} rx={w / 2} ry={w * 0.1} fill={color.ochre} stroke={color.ochreDark} strokeWidth={4} />
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1={w * (0.15 + i * 0.12)} y1={w * 0.07} x2={w * (0.12 + i * 0.12)} y2={w * 0.21} stroke={color.ochreDark} strokeWidth={3} opacity={0.6} />
        ))}
        <rect x={w * 0.44} y={w * 0.02} width={w * 0.12} height={w * 0.06} rx={8} fill={color.ochreDark} />
      </svg>
      {/* body */}
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: w * 0.14 }}>
        <rect x={0} y={0} width={w} height={h} rx={w * 0.06} fill={color.ochre} stroke={color.ochreDark} strokeWidth={4} />
        {band(h * 0.25, 1)}
        {band(h * 0.55, 2)}
        {band(h * 0.82, 3)}
      </svg>
    </div>
  );
};

// ------------------------------------------------------------ agent + payoff

export type TraceLine = { at: number; call: string; ok?: number; ms?: string };

// Alfie's live agent trace: calls type in, then tick green with a timing.
export const TraceConsole: React.FC<{ lines: TraceLine[]; w: number; minH: number; size?: number }> = ({ lines, w, minH, size = 28 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: w, minHeight: minH, boxSizing: "border-box", background: color.ink, borderRadius: radius.lg, padding: 32, fontFamily, display: "flex", flexDirection: "column", gap: 14, boxShadow: shadow.l }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 500, color: color.grayDisabled, marginBottom: 6 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: color.olive }} /> alfie · agent trace
      </div>
      {lines.map((l, i) => {
        if (frame < l.at) return null;
        const shown = l.call.slice(0, Math.floor((frame - l.at) * 2.2));
        const ok = l.ok !== undefined && frame >= l.ok;
        const okP = l.ok !== undefined ? interpolate(frame, [l.ok, l.ok + 6], [0, 1], clamp) : 0;
        return (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 14, fontSize: size, fontWeight: 500, color: color.beige }}>
            <span style={{ color: color.brandFg }}>›</span>
            <span style={{ flex: 1 }}>{shown}</span>
            {ok && (
              <span style={{ display: "flex", gap: 12, opacity: okP, scale: `${0.7 + okP * 0.3}` }}>
                <span style={{ color: color.olive, fontWeight: 700 }}>✓</span>
                {l.ms && <span style={{ color: color.grayDisabled }}>{l.ms}</span>}
              </span>
            )}
          </div>
        );
      })}
      <span style={{ width: 14, height: size, background: color.brandFg, opacity: Math.floor(frame / 8) % 2 ? 0 : 0.9 }} />
    </div>
  );
};

// Guest mood: a half dial swinging from upset (brand red) to happy (olive), with overshoot.
export const MoodDial: React.FC<{ at: number; size: number }> = ({ at, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 9, stiffness: 90 } });
  const angle = -70 + p * 140;
  const happy = p > 0.5;
  return (
    <div style={{ width: size, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily }}>
      <svg width={size} height={size * 0.6} viewBox="-1.1 -1.05 2.2 1.25">
        <path d="M -1 0 A 1 1 0 0 1 0 -1" fill="none" stroke={color.brandBg} strokeWidth={0.2} />
        <path d="M 0 -1 A 1 1 0 0 1 1 0" fill="none" stroke={color.olive} strokeWidth={0.2} />
        <g transform={`rotate(${angle})`}>
          <line x1={0} y1={0} x2={0} y2={-0.85} stroke={color.ink} strokeWidth={0.07} strokeLinecap="round" />
        </g>
        <circle r={0.1} fill={color.ink} />
      </svg>
      <span style={{ fontSize: 26, fontWeight: 600, color: happy ? color.oliveDark : color.brand }}>{happy ? "Happy guest" : "Upset guest"}</span>
    </div>
  );
};

// A slammed stamp.
export const Slam: React.FC<{ at: number; label: string; tone: "olive" | "red"; size?: number; style?: React.CSSProperties }> = ({ at, label, tone, size = 56, style }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0) return null;
  const s = interpolate(t, [0, 5], [2.4, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const fg = tone === "olive" ? color.oliveDark : color.brand;
  return (
    <div style={{ position: "absolute", fontFamily, fontWeight: 700, fontSize: size, color: fg, border: `6px solid ${fg}`, borderRadius: radius.md, padding: `${size * 0.12}px ${size * 0.4}px`, background: tone === "olive" ? `${color.olive}cc` : `${color.brandBg}dd`, rotate: "-9deg", scale: `${s}`, opacity: interpolate(t, [0, 2], [0, 1], clamp), whiteSpace: "nowrap", ...style }}>
      {label}
    </div>
  );
};

// Confetti of tiny dumpling pleats (little arcs) and dots in brand colours.
export const PleatConfetti: React.FC<{ at: number; count?: number; radius?: number }> = ({ at, count = 30, radius: R = 480 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 60) return null;
  const p = interpolate(t, [0, 45], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + random(`pa${i}`) * 0.4;
        const d = R * (0.4 + random(`pd${i}`) * 0.7) * p;
        const s = 18 + random(`ps${i}`) * 22;
        const fill = [color.brand, color.ochre, color.olive, color.brandFg][i % 4];
        return (
          <svg key={i} width={s} height={s * 0.6} viewBox="0 0 10 6" style={{ position: "absolute", left: "50%", top: "50%", translate: `${Math.cos(a) * d - s / 2}px ${Math.sin(a) * d + t * t * 0.07}px`, rotate: `${t * (random(`pr${i}`) - 0.5) * 24}deg`, opacity: interpolate(t, [36, 60], [1, 0], clamp) }}>
            {i % 3 === 0 ? <circle cx={5} cy={3} r={2.6} fill={fill} /> : <path d="M1 5 Q5 -1 9 5" fill="none" stroke={fill} strokeWidth={2} strokeLinecap="round" />}
          </svg>
        );
      })}
    </>
  );
};

// A ring burst in a given colour.
export const RingBurst: React.FC<{ at: number; size: number; tint: string; count?: number }> = ({ at, size, tint, count = 3 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const t = frame - at - i * 5;
        if (t < 0 || t > 36) return null;
        return (
          <span key={i} style={{ position: "absolute", left: "50%", top: "50%", width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: "50%", border: `${6 - i * 1.5}px solid ${tint}`, scale: `${1 + t / 12}`, opacity: interpolate(t, [0, 36], [0.9, 0]) }} />
        );
      })}
    </>
  );
};

export const Stage: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ fontFamily, ...style }}>{children}</AbsoluteFill>
);

export { type };
