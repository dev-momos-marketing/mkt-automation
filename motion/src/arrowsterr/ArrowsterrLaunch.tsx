import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, staticFile } from "remotion";
import { color, font } from "./brand";
import { Hud } from "./Hud";
import { Close } from "./scenes/Close";
import { Invisible } from "./scenes/Invisible";
import { Meet } from "./scenes/Meet";
import { Question } from "./scenes/Question";
import { Create, Find, Plan, See } from "./scenes/Stages";
import { Visible } from "./scenes/Visible";
import { sceneLength, TIMELINE } from "./timeline";

// Script: scripts/arrowsterr-launch.md. Lengths and transition overlaps come from
// timeline.json (scripts/build-arrowsterr-soundtrack.py); keep the overlaps below in sync.
export const ARROWSTERR_DURATION = TIMELINE.total;

const left = (frames: number) => ({
  presentation: slide({ direction: "from-right" }),
  timing: linearTiming({ durationInFrames: frames }),
});

export const ArrowsterrLaunch: React.FC = () => (
  <AbsoluteFill style={{ background: color.bg2, fontFamily: font.sans }}>
    <TransitionSeries>
      <TransitionSeries.Sequence name="Question" durationInFrames={sceneLength("question")}>
        <Question />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence name="Invisible" durationInFrames={sceneLength("invisible")}>
        <Invisible />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence name="Meet" durationInFrames={sceneLength("meet")}>
        <Meet />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...left(12)} />
      <TransitionSeries.Sequence name="01 See" durationInFrames={sceneLength("see")}>
        <See />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...left(12)} />
      <TransitionSeries.Sequence name="02 Find" durationInFrames={sceneLength("find")}>
        <Find />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...left(12)} />
      <TransitionSeries.Sequence name="03 Plan" durationInFrames={sceneLength("plan")}>
        <Plan />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...left(12)} />
      <TransitionSeries.Sequence name="04 Create" durationInFrames={sceneLength("create")}>
        <Create />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...left(12)} />
      <TransitionSeries.Sequence name="Visible" durationInFrames={sceneLength("visible")}>
        <Visible />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence name="Close" durationInFrames={sceneLength("close")}>
        <Close />
      </TransitionSeries.Sequence>
    </TransitionSeries>
    <Hud />
    <Audio src={staticFile("audio/arrowsterr-mix.wav")} />
  </AbsoluteFill>
);
