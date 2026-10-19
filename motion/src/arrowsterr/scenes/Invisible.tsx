import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { color, radius, type } from "../brand";
import { cue } from "../timeline";
import { BrandChip, Climb, clamp, EASE, FlightGrid, Rise, Tag, Ticks, useIsVertical } from "../ui";

export const ENGINES = ["ChatGPT", "Claude", "Gemini", "Perplexity", "AI Overviews", "AI Mode"];
const START = cue("aw-inv") - 4;

// 3. The same question on 6 engines, run in parallel. None of them name you.
export const Invisible: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();

  return (
    <FlightGrid>
      <AbsoluteFill
        style={{
          padding: vertical ? "200px 64px" : "96px 120px",
          flexDirection: vertical ? "column" : "row",
          gap: vertical ? 72 : 120,
          alignItems: vertical ? "stretch" : "center",
          justifyContent: "center",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          <Rise>
            <div style={{ display: "flex", alignItems: "center", gap: 12, ...type.label, fontSize: 30, fontWeight: 600, color: color.signalText }}>
              <Climb size={30} fill={color.signalText} /> Daily check
            </div>
          </Rise>
          <Rise delay={3}>
            <div style={{ ...type.h1, color: color.inkStrong, marginBottom: 24 }}>
              Same question. <span style={{ color: color.signalText }}>6 AI engines.</span>
            </div>
          </Rise>
          {ENGINES.map((name, i) => {
            const at = START + i * 8;
            const run = interpolate(frame, [at, at + 22], [0, 1], { ...clamp, easing: EASE });
            const done = frame >= at + 22;
            return (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  padding: "14px 0",
                  borderBottom: `2px solid ${color.lineFaint}`,
                  opacity: interpolate(frame, [at - 6, at], [0, 1], clamp),
                }}
              >
                <span style={{ ...type.ui, fontWeight: 600, color: color.ink, width: 260 }}>{name}</span>
                <div style={{ flex: 1, height: 14, borderRadius: radius.sm, background: color.bg3, overflow: "hidden" }}>
                  <div style={{ width: `${run * 100}%`, height: "100%", background: done ? color.lineStrong : color.signal }} />
                </div>
                <span style={{ width: 230, display: "flex", justifyContent: "flex-end" }}>
                  {done ? <Tag tone="neg">Not named</Tag> : <Tag>Running</Tag>}
                </span>
              </div>
            );
          })}
        </div>

        <Rise delay={START + 20} style={{ display: "flex", flexDirection: "column", gap: 28, alignItems: vertical ? "center" : "flex-start" }}>
          <BrandChip solid={0} size={40} />
          <div style={{ ...type.label, fontSize: 32, color: color.ink2 }}>Visibility</div>
          <Ticks delay={START + 60}>
            <div style={{ ...type.stat, fontSize: 200, color: color.inkStrong }}>0%</div>
          </Ticks>
        </Rise>
      </AbsoluteFill>
    </FlightGrid>
  );
};
