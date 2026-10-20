import { getLength, getPointAtLength } from "@remotion/paths";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Pan } from "../../arrowsterr/fx";
import { color, fontFamily, radius, shadow, type } from "../../brand";
import { AlfieAvatar, AlfieFull, Check, clamp, MOMOS_LOGO, Rise, useIsVertical } from "../../alfie/ui";
import { BeatWords, type Beat } from "../../alfie/scenes/BeatWords";
import { Decode, EASE, Phone, PleatConfetti, RingBurst, Steam, useIn } from "../fx";
import { cue } from "../timeline";

// 8. "Now do that for every guest." Infinite zoom-out; tiles flip to resolved in a wave.
export const WallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const cols = vertical ? 11 : 19;
  const rows = vertical ? 21 : 11;
  const tw = vertical ? 88 : 92;
  const th = vertical ? 82 : 86;
  const gap = 8;
  const zoom = interpolate(frame, [0, 34], [10, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const gridW = cols * (tw + gap);
  const gridH = rows * (th + gap);
  return (
    <Pan enter={false}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ position: "relative", width: gridW, height: gridH, scale: `${zoom}` }}>
          {Array.from({ length: cols * rows }).map((_, k) => {
            const i = k % cols;
            const j = Math.floor(k / cols);
            const d = Math.hypot(i - cx, j - cy);
            const flip = 22 + d * 3.2;
            const p = interpolate(frame, [flip, flip + 8], [0, 1], clamp);
            const done = p >= 0.5 || (i === cx && j === cy);
            return (
              <div key={k} style={{ position: "absolute", left: i * (tw + gap), top: j * (th + gap), width: tw, height: th, borderRadius: 12, background: done ? color.olive : color.brandBg, rotate: `y ${p < 1 && p > 0 ? p * 180 : 0}deg`, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${done ? color.oliveDark : color.brand}33` }}>
                {done ? (
                  <svg width={tw * 0.42} height={tw * 0.42} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke={color.oliveDark} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <span style={{ width: 14, height: 14, borderRadius: 7, background: color.brand }} />
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 440 : 70 }}>
        <span style={{ background: color.ink, borderRadius: 20, padding: "16px 34px", opacity: useIn(cue("wall-1") + 10, 8) }}>
          <Decode text="Every guest. Every location." start={cue("wall-1") + 10} perChar={0.7} style={{ ...type.h3, fontSize: 48, fontWeight: 600, fontFamily, color: color.beige }} />
        </span>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: width / 2, top: height / 2, width: 0, height: 0 }}>
        <RingBurst at={20} size={200} tint={color.oliveDark} count={2} />
      </div>
    </Pan>
  );
};

const LANES = [
  { label: "Web chat", cue: "lanes-web" as const },
  { label: "App", cue: "lanes-app" as const },
  { label: "Surveys", cue: "lanes-surveys" as const },
  { label: "Delivery", cue: "lanes-delivery" as const },
];

// 9. "On web chat, your app, surveys and delivery." A switchboard into Alfie.
export const LanesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const hub = { x: vertical ? width / 2 : width * 0.56, y: vertical ? height * 0.6 : height / 2 };
  const startX = vertical ? 0 : 340;
  const paths = LANES.map((_, i) => {
    if (vertical) {
      const sx = 140 + i * ((width - 280) / 3);
      return `M ${sx} ${height * 0.26} C ${sx} ${height * 0.42}, ${hub.x} ${hub.y - 380}, ${hub.x} ${hub.y - 140}`;
    }
    const sy = height * (0.22 + i * 0.19);
    return `M ${startX} ${sy} C ${width * 0.36} ${sy}, ${hub.x - 360} ${hub.y}, ${hub.x - 150} ${hub.y}`;
  });
  const out = vertical
    ? `M ${hub.x} ${hub.y + 140} L ${hub.x} ${height * 0.86}`
    : `M ${hub.x + 150} ${hub.y} L ${width - 160} ${hub.y}`;
  return (
    <Pan>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {paths.map((d, i) => {
          const on = frame >= cue(LANES[i].cue);
          return <path key={i} d={d} fill="none" stroke={on ? color.ink : color.border} strokeWidth={on ? 8 : 5} strokeLinecap="round" />;
        })}
        <path d={out} fill="none" stroke={color.oliveDark} strokeWidth={8} strokeLinecap="round" opacity={useIn(cue("lanes-web") + 10, 10)} />
      </svg>
      {/* message packets flowing in, resolved packets flowing out */}
      {paths.map((d, i) => {
        const on = cue(LANES[i].cue);
        if (frame < on) return null;
        const len = getLength(d);
        return Array.from({ length: 4 }).map((_, k) => {
          const p = ((frame - on) * 0.028 + k / 4) % 1;
          const pt = getPointAtLength(d, len * p) ?? { x: 0, y: 0 };
          return <div key={`${i}-${k}`} style={{ position: "absolute", left: pt.x - 26, top: pt.y - 18, width: 52, height: 36, borderRadius: 12, background: color.white, border: `3px solid ${color.ink}`, opacity: Math.sin(Math.PI * p) }} />;
        });
      })}
      {frame >= cue("lanes-web") + 14 &&
        Array.from({ length: 4 }).map((_, k) => {
          const len = getLength(out);
          const p = ((frame - cue("lanes-web") - 14) * 0.03 + k / 4) % 1;
          const pt = getPointAtLength(out, len * p) ?? { x: 0, y: 0 };
          return (
            <div key={k} style={{ position: "absolute", left: pt.x - 26, top: pt.y - 26, width: 52, height: 52, borderRadius: 26, background: color.olive, display: "flex", alignItems: "center", justifyContent: "center", opacity: Math.sin(Math.PI * p) }}>
              <svg width={28} height={28} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke={color.oliveDark} strokeWidth={3.4} strokeLinecap="round" /></svg>
            </div>
          );
        })}
      {LANES.map((l, i) => {
        const on = frame >= cue(l.cue);
        const pop = interpolate(frame - cue(l.cue), [0, 4, 10], [1, 1.15, 1], clamp);
        const pos = vertical ? { left: 140 + i * ((width - 280) / 3), top: height * 0.22 } : { left: startX - 20, top: height * (0.22 + i * 0.19) };
        return (
          <div key={l.label} style={{ position: "absolute", ...pos, translate: vertical ? "-50% -50%" : "-100% -50%", fontFamily, fontWeight: 700, fontSize: vertical ? 36 : 44, color: on ? color.ink : color.grayDisabled, scale: `${pop}`, whiteSpace: "nowrap" }}>
            {l.label}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: hub.x - 140, top: hub.y - 140 }}>
        <AlfieAvatar size={280} style={{ boxShadow: `0 0 0 ${10 + Math.sin(frame / 4) * 4}px ${color.brandBg}` }} />
      </div>
      <div style={{ position: "absolute", left: vertical ? hub.x : width - 140, top: vertical ? height * 0.89 : hub.y - 64, translate: vertical ? "-50% 0" : "-50% -50%", fontFamily, fontWeight: 700, fontSize: 40, color: color.oliveDark, opacity: useIn(cue("lanes-web") + 20, 10) }}>
        Resolved
      </div>
    </Pan>
  );
};

// 10. "All night." A clock time-lapse from 9:47 PM to 6:00 AM.
export const NightScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const vertical = useIsVertical();
  const p = interpolate(frame, [4, durationInFrames - 8], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const minutes = 21 * 60 + 47 + p * (8 * 60 + 13); // 21:47 → 06:00
  const m = Math.floor(minutes) % (24 * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const label = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "PM" : "AM"}`;
  const night = Math.sin(Math.PI * p);
  const resolved = Math.round(interpolate(p, [0, 1], [1, 1284]));
  const size = vertical ? 520 : 480;
  return (
    <Pan>
      <AbsoluteFill style={{ background: color.ink, opacity: night * 0.85 }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: vertical ? "column" : "row", gap: vertical ? 60 : 120 }}>
        <svg width={size} height={size} viewBox="-1 -1 2 2">
          <circle r={0.96} fill={color.white} stroke={color.border} strokeWidth={0.02} />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={Math.cos(a) * 0.78} y1={Math.sin(a) * 0.78} x2={Math.cos(a) * 0.88} y2={Math.sin(a) * 0.88} stroke={color.ink} strokeWidth={0.04} strokeLinecap="round" />;
          })}
          <line x1={0} y1={0} x2={0} y2={-0.5} stroke={color.ink} strokeWidth={0.07} strokeLinecap="round" transform={`rotate(${(minutes / 720) * 360})`} />
          <line x1={0} y1={0} x2={0} y2={-0.75} stroke={color.brand} strokeWidth={0.035} strokeLinecap="round" transform={`rotate(${(minutes / 60) * 360})`} />
          <circle r={0.06} fill={color.ink} />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: vertical ? "center" : "flex-start" }}>
          <span style={{ fontFamily, fontWeight: 700, fontSize: vertical ? 120 : 130, color: night > 0.5 ? color.beige : color.ink, fontVariantNumeric: "tabular-nums" }}>{label}</span>
          <span style={{ fontFamily, fontWeight: 500, fontSize: 40, color: night > 0.5 ? color.grayDisabled : color.gray600 }}>
            Resolved tonight <span style={{ fontWeight: 700, color: night > 0.5 ? color.olive : color.oliveDark, fontVariantNumeric: "tabular-nums" }}>{resolved.toLocaleString("en-US")}</span>
          </span>
        </div>
      </AbsoluteFill>
    </Pan>
  );
};

