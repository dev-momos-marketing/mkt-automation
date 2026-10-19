import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { color, font, radius, type } from "../brand";
import { cue, cueEnd } from "../timeline";
import {
  Chevron,
  clamp,
  EASE,
  FlightGrid,
  NotchButton,
  Rise,
  Slide,
  Tag,
  Ticks,
  typed,
  useIn,
  useIsVertical,
  Window,
} from "../ui";
import { ENGINES } from "./Invisible";

// Stage scenes share a layout that leaves room for the progress HUD.
const Stage: React.FC<{ children: React.ReactNode; row?: boolean }> = ({ children, row }) => {
  const vertical = useIsVertical();
  return (
    <FlightGrid>
      <AbsoluteFill
        style={{
          padding: vertical ? "430px 56px 200px" : "80px 120px 220px",
          flexDirection: row && !vertical ? "row" : "column",
          gap: vertical ? 40 : 48,
          alignItems: row && !vertical ? "center" : "stretch",
          justifyContent: "center",
        }}
      >
        {children}
      </AbsoluteFill>
    </FlightGrid>
  );
};

const count = (frame: number, from: number, to: number, start: number, dur = 20) =>
  Math.round(interpolate(frame, [start, start + dur], [from, to], { ...clamp, easing: EASE }));

// ------------------------------------------------------------------ 01 See

const SCORES = [12, 8, 21, 30, 9, 14];
const GAPS = [
  ["Best review software for small cafes", "Revora"],
  ["Cheapest way to reply to Yelp reviews", "Guestly"],
  ["Top guest feedback tools for hotels", "Revora"],
];

export const See: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const a = cue("aw-s1");
  const b = cue("aw-s2");
  return (
    <Stage row>
      <Window title="AI Visibility / tablely.com" style={{ flex: 1 }} bodyStyle={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {ENGINES.map((name, i) => {
          const at = a + 6 + i * 5;
          const v = count(frame, 0, SCORES[i], at);
          return (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 24, opacity: useInline(frame, at) }}>
              <span style={{ ...type.ui, fontWeight: 600, color: color.ink, width: vertical ? 230 : 240 }}>{name}</span>
              <div style={{ flex: 1, height: 14, borderRadius: radius.sm, background: color.bg3 }}>
                <div style={{ width: `${v}%`, height: "100%", borderRadius: radius.sm, background: color.signal }} />
              </div>
              <span style={{ ...type.num, color: color.inkStrong, width: 90, textAlign: "right" }}>{v}%</span>
            </div>
          );
        })}
      </Window>
      <Window
        title="Competitor gaps"
        style={{ flex: 1 }}
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <Rise delay={b}>
          <Ticks delay={b + 16} gap={10}>
            <Tag tone="signal" style={{ fontSize: 32 }}>14 gaps found</Tag>
          </Ticks>
        </Rise>
        {GAPS.map(([prompt, rival], i) => (
          <Slide key={prompt} delay={b + 6 + i * 7}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "14px 0", borderBottom: `2px solid ${color.lineFaint}` }}>
              <span style={{ ...type.ui, color: color.ink, flex: 1 }}>{prompt}</span>
              <Tag>{rival} cited</Tag>
            </div>
          </Slide>
        ))}
      </Window>
    </Stage>
  );
};

const useInline = (frame: number, at: number) => interpolate(frame, [at - 6, at], [0, 1], clamp);

// ------------------------------------------------------------------ 02 Find

const KEYWORDS: [string, number, number, string][] = [
  ["review software for cafes", 1900, 28, "Buy"],
  ["best restaurant review app", 1300, 35, "Buy"],
  ["how to reply to yelp reviews", 880, 19, "Learn"],
  ["guest feedback tools", 720, 24, "Buy"],
];

