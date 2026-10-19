import { zColor } from "@remotion/zod-types";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

// Props are editable live in the Remotion Studio sidebar.
export const momosPromoSchema = z.object({
  headline: z.string(),
  features: z.array(z.string()).max(4),
  cta: z.string(),
  url: z.string(),
  brandColor: zColor(),
  accentColor: zColor(),
});

type Props = z.infer<typeof momosPromoSchema>;

const FONT =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const MomosPromo: React.FC<Props> = ({
  headline,
  features,
  cta,
  url,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Slow drift on the background gradient so the frame never feels static.
  const angle = interpolate(frame, [0, durationInFrames], [120, 200]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${brandColor} 0%, #1A1033 100%)`,
        fontFamily: FONT,
        color: "white",
      }}
    >
      <Sequence durationInFrames={75} name="Logo">
        <Logo accentColor={accentColor} />
      </Sequence>
      <Sequence from={60} durationInFrames={90} name="Headline">
        <Headline text={headline} />
      </Sequence>
      <Sequence from={140} durationInFrames={65} name="Features">
        <Features items={features} accentColor={accentColor} />
      </Sequence>
      <Sequence from={195} name="CTA">
        <Cta cta={cta} url={url} accentColor={accentColor} />
      </Sequence>
    </AbsoluteFill>
  );
};

// Fades a scene out over its last `frames` frames.
const useExit = (frames = 12) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(
    frame,
    [durationInFrames - frames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
};

const Logo: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });
  const dot = spring({ frame: frame - 15, fps, config: { damping: 8 } });
  const opacity = useExit();

  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", opacity }}
    >
      <div
        style={{
          fontSize: width * 0.12,
          fontWeight: 800,
          letterSpacing: -4,
          transform: `scale(${scale})`,
        }}
      >
        momos
        <span style={{ color: accentColor, display: "inline-block", transform: `scale(${dot})` }}>
          .
        </span>
      </div>
    </AbsoluteFill>
  );
};

const Headline: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const opacity = useExit();
  const words = text.split(" ");

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: width * 0.08,
        opacity,
      }}
    >
      <h1
        style={{
          fontSize: width * 0.065,
          fontWeight: 800,
          lineHeight: 1.1,
          textAlign: "center",
          margin: 0,
        }}
      >
        {words.map((word, i) => {
          const progress = spring({
            frame: frame - i * 4,
            fps,
            config: { damping: 200 },
          });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.25em",
                opacity: progress,
                transform: `translateY(${(1 - progress) * 40}px)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </h1>
    </AbsoluteFill>
  );
};

const Features: React.FC<{ items: string[]; accentColor: string }> = ({
  items,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const opacity = useExit(10);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: width * 0.02,
        opacity,
      }}
    >
      {items.map((item, i) => {
        const progress = spring({ frame: frame - i * 8, fps });
        return (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              fontSize: width * 0.035,
              fontWeight: 600,
              padding: `${width * 0.012}px ${width * 0.025}px`,
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              opacity: progress,
              transform: `translateX(${(1 - progress) * -120}px)`,
            }}
          >
            <span style={{ color: accentColor }}>✓</span>
            {item}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Cta: React.FC<{ cta: string; url: string; accentColor: string }> = ({
  cta,
  url,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 10 } });
  const urlOpacity = interpolate(frame, [10, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: width * 0.025,
      }}
    >
      <div
        style={{
          fontSize: width * 0.05,
          fontWeight: 800,
          color: "#1A1033",
          background: accentColor,
          padding: `${width * 0.015}px ${width * 0.04}px`,
          borderRadius: 999,
          transform: `scale(${pop})`,
        }}
      >
        {cta} →
      </div>
      <div style={{ fontSize: width * 0.03, opacity: urlOpacity }}>{url}</div>
    </AbsoluteFill>
  );
};
