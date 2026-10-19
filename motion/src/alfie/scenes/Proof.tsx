import { CrossedOff, Circle as RoughCircle, Highlight } from "@remotion/rough-notation";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { color, radius, shadow, type } from "../../brand";
import {
  AlfieAvatar,
  Bubble,
  Check,
  clamp,
  MaskWords,
  TypingDots,
  useIsVertical,
} from "../ui";

export const PROOF_LENGTH = 330;

const EXPLODE = [48, 84] as const;
const CARD_AT = [60, 76, 92];
const COLLAPSE_AT = [196, 204, 212];
const REPLY_AT = 222;
const THANKS_AT = 288;
const RESOLVED_AT = 300;

const ease = Easing.bezier(0.16, 1, 0.3, 1);

// 4. Proof: the chat explodes into 3D layers showing what Alfie does behind the reply.
export const Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useIsVertical();

  const out = interpolate(frame, [...EXPLODE], [0, 1], { ...clamp, easing: ease });
  const back = interpolate(frame, [COLLAPSE_AT[0], COLLAPSE_AT[2] + 14], [0, 1], {
    ...clamp,
    easing: ease,
  });
  const open = out * (1 - back);
  // Camera push-in on the chat once the layers have collapsed back into it.
  const push = interpolate(frame, [REPLY_AT - 10, PROOF_LENGTH], [1, vertical ? 1.06 : 1.2], {
    ...clamp,
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  });

  const chatW = vertical ? 940 : 980;
  const chatH = vertical ? 1040 : 820;
  const bubble = vertical ? 38 : 36;

  return (
    <AbsoluteFill style={{ background: color.beige, perspective: 2400, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          paddingTop: vertical ? 150 : 56,
          opacity: interpolate(frame, [EXPLODE[0], EXPLODE[0] + 10, COLLAPSE_AT[0], COLLAPSE_AT[0] + 10], [0, 1, 1, 0], clamp),
        }}
      >
        <MaskWords
          text="While it types, Alfie gets to work."
          delay={EXPLODE[0]}
          style={{ ...type.h3, fontWeight: 700, color: color.ink }}
        />
      </AbsoluteFill>

      {/* Chat window */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: chatW,
          height: chatH,
          marginLeft: -chatW / 2,
          marginTop: -chatH / 2,
          boxSizing: "border-box",
          translate: vertical
            ? `0 ${-330 * open}px`
            : `${-420 * open}px ${40 * open}px`,
          rotate: vertical ? `x ${10 * open}deg` : `y ${22 * open}deg`,
          scale: `${(1 - (vertical ? 0.22 : 0.14) * open) * push}`,
          background: color.white,
          border: `2px solid ${color.border}`,
          borderRadius: radius.xl,
          boxShadow: shadow.l,
          padding: 36,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            paddingBottom: 24,
            borderBottom: `2px solid ${color.border}`,
          }}
        >
          <AlfieAvatar size={64} />
          <div style={{ ...type.caption, fontWeight: 700, color: color.ink, flex: 1 }}>
            Alfie
          </div>
          <Resolved />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 24,
            background: color.brandPale,
            margin: -36,
            marginTop: 0,
            padding: 36,
            borderRadius: `0 0 ${radius.xl}px ${radius.xl}px`,
          }}
        >
          <Bubble
            from="guest"
            delay={4}
            size={bubble}
            text="My order just arrived and the fries are missing. Again."
          />
          <TypingDots from={24} to={REPLY_AT} size={bubble} />
          <Bubble
            from="alfie"
            delay={REPLY_AT}
            typeFrames={56}
            size={bubble}
            text="So sorry, Maya. Order #4182 from Downtown was missing your fries. I've added 200 points, and your next fries are on us."
          />
          <Bubble from="guest" delay={THANKS_AT} size={bubble} text="That was quick. Thank you!" />
        </div>
      </div>

      {/* Exploded layers */}
      {[OrderCard, PolicyCard, PointsCard].map((Card, i) => {
        const inP = spring({ frame: frame - CARD_AT[i], fps, config: { damping: 15 } });
        const backP = interpolate(frame, [COLLAPSE_AT[i], COLLAPSE_AT[i] + 14], [0, 1], {
          ...clamp,
          easing: Easing.bezier(0.7, 0, 0.84, 0),
        });
        const p = inP * (1 - backP);
        const w = vertical ? 860 : 700;
        const tx = vertical ? 0 : 380;
        const ty = vertical ? 150 + i * 270 : -250 + i * 250;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: w,
              marginLeft: -w / 2,
              marginTop: -100,
              translate: `${interpolate(p, [0, 1], [vertical ? 0 : -420, tx])}px ${interpolate(p, [0, 1], [vertical ? -330 : 0, ty])}px ${interpolate(p, [0, 1], [-600, -i * 90])}px`,
              rotate: vertical ? "x 6deg" : "y -14deg",
              opacity: Math.min(1, p * 3),
              filter: `blur(${(1 - p) * 6 + (vertical ? 0 : i * 0.6)}px)`,
            }}
          >
            <Card start={CARD_AT[i]} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Layer: React.FC<{ title: string; start: number; children: React.ReactNode }> = ({
  title,
  start,
  children,
}) => (
  <div
    style={{
      background: color.white,
      borderRadius: radius.lg,
      boxShadow: shadow.l,
      border: `2px solid ${color.border}`,
      padding: "28px 36px",
      display: "flex",
      gap: 28,
      alignItems: "center",
    }}
  >
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...type.caption, color: color.gray600 }}>{title}</div>
      {children}
    </div>
    <Check delay={start + 34} />
  </div>
);

