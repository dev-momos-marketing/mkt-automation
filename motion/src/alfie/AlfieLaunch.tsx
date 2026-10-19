import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { iris } from "@remotion/transitions/iris";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { color, fontFamily } from "../brand";
import { Cascade } from "./scenes/Cascade";
import { Cta } from "./scenes/Cta";
import { Handoff } from "./scenes/Handoff";
import { Hook } from "./scenes/Hook";
import { Proof } from "./scenes/Proof";
import { Reach } from "./scenes/Reach";
import { Reveal } from "./scenes/Reveal";
import { Soundtrack } from "./Soundtrack";
import { sceneLength, TIMELINE } from "./timeline";

// Script: scripts/alfie-launch.md. Frames at 30fps; one beat = 15 frames.
// Scene lengths and the total come from timeline.json (scripts/build-soundtrack.py),
// whose transition overlaps (15 frames) must match the transitions below.
const T = 15;
const timing = linearTiming({ durationInFrames: T });

export const ALFIE_DURATION = TIMELINE.total;

export const AlfieLaunch: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily, background: color.beige }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={sceneLength("hook")}>
          <Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="Cascade" durationInFrames={sceneLength("cascade")}>
          <Cascade />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={iris({ width, height })} timing={timing} />
        <TransitionSeries.Sequence name="Reveal" durationInFrames={sceneLength("reveal")}>
          <Reveal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
        <TransitionSeries.Sequence name="Proof" durationInFrames={sceneLength("proof")}>
          <Proof />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
        <TransitionSeries.Sequence name="Reach" durationInFrames={sceneLength("reach")}>
          <Reach />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={timing} />
        <TransitionSeries.Sequence name="Handoff" durationInFrames={sceneLength("handoff")}>
          <Handoff />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="CTA" durationInFrames={sceneLength("cta")}>
          <Cta />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Soundtrack />
    </AbsoluteFill>
  );
};
