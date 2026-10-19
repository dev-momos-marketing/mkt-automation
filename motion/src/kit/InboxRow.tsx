import type React from "react";
import { Interactive, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, column916, dur, ease, font, radius, shadow, type } from "../brand/theme";
import { fontFamily } from "../brand/fonts";
import { Stars } from "./Stars";

type InboxRowProps = {
  readonly rating: number;
  // Keep under ~28 characters so it never truncates.
  readonly snippet: string;
  // Frame the "Replied" tag lands, relative to this row.
  readonly repliedAt: number;
  readonly style?: React.CSSProperties;
};

// One review in the momos inbox: stars and reply status on top, the snippet below.
const InboxRowInner: React.FC<InboxRowProps> = ({ rating, snippet, repliedAt, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: column916.width,
        padding: "22px 30px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        backgroundColor: color.white,
        borderRadius: 24,
        boxShadow: shadow.card,
        fontFamily,
        color: color.ink,
        ...style,
      }}
    >
      <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stars rating={rating} size={34} />
        <div
          style={{
            height: 64,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: radius.pill,
            backgroundColor: color.blush,
            color: color.red,
            fontSize: 34,
            fontWeight: font.semibold,
            opacity: interpolate(frame, [repliedAt, repliedAt + 2], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [repliedAt, repliedAt + dur.pop * fps], [0.9, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.premium,
            }),
          }}
        >
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color.red} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Replied
        </div>
      </div>
      <div style={{ fontSize: 38, letterSpacing: type.tracking.body, color: color.inkSoft, whiteSpace: "nowrap" }}>
        {snippet}
      </div>
    </div>
  );
};

export const InboxRow = Interactive.create({
  Component: InboxRowInner,
  layout: "none",
  schema: {
    rating: { type: "number", default: 5, min: 1, max: 5, step: 1, description: "Stars", hiddenFromList: false },
    snippet: { type: "string", default: "", description: "Review snippet" },
    repliedAt: { type: "number", default: 15, step: 1, description: "Replied tag lands (frame)", hiddenFromList: false },
  },
});
