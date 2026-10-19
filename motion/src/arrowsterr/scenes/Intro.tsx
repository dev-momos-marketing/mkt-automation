import { noise2D } from "@remotion/noise";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, radius, type } from "../brand";
import {
  AcmeChip,
  AiLogo,
  CometRoute,
  DecodeText,
  ENGINES,
  FlapCounter,
  Glitch,
  Pan,
  Shatter,
  SonarRings,
  Stamp,
  useShake,
} from "../fx";
import { CARD_LAND, cue, type Cue } from "../timeline";
import { Chevron, clamp, EASE, Rise, Tag, Ticks, useIn, useIsVertical } from "../ui";

export const PROMPT = "What's the best CRM for a startup?";

// The AI chat bar the whole story starts in.
export const ChatBar: React.FC<{ text: React.ReactNode; width: number; size?: number; caret?: boolean }> = ({
  text,
  width,
  size = 44,
  caret,
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

// 1. Cold open: a cursor, then the buyer's question decodes into the chat bar.
export const Ask: React.FC = () => {
  const vertical = useIsVertical();
  const typingAt = cue("ask-when") - 4;
  const frame = useCurrentFrame();
  return (
    <Pan enter={false}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 40 }}>
        <Rise delay={cue("ask-quick")}>
          <span style={{ ...type.label, fontSize: 30, color: color.ink2 }}>Quick question.</span>
        </Rise>
        <ChatBar
          width={vertical ? 960 : 1240}
          size={vertical ? 40 : 46}
          caret
          text={
            frame < typingAt ? (
              <span style={{ color: color.ink3 }}>Ask anything</span>
            ) : (
              <DecodeText text={PROMPT} start={typingAt} perChar={1.6} scramble={5} />
            )
          }
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

// 2. AI hands back a shortlist. The 4th slot is empty, and your ghost glitches in it.
export const Shortlist: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const so = cue("list-so");
  const you = cue("list-you");
  const dive = interpolate(frame, [you, you + 30], [1, vertical ? 1.05 : 1.06], { ...clamp, easing: EASE });
  const slot = useIn(so, 10);
  const w = vertical ? 900 : 400;
  const h = vertical ? 200 : 300;

  return (
    <Pan>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: vertical ? 260 : 90, gap: vertical ? 40 : 56, scale: `${dive}`, transformOrigin: vertical ? "50% 82%" : "70% 60%" }}>
        <ChatBar width={vertical ? 960 : 1240} size={vertical ? 34 : 36} text={PROMPT} />
        <Rise delay={cue("list-ask")} style={{ alignSelf: vertical ? "center" : undefined }}>
          <DecodeText text="Here's a shortlist for startups:" start={cue("list-ask")} perChar={0.8} style={{ ...type.lead, color: color.ink2 }} />
        </Rise>
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
              border: `3px dashed ${color.lineStrong}`,
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
            <Ticks delay={you + 10}>
              <Glitch intensity={frame >= you ? 1 : 0.4} seed="slot">
                <AcmeChip size={34} />
              </Glitch>
            </Ticks>
          </div>
        </div>
      </AbsoluteFill>
    </Pan>
  );
};

const ENGINE_CUES: Cue[] = ["eng-chatgpt", "eng-claude", "eng-gemini", "eng-perplexity", "eng-google"];

const useArc = () => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const hub = { x: width / 2, y: height * (vertical ? 0.7 : 0.8) };
  const nodes = ENGINES.map((_, i) => {
    const a = Math.PI * (1.15 + (i / 4) * 0.7); // arc above the hub
    const rx = width * (vertical ? 0.4 : 0.36);
    const ry = height * (vertical ? 0.3 : 0.5);
    return { x: hub.x + Math.cos(a) * rx, y: hub.y + Math.sin(a) * ry };
  });
  return { hub, nodes, vertical, width, height };
};

