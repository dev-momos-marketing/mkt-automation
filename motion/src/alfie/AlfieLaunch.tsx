import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { iris } from "@remotion/transitions/iris";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { color, fontFamily } from "../brand";
import { Cascade, CASCADE_LENGTH } from "./scenes/Cascade";
import { Cta, CTA_LENGTH } from "./scenes/Cta";
import { Handoff, HANDOFF_LENGTH } from "./scenes/Handoff";
import { Hook, HOOK_LENGTH } from "./scenes/Hook";
import { Proof, PROOF_LENGTH } from "./scenes/Proof";
import { Reach, REACH_LENGTH } from "./scenes/Reach";
import { Reveal, REVEAL_LENGTH } from "./scenes/Reveal";
import { Voiceover } from "./Voiceover";

// Script: scripts/alfie-launch.md. Frames at 30fps; one beat = 15 frames.
const T = 15;
const timing = linearTiming({ durationInFrames: T });

export const ALFIE_DURATION =
  HOOK_LENGTH +
  CASCADE_LENGTH +
  REVEAL_LENGTH +
  PROOF_LENGTH +
  REACH_LENGTH +
  HANDOFF_LENGTH +
  CTA_LENGTH -
  4 * T;

export const AlfieLaunch: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily, background: color.beige }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={HOOK_LENGTH}>
          <Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Cascade" durationInFrames={CASCADE_LENGTH}>
          <Cascade />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={iris({ width, height })} timing={timing} />
        <TransitionSeries.Sequence name="Reveal" durationInFrames={REVEAL_LENGTH}>
          <Reveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
        <TransitionSeries.Sequence name="Proof" durationInFrames={PROOF_LENGTH}>
          <Proof />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
        <TransitionSeries.Sequence name="Reach" durationInFrames={REACH_LENGTH}>
          <Reach />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={timing} />
        <TransitionSeries.Sequence name="Handoff" durationInFrames={HANDOFF_LENGTH}>
          <Handoff />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="CTA" durationInFrames={CTA_LENGTH}>
          <Cta />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Voiceover />
    </AbsoluteFill>
  );
};
