import { getLength } from "@remotion/paths";
import { lightLeak } from "@remotion/effects/light-leak";
import { AbsoluteFill, Easing, interpolate, random, Solid, useCurrentFrame, useVideoConfig } from "remotion";
import { color, font, motif, radius, type } from "../brand";
import { AcmeChip, ChevronConfetti, DecodeText, FlapCounter, getPointAtLength, Pan, SonarRings, Starburst, useShake } from "../fx";
import { cue } from "../timeline";
import { clamp, EASE, Headline, Logo, NotchButton, Rise, SparkStar, Tag, Ticks, useIn } from "../ui";
import { ChatBar, PROMPT } from "./Intro";

// The folded page: a paper dart with a Signal Blue edge, pointing right.
export const Dart: React.FC<{ w?: number; h?: number; style?: React.CSSProperties }> = ({ w = 300, h = 180, style }) => (
  <svg width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: "visible", ...style }}>
    <polygon points="0,10 52,34 100,50 52,66 0,90 30,50" fill={color.bg} stroke={color.signal} strokeWidth={2.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    <polyline points="30,50 100,50" fill="none" stroke={color.sky} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
  </svg>
);

// 7. "Ship it": the dart crouches, then launches with a sonic boom and speed lines.
export const Ship: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const launch = cue("ship") + 10;
  const crouch = interpolate(frame, [launch - 8, launch], [1, 0.86], clamp);
  const fly = interpolate(frame, [launch, launch + 16], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const x = width * 0.36 + fly * width * 1.1;
  const shake = useShake([launch], 18, 10);

  return (
    <AbsoluteFill style={{ translate: shake }}>
      {frame >= launch &&
        Array.from({ length: 22 }).map((_, i) => {
          const y = random(`ly${i}`) * height;
          const len = 200 + random(`ll${i}`) * 600;
          const t = (frame - launch) * (40 + random(`ls${i}`) * 40);
          return (
            <span key={i} style={{ position: "absolute", left: width - t + random(`lx${i}`) * width, top: y, width: len, height: 3 + random(`lh${i}`) * 3, background: i % 3 ? color.sky : color.signal, opacity: 0.5 }} />
          );
        })}
      <div style={{ position: "absolute", left: width * 0.36, top: height * 0.5, width: 0, height: 0 }}>
        <SonarRings at={launch} size={260} tint={color.signal} count={3} />
        <Starburst at={launch} size={900} tint={color.sky} rays={14} spin={2} />
      </div>
      {/* Motion-blurred copies behind the dart. */}
      {[0.06, 0.12, 0.2, 0.3].map((lag, k) => (
        <div key={k} style={{ position: "absolute", left: x - 150 - lag * width * 0.6 * fly, top: height * 0.5 - 90, opacity: fly > 0 ? 0.25 - k * 0.05 : 0 }}>
          <Dart />
        </div>
      ))}
      <div style={{ position: "absolute", left: x - 150, top: height * 0.5 - 90, scale: `${crouch} 1`, transformOrigin: "100% 50%" }}>
        <Dart />
      </div>
      <Rise delay={cue("ship")} style={{ position: "absolute", left: 0, right: 0, bottom: height * 0.22, textAlign: "center", opacity: 1 - fly }}>
        <span style={{ ...type.display, color: color.inkStrong }}>
          Ship <span style={{ color: color.signalText }}>it</span>
        </span>
      </Rise>
    </AbsoluteFill>
  );
};

const ROWS = [
  { name: "Northwind", note: "Pipelines for small teams" },
  { name: "Globex", note: "Email and CRM in one" },
  { name: "Initech", note: "Cheapest seat price" },
];

const Row: React.FC<{ rank: number; name: React.ReactNode; note: string; highlight?: boolean; children?: React.ReactNode }> = ({ rank, name, note, highlight, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "18px 24px", borderRadius: radius.md, background: highlight ? color.signalTint : color.bg, border: `2px solid ${highlight ? color.signal : color.line}`, position: "relative" }}>
    <span style={{ width: 56, height: 56, borderRadius: radius.sm, background: highlight ? color.signal : color.bg3, color: highlight ? color.onSignal : color.ink2, display: "flex", alignItems: "center", justifyContent: "center", ...type.num, fontSize: 28 }}>{rank}</span>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 40, color: color.inkStrong }}>{name}</span>
      <span style={{ ...type.ui, fontSize: 26, color: color.ink2 }}>{note}</span>
    </div>
    {children}
  </div>
);