export const Find: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const a = cue("aw-f1");

  const gap = (
    <Rise key="gap" delay={a - 4} style={{ flex: vertical ? undefined : "0 0 520px" }}>
      <div style={{ background: color.bg, border: `2px solid ${color.line}`, borderRadius: radius.md, padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ ...type.label, color: color.ink2 }}>AI gap</span>
        <span style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 40, color: color.inkStrong }}>
          Best review software for small cafes
        </span>
        <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Tag>Revora cited</Tag>
          <Tag tone="neg">You: not named</Tag>
        </span>
      </div>
    </Rise>
  );
  const arrow = (
    <Rise key="arrow" delay={a + 20} style={{ alignSelf: "center" }}>
      <Chevron size={56} fill={color.signal} rotate={vertical ? 0 : 90} />
    </Rise>
  );
  const table = (
    <Window key="table" title="Keyword research · From AI gaps" style={{ flex: 1 }} bodyStyle={{ padding: "16px 32px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 90px 140px", ...type.label, color: color.ink2, padding: "12px 0", borderBottom: `2px solid ${color.line}` }}>
        <span>Keyword</span>
        <span style={{ textAlign: "right" }}>Volume</span>
        <span style={{ textAlign: "right" }}>KD</span>
        <span style={{ textAlign: "right" }}>Intent</span>
      </div>
      {KEYWORDS.map(([kw, vol, kd, intent], i) => {
        const at = a + 26 + i * 10;
        const first = i === 0;
        const volText = count(frame, 0, vol, at, 16).toLocaleString("en-US");
        return (
          <div
            key={kw}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 90px 140px",
              alignItems: "center",
              padding: "18px 0",
              borderBottom: `2px solid ${color.lineFaint}`,
              opacity: useInline(frame, at),
              translate: `${(useInline(frame, at) - 1) * 32}px 0`,
            }}
          >
            <span style={{ ...type.ui, color: color.ink }}>{typed(kw, frame, at, 2.4)}</span>
            <span style={{ ...type.num, color: color.inkStrong, textAlign: "right" }}>
              {first ? <Ticks delay={a + 64} gap={8}>{volText}</Ticks> : volText}
            </span>
            <span style={{ ...type.num, color: color.ink2, textAlign: "right" }}>{kd}</span>
            <span style={{ textAlign: "right" }}>
              <Tag tone={intent === "Buy" ? "signal" : "neutral"}>{intent}</Tag>
            </span>
          </div>
        );
      })}
    </Window>
  );
  return <Stage row>{vertical ? [table, arrow, gap] : [gap, arrow, table]}</Stage>;
};

// ------------------------------------------------------------------ 03 Plan

