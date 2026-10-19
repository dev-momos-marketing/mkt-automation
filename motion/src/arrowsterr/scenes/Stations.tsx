import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, font, radius, type } from "../brand";
import { FlapCounter, Pan, RadialGauge, SplitFlap } from "../fx";
import { cue, cueEnd } from "../timeline";
import { Chevron, clamp, EASE, Rise, Tag, Ticks, typed, useIn, useIsVertical, Window } from "../ui";

// Visibility HUD in the corner of every station: clacks to the stage's new value.
const VisHud: React.FC<{ value: number; from: number; at: number }> = ({ value, from, at }) => {
  const vertical = useIsVertical();
  return (
    <div style={{ position: "absolute", right: vertical ? 56 : 120, top: vertical ? 200 : 64, display: "flex", alignItems: "center", gap: 18 }}>
      <span style={{ ...type.label, fontSize: 28, color: color.ink2 }}>Visibility</span>
      <FlapCounter value={value} from={from} suffix="%" start={at} size={44} />
    </div>
  );
};

const StationTitle: React.FC<{ n: string; title: string }> = ({ n, title }) => {
  const vertical = useIsVertical();
  return (
    <Rise delay={2} style={{ position: "absolute", left: vertical ? 56 : 120, top: vertical ? 200 : 64, display: "flex", alignItems: "baseline", gap: 14 }}>
      <span style={{ ...type.num, fontSize: 34, color: color.signalText }}>{n}</span>
      <span style={{ ...type.h2, fontSize: 52, color: color.inkStrong }}>{title}</span>
    </Rise>
  );
};

// ------------------------------------------------------------ 01 See

const BOARD = [
  ["Best CRM for startups", "Northwind"],
  ["CRM with email built in", "Globex"],
  ["Cheapest CRM for 5 seats", "Initech"],
  ["CRM that syncs with Slack", "Northwind"],
  ["Best free CRM", "Globex"],
];

