import type React from "react";
import { Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, column916, dur, ease, font, type } from "../../brand/theme";
import { InboxRow } from "../../kit/InboxRow";
import { MaskLine } from "../../kit/MaskLine";

const headline: React.CSSProperties = {
  color: color.ink,
  fontSize: type.headline,
  fontWeight: font.semibold,
  lineHeight: type.lineHeight.headline,
  letterSpacing: type.tracking.headline,
  whiteSpace: "nowrap",
};

// Measured from a render: InboxRow is ~177px tall. Three rows fit under a two-line
// headline inside y 348-1188.
const ROW_TOP = 590;
const ROW_STEP = 177 + 16;

// Shot 3 (4s, 8 beats): hard cut to a wider shot. The inbox is already landing on
// frame 0 and every row gets answered on the half-beats under one headline.
const ScaleSceneInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Rows land fully opaque (2-frame snap) so no frame shows a half-faded card.
  const rowEnter = (at: number): React.CSSProperties => ({
    position: "absolute",
    left: column916.left,
    opacity: interpolate(frame, [at, at + 2], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    translate: `0 ${interpolate(frame, [at, at + dur.enter * fps], [64, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease.enter,
    })}px`,
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: "504px 748px",
        scale: interpolate(frame, [0, 4 * fps], [1, 1.03]),
      }}
    >
      <div style={{ position: "absolute", left: column916.left, top: column916.top }}>
        <MaskLine name="Headline 1" enterAt={-6} style={headline}>
          Every review,
        </MaskLine>
        <MaskLine name="Headline 2" enterAt={0.5 * fps} style={headline}>
          answered.
        </MaskLine>
      </div>
      <InboxRow
        name="Row 1"
        rating={5}
        snippet="Best laksa in town."
        repliedAt={0.75 * fps}
        style={{ ...rowEnter(-8), top: ROW_TOP }}
      />
      <InboxRow
        name="Row 2"
        rating={4}
        snippet="Great brunch, slow coffee."
        repliedAt={1 * fps}
        style={{ ...rowEnter(-6), top: ROW_TOP + ROW_STEP }}
      />
      <InboxRow
        name="Row 3"
        rating={2}
        snippet="Our booking got lost."
        repliedAt={1.25 * fps}
        style={{ ...rowEnter(-4), top: ROW_TOP + ROW_STEP * 2 }}
      />
    </div>
  );
};

export const ScaleScene = Interactive.create({
  Component: ScaleSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
