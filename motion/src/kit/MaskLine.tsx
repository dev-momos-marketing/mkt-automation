import type React from "react";
import { Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { dur, ease } from "../brand/theme";
import { fontFamily } from "../brand/fonts";

type MaskLineProps = {
  readonly children: React.ReactNode;
  // Frame the reveal starts. Negative values put frame 0 mid-reveal, so it is never empty.
  readonly enterAt?: number;
  // Frame the line lifts out through the top of its mask. Omit to stay.
  readonly exitAt?: number;
  readonly style?: React.CSSProperties;
};

// One line of text rising through a hard edge. Use instead of opacity fades for type.
const MaskLineInner: React.FC<MaskLineProps> = ({ children, enterAt = 0, exitAt, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        overflow: "hidden",
        // Room for descenders inside the mask.
        paddingBottom: "0.12em",
        marginBottom: "-0.12em",
        fontFamily,
        ...style,
      }}
    >
      <div
        style={{
          translate: `0 ${
            interpolate(frame, [enterAt, enterAt + dur.enter * fps], [112, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.enter,
            }) +
            (exitAt === undefined
              ? 0
              : interpolate(frame, [exitAt, exitAt + dur.exit * fps], [0, -112], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: ease.exit,
                }))
          }%`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const MaskLine = Interactive.create({
  Component: MaskLineInner,
  layout: "none",
  schema: {
    ...Interactive.textSchema,
    ...Interactive.childrenSchema,
  },
});
