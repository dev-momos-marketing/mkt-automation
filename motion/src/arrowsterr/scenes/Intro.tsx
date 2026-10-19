import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, radius, type } from "../brand";
import {
  AcmeChip,
  AiLogo,
  CometRoute,
  Compass,
  DataRain,
  DecodeText,
  ENGINES,
  FlapCounter,
  Glitch,
  Pan,
  Shatter,
  SonarRings,
  Stamp,
  TearFlash,
  useShake,
} from "../fx";
import { CARD_LAND, cue, type Cue } from "../timeline";
import { Chevron, clamp, EASE, Rise, Tag, Ticks, useIn, useIsVertical } from "../ui";

export const PROMPT = "What's the best CRM for a startup?";

// The AI chat bar the whole story starts in.
export const ChatBar: React.FC<{ text: React.ReactNode; width: number; size?: number; caret?: boolean; logo?: string }> = ({
  text,
  width,
  size = 44,
  caret,
  logo,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width,
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: `${size * 0.5}px ${size * 0.7}px`,
        background: color.bg,
        border: `2px solid ${color.lineStrong}`,
        borderRadius: radius.lg,
      }}
    >
      {logo && <AiLogo logo={logo} size={size * 1.1} />}
      <span style={{ ...type.lead, fontSize: size, color: color.ink, flex: 1, minHeight: size * 1.4 }}>
        {text}
        {caret && <span style={{ display: "inline-block", width: 4, height: size * 1.1, marginLeft: 4, verticalAlign: "middle", background: color.signal, opacity: Math.floor(frame / 8) % 2 ? 0 : 1 }} />}
      </span>
      <span style={{ width: size * 1.4, height: size * 1.4, borderRadius: radius.sm, background: color.signal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Chevron size={size * 0.7} fill={color.onSignal} />
      </span>
    </div>
  );
};

// 1. "Your next customer just asked ChatGPT one question." The question decodes as it's read.
export const Hook: React.FC = () => {
  const vertical = useIsVertical();
  const frame = useCurrentFrame();
  const typingAt = cue("hook-2") - 2;
  const logoIn = useIn(cue("hook-1") + 30, 10);
  return (
    <Pan enter={false}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: logoIn, translate: `0 ${(1 - logoIn) * 16}px` }}>
          <AiLogo logo="chatgpt.svg" size={44} />
          <span style={{ ...type.label, fontSize: 32, fontWeight: 600, color: color.inkStrong }}>ChatGPT</span>
        </div>
        <ChatBar
          width={vertical ? 960 : 1240}
          size={vertical ? 40 : 46}
          caret
          text={frame < typingAt ? <span style={{ color: color.ink3 }}>Ask anything</span> : <DecodeText text={PROMPT} start={typingAt} perChar={1.25} scramble={5} />}
        />
      </AbsoluteFill>
    </Pan>
  );
};

const COMPETITORS = [
  { name: "Northwind", note: "Pipelines for small teams" },
  { name: "Globex", note: "Email and CRM in one" },
  { name: "Initech", note: "Cheapest seat price" },
];

// A competitor card dealt face-down, flipping over in 3D and slamming down.
const DealtCard: React.FC<{ rank: number; name: string; note: string; land: number; w: number; h: number }> = ({
  rank,
  name,
  note,
  land,
  w,
  h,
}) => {
  const frame = useCurrentFrame();
  const fly = interpolate(frame, [land - 14, land], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const snap = interpolate(frame, [land, land + 3, land + 7], [1, 1.06, 1], clamp);
  if (frame < land - 14) return <div style={{ width: w, height: h }} />;
  const face = (back: boolean): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    borderRadius: radius.md,
    rotate: back ? "y 180deg" : undefined,
  });
  return (
    <div style={{ width: w, height: h, perspective: 1600 }}>
      <div
        style={{
          position: "relative",
          width: w,
          height: h,
          transformStyle: "preserve-3d",
          translate: `${(1 - fly) * -700}px ${(1 - fly) * 500}px`,
          rotate: `y ${(1 - fly) * 180}deg`,
          scale: `${snap}`,
        }}
      >
        <div style={{ ...face(false), background: color.bg, border: `2px solid ${color.line}`, padding: 28, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ ...type.num, fontSize: 28, color: color.ink2 }}>#{rank}</span>
            <Tag tone="signal">Recommended</Tag>
          </div>
          <span style={{ ...type.h2, fontSize: 52, color: color.inkStrong }}>{name}</span>
          <span style={{ ...type.ui, fontSize: 28, color: color.ink2 }}>{note}</span>
        </div>
        <div style={{ ...face(true), background: color.night, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: 18, padding: 24 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Chevron key={i} size={40} fill={color.sky} />
          ))}
        </div>
      </div>
    </div>
  );
};