// 8. Next morning: the dart lands in the shortlist and Acme is recommended.
export const Land: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const there = cue("land-there");
  const rec = cue("land-rec");
  const hit = there + 12;
  const room = interpolate(frame, [hit - 4, hit + 6], [0, 1], { ...clamp, easing: EASE });
  const snap = interpolate(frame, [hit, hit + 3, hit + 8], [1.25, 0.97, 1], clamp);
  const shake = useShake([hit, rec], 14, 10);
  const listW = vertical ? 960 : 1180;
  const listTop = vertical ? 620 : 300;
  const rowH = 122;

  // Dart flight path into slot #2.
  const slotX = width / 2 - listW / 2 + 60;
  const slotY = listTop + rowH * 1 + 60 + 48;
  const path = `M -200 ${height * 0.9} C ${width * 0.15} ${height * 0.85}, ${width * 0.1} ${slotY - 200}, ${slotX} ${slotY}`;
  const fp = interpolate(frame, [there, hit], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const pt = getPointAtLength(path, getLength(path) * fp);

  return (
    <Pan exit={false}>
      <AbsoluteFill style={{ translate: shake }}>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: vertical ? 300 : 70, gap: 28 }}>
          <Rise delay={2}>
            <span style={{ ...type.num, fontSize: 28, color: color.signalText }}>06:00 UTC · daily check</span>
          </Rise>
          <ChatBar width={listW} size={vertical ? 34 : 36} text={<DecodeText text={PROMPT} start={cue("land-next")} perChar={0.6} scramble={4} />} />
        </AbsoluteFill>
        <div style={{ position: "absolute", left: width / 2 - listW / 2, top: listTop + 60, width: listW, display: "flex", flexDirection: "column", gap: 18 }}>
          <Rise delay={cue("land-next") + 20}>
            <Row rank={1} {...ROWS[0]} />
          </Rise>
          <div style={{ height: room * (rowH + 4), position: "relative" }}>
            {frame >= hit && (
              <div style={{ scale: `${snap}` }}>
                <Ticks delay={rec} gap={10} style={{ display: "block" }}>
                  <Row rank={2} name={<AcmeChip solid size={34} />} note="Startup CRM that sets up in a day" highlight>
                    {frame >= rec && (
                      <span style={{ position: "relative" }}>
                        {/* Rays and confetti sit behind the label. */}
                        <span style={{ position: "absolute", left: 30, top: "50%", width: 0, height: 0, zIndex: 0 }}>
                          <Starburst at={rec} size={vertical ? 800 : 1000} tint={color.spark} rays={18} spin={0.6} />
                          <ChevronConfetti at={rec} radius={vertical ? 380 : 460} />
                        </span>
                        <Tag tone="spark" style={{ position: "relative", zIndex: 1, scale: `${interpolate(frame, [rec, rec + 4, rec + 9], [0.4, 1.15, 1], clamp)}` }}>
                          <SparkStar size={28} /> Recommended
                        </Tag>
                      </span>
                    )}
                  </Row>
                </Ticks>
              </div>
            )}
          </div>
          {ROWS.slice(1).map((r, i) => (
            <Rise key={r.name} delay={cue("land-next") + 26 + i * 6}>
              <Row rank={frame >= hit ? i + 3 : i + 2} {...r} />
            </Rise>
          ))}
        </div>
        {frame >= there && frame < hit + 2 && (
          <div style={{ position: "absolute", left: pt.x - 150, top: pt.y - 90, rotate: `${interpolate(fp, [0, 1], [-30, 0])}deg` }}>
            <Dart />
          </div>
        )}
        <div style={{ position: "absolute", left: slotX, top: slotY, width: 0, height: 0 }}>
          <SonarRings at={hit} size={200} count={3} />
        </div>
        <Rise delay={4} style={{ position: "absolute", right: vertical ? 56 : 120, top: vertical ? 200 : 64, display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ ...type.label, fontSize: 28, color: color.ink2 }}>Visibility</span>
          <FlapCounter value={60} from={0} suffix="%" start={rec} size={44} />
        </Rise>
      </AbsoluteFill>
      {/* Warm light leak over the win. */}
      {frame >= rec && frame < rec + 30 && (
        <AbsoluteFill style={{ mixBlendMode: "screen", opacity: interpolate(frame, [rec, rec + 5, rec + 24], [0, 0.16, 0], clamp) }}>
          <Solid width={width} height={height} color="black" effects={[lightLeak({ seed: 5, hueShift: 0, progress: interpolate(frame, [rec, rec + 30], [0.1, 0.9], clamp) })]} />
        </AbsoluteFill>
      )}
    </Pan>
  );
};