const TOPICS: [string, string, number][] = [
  ["How to reply to Yelp reviews", "Learn", 900],
  ["Best review software for cafes", "Buy", 2100],
  ["Guest feedback tools for hotels", "Buy", 1200],
  ["Revora alternatives", "Compare", 1400],
];
const ROW_H = 92;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const Plan: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const a = cue("aw-p1");
  const b = cue("aw-p2");
  const sort = interpolate(frame, [a + 34, a + 52], [0, 1], { ...clamp, easing: EASE });
  const sorted = [...TOPICS].sort((x, y) => y[2] - x[2]);
  const total = count(frame, 0, 84, b + 4, 24) / 10;

  return (
    <Stage row>
      <Window title="Topic Bank · ranked by value" style={{ flex: 1.2 }} bodyStyle={{ position: "relative", height: ROW_H * TOPICS.length + 24, padding: "12px 32px" }}>
        {TOPICS.map((t, i) => {
          const at = a + 4 + i * 6;
          const y = interpolate(sort, [0, 1], [i, sorted.indexOf(t)]) * ROW_H;
          return (
            <div
              key={t[0]}
              style={{
                position: "absolute",
                left: 32,
                right: 32,
                top: 12 + y,
                height: ROW_H,
                display: "flex",
                alignItems: "center",
                gap: 20,
                borderBottom: `2px solid ${color.lineFaint}`,
                opacity: useInline(frame, at),
              }}
            >
              <span style={{ ...type.ui, color: color.ink, flex: 1 }}>{t[0]}</span>
              <Tag tone={t[1] === "Buy" ? "signal" : "neutral"}>{t[1]}</Tag>
              <span style={{ ...type.num, color: color.inkStrong, width: 120, textAlign: "right" }}>
                ${(t[2] / 1000).toFixed(1)}k
              </span>
            </div>
          );
        })}
      </Window>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: vertical ? 32 : 40 }}>
        <Rise delay={b} style={{ display: "flex", gap: 12 }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ flex: 1, background: color.bg, border: `2px solid ${color.line}`, borderRadius: radius.md, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <span style={{ ...type.label, color: color.ink2 }}>{d}</span>
              <span
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: radius.sm,
                  background: i < 4 ? color.signalTint : color.bg3,
                  opacity: useInline(frame, b + 8 + i * 4),
                }}
              />
            </div>
          ))}
        </Rise>
        <Rise delay={b + 4}>
          <div style={{ ...type.label, fontSize: 32, color: color.ink2, marginBottom: 8 }}>Traffic value of this month's plan</div>
          <Ticks delay={b + 24}>
            <span style={{ ...type.stat, fontSize: vertical ? 120 : 132, letterSpacing: "-0.06em", color: color.inkStrong }}>
              ${total.toFixed(1)}k<span style={{ fontSize: "0.45em", color: color.ink2 }}>/mo</span>
            </span>
          </Ticks>
        </Rise>
      </div>
    </Stage>
  );
};

// ------------------------------------------------------------------ 04 Create

const TITLE = "The best review software for cafes in 2026";
const BODY =
  "Small cafes live and die by their reviews. One bad week on Google can cost you regulars, and most owners have no time to answer every comment.";

export const Create: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const a = cue("aw-c1");
  const google = cue("aw-c2");
  const ai = cue("aw-c3");
  const exportAt = cueEnd("aw-c3") - 6;
  const pressed = interpolate(frame, [exportAt, exportAt + 3, exportAt + 7], [0, 1, 0], clamp);
  const live = useIn(exportAt + 8, 8);

  const score = (label: string, value: number, at: number) => {
    const v = count(frame, 0, value, at, 24);
    return (
      <Rise delay={at - 4}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <span style={{ ...type.ui, fontWeight: 600, color: color.ink }}>{label}</span>
          <span style={{ ...type.stat, fontSize: 72, color: color.inkStrong }}>{v}</span>
        </div>
        <div style={{ height: 14, borderRadius: radius.sm, background: color.bg3 }}>
          <div style={{ width: `${v}%`, height: "100%", borderRadius: radius.sm, background: color.signal }} />
        </div>
      </Rise>
    );
  };

  return (
    <Stage row>
      <Window title="Agentic Writer · Draft" style={{ flex: 1.4 }} bodyStyle={{ display: "flex", flexDirection: "column", gap: 24, minHeight: vertical ? 520 : 560 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Tag tone={live > 0 ? "pos" : "signal"}>{live > 0 ? "Live" : "Writing"}</Tag>
          <span style={{ ...type.label, color: color.ink3 }}>Answers 6 buyer prompts · Cites 4 trusted sources</span>
        </div>
        <div style={{ ...type.h2, fontSize: vertical ? 52 : 56, color: color.inkStrong, minHeight: 130 }}>
          {typed(TITLE, frame, a, 1.6)}
        </div>
        <div style={{ ...type.lead, fontSize: 32, color: color.ink }}>{typed(BODY, frame, a + 26, 2.2)}</div>
      </Window>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: vertical ? 32 : 44 }}>
        {score("Google score", 92, google)}
        {score("AI score", 88, ai)}
        <Rise delay={exportAt - 10} style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <NotchButton label="Export draft" pressed={pressed} />
          <span style={{ ...type.num, color: color.pos, opacity: live }}>draft → live</span>
        </Rise>
      </div>
    </Stage>
  );
};