// The engine arc: 5 real AI engines on orbiting rings around the buyer's prompt.
const EngineArc: React.FC<{ lit: (i: number) => boolean; children?: React.ReactNode; stamps?: boolean }> = ({
  lit,
  stamps,
  children,
}) => {
  const frame = useCurrentFrame();
  const { hub, nodes, vertical, width, height } = useArc();
  const size = vertical ? 150 : 170;
  const sweepStart = cue("eng-check");
  const sweep = -160 + ((frame - sweepStart) * 2.2) % 140;

  return (
    <AbsoluteFill>
      {!stamps && frame >= sweepStart && (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <path
            d={`M ${hub.x} ${hub.y} L ${hub.x + Math.cos(((sweep - 12) * Math.PI) / 180) * 2400} ${hub.y + Math.sin(((sweep - 12) * Math.PI) / 180) * 2400} L ${hub.x + Math.cos((sweep * Math.PI) / 180) * 2400} ${hub.y + Math.sin((sweep * Math.PI) / 180) * 2400} Z`}
            fill={color.signal}
            opacity={0.07}
          />
        </svg>
      )}
      {nodes.map((n, i) => {
        const on = lit(i);
        const bobX = noise2D(`bx${i}`, frame * 0.02, 0) * 10;
        const bobY = noise2D(`by${i}`, frame * 0.02, 1) * 8;
        const pop = on ? interpolate(frame - cue(ENGINE_CUES[i]), [0, 4, 10], [1, 1.14, 1.06], clamp) : 1;
        return (
          <div key={ENGINES[i].id} style={{ position: "absolute", left: n.x - size / 2 + bobX, top: n.y - size / 2 + bobY, width: size, height: size }}>
            <svg width={size * 1.9} height={size * 1.9} viewBox="-1 -1 2 2" style={{ position: "absolute", left: -size * 0.45, top: -size * 0.45, overflow: "visible", rotate: `${frame * (i % 2 ? 0.8 : -0.6)}deg` }}>
              <ellipse rx={0.95} ry={0.42} fill="none" stroke={on ? color.sky : color.lineStrong} strokeWidth={0.012} strokeDasharray="0.05 0.04" transform={`rotate(${i * 30 - 20})`} />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: color.bg,
                border: `3px solid ${on ? color.signal : color.line}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                scale: `${pop}`,
              }}
            >
              <AiLogo logo={ENGINES[i].logo} size={size * 0.48} style={{ opacity: on || stamps ? 1 : 0.45, filter: on || stamps ? undefined : "grayscale(1)" }} />
            </div>
            {!stamps && <SonarRings at={cue(ENGINE_CUES[i])} size={size} />}
            <div style={{ position: "absolute", top: size + 14, left: -60, right: -60, textAlign: "center", ...type.label, fontSize: vertical ? 26 : 28, fontWeight: 600, color: on ? color.inkStrong : color.ink3 }}>
              {ENGINES[i].name}
            </div>
            {stamps && <Stamp at={cue("inv-zero") + 4 + i * 4} label="Not recommended" style={{ left: -20, top: size * 0.32 }} />}
          </div>
        );
      })}
      {!stamps &&
        ENGINE_CUES.map((c, i) => {
          const n = nodes[i];
          const midX = (hub.x + n.x) / 2;
          return (
            <CometRoute
              key={c}
              d={`M ${hub.x} ${hub.y - 60} Q ${midX} ${hub.y - 260} ${n.x} ${n.y + size * 0.55}`}
              start={cue(c) - 8}
              dur={9}
              width={width}
              height={height}
              stroke={3}
              headSize={26}
            />
          );
        })}
      {children}
    </AbsoluteFill>
  );
};

// 3. "Let's check": the prompt fires to 5 engines; each lights up as it's named.
export const Engines: React.FC = () => {
  const frame = useCurrentFrame();
  const { hub, vertical } = useArc();
  return (
    <Pan exit={false}>
      <EngineArc lit={(i) => frame >= cue(ENGINE_CUES[i])}>
        <div style={{ position: "absolute", left: hub.x, top: hub.y, translate: "-50% -50%" }}>
          <ChatBar width={vertical ? 760 : 880} size={vertical ? 30 : 32} text={PROMPT} />
        </div>
      </EngineArc>
    </Pan>
  );
};

// 4. "Zero recommendations": stamps slam down, your ghost shatters, 0% clacks in.
export const Invisible: React.FC = () => {
  const { hub, vertical } = useArc();
  const hits = [0, 1, 2, 3, 4].map((i) => cue("inv-zero") + 4 + i * 4);
  const shake = useShake([...hits, cue("inv-you")], 12);
  const you = cue("inv-you");
  return (
    <Pan enter={false}>
      <AbsoluteFill style={{ translate: shake }}>
        <EngineArc lit={() => false} stamps>
          <div style={{ position: "absolute", left: hub.x, top: hub.y, translate: "-50% -50%", display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: vertical ? 40 : 80 }}>
            <Shatter at={you} width={vertical ? 400 : 420} height={vertical ? 92 : 96} cols={12} rows={4}>
              <Glitch intensity={0.8} seed="inv">
                <AcmeChip size={vertical ? 38 : 40} />
              </Glitch>
            </Shatter>
            <Rise delay={you + 4} style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ ...type.label, fontSize: 32, color: color.ink2 }}>Visibility</span>
              <FlapCounter value={0} suffix="%" start={you + 4} size={72} />
            </Rise>
          </div>
        </EngineArc>
      </AbsoluteFill>
    </Pan>
  );
};

// 5. "Good news." A beat of calm, then the navigator streaks in.
export const Navigator: React.FC = () => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const need = cue("nav-need");
  const frame = useCurrentFrame();
  const textOut = interpolate(frame, [need + 8, need + 20], [1, 0], clamp);
  const y = height * 0.5;
  return (
    <Pan>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: textOut }}>
        <DecodeText text="Good news." start={cue("nav-good")} perChar={1.4} style={{ ...type.display, fontSize: vertical ? 120 : 150, color: color.inkStrong }} />
      </AbsoluteFill>
      <CometRoute
        d={`M -100 ${y + 260} C ${width * 0.3} ${y + 240}, ${width * 0.45} ${y - 40}, ${width * 0.62} ${y - 120} S ${width * 0.95} ${y - 360}, ${width + 200} ${y - 420}`}
        start={need}
        dur={34}
        width={width}
        height={height}
        stroke={8}
        headSize={70}
      />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 420 : 120, opacity: useIn(need + 10, 10) }}>
        <span style={{ ...type.h2, color: color.inkStrong }}>
          You need a <span style={{ color: color.signalText }}>navigator</span>
        </span>
      </AbsoluteFill>
    </Pan>
  );
};

