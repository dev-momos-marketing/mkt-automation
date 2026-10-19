import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, font, type } from "../brand";
import { cue } from "../timeline";
import { Climb, clamp, EASE, Headline, Logo, NotchButton, Rise, useIsVertical } from "../ui";

// 10. Night band close: the only dark scene, the Climb watermark rising in the corner.
export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const vertical = useIsVertical();
  const rise = interpolate(frame, [0, durationInFrames], [40, 0], { ...clamp, easing: EASE });

  return (
    <AbsoluteFill style={{ background: color.night, fontFamily: font.sans, overflow: "hidden" }}>
      <Climb
        size={vertical ? 760 : 900}
        fill="rgba(255,255,255,0.06)"
        style={{ position: "absolute", right: vertical ? -140 : -80, bottom: vertical ? 120 : -60, translate: `0 ${rise}px` }}
      />
      <Logo white height={vertical ? 56 : 52} style={{ position: "absolute", left: vertical ? 64 : 120, top: vertical ? 220 : 88 }} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          padding: vertical ? "0 64px" : "0 120px",
          gap: vertical ? 56 : 48,
        }}
      >
        <Rise delay={2}>
          <Headline
            lead="Win organic search everywhere,"
            payoff="all at once"
            breakBefore
            onNight
            size={vertical ? 92 : 112}
          />
        </Rise>
        <Rise delay={cue("aw-e2")} style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <NotchButton label="Start free trial" variant="onNight" />
          <NotchButton label="Book a demo" variant="ghostNight" />
        </Rise>
        <Rise delay={cue("aw-e2") + 8}>
          <div style={{ ...type.lead, color: color.onNight2 }}>Free forever plan. No card needed.</div>
        </Rise>
      </AbsoluteFill>
      <Rise delay={cue("aw-e2") + 14} style={{ position: "absolute", left: vertical ? 64 : 120, bottom: vertical ? 420 : 72, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 14, height: 14, borderRadius: 7, background: color.pos }} />
        <span style={{ ...type.num, fontSize: 26, color: color.onNight2 }}>All systems normal</span>
      </Rise>
    </AbsoluteFill>
  );
};