export const See: React.FC = () => {
  const vertical = useIsVertical();
  const a = cue("see-1");
  const b = cue("see-2");
  const flap = vertical ? 22 : 28;
  return (
    <Pan>
      <StationTitle n="01" title="See" />
      <VisHud value={18} from={0} at={cueEnd("see-2")} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: vertical ? 120 : 40 }}>
        <Window title="AI answers · checked daily" width={vertical ? 1000 : 1640} bodyStyle={{ display: "flex", flexDirection: "column", gap: 14, padding: vertical ? 24 : 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: vertical ? "1fr 220px 190px" : "1fr 320px 260px", ...type.label, color: color.ink2, paddingBottom: 6 }}>
            <span>Prompt</span>
            <span>AI recommends</span>
            <span>Acme</span>
          </div>
          {BOARD.map(([prompt, who], i) => (
            <div key={prompt} style={{ display: "grid", gridTemplateColumns: vertical ? "1fr 220px 190px" : "1fr 320px 260px", alignItems: "center" }}>
              <SplitFlap text={vertical ? prompt.slice(0, 22) : prompt} start={a + i * 5} flips={5} stagger={0.6} size={flap} />
              <SplitFlap text={who} start={a + 10 + i * 5} flips={6} stagger={0.8} size={flap} tile={color.signalTint} ink={color.signalText} />
              <SplitFlap text="Missing" start={b + 4 + i * 5} flips={6} stagger={0.8} size={flap} tile={color.negTint} ink={color.neg} />
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <Rise delay={b + 30}>
              <Ticks delay={b + 40} gap={10}>
                <Tag tone="signal" style={{ fontSize: 32 }}>14 gaps found</Tag>
              </Ticks>
            </Rise>
          </div>
        </Window>
      </AbsoluteFill>
    </Pan>
  );
};

// ------------------------------------------------------------ 02 Find

const KEYWORDS: [string, number, number, string][] = [
  ["crm software", 49500, 78, "Buy"],
  ["best crm software", 12100, 64, "Compare"],
  ["crm software for small business", 6600, 52, "Buy"],
  ["free crm software", 5400, 58, "Buy"],
];

export const Find: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const a = cue("find-1");
  const b = cue("find-2");

  const vortex = { x: vertical ? width / 2 : width * 0.3, y: vertical ? height * 0.42 : height * 0.55 };
  const suck = interpolate(frame, [a + 8, a + 36], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const spin = frame * 6;
  const vortexOn = interpolate(frame, [a, a + 8, b + 10, b + 24], [0, 1, 1, 0], clamp);
  const scan = interpolate(frame, [b, b + 30], [0, 100], { ...clamp, easing: Easing.inOut(Easing.quad) });

  const cardFrom = { x: vertical ? width / 2 : width * 0.12, y: vertical ? height * 0.25 : height * 0.32 };
  const cx = interpolate(suck, [0, 1], [cardFrom.x, vortex.x]);
  const cy = interpolate(suck, [0, 1], [cardFrom.y, vortex.y]);

  return (
    <Pan>
      <StationTitle n="02" title="Find" />
      <VisHud value={34} from={18} at={cueEnd("find-2")} />

      {/* Vortex: spiral arms of chevrons and particles pulled into the centre. */}
      <div style={{ position: "absolute", left: vortex.x, top: vortex.y, width: 0, height: 0, opacity: vortexOn }}>
        {Array.from({ length: 4 }).map((_, ring) => (
          <div key={ring} style={{ position: "absolute", left: -(120 + ring * 70), top: -(120 + ring * 70), width: (120 + ring * 70) * 2, height: (120 + ring * 70) * 2, borderRadius: "50%", border: `3px dashed ${ring % 2 ? color.sky : color.signal}`, opacity: 0.5 - ring * 0.1, rotate: `${spin * (ring % 2 ? -1 : 1) * (1 - ring * 0.15)}deg`, scale: "1 0.45" }} />
        ))}
        {Array.from({ length: 36 }).map((_, i) => {
          const life = ((frame * 1.4 + i * 9) % 50) / 50;
          const r = (1 - life) * 420;
          const ang = i * 0.7 + life * 7;
          return <span key={i} style={{ position: "absolute", left: Math.cos(ang) * r, top: Math.sin(ang) * r * 0.45, width: 8, height: 8, borderRadius: 4, background: i % 2 ? color.signal : color.sky, opacity: life }} />;
        })}
      </div>

      {/* The gap card gets pulled in. */}
      {suck < 1 && (
        <div style={{ position: "absolute", left: cx, top: cy, translate: "-50% -50%", scale: `${1 - suck * 0.95}`, rotate: `${suck * 540}deg`, opacity: 1 - suck * 0.6 }}>
          <div style={{ width: 520, background: color.bg, border: `2px solid ${color.line}`, borderRadius: radius.md, padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ ...type.label, color: color.ink2 }}>AI gap</span>
            <span style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 40, color: color.inkStrong }}>Best CRM for startups</span>
            <span style={{ display: "flex", gap: 10 }}>
              <Tag>Northwind recommended</Tag>
              <Tag tone="neg">Acme missing</Tag>
            </span>
          </div>
        </div>
      )}

      {/* Keyword table, revealed by a laser scan. */}
      <div style={{ position: "absolute", left: vertical ? 56 : width * 0.5, right: vertical ? 56 : 120, top: vertical ? height * 0.58 : height * 0.26 }}>
        <div style={{ position: "relative", clipPath: `inset(0 0 ${100 - scan}% 0)` }}>
          <Window title="Keyword research · From AI gaps" bodyStyle={{ padding: "12px 28px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 70px 150px", ...type.label, color: color.ink2, padding: "10px 0", borderBottom: `2px solid ${color.line}` }}>
              <span>Keyword</span>
              <span style={{ textAlign: "right" }}>Volume</span>
              <span style={{ textAlign: "right" }}>KD</span>
              <span style={{ textAlign: "right" }}>Intent</span>
            </div>
            {KEYWORDS.map(([kw, vol, kd, intent], i) => {
              const rowAt = b + 6 + i * 6;
              const v = Math.round(interpolate(frame, [rowAt, rowAt + 18], [0, vol], { ...clamp, easing: EASE }));
              return (
                <div key={kw} style={{ display: "grid", gridTemplateColumns: "1fr 150px 70px 150px", alignItems: "center", padding: "16px 0", borderBottom: `2px solid ${color.lineFaint}` }}>
                  <span style={{ ...type.ui, fontSize: vertical ? 28 : 30, color: color.ink }}>{kw}</span>
                  <span style={{ ...type.num, fontSize: 30, color: color.inkStrong, textAlign: "right" }}>
                    {i === 0 ? <Ticks delay={b + 34} gap={8}>{v.toLocaleString("en-US")}</Ticks> : v.toLocaleString("en-US")}
                  </span>
                  <span style={{ ...type.num, fontSize: 30, color: color.ink2, textAlign: "right" }}>{kd}</span>
                  <span style={{ textAlign: "right" }}>
                    <Tag tone={intent === "Buy" ? "signal" : "neutral"}>{intent}</Tag>
                  </span>
                </div>
              );
            })}
          </Window>
        </div>
        {scan > 0 && scan < 100 && (
          <div style={{ position: "absolute", left: -20, right: -20, top: `${scan}%`, height: 4, background: color.signal, boxShadow: `0 0 24px 8px ${color.sky}88` }} />
        )}
      </div>
    </Pan>
  );
};

