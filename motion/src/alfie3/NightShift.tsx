import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { color, fontFamily } from "../brand";
import { Grain, LightLeak } from "../alfie/ui";
import { BagScene, FloodScene, FreezeScene, PrinterScene, RailScene } from "./scenes/Act1";
import { FixScene, RevealScene } from "./scenes/Act2";
import { BeatsScene, EndScene, HandoffScene, LanesScene, MorningScene, NightScene, WallScene } from "./scenes/Act3";
import { sceneLength, sceneStart, TIMELINE, type Scene } from "./timeline";

// Script: scripts/alfie-launch-v3.md ("The night shift"). Scene lengths and every cue
// come from timeline.json, written by scripts/build-alfie3-soundtrack.py from the voiceover.
export const NIGHT_SHIFT_DURATION = TIMELINE.total;

const SCENES: [Scene, React.FC][] = [
  ["printer", PrinterScene],
  ["rail", RailScene],
  ["bag", BagScene],
  ["flood", FloodScene],
  ["freeze", FreezeScene],
  ["reveal", RevealScene],
  ["fix", FixScene],
  ["wall", WallScene],
  ["lanes", LanesScene],
  ["night", NightScene],
  ["handoff", HandoffScene],
  ["morning", MorningScene],
  ["beats", BeatsScene],
  ["end", EndScene],
];

export const NightShift: React.FC = () => (
  <AbsoluteFill style={{ background: color.beige, fontFamily }}>
    {SCENES.map(([id, Comp]) => (
      <Sequence key={id} name={id} from={sceneStart(id)} durationInFrames={sceneLength(id)}>
        <Comp />
      </Sequence>
    ))}
    {/* light leaks on the two drops */}
    <Sequence from={sceneStart("reveal") + 8} durationInFrames={36}>
      <LightLeak duration={36} seed={5} />
    </Sequence>
    <Sequence from={sceneStart("beats")} durationInFrames={30}>
      <LightLeak duration={30} seed={9} hueShift={20} />
    </Sequence>
    <Grain opacity={0.06} />
    <Audio src={staticFile("audio/alfie3-mix.wav")} />
  </AbsoluteFill>
);
