import type React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, dur, ease } from "../brand/theme";

const STAR_PATH =
  "M12 2.5l2.95 6.02 6.55.95-4.75 4.63 1.12 6.53L12 17.55l-5.87 3.08 1.12-6.53L2.5 9.47l6.55-.95L12 2.5z";

type StarsProps = {
  readonly rating: number;
  readonly size: number;
  readonly fill?: string;
  // Frame the filled stars pop (scale 1 -> 1.18 -> 1 over 6 frames; pushed past the usual
  // 1.08 because a 44px star reads tiny in the feed). Omit for no pop.
  readonly popAt?: number;
};

// Low ratings (1-2) are the problem we show, so they take the accent; others stay ink.
export const Stars: React.FC<StarsProps> = ({ rating, size, fill = rating <= 2 ? color.red : color.ink, popAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const popEnd = popAt === undefined ? 0 : popAt + dur.pop * fps;

  return (
    <div style={{ display: "flex", gap: size * 0.18 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= rating;
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            style={{
              scale:
                filled && popAt !== undefined
                  ? interpolate(frame, [popAt, (popAt + popEnd) / 2, popEnd], [1, 1.18, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: ease.settle,
                    })
                  : 1,
            }}
          >
            <path
              d={STAR_PATH}
              fill={filled ? fill : "none"}
              stroke={filled ? fill : color.inkMuted}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </div>
  );
};