// Points along the Climb outline, for the watermark that assembles from dots.
const CLIMB_POINTS = (() => {
  const d = motif.climb;
  const len = getLength(d);
  return Array.from({ length: 140 }).map((_, i) => getPointAtLength(d, (i / 140) * len));
})();

// 9. Close: a giant chevron wipes up into Night; the Climb rebuilds from the grid's dots.
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const wipe = interpolate(frame, [0, 20], [0.15, 9], { ...clamp, easing: Easing.in(Easing.cubic) });
  const night = frame >= 18;
  const markW = vertical ? 760 : 900;
  const markH = markW * (39 / 56);
  const mx = width - markW * (vertical ? 0.85 : 0.9);
  const my = height - markH * (vertical ? 1.4 : 0.95);
  const gather = interpolate(frame, [16, 56], [0, 1], { ...clamp, easing: EASE });
  const fill = interpolate(frame, [50, 70], [0, 0.06], clamp);
  const shine = interpolate(frame, [cue("close-start") + 8, cue("close-start") + 26], [-30, 130], clamp);

  return (
    <AbsoluteFill style={{ fontFamily: font.sans, overflow: "hidden" }}>
      {!night && (
        <svg viewBox="4 24 56 39" width={300} height={210} style={{ position: "absolute", left: width / 2 - 150, top: height - 120, scale: `${wipe}`, transformOrigin: "50% 100%" }}>
          <path d={motif.climb.split(" M18.593")[0]} fill={color.night} />
        </svg>
      )}
      {night && (
        <AbsoluteFill style={{ background: color.night }}>
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            {CLIMB_POINTS.map((p, i) => {
              const tx = mx + ((p.x - 4) / 56) * markW;
              const ty = my + ((p.y - 24) / 39) * markH;
              const sx = random(`dx${i}`) * width;
              const sy = random(`dy${i}`) * height;
              return <circle key={i} cx={sx + (tx - sx) * gather} cy={sy + (ty - sy) * gather} r={3.5} fill={color.sky} opacity={0.5 - fill * 4} />;
            })}
          </svg>
          <svg viewBox="4 24 56 39" width={markW} height={markH} style={{ position: "absolute", left: mx, top: my }}>
            <path d={motif.climb} fill={`rgba(255,255,255,${fill})`} />
          </svg>
          <Logo white height={vertical ? 56 : 52} style={{ position: "absolute", left: vertical ? 64 : 120, top: vertical ? 220 : 88, opacity: useIn(20, 10) }} />
          <AbsoluteFill style={{ justifyContent: "center", padding: vertical ? "0 64px" : "0 120px", gap: vertical ? 56 : 48 }}>
            <Rise delay={cue("close-get")}>
              <Headline lead="Get recommended" payoff="in AI answers" breakBefore onNight size={vertical ? 110 : 128} />
            </Rise>
            <Rise delay={cue("close-start")} style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <NotchButton label="Start free trial" variant="onNight" />
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)", background: `linear-gradient(100deg, transparent ${shine - 15}%, rgba(143,176,255,0.55) ${shine}%, transparent ${shine + 15}%)` }} />
              </div>
              <NotchButton label="Book a demo" variant="ghostNight" />
            </Rise>
            <Rise delay={cue("close-start") + 8}>
              <div style={{ ...type.lead, color: color.onNight2 }}>Free forever plan. No card needed.</div>
            </Rise>
          </AbsoluteFill>
          <Rise delay={cue("close-start") + 14} style={{ position: "absolute", left: vertical ? 64 : 120, bottom: vertical ? 420 : 72, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: color.pos }} />
            <span style={{ ...type.num, fontSize: 26, color: color.onNight2 }}>All systems normal</span>
          </Rise>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
