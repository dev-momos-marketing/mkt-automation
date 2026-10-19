import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { color, radius, shadow, type } from "../brand";

export const useIsVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

// No-bounce spring: Momos motion is warm and calm, not springy.
export const useEnter = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};

export const Rise: React.FC<{
  delay?: number;
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, distance = 40, children, style }) => {
  const p = useEnter(delay);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * distance}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Word-by-word mask reveal: each word slides up from behind its own clip.
export const MaskWords: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, stagger = 4, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ margin: 0, ...style }}>
      {text.split(" ").map((word, i) => {
        const p = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 200 },
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "top",
              paddingBottom: "0.08em",
              marginRight: "0.26em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - p) * 110}%)`,
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const CHAT_TEXT = { ...type.body, fontSize: 36 };

export const Bubble: React.FC<{
  from: "guest" | "alfie";
  text: string;
  delay: number;
  // When set, the text types out over this many frames.
  typeFrames?: number;
  size?: number;
}> = ({ from, text, delay, typeFrames, size = 36 }) => {
  const frame = useCurrentFrame();
  const p = useEnter(delay);
  if (frame < delay) return null;

  const shown = typeFrames
    ? text.slice(
        0,
        Math.round(
          interpolate(frame, [delay, delay + typeFrames], [0, text.length], {
            extrapolateRight: "clamp",
          }),
        ),
      )
    : text;
  const guest = from === "guest";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: guest ? "flex-end" : "flex-start",
        gap: 20,
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px) scale(${0.96 + p * 0.04})`,
        transformOrigin: guest ? "right bottom" : "left bottom",
      }}
    >
      {!guest && <Avatar size={64} />}
      <div
        style={{
          ...CHAT_TEXT,
          fontSize: size,
          maxWidth: "82%",
          padding: `${size * 0.6}px ${size * 0.85}px`,
          borderRadius: radius.lg,
          borderBottomRightRadius: guest ? radius.sm : radius.lg,
          borderBottomLeftRadius: guest ? radius.lg : radius.sm,
          background: guest ? color.ink : color.white,
          color: guest ? color.white : color.ink,
          boxShadow: guest ? "none" : shadow.s,
          border: guest ? "none" : `2px solid ${color.border}`,
        }}
      >
        {/* Reserve the full text height so the layout doesn't jump while typing. */}
        <span style={{ position: "relative", display: "block" }}>
          <span style={{ visibility: "hidden" }}>{text}</span>
          <span style={{ position: "absolute", inset: 0 }}>{shown}</span>
        </span>
      </div>
    </div>
  );
};

export const Avatar: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: radius.full,
      background: color.brand,
      color: color.white,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: size * 0.5,
      alignSelf: "flex-end",
    }}
  >
    A
  </div>
);

export const TypingDots: React.FC<{ from: number; to: number }> = ({
  from,
  to,
}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
      <Avatar size={64} />
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "26px 30px",
          borderRadius: radius.lg,
          borderBottomLeftRadius: radius.sm,
          background: color.white,
          border: `2px solid ${color.border}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: radius.full,
              background: color.gray600,
              opacity: 0.35 + 0.65 * Math.max(0, Math.sin((frame - i * 5) / 4)),
            }}
          />
        ))}
      </div>
    </div>
  );
};

// A check mark that draws itself inside an olive circle.
export const Check: React.FC<{ delay: number; size?: number }> = ({
  delay,
  size = 56,
}) => {
  const pop = useEnter(delay, 14);
  const draw = useEnter(delay + 4);
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius.full,
        background: color.olive,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${pop})`,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
        <path
          d="M4 12.5l5 5L20 6.5"
          fill="none"
          stroke={color.oliveDark}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={26}
          strokeDashoffset={26 * (1 - draw)}
        />
      </svg>
    </div>
  );
};
