import { AbsoluteFill, Sequence } from "remotion";
import { color } from "../../brand";
import { Bubble, useIsVertical, useShake } from "../ui";
import { BeatWords, beatsLength, type Beat } from "./BeatWords";

// Each card holds for as long as its line is spoken (see voiceover.json).
const WORDS: Beat[] = [
  { text: "9:47 PM", beats: 2 },
  { text: "No fries.", dark: true, beats: 2 },
];
const SLAM = beatsLength(WORDS);

// 1. Hook: three beat cuts, then the guest's message slams in.
export const Hook: React.FC = () => {
  const vertical = useIsVertical();
  const shake = useShake(SLAM + 4, 22, 12);
  return (
    <AbsoluteFill style={{ background: color.beige }}>
      <BeatWords words={WORDS} size={260} />
      <Sequence from={SLAM} layout="none">
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            padding: vertical ? 64 : 200,
            translate: `${shake.x}px ${shake.y}px`,
          }}
        >
          <div style={{ width: "100%", maxWidth: 1400 }}>
            <Bubble
              from="guest"
              delay={0}
              size={vertical ? 56 : 68}
              text="My order just arrived and the fries are missing. Again."
            />
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
