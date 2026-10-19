import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { color, type } from "../../brand";
import { AlfieAvatar, clamp, Rise, useIsVertical } from "../ui";

const ROWS = ["Website chat", "Mobile app", "Post-visit surveys", "Delivery apps"];

// 5. Reach: channels as giant marquee type, rows drifting in opposite directions.
export const Reach: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const size = vertical ? 112 : 160;

  return (
    <AbsoluteFill
      style={{
        background: color.beige,
        justifyContent: "center",
        gap: vertical ? 28 : 8,
        overflow: "hidden",
      }}
    >
      <Rise style={{ padding: vertical ? "0 64px 24px" : "0 120px 16px" }}>
        <div style={{ ...type.h3, color: color.neutral700 }}>Alfie works across</div>
      </Rise>
      {ROWS.map((row, i) => {
        const dir = i % 2 === 0 ? -1 : 1;
        const enter = interpolate(frame, [i * 4, i * 4 + 22], [1, 0], {
          ...clamp,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
        // Constant drift after a fast entrance from the side it travels away from.
        const x = dir * frame * 9 - dir * enter * 1400 + (dir > 0 ? -1800 : -200);
        const outlined = i % 2 === 1;
        return (
          <div
            key={row}
            style={{
              display: "flex",
              alignItems: "center",
              gap: size * 0.4,
              whiteSpace: "nowrap",
              translate: `${x}px 0`,
              filter: `blur(${enter * 8}px)`,
            }}
          >
            {[0, 1, 2, 3].map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: size * 0.4 }}>
                <span
                  style={{
                    ...type.display,
                    fontSize: size,
                    lineHeight: 1.15,
                    color: outlined ? "transparent" : color.ink,
                    WebkitTextStroke: outlined ? `3px ${color.ink}` : undefined,
                  }}
                >
                  {row}
                </span>
                <AlfieAvatar size={size * 0.62} />
              </div>
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
