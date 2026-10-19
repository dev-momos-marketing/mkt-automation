import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, motif, type } from "../brand";
import { AcmeChip, CometRoute, Pan, SonarRings, Starburst } from "../fx";
import { cue } from "../timeline";
import { clamp, EASE, Headline, Logo, Rise, useIn } from "../ui";

const [OUTER, INNER] = motif.climb.split(" M18.593").map((d, i) => (i ? `M18.593${d}` : d));
const LOGO_W = 623.62;
const LOGO_H = 114.67;
const MARK_W_IN_LOGO = 106.64;
const STOPS = ["See", "Find", "Plan", "Create"];

// 6. The route spirals up and forges the logo, then lays the 4-stop metro map.
export const Meet: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;

  const LH = vertical ? 96 : 112;
  const LY = vertical ? 330 : 96;
  const s = LH / LOGO_H;
  const logoLeft = width / 2 - (LOGO_W * s) / 2;
  const markCx = logoLeft + (MARK_W_IN_LOGO * s) / 2;
  const markCy = LY + LH / 2;

  // The comet arrives at the mark's centre, then the mark is forged there big.
  const arrive = 16;
  const forge = interpolate(frame, [arrive, arrive + 10], [1, 0], { ...clamp, easing: EASE }); // 1 = extruded
  const star = useIn(arrive + 4, 6);
  const settle = interpolate(frame, [arrive + 14, arrive + 28], [0, 1], { ...clamp, easing: EASE });
  const swap = interpolate(frame, [arrive + 27, arrive + 32], [0, 1], clamp);
  const bigH = vertical ? 340 : 360;
  const bigCy = vertical ? height * 0.38 : height * 0.46;
  const h = interpolate(settle, [0, 1], [bigH, LH]);
  const cx = interpolate(settle, [0, 1], [width / 2, markCx]);
  const cy = interpolate(settle, [0, 1], [bigCy, markCy]);
  const w = h * (55.33 / 59.5);

  // Metro map along the bottom: 4 stops, then Acme at the end of the line turns solid.
  const mapY = vertical ? 1180 : 760;
  const x0 = vertical ? 110 : 260;
  const x1 = vertical ? width - 110 : width - 520;
  const lay = cue("meet-visible");
  const solidAt = lay + 40;

  return (
    <Pan>
      <CometRoute
        d={`M ${-80} ${height * 0.9} C ${width * 0.2} ${height * 0.95}, ${width * 0.15} ${height * 0.3}, ${width * 0.4} ${height * 0.35} S ${width * 0.62} ${bigCy + 120}, ${width / 2} ${bigCy}`}
        start={0}
        dur={arrive}
        width={width}
        height={height}
        stroke={6}
        headSize={60}
        keepLine={false}
      />

      {swap < 1 && frame >= arrive - 2 && (
        <svg viewBox="4.337 3 55.33 59.5" style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, overflow: "visible", opacity: 1 - swap }}>
          {Array.from({ length: 7 }).map((_, k) => (
            <g key={k} transform={`translate(${forge * (7 - k) * 0.9} ${forge * (7 - k) * 1.3})`} opacity={k === 6 ? 1 : forge * 0.9}>
              <path d={OUTER} fill={k === 6 ? color.signal : "#07368E"} />
              <path d={INNER} fill={k === 6 ? color.sky : "#3A64C0"} />
            </g>
          ))}
          <path d={motif.spark} fill={color.signal} opacity={star} transform={`translate(32 ${11.6 - (1 - star) * 14}) scale(${0.5 + star * 0.5}) translate(-32 -11.6)`} />
        </svg>
      )}
      <div style={{ position: "absolute", left: width / 2, top: bigCy - bigH * 0.38, width: 0, height: 0 }}>
        <Starburst at={arrive + 8} size={vertical ? 900 : 1100} tint={color.sky} rays={16} life={16} />
        <SonarRings at={arrive + 8} size={bigH * 0.9} tint={color.sky} count={2} />
      </div>
      <Logo height={LH} style={{ position: "absolute", left: logoLeft, top: LY, opacity: swap }} />

      <AbsoluteFill style={{ top: LY + LH + (vertical ? 90 : 60), bottom: "auto", alignItems: "center", padding: vertical ? "0 56px" : "0 160px" }}>
        <Rise delay={Math.max(cue("meet-platform"), arrive + 30)}>
          <Headline lead="The end-to-end agentic" payoff="SEO/GEO platform" breakBefore size={vertical ? 84 : 104} style={{ textAlign: "center" }} />
        </Rise>
      </AbsoluteFill>

      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line
          x1={x0}
          y1={mapY}
          x2={x0 + (x1 - x0) * interpolate(frame, [lay, lay + 30], [0, 1], { ...clamp, easing: EASE })}
          y2={mapY}
          stroke={color.signal}
          strokeWidth={8}
          strokeLinecap="round"
        />
      </svg>
      {STOPS.map((stop, i) => {
        const x = x0 + ((x1 - x0) * i) / 3;
        const at = lay + i * 7;
        const drop = interpolate(frame, [at, at + 8], [-120, 0], { ...clamp, easing: Easing.in(Easing.quad) });
        const op = interpolate(frame, [at, at + 3], [0, 1], clamp);
        return (
          <div key={stop} style={{ position: "absolute", left: x, top: mapY, width: 0, height: 0, opacity: op }}>
            <SonarRings at={at + 8} size={60} count={1} />
            <div style={{ position: "absolute", left: -22, top: -22 + drop, width: 44, height: 44, borderRadius: "50%", background: color.bg, border: `8px solid ${color.signal}` }} />
            <div style={{ position: "absolute", top: 44, left: -120, width: 240, textAlign: "center", display: "flex", gap: 10, justifyContent: "center", alignItems: "baseline" }}>
              <span style={{ ...type.num, fontSize: 28, color: color.signalText }}>{`0${i + 1}`}</span>
              <span style={{ ...type.label, fontSize: 38, fontWeight: 600, color: color.inkStrong }}>{stop}</span>
            </div>
          </div>
        );
      })}
      <Rise delay={lay + 30} style={{ position: "absolute", left: vertical ? width / 2 : x1 + 80, top: vertical ? mapY + 170 : mapY, translate: vertical ? "-50% 0" : "0 -50%" }}>
        <AcmeChip solid={frame >= solidAt} size={vertical ? 40 : 36} />
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
          <SonarRings at={solidAt} size={180} count={2} />
        </div>
      </Rise>
    </Pan>
  );
};

