import type React from "react";
import { Interactive } from "remotion";
import { color, font, radius, column916, shadow, type } from "../brand/theme";
import { fontFamily } from "../brand/fonts";
import { Stars } from "./Stars";

type ReviewCardProps = {
  readonly author: string;
  readonly source: string;
  readonly rating: number;
  readonly text: string;
  // Frame the filled stars pop, relative to this card.
  readonly starPopAt?: number;
  readonly style?: React.CSSProperties;
};

// A public review as a diner posted it. Author names must be invented or anonymised.
const ReviewCardInner: React.FC<ReviewCardProps> = ({
  author,
  source,
  rating,
  text,
  starPopAt,
  style,
}) => {
  return (
    <div
      style={{
        width: column916.width,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        backgroundColor: color.white,
        borderRadius: radius.card,
        boxShadow: shadow.card,
        fontFamily,
        color: color.ink,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: radius.pill,
            backgroundColor: color.cream,
            border: `2px solid ${color.hairline}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            fontWeight: font.semibold,
            color: color.inkSoft,
          }}
        >
          {author.slice(0, 1)}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, fontWeight: font.semibold, letterSpacing: type.tracking.body }}>
            {author}
          </div>
          <div style={{ fontSize: type.meta, color: color.inkMuted }}>{source}</div>
        </div>
      </div>
      <Stars rating={rating} size={44} popAt={starPopAt} />
      <div
        style={{
          fontSize: type.body,
          lineHeight: type.lineHeight.body,
          letterSpacing: type.tracking.body,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const ReviewCard = Interactive.create({
  Component: ReviewCardInner,
  layout: "none",
  schema: {
    author: { type: "string", default: "Alex M.", description: "Author" },
    source: { type: "string", default: "Google review · 2 min ago", description: "Source" },
    rating: { type: "number", default: 1, min: 1, max: 5, step: 1, description: "Stars", hiddenFromList: false },
    text: { type: "string", default: "", description: "Review text" },
  },
});
