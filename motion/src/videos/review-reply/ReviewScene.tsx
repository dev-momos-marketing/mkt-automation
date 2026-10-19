import type React from "react";
import { Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, column916, dur, ease, font, type } from "../../brand/theme";
import { MaskLine } from "../../kit/MaskLine";
import { ReplyComposer } from "../../kit/ReplyComposer";
import { ReviewCard } from "../../kit/ReviewCard";

const headline: React.CSSProperties = {
  color: color.ink,
  fontSize: type.headline,
  fontWeight: font.semibold,
  lineHeight: type.lineHeight.headline,
  letterSpacing: type.tracking.headline,
  whiteSpace: "nowrap",
};

// Measured from a render: ReviewCard is 440px tall at column width. Lifted, it steps
// back to 0.88 so the reply below it owns the frame (and the stack fits y 348-1188).
const CARD_TOP = 590;
const CARD_LIFTED_TOP = column916.top;
const CARD_LIFTED_SCALE = 0.88;
const COMPOSER_TOP = CARD_LIFTED_TOP + Math.round(440 * CARD_LIFTED_SCALE) + 24;

// Shot 1-2 (8s, 16 beats @120bpm): a 1-star review lands, the camera lifts it and it
// steps back as momos types the reply. The typing is the hero moment.
const ReviewSceneInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        // Constant drift so no hold is dead; the column leaves room for it.
        transformOrigin: "504px 768px",
        scale: interpolate(frame, [0, 8 * fps], [1, 1.02]),
      }}
    >
      <div style={{ position: "absolute", left: column916.left, top: column916.top }}>
        <MaskLine name="Headline 1" enterAt={-6} exitAt={2.75 * fps} style={headline}>
          A 1-star review
        </MaskLine>
        <MaskLine name="Headline 2" enterAt={0.5 * fps} exitAt={2.75 * fps + 2} style={headline}>
          just landed.
        </MaskLine>
      </div>
      <ReviewCard
        name="Review card"
        author="Alex M."
        source="Google review · 2 min ago"
        rating={1}
        text="Waited 40 minutes for our mains. Lovely staff, slammed kitchen."
        starPopAt={1.5 * fps}
        style={{
          position: "absolute",
          left: column916.left,
          top: CARD_TOP,
          opacity: interpolate(frame, [1 * fps, 1 * fps + 4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `0 ${
            interpolate(frame, [1 * fps, (1 + dur.enter) * fps], [140, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.enter,
            }) +
            interpolate(frame, [3 * fps, (3 + dur.move) * fps], [0, CARD_LIFTED_TOP - CARD_TOP], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.move,
            })
          }px`,
          transformOrigin: "50% 0%",
          scale:
            interpolate(frame, [1 * fps, (1 + dur.enter) * fps], [0.96, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.premium,
            }) *
            interpolate(frame, [3 * fps, (3 + dur.move) * fps], [1, CARD_LIFTED_SCALE], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.move,
            }),
        }}
      />
      <ReplyComposer
        name="Reply composer"
        from={3 * fps + 6}
        label="momos drafted a reply"
        reply={"So sorry, Alex.\nFriday got away from us.\nDessert's on the house."}
        typeAt={0.8 * fps}
        sendAt={7 * fps - (3 * fps + 6)}
        style={{
          position: "absolute",
          left: column916.left,
          top: COMPOSER_TOP,
          opacity: interpolate(frame, [3 * fps + 6, 3 * fps + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `0 ${interpolate(frame, [3 * fps + 6, (3 + dur.enter) * fps + 6], [180, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease.enter,
          })}px`,
        }}
      />
    </div>
  );
};

export const ReviewScene = Interactive.create({
  Component: ReviewSceneInner,
  layout: "absolute-fill",
  schema: {
    ...Interactive.backgroundSchema,
  },
});
