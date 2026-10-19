import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { color, type } from "../../brand";
import { BEAT, clamp, useIsVertical } from "../ui";

export type Beat = { text: string; dark?: boolean; beats?: number };

// Kinetic type: one phrase per beat, hard cuts, a scale punch on each hit.
export const BeatWords: React.FC<{ words: Beat[]; size?: number; verticalSize?: number }> = ({
  words,
  size = 220,
  verticalSize = 136,
}) => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();

  let start = 0;
  for (const w of words) {
    const len = (w.beats ?? 1) * BEAT;
    if (frame < start + len) {
      const t = frame - start;
      return (
        <AbsoluteFill
          style={{
            background: w.dark ? color.ink : color.beige,
            justifyContent: "center",
            alignItems: "center",
            padding: vertical ? 64 : 120,
          }}
        >
          <div
            style={{
              ...type.display,
              fontSize: vertical ? verticalSize : size,
              letterSpacing: interpolate(t, [0, 8], [-2, -6], clamp),
              color: w.dark ? color.beige : color.ink,
              textAlign: "center",
              scale: `${interpolate(t, [0, 6], [1.18, 1], {
                ...clamp,
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}`,
            }}
          >
            {w.text}
          </div>
        </AbsoluteFill>
      );
    }
    start += len;
  }
  return null;
};

export const beatsLength = (words: Beat[]) =>
  words.reduce((n, w) => n + (w.beats ?? 1) * BEAT, 0);
