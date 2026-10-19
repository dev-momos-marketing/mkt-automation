import type React from "react";
import { Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, column916, dur, ease, font, radius, shadow, type } from "../../brand/theme";
import { fontFamily } from "../../brand/fonts";
import { MaskLine } from "../../kit/MaskLine";

// Shot 4 (2s, 4 beats): end card. Already moving on frame 0; never static.
// The wordmark is set type until the real logo SVG lands in public/brand/.
const EndCardSceneInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const centerX = (column916.left + column916.right) / 2;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: "50% 45%",
        scale: interpolate(frame, [0, 2 * fps], [1, 1.025]),
        fontFamily,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 560,
          left: centerX,
          translate: "-50% 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <MaskLine
          name="Wordmark"
          enterAt={-6}
          style={{
            color: color.ink,
            fontSize: 176,
            fontWeight: font.bold,
            letterSpacing: "-0.05em",
            lineHeight: 1,
          }}
        >
          momos
        </MaskLine>
      </div>
      <div
        style={{
          position: "absolute",
          top: 800,
          left: centerX,
          height: 120,
          padding: "0 64px",
          display: "flex",
          alignItems: "center",
          borderRadius: radius.button,
          background: `linear-gradient(139deg, ${color.red} 0%, ${color.coral} 100%)`,
          boxShadow: shadow.cta,
          color: color.white,
          fontSize: type.body,
          fontWeight: font.semibold,
          whiteSpace: "nowrap",
          opacity: interpolate(frame, [2, 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `-50% ${interpolate(frame, [2, 2 + dur.enter * fps], [80, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease.enter,
          })}px`,
        }}
      >
        Book a demo
      </div>
      <div
        style={{
          position: "absolute",
          top: 968,
          left: centerX,
          translate: "-50% 0",
        }}
      >
        <MaskLine
          name="URL"
          enterAt={6}
          style={{ color: color.inkSoft, fontSize: type.meta + 6, fontWeight: font.medium }}
        >
          momos.com
        </MaskLine>
      </div>
    </div>
  );
};

export const EndCardScene = Interactive.create({
  Component: EndCardSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