// 11. "And when it needs a person, Alfie hands over the full story."
export const HandoffScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const go = cue("handoff-2");
  const from = { x: vertical ? width / 2 : width * 0.12, y: vertical ? height * 0.16 : height * 0.5 };
  const to = { x: vertical ? width / 2 : width * 0.76, y: vertical ? height * 0.7 : height * 0.5 };
  const fly = interpolate(frame, [go, go + 20], [0, 1], { ...clamp, easing: EASE });
  const arc = Math.sin(Math.PI * fly) * -200;
  const land = spring({ frame: frame - go - 20, fps, config: { damping: 14 } });
  const cardW = vertical ? 800 : 560;
  return (
    <Pan>
      <div style={{ position: "absolute", left: from.x - 120, top: from.y - 120 }}>
        <AlfieAvatar size={240} />
      </div>
      <div style={{ position: "absolute", left: to.x - (vertical ? 270 : 260), top: to.y - (vertical ? 360 : 400) }}>
        <Phone w={vertical ? 540 : 520} h={vertical ? 720 : 800}>
          {frame >= go + 18 && (
            <div style={{ background: color.white, borderRadius: 24, padding: 22, boxShadow: shadow.m, fontFamily, scale: `${0.8 + land * 0.2}`, opacity: land }}>
              <div style={{ fontWeight: 700, fontSize: 28, color: color.ink }}>Alfie · 1 case needs you</div>
              <div style={{ fontWeight: 500, fontSize: 24, color: color.gray600 }}>Downtown · order #4190</div>
            </div>
          )}
        </Phone>
      </div>
      {frame >= go && fly < 1 && (
        <div style={{ position: "absolute", left: from.x + (to.x - from.x) * fly - 120, top: from.y + (to.y - from.y) * fly + arc - 60, width: 240, height: 120, borderRadius: radius.md, background: color.white, boxShadow: shadow.l, rotate: `${fly * 12}deg`, scale: `${1 - fly * 0.4}` }} />
      )}
      <div style={{ position: "absolute", left: vertical ? (width - cardW) / 2 : width * 0.23, top: vertical ? height * 0.3 : height * 0.3, width: cardW, opacity: useIn(cue("handoff-1"), 10) }}>
        <div style={{ background: color.white, borderRadius: radius.lg, boxShadow: shadow.m, padding: 32, display: "flex", flexDirection: "column", gap: 20, fontFamily }}>
          <span style={{ fontWeight: 700, fontSize: 36, color: color.ink }}>Handed over with</span>
          {["Full conversation", "Order details", "Suggested next step"].map((t, i) => (
            <Rise key={t} delay={go + 6 + i * 6} distance={20}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <Check delay={go + 8 + i * 6} size={52} />
                <span style={{ fontWeight: 500, fontSize: 34, color: color.ink }}>{t}</span>
              </div>
            </Rise>
          ))}
        </div>
      </div>
    </Pan>
  );
};