const OrderCard: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const item = { ...type.body, fontSize: 36, fontWeight: 500, color: color.ink };
  return (
    <Layer title="Order #4182, Downtown" start={start}>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <span style={item}>Burger</span>
        <span style={item}>Lemonade</span>
        <CrossedOff
          color={color.brand}
          strokeWidth={4}
          seed={4}
          progress={interpolate(frame, [start + 16, start + 32], [0, 1], clamp)}
        >
          <span style={item}>Fries</span>
        </CrossedOff>
      </div>
    </Layer>
  );
};

const PolicyCard: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  return (
    <Layer title="Your recovery policy" start={start}>
      <div style={{ ...type.body, fontSize: 36, fontWeight: 500, color: color.ink }}>
        Missing item:{" "}
        <Highlight
          color={color.brandBg}
          seed={2}
          progress={interpolate(frame, [start + 14, start + 30], [0, 1], clamp)}
        >
          200 points + free replacement
        </Highlight>
      </div>
    </Layer>
  );
};

const PointsCard: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const points = Math.round(
    interpolate(frame, [start + 12, start + 34], [1240, 1440], { ...clamp, easing: ease }),
  );
  const badge = spring({ frame: frame - start - 12, fps: 30, config: { damping: 10 } });
  return (
    <Layer title="Maya's loyalty balance" start={start}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <span
          style={{
            ...type.h3,
            fontWeight: 700,
            color: color.ink,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {points.toLocaleString("en-US")} pts
        </span>
        <span
          style={{
            ...type.caption,
            fontWeight: 700,
            color: color.oliveDark,
            background: color.olive,
            borderRadius: radius.full,
            padding: "4px 20px",
            scale: `${badge}`,
          }}
        >
          +200
        </span>
      </div>
    </Layer>
  );
};

const Resolved: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = spring({ frame: frame - RESOLVED_AT, fps: 30, config: { damping: 9 } });
  if (frame < RESOLVED_AT) return null;
  return (
    <RoughCircle
      color={color.brand}
      strokeWidth={4}
      seed={7}
      padding={{ left: 14, right: 14, top: 10, bottom: 10 }}
      progress={interpolate(frame, [RESOLVED_AT + 6, RESOLVED_AT + 22], [0, 1], clamp)}
    >
      <span
        style={{
          ...type.caption,
          fontWeight: 700,
          display: "inline-block",
          color: color.oliveDark,
          background: color.olive,
          borderRadius: radius.full,
          padding: "4px 24px",
          scale: `${pop}`,
        }}
      >
        Resolved
      </span>
    </RoughCircle>
  );
};
