import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, font, motif, type } from "../brand";
import { cue } from "../timeline";
import { BrandChip, Chevron, clamp, EASE, Headline, Logo, Rise, useIn, useIsVertical } from "../ui";

const [OUTER, INNER] = motif.climb.split(" M18.593").map((d, i) => (i ? `M18.593${d}` : d));

// Logo geometry (arrowsterr-logo-color.svg): 623.62 x 114.67, the mark fills
// the first 106.64 units. The mark alone spans 55.33 x 59.5 in path units.
const LOGO_W = 623.62;
const LOGO_H = 114.67;
const MARK_W_IN_LOGO = 106.64;

const STEPS = ["See", "Find", "Plan", "Create"];

// 4. Meet Arrowsterr: the mark builds, settles into the full logo, then the promise.
export const Meet: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const vertical = useIsVertical();

  const LH = vertical ? 100 : 120;
  const LY = vertical ? 600 : 170;
  const s = LH / LOGO_H;
  const logoLeft = width / 2 - (LOGO_W * s) / 2;

  // Build: outer chevron, inner chevron, then the sparkle lands.
  const outer = useIn(2, 12);
  const inner = useIn(8, 12);
  const star = useIn(16, 10);
  // Settle: the big mark moves into its place inside the logo.
  const settle = interpolate(frame, [30, 48], [0, 1], { ...clamp, easing: EASE });
  const swap = interpolate(frame, [46, 52], [0, 1], clamp);

  const startH = vertical ? 300 : 320;
  const box = {
    h: interpolate(settle, [0, 1], [startH, LH]),
    cx: interpolate(settle, [0, 1], [width / 2, logoLeft + (MARK_W_IN_LOGO * s) / 2]),
    cy: interpolate(settle, [0, 1], [LY + LH / 2 + (vertical ? 120 : 160), LY + LH / 2]),
  };
  const boxW = box.h * (55.33 / 59.5);

  const solid = interpolate(frame, [cue("aw-m3") + 40, cue("aw-m3") + 56], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: color.bg, fontFamily: font.sans }}>
      {swap < 1 && (
        <svg
          viewBox="4.337 3 55.33 59.5"
          style={{
            position: "absolute",
            left: box.cx - boxW / 2,
            top: box.cy - box.h / 2,
            width: boxW,
            height: box.h,
            overflow: "visible",
            opacity: 1 - swap,
          }}
        >
          <path d={OUTER} fill={color.signal} opacity={outer} transform={`translate(0 ${(1 - outer) * 8})`} />
          <path d={INNER} fill={color.sky} opacity={inner} transform={`translate(0 ${(1 - inner) * 8})`} />
          <path
            d={motif.spark}
            fill={color.signal}
            opacity={star}
            transform={`translate(32 11.6) scale(${0.4 + star * 0.6}) translate(-32 -11.6)`}
          />
        </svg>
      )}
      <Logo
        height={LH}
        style={{ position: "absolute", left: logoLeft, top: LY, opacity: swap }}
      />

      <AbsoluteFill
        style={{
          top: LY + LH + (vertical ? 96 : 72),
          bottom: "auto",
          alignItems: "center",
          gap: vertical ? 64 : 56,
          padding: vertical ? "0 64px" : "0 160px",
        }}
      >
        <Rise delay={cue("aw-m2")}>
          <Headline
            lead="The end-to-end agentic"
            payoff="SEO/GEO platform"
            breakBefore
            size={vertical ? 88 : 104}
            style={{ textAlign: "center" }}
          />
        </Rise>
        <div
          style={{
            display: "flex",
            flexWrap: vertical ? "wrap" : "nowrap",
            justifyContent: "center",
            alignItems: "center",
            gap: vertical ? 24 : 32,
            maxWidth: vertical ? 760 : undefined,
          }}
        >
          {STEPS.map((step, i) => (
            <Rise key={step} delay={cue("aw-m3") + i * 6} style={{ display: "flex", alignItems: "center", gap: vertical ? 24 : 32 }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={{ ...type.num, fontSize: 34, color: color.signalText }}>{`0${i + 1}`}</span>
                <span style={{ ...type.label, fontSize: 44, fontWeight: 600, color: color.ink }}>{step}</span>
              </span>
              {i < STEPS.length - 1 && !vertical && <Chevron size={26} fill={color.lineStrong} rotate={90} />}
            </Rise>
          ))}
        </div>
        <Rise delay={cue("aw-m3") + 24}>
          <BrandChip solid={solid} size={40} />
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