// 12. "So the next morning, your manager wakes up to... a quiet inbox."
export const MorningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const quiet = cue("morning-quiet");
  const clear = interpolate(frame, [quiet - 4, quiet + 10], [0, 1], { ...clamp, easing: EASE });
  const w = vertical ? 900 : 1000;
  return (
    <Pan>
      <AbsoluteFill style={{ background: `${color.warmCream}`, opacity: 0.6 }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: w, background: color.white, borderRadius: radius.xl, boxShadow: shadow.l, padding: 40, display: "flex", flexDirection: "column", gap: 22, fontFamily, minHeight: 560, boxSizing: "border-box" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 40, color: color.ink }}>Inbox</span>
            <span style={{ fontWeight: 500, fontSize: 28, color: color.gray600 }}>Sat · 6:00 AM</span>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 76, borderRadius: 16, background: color.bgSecondary, overflow: "hidden", opacity: 1 - clear, translate: `${clear * (i % 2 ? 60 : -60)}px 0`, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${color.white}, transparent)`, translate: `${((frame * 18 + i * 120) % (w * 2)) - w}px 0`, opacity: 0.8 }} />
            </div>
          ))}
          <div style={{ position: "absolute", left: "50%", top: "50%", translate: "-50% -50%", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: clear, scale: `${0.8 + clear * 0.2}` }}>
            <div style={{ width: 130, height: 130, borderRadius: 65, background: color.olive, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width={70} height={70} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke={color.oliveDark} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 64, color: color.ink }}>All caught up.</span>
          </div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", right: vertical ? -40 : 80, bottom: vertical ? 300 : -60, translate: `0 ${(1 - useIn(quiet + 10, 14)) * 300}px` }}>
        <AlfieFull height={vertical ? 360 : 380} delay={quiet + 10} />
      </div>
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: vertical ? 240 : 60 }}>
        <Decode text="The next morning" start={cue("morning-1")} perChar={0.8} style={{ ...type.caption, fontFamily, fontWeight: 600, color: color.gray600 }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: width / 2, top: height / 2, width: 0, height: 0 }}>
        <RingBurst at={quiet + 4} size={220} tint={color.olive} count={2} />
      </div>
    </Pan>
  );
};

// 13. "Resolve. Recover. Bring them back." On the beat, a key higher.
const WORDS: Beat[] = [
  { text: "Resolve.", beats: 2 },
  { text: "Recover.", dark: true, beats: 2 },
  { text: "Bring them back.", beats: 2 },
];
export const BeatsScene: React.FC = () => <BeatWords words={WORDS} size={210} verticalSize={130} />;

// 14. End card: Alfie, the logo, Book a demo, a puff of steam and pleat confetti.
export const EndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const btn = useIn(cue("end-2") - 4, 10);
  const shine = interpolate(frame, [cue("end-2") + 8, cue("end-2") + 28], [-30, 130], clamp);
  const mascot = vertical ? 520 : 560;
  return (
    <AbsoluteFill style={{ background: color.beige, fontFamily }}>
      <AbsoluteFill style={{ flexDirection: vertical ? "column" : "row", justifyContent: "center", alignItems: "center", gap: vertical ? 40 : 120 }}>
        <div style={{ position: "relative", width: mascot * 0.9, height: mascot, display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
          <div style={{ position: "absolute", width: mascot * 0.82, height: mascot * 0.82, top: mascot * 0.02, borderRadius: "50%", background: color.brandBg, scale: `${useIn(0, 14)}` }} />
          <AlfieFull height={mascot * 0.92} delay={2} style={{ position: "relative" }} />
          <div style={{ position: "absolute", left: "50%", top: "45%", width: 0, height: 0 }}>
            <PleatConfetti at={cue("end-1") + 4} radius={vertical ? 420 : 520} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: vertical ? "center" : "flex-start", gap: 48 }}>
          <Rise delay={cue("end-1")}>
            <Img src={MOMOS_LOGO} style={{ height: vertical ? 110 : 120 }} />
          </Rise>
          <Rise delay={cue("end-1") + 8}>
            <span style={{ ...type.h3, fontWeight: 600, color: color.neutral700 }}>Alfie, the Experience Agent</span>
          </Rise>
          <div style={{ position: "relative", overflow: "hidden", ...type.h3, fontWeight: 700, color: color.white, background: color.brand, borderRadius: 8, padding: "26px 64px", scale: `${0.85 + btn * 0.15}`, opacity: btn }}>
            Book a demo
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, transparent ${shine - 20}%, rgba(255,255,255,0.45) ${shine}%, transparent ${shine + 20}%)` }} />
          </div>
          <Rise delay={cue("end-2") + 10}>
            <span style={{ ...type.h3, fontWeight: 500, color: color.neutral700 }}>momos.com/alfie</span>
          </Rise>
        </div>
      </AbsoluteFill>
      <Steam x={vertical ? width / 2 : width * 0.3} y={vertical ? height * 0.5 : height * 0.62} count={10} spread={260} opacity={0.6} start={cue("end-2")} burst />
    </AbsoluteFill>
  );
};
