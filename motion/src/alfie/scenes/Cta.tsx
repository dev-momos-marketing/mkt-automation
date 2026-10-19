import { AbsoluteFill, Img, interpolate, Sequence, useCurrentFrame } from "remotion";
import { color, radius, type } from "../../brand";
import { clamp, MOMOS_LOGO, Rise, useEnter, useIsVertical } from "../ui";
import { BeatWords, beatsLength, type Beat } from "./BeatWords";

const WORDS: Beat[] = [
  { text: "Resolve." },
  { text: "Recover.", dark: true },
  { text: "Bring them back.", beats: 2 },
];
const END = beatsLength(WORDS);

export const CTA_LENGTH = END + 75;

// 7. CTA: the product's verbs on the beat, then the end card.
export const Cta: React.FC = () => (
  <AbsoluteFill style={{ background: color.beige }}>
    <BeatWords words={WORDS} size={200} verticalSize={130} />
    <Sequence from={END} layout="none">
      <EndCard />
    </Sequence>
  </AbsoluteFill>
);

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const vertical = useIsVertical();
  const button = useEnter(12, 11);
  // A sheen sweeps across the button once it lands.
  const sheen = interpolate(frame, [26, 46], [-30, 130], clamp);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: vertical ? 72 : 64,
      }}
    >
      <Rise>
        <Img src={MOMOS_LOGO} style={{ height: vertical ? 120 : 110, objectFit: "contain" }} />
      </Rise>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          ...type.h3,
          fontWeight: 700,
          color: color.white,
          background: color.brand,
          borderRadius: radius.sm,
          padding: "26px 64px",
          scale: `${button}`,
        }}
      >
        Book a demo
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(100deg, transparent ${sheen - 20}%, rgba(255,255,255,0.45) ${sheen}%, transparent ${sheen + 20}%)`,
          }}
        />
      </div>
      <Rise delay={20}>
        <div style={{ ...type.h3, fontWeight: 500, color: color.neutral700 }}>momos.com/alfie</div>
      </Rise>
    </AbsoluteFill>
  );
};