// 2. AI hands over its shortlist. "Guess who's missing? You." Then we zoom through the gap.
export const Shortlist: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const missing = cue("list-2");
  const you = cue("list-3");
  const slot = useIn(missing, 10);
  const w = vertical ? 900 : 400;
  const h = vertical ? 200 : 300;

  return (
    <Pan zoomOut={vertical ? { x: 50, y: 78 } : { x: 84, y: 62 }} dur={12}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: vertical ? 260 : 90, gap: vertical ? 40 : 56 }}>
        <ChatBar width={vertical ? 960 : 1240} size={vertical ? 34 : 36} text={PROMPT} logo="chatgpt.svg" />
        <DecodeText text="Here's a shortlist for startups:" start={cue("list-1") + 6} perChar={0.7} style={{ ...type.lead, color: color.ink2 }} />
        <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", gap: 28 }}>
          {COMPETITORS.map((c, i) => (
            <DealtCard key={c.name} rank={i + 1} name={c.name} note={c.note} land={CARD_LAND[i]} w={w} h={h} />
          ))}
          <div
            style={{
              width: w,
              height: h,
              boxSizing: "border-box",
              borderRadius: radius.md,
              border: `3px dashed ${frame >= you ? color.neg : color.lineStrong}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              opacity: slot,
              translate: `0 ${(1 - slot) * 16}px`,
            }}
          >
            <span style={{ ...type.num, fontSize: 28, color: color.ink3 }}>#4</span>
            <Ticks delay={you}>
              <Glitch intensity={frame >= you ? 1 : 0.45} seed="slot">
                <AcmeChip size={34} />
              </Glitch>
            </Ticks>
          </div>
        </div>
      </AbsoluteFill>
    </Pan>
  );
};

const ALL: { cue: Cue; engine: number }[] = [
  { cue: "all-claude", engine: 1 },
  { cue: "all-gemini", engine: 2 },
  { cue: "all-perplexity", engine: 3 },
  { cue: "all-google", engine: 4 },
];

// One engine's live answer: lights up when named, streams its shortlist, stamps you out.
const EngineWindow: React.FC<{ engine: number; at: number; w: number; h: number }> = ({ engine, at, w, h }) => {
  const frame = useCurrentFrame();
  const on = frame >= at;
  const e = ENGINES[engine];
  const pop = on ? interpolate(frame - at, [0, 4, 10], [1, 1.05, 1], clamp) : 1;
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        boxSizing: "border-box",
        background: color.bg,
        border: `3px solid ${on ? color.signal : color.line}`,
        borderRadius: radius.lg,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: on ? 1 : 0.4,
        filter: on ? undefined : "grayscale(1)",
        scale: `${pop}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        <span style={{ position: "relative", display: "flex" }}>
          <AiLogo logo={e.logo} size={48} />
          <SonarRings at={at} size={60} />
        </span>
        <span style={{ ...type.label, fontSize: 32, fontWeight: 600, color: color.inkStrong }}>{e.name}</span>
      </div>
      <span style={{ ...type.ui, fontSize: 24, color: color.ink3 }}>{PROMPT}</span>
      {COMPETITORS.map((c, i) => {
        const t = at + 4 + i * 3;
        return (
          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: radius.sm, background: color.bg3, opacity: interpolate(frame, [t, t + 4], [0, 1], clamp), translate: `${interpolate(frame, [t, t + 6], [-24, 0], { ...clamp, easing: EASE })}px 0` }}>
            <span style={{ ...type.num, fontSize: 24, color: color.ink2 }}>{i + 1}</span>
            <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 28, color: color.ink }}>{c.name}</span>
          </div>
        );
      })}
      <div style={{ position: "relative", marginTop: 6, opacity: interpolate(frame, [at + 12, at + 14], [0, 1], clamp) }}>
        <div style={{ padding: "10px 14px", borderRadius: radius.sm, border: `2px dashed ${color.lineStrong}`, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ ...type.num, fontSize: 24, color: color.ink3 }}>4</span>
          <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 26, color: color.ink3 }}>acme.com</span>
        </div>
        <Stamp at={at + 12} label="Not recommended" style={{ right: -6, top: -14 }} />
      </div>
    </div>
  );
};