// ------------------------------------------------------------ 03 Plan

const TOPICS: [string, string, number][] = [
  ["CRM vs spreadsheet", "Learn", 900],
  ["Best CRM for startups", "Buy", 3200],
  ["CRM pricing guide", "Buy", 1500],
  ["Globex alternatives", "Compare", 2600],
  ["CRM with built-in email", "Buy", 1400],
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const Plan: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const a = cue("plan-1");
  const b = cue("plan-2");
  const sorted = [...TOPICS].sort((x, y) => y[2] - x[2]);

  // Carousel spin, decelerating into a ranked column.
  const settle = interpolate(frame, [a + 24, a + 48], [0, 1], { ...clamp, easing: EASE });
  const spin = interpolate(frame, [a, a + 48], [0, 360 + 72], { ...clamp, easing: Easing.out(Easing.cubic) });
  const colX = vertical ? width / 2 : width * 0.28;
  const colTop = vertical ? 330 : 220;
  const cardW = vertical ? 760 : 620;
  const rowH = vertical ? 96 : 104;

  const week = { left: vertical ? 56 : width * 0.52, top: vertical ? 900 : 230, w: vertical ? width - 112 : width * 0.52 - 120 };
  const colW = (week.w - 4 * 16) / 5;
  const blockH = 120;
  const total = Math.round(interpolate(frame, [b + 36, b + 60], [0, 96], { ...clamp, easing: EASE })) / 10;
  const sweep = interpolate(frame, [b + 38, b + 52], [-10, 110], clamp);

  return (
    <Pan>
      <StationTitle n="03" title="Plan" />
      <VisHud value={47} from={34} at={cueEnd("plan-2")} />

      {TOPICS.map((t, i) => {
        const rank = sorted.indexOf(t);
        const ang = ((i * 72 + spin) * Math.PI) / 180;
        const ringX = Math.sin(ang) * (vertical ? 300 : 280);
        const ringZ = Math.cos(ang);
        const x = interpolate(settle, [0, 1], [colX + ringX, colX]);
        const y = interpolate(settle, [0, 1], [colTop + 2 * rowH + 40, colTop + rank * rowH]);
        const sc = interpolate(settle, [0, 1], [0.75 + ringZ * 0.2, 1]);
        const op = useInRow(frame, a - 4 + i * 2) * interpolate(settle, [0, 1], [0.55 + ringZ * 0.45, 1]);
        return (
          <div key={t[0]} style={{ position: "absolute", left: x - cardW / 2, top: y, width: cardW, height: rowH - 14, scale: `${sc}`, opacity: op, zIndex: Math.round((settle > 0.5 ? 10 - rank : ringZ * 10) + 20), background: color.bg, border: `2px solid ${rank === 0 && settle > 0.9 ? color.signal : color.line}`, borderRadius: radius.md, display: "flex", alignItems: "center", gap: 18, padding: "0 24px" }}>
            <span style={{ ...type.num, fontSize: 28, color: color.ink3, width: 44 }}>{settle > 0.6 ? `#${rank + 1}` : ""}</span>
            <span style={{ ...type.ui, fontSize: 30, fontWeight: 600, color: color.ink, flex: 1 }}>{t[0]}</span>
            <Tag tone={t[1] === "Buy" ? "signal" : "neutral"}>{t[1]}</Tag>
            <span style={{ ...type.num, fontSize: 30, color: color.inkStrong, width: 96, textAlign: "right" }}>${(t[2] / 1000).toFixed(1)}k</span>
          </div>
        );
      })}

      {/* The week: topics fall in like blocks and lock with a flash. */}
      <Rise delay={b - 2} style={{ position: "absolute", left: week.left, top: week.top, width: week.w }}>
        <div style={{ display: "flex", gap: 16 }}>
          {DAYS.map((d, i) => {
            const at = b + 6 + i * 6;
            const fall = interpolate(frame, [at - 10, at], [-520, 0], { ...clamp, easing: Easing.in(Easing.quad) });
            const flash = interpolate(frame, [at, at + 8], [1, 0], clamp);
            const topic = sorted[i];
            return (
              <div key={d} style={{ width: colW, height: blockH + 70, background: color.bg, border: `2px solid ${color.line}`, borderRadius: radius.md, padding: 10, display: "flex", flexDirection: "column", gap: 10, overflow: "visible" }}>
                <span style={{ ...type.label, fontSize: 26, color: color.ink2, textAlign: "center" }}>{d}</span>
                {frame >= at - 10 && (
                  <div style={{ height: blockH, translate: `0 ${fall}px`, background: i === 0 ? color.signal : color.signalTint, borderRadius: radius.sm, padding: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: flash > 0 ? `0 0 0 ${flash * 10}px ${color.sky}66` : undefined }}>
                    <span style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 20, lineHeight: 1.2, color: i === 0 ? color.onSignal : color.signalText }}>{topic[0]}</span>
                    <span style={{ ...type.num, fontSize: 22, color: i === 0 ? color.onSignal : color.signalText }}>${(topic[2] / 1000).toFixed(1)}k</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {sweep > -10 && sweep < 110 && (
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sweep}%`, width: 40, background: `${color.bg}cc`, filter: "blur(8px)" }} />
        )}
        <Rise delay={b + 34} style={{ marginTop: 40 }}>
          <div style={{ ...type.label, fontSize: 30, color: color.ink2, marginBottom: 6 }}>Traffic value of this month's plan</div>
          <Ticks delay={b + 50}>
            <span style={{ ...type.stat, fontSize: vertical ? 112 : 120, letterSpacing: "-0.06em", color: color.inkStrong }}>
              ${total.toFixed(1)}k<span style={{ fontSize: "0.45em", color: color.ink2 }}>/mo</span>
            </span>
          </Ticks>
        </Rise>
      </Rise>
    </Pan>
  );
};

const useInRow = (frame: number, at: number) => interpolate(frame, [at, at + 8], [0, 1], clamp);

// ------------------------------------------------------------ 04 Create

const SOURCE = [
  "# The best CRM for startups in 2026",
  "Startups need a CRM that sets up in a day.",
  "## What to look for",
  "- Email built in",
  "- Pricing per seat",
  "## FAQ",
];

// The page folds into a paper arrow: 7-point polygon from rectangle to dart.
const RECT = [[0, 0], [50, 0], [100, 0], [100, 100], [50, 100], [0, 100], [0, 50]];
const DART = [[0, 10], [52, 34], [100, 50], [100, 50], [52, 66], [0, 90], [30, 50]];
export const foldPoly = (p: number) =>
  RECT.map(([x, y], i) => `${x + (DART[i][0] - x) * p}% ${y + (DART[i][1] - y) * p}%`).join(", ");

export const Create: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const a = cue("create-1");
  const lineAt = (i: number) => a + 4 + i * 9;
  const foldAt = cueEnd("create-ai") + 4;
  const fold = interpolate(frame, [foldAt, foldAt + 14], [0, 1], { ...clamp, easing: EASE });
  const others = 1 - interpolate(frame, [foldAt - 4, foldAt + 6], [0, 1], clamp);

  const page = vertical
    ? { left: 56, top: 760, w: width - 112, h: 560 }
    : { left: width * 0.42, top: 200, w: width * 0.3, h: 700 };
  // After folding, the dart drifts to the launch point (the Ship scene picks it up there).
  const dartW = 300;
  const shrink = interpolate(fold, [0, 1], [1, dartW / page.w]);
  const dx = interpolate(fold, [0, 1], [0, width * 0.36 - (page.left + page.w / 2)]);
  const dy = interpolate(fold, [0, 1], [0, height * 0.5 - (page.top + page.h / 2)]);

  return (
    <Pan exit={false}>
      <div style={{ opacity: others }}>
        <StationTitle n="04" title="Create" />
        <VisHud value={60} from={47} at={cueEnd("create-ai")} />
      </div>

      {/* Markdown source streaming in. */}
      <div style={{ position: "absolute", left: vertical ? 56 : 120, top: vertical ? 330 : 200, width: vertical ? width - 112 : width * 0.38 - 120, opacity: others }}>
        <Window title="draft.md" bodyStyle={{ display: "flex", flexDirection: "column", gap: 10, minHeight: vertical ? 300 : 620 }}>
          {SOURCE.map((l, i) => (
            <span key={l} style={{ ...type.num, fontSize: vertical ? 24 : 26, color: l.startsWith("#") ? color.signalText : color.ink }}>
              {typed(l, frame, lineAt(i), 3.2)}
            </span>
          ))}
        </Window>
      </div>

      {/* Rendered page building beside it, then folding into a paper arrow. */}
      <div
        style={{
          position: "absolute",
          left: page.left,
          top: page.top,
          width: page.w,
          height: page.h,
          translate: `${dx}px ${dy}px`,
          scale: `${shrink} ${interpolate(fold, [0, 1], [1, 180 / page.h])}`,
          rotate: `${fold * -8}deg`,
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: fold > 0 ? color.signal : color.line, clipPath: `polygon(${foldPoly(fold)})` }} />
        <div style={{ position: "absolute", inset: 3, background: color.bg, clipPath: `polygon(${foldPoly(fold)})`, padding: 36, display: "flex", flexDirection: "column", gap: 18, overflow: "hidden" }}>
          <div style={{ opacity: 1 - fold }}>
            <Pop at={lineAt(0) + 10}>
              <div style={{ ...type.h2, fontSize: vertical ? 46 : 44, color: color.inkStrong }}>The best CRM for startups in 2026</div>
            </Pop>
            <Pop at={lineAt(1) + 10}>
              <div style={{ ...type.ui, fontSize: 26, color: color.ink, marginTop: 14 }}>Startups need a CRM that sets up in a day.</div>
            </Pop>
            <Pop at={lineAt(2) + 8}>
              <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 32, color: color.inkStrong, marginTop: 20 }}>What to look for</div>
            </Pop>
            {[3, 4].map((i) => (
              <Pop key={i} at={lineAt(i) + 6}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, ...type.ui, fontSize: 26, color: color.ink, marginTop: 10 }}>
                  <Chevron size={20} fill={color.signal} rotate={90} /> {SOURCE[i].slice(2)}
                </div>
              </Pop>
            ))}
            <Pop at={lineAt(5) + 6}>
              <div style={{ marginTop: 20, padding: 16, background: color.bg3, borderRadius: radius.sm, ...type.label, color: color.ink2 }}>FAQ · 6 buyer questions answered</div>
            </Pop>
          </div>
        </div>
      </div>

      {/* Scores. */}
      <div style={{ position: "absolute", right: vertical ? undefined : 120, left: vertical ? 56 : undefined, top: vertical ? 1380 : 220, display: "flex", flexDirection: vertical ? "row" : "column", gap: 40, opacity: others }}>
        <RadialGauge value={92} at={cue("create-google")} size={vertical ? 300 : 300} label="Google score" />
        <RadialGauge value={88} at={cue("create-ai")} size={vertical ? 300 : 300} label="AI score" />
      </div>
    </Pan>
  );
};

const Pop: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const p = useIn(at, 8);
  return <div style={{ opacity: p, scale: `${0.94 + p * 0.06}`, transformOrigin: "left center" }}>{children}</div>;
};

