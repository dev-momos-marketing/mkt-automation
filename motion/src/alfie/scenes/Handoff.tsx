import { evolvePath, getPointAtLength, getLength } from "@remotion/paths";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, radius, shadow, type } from "../../brand";
import { AlfieAvatar, Check, clamp, MaskWords, Rise, useEnter, useIsVertical } from "../ui";

export const HANDOFF_LENGTH = 105;

// Explicit line breaks so no headline leaves an orphan word.
const LINES = ["When a person should step in,", "Alfie hands over the full story."];
const LINES_VERTICAL = ["When a person", "should step in,", "Alfie hands over", "the full story."];

const ITEMS = ["Full conversation", "Order details", "Suggested next step"];

// 6. Handoff: a line draws from Alfie to your team and delivers the context.
export const Handoff: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = useIsVertical();
  const team = useEnter(8);

  const a = vertical ? { x: width / 2, y: 760 } : { x: 360, y: 560 };
  const b = vertical ? { x: width / 2, y: 1380 } : { x: 1100, y: 560 };
  const path = vertical
    ? `M ${a.x} ${a.y} C ${a.x + 300} ${a.y + 200}, ${b.x - 300} ${b.y - 260}, ${b.x} ${b.y - 120}`
    : `M ${a.x + 110} ${a.y} C ${a.x + 330} ${a.y - 220}, ${b.x - 340} ${b.y - 220}, ${b.x - 40} ${b.y}`;
  const draw = interpolate(frame, [14, 44], [0, 1], clamp);
  const travel = interpolate(frame, [30, 56], [0, 1], clamp);
  const evolved = evolvePath(draw, path);
  const dot = getPointAtLength(path, getLength(path) * travel);

  return (
    <AbsoluteFill style={{ background: color.beige }}>
      <AbsoluteFill style={{ padding: vertical ? "160px 64px" : "80px 120px" }}>
        {(vertical ? LINES_VERTICAL : LINES).map((line, i) => (
          <MaskWords
            key={line}
            text={line}
            delay={i * 6}
            style={{ ...type.h2, color: i < 1 || (vertical && i < 2) ? color.neutral700 : color.ink }}
          />
        ))}
      </AbsoluteFill>

      <svg width={width} height={height} style={{ position: "absolute" }}>
        <path
          d={path}
          fill="none"
          stroke={color.ink}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={evolved.strokeDasharray}
          strokeDashoffset={evolved.strokeDashoffset}
        />
        {dot && travel > 0 && travel < 1 && <circle cx={dot.x} cy={dot.y} r={16} fill={color.brand} />}
      </svg>

      <AlfieAvatar
        size={200}
        style={{ position: "absolute", left: a.x - 100, top: a.y - 100 }}
      />

      <div
        style={{
          position: "absolute",
          left: vertical ? 64 : b.x - 40,
          right: vertical ? 64 : undefined,
          top: vertical ? b.y - 120 : b.y - 200,
          width: vertical ? undefined : 680,
          opacity: team,
          translate: `0 ${(1 - team) * 30}px`,
          background: color.white,
          borderRadius: radius.lg,
          boxShadow: shadow.l,
          padding: 36,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.full,
              background: color.ink,
              color: color.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...type.caption,
              fontWeight: 700,
            }}
          >
            SM
          </div>
          <div style={{ ...type.h3, fontWeight: 700, color: color.ink }}>Store manager</div>
        </div>
        {ITEMS.map((item, i) => (
          <Rise key={item} delay={56 + i * 6} distance={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Check delay={58 + i * 6} size={52} />
              <div style={{ ...type.body, fontSize: 36, fontWeight: 500, color: color.ink }}>
                {item}
              </div>
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
};