// 3. "Same story on Claude. Gemini. Perplexity. Google." Four live answers, one by one.
export const Everywhere: React.FC = () => {
  const vertical = useIsVertical();
  const shake = useShake(ALL.map((a) => cue(a.cue) + 12), 10, 8);
  const w = vertical ? 470 : 410;
  const h = vertical ? 560 : 600;
  return (
    <Pan zoomIn exit={false}>
      <DataRain />
      <AbsoluteFill style={{ translate: shake, justifyContent: "center", alignItems: "center", flexDirection: "column", gap: vertical ? 40 : 48 }}>
        <DecodeText text="Same question. Every engine." start={cue("all-0")} perChar={0.8} style={{ ...type.h2, color: color.inkStrong }} />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, width: vertical ? w * 2 + 24 : undefined }}>
          {ALL.map((a) => (
            <EngineWindow key={a.cue} engine={a.engine} at={cue(a.cue)} w={w} h={h} />
          ))}
        </div>
      </AbsoluteFill>
    </Pan>
  );
};

// 4. "Zero recommendations. Zero deals." A tear, a giant 0, a slow-motion shatter.
export const Zero: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const z1 = cue("zero-1");
  const z2 = cue("zero-2");
  const drain = interpolate(frame, [z2, z2 + 20], [0, 1], clamp);
  const push = interpolate(frame, [z1, z2 + 40], [1, 1.08], clamp);
  const shake = useShake([z1, z2], 18, 10);
  return (
    <Pan enter={false}>
      <AbsoluteFill style={{ translate: shake, scale: `${push}`, filter: drain > 0 ? `grayscale(${drain}) contrast(${1 + drain * 0.15})` : undefined, justifyContent: "center", alignItems: "center", flexDirection: "column", gap: vertical ? 48 : 40 }}>
        <Rise delay={z1} dur={6} style={{ display: "flex", alignItems: "center", gap: vertical ? 24 : 40, flexDirection: vertical ? "column" : "row" }}>
          <FlapCounter value={0} start={z1 + 2} size={vertical ? 260 : 300} tile={color.bg3} />
          <span style={{ ...type.h1, color: color.inkStrong, maxWidth: 600 }}>AI recommendations</span>
        </Rise>
        <div style={{ height: 120, display: "flex", alignItems: "center" }}>
          <Shatter at={z2} width={vertical ? 400 : 420} height={vertical ? 92 : 96} cols={14} rows={5} speed={0.45}>
            <Glitch intensity={0.6} seed="zero">
              <AcmeChip size={vertical ? 38 : 40} />
            </Glitch>
          </Shatter>
        </div>
        <Rise delay={z2 + 4}>
          <span style={{ ...type.h2, color: color.neg }}>0 deals</span>
        </Rise>
      </AbsoluteFill>
      <TearFlash at={z1 - 2} dur={12} />
    </Pan>
  );
};

// 5. "Here's the fix. You need a navigator." The nav display boots; a comet launches from it.
export const Fix: React.FC = () => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const frame = useCurrentFrame();
  const f1 = cue("fix-1");
  const f2 = cue("fix-2");
  // The compass boots big in the centre, then flies to the HUD corner on "navigator".
  const fly = interpolate(frame, [f2 + 6, f2 + 26], [0, 1], { ...clamp, easing: EASE });
  const big = vertical ? 380 : 420;
  const small = 120;
  const hud = { x: width - (vertical ? 56 : 120) - small / 2, y: (vertical ? 200 : 64) + small / 2 };
  const size = interpolate(fly, [0, 1], [big, small]);
  const cx = interpolate(fly, [0, 1], [width / 2, hud.x]);
  const cy = interpolate(fly, [0, 1], [height * 0.42, hud.y]);
  const textOut = interpolate(frame, [f2 + 4, f2 + 14], [1, 0], clamp);
  return (
    <Pan enter={false} exit={false}>
      <div style={{ position: "absolute", left: cx - size / 2, top: cy - size / 2 }}>
        <Compass size={size} boot={f1 - 8} heading={45} />
      </div>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: vertical ? 620 : 560, opacity: textOut }}>
        <DecodeText text="Here's the fix." start={f1} perChar={1.2} style={{ ...type.display, fontSize: vertical ? 110 : 120, color: color.inkStrong }} />
      </AbsoluteFill>
      <CometRoute
        d={`M ${width / 2} ${height * 0.42} C ${width * 0.55} ${height * 0.75}, ${width * 0.2} ${height * 0.8}, ${width * 0.35} ${height * 0.55} S ${width * 0.8} ${height * 0.3}, ${width + 200} ${height * 0.2}`}
        start={f2 + 2}
        dur={30}
        width={width}
        height={height}
        stroke={8}
        headSize={70}
      />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 420 : 120, opacity: useIn(f2 + 8, 10) }}>
        <span style={{ ...type.h2, color: color.inkStrong }}>
          You need a <span style={{ color: color.signalText }}>navigator</span>
        </span>
      </AbsoluteFill>
    </Pan>
  );
};

