import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, type } from "../../brand";
import {
  AlfieFull,
  Grain,
  LightLeak,
  LiquidGlow,
  MaskWords,
  Rise,
  useEnter,
  useIsVertical,
} from "../ui";
import { cue } from "../timeline";

// 3. Reveal: the only dark scene. Light leak, liquid glow, the icon rises.
export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const vertical = useIsVertical();
  const icon = useEnter(6, 16);
  const size = vertical ? 400 : 330; // ring diameter around the mascot
  const mascot = vertical ? 560 : 440;

  return (
    <AbsoluteFill style={{ background: color.ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{ scale: `${interpolate(frame, [0, durationInFrames], [1, 1.06])}` }}
      >
        <LiquidGlow colors={[color.brand, color.brandFg, color.brand]} opacity={0.5} />
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 48,
          }}
        >
          <div
            style={{
              position: "relative",
              width: size,
              height: mascot * 0.9,
              display: "flex",
              justifyContent: "center",
            }}
          >
            {[0, 1, 2].map((i) => {
              // Rings pulse outward from the icon, one per beat.
              const t = (frame - 20 - i * 15 + 300) % 45;
              const on = frame >= 20 + i * 15;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    width: size,
                    height: size,
                    top: mascot * 0.04,
                    borderRadius: "50%",
                    border: `3px solid ${color.brandFg}`,
                    opacity: on ? interpolate(t, [0, 45], [0.7, 0]) : 0,
                    scale: `${interpolate(t, [0, 45], [1, 1.9])}`,
                  }}
                />
              );
            })}
            <AlfieFull
              height={mascot}
              delay={6}
              style={{
                position: "absolute",
                top: 0,
                filter: `drop-shadow(0 0 ${60 * icon}px ${color.brandFg}aa)`,
              }}
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <MaskWords
              text="Meet Alfie."
              delay={cue("reveal-meet")}
              stagger={6}
              style={{ ...type.display, fontSize: vertical ? 150 : 170, color: color.white }}
            />
            <Rise delay={cue("reveal-agent")}>
              <div style={{ ...type.h3, color: color.beige }}>
                The Experience Agent from Momos
              </div>
            </Rise>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <LightLeak duration={55} />
      <Grain opacity={0.12} />
    </AbsoluteFill>
  );
};
